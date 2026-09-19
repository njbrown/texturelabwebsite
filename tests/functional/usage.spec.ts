import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { dailyVisitors } from '#services/usage_service'

const today = () => DateTime.utc().toISODate()!

/**
 * Tracking is fire-and-forget, so wait for the aggregate to land.
 */
async function visitorsToday(expected: number) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const row = await db.from('daily_usage').where('day', today()).first()
    if (row && Number(row.visitors) === expected) return expected
    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  const row = await db.from('daily_usage').where('day', today()).first()
  return row ? Number(row.visitors) : 0
}

test.group('Usage tracking', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => redis.del(`usage:visitors:${today()}`))

  test('counts unique visitors once per day', async ({ client, assert }) => {
    await client.get('/api/releases/latest').header('user-agent', 'TextureLab/1.0')
    await client.get('/api/releases/latest').header('user-agent', 'TextureLab/1.0')
    await client.get('/api/releases/latest').header('user-agent', 'TextureLab/2.0')

    assert.equal(await visitorsToday(2), 2)
  })

  test('stores only aggregate counts', async ({ client, assert }) => {
    await client.get('/api/releases/latest').header('user-agent', 'TextureLab/1.0')
    await visitorsToday(1)

    const rows = await db.from('daily_usage')
    assert.deepEqual(Object.keys(rows[0]).sort(), ['day', 'updated_at', 'visitors'])
  })

  test('fills missing days with zero', async ({ assert }) => {
    const series = await dailyVisitors(7)

    assert.lengthOf(series, 7)
    assert.equal(series.at(-1)!.day, today())
    assert.isTrue(series.every((point) => point.visitors === 0))
  })
})
