import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * Privacy-friendly daily unique counts for the desktop app's update check,
 * modelled on Plausible (https://plausible.io/data-policy):
 *
 * - Each request is reduced to `sha256(dailySalt + ip + userAgent)`.
 * - The salt is random, lives only in Redis and expires at the end of the UTC
 *   day. Once it is gone nobody — us included — can recompute a hash or link a
 *   visitor across days.
 * - Hashes are fed into a HyperLogLog, which keeps a cardinality estimate but
 *   not the hashes themselves, and which is also dropped after two days.
 * - Only the daily total is persisted, in the `daily_usage` table.
 */

const TABLE = 'daily_usage'

function today() {
  return DateTime.utc().toISODate()!
}

function secondsUntilEndOfDay() {
  const now = DateTime.utc()
  return Math.max(1, Math.ceil(now.endOf('day').diff(now, 'seconds').seconds))
}

async function saltFor(day: string) {
  const key = `usage:salt:${day}`
  // NX so concurrent requests agree on one salt for the day.
  await redis.set(key, randomBytes(32).toString('hex'), 'EX', secondsUntilEndOfDay(), 'NX')
  return redis.get(key)
}

async function track(ip: string, userAgent: string) {
  const day = today()
  const salt = await saltFor(day)
  if (!salt) return

  const hash = createHash('sha256').update(`${salt}${ip}${userAgent}`).digest('hex')
  const key = `usage:visitors:${day}`

  const changed = await redis.pfadd(key, hash)
  if (!changed) return // already counted today; skip the DB write

  await redis.expire(key, 60 * 60 * 48)
  const visitors = await redis.pfcount(key)

  await db
    .knexQuery()
    .table(TABLE)
    .insert({ day, visitors, updated_at: new Date() })
    .onConflict('day')
    .merge()
}

/**
 * Counts a visitor without delaying the response or ever failing the request.
 */
export function recordVisit(ip: string, userAgent: string | undefined) {
  track(ip, userAgent ?? '').catch((error) => {
    logger.warn({ err: error }, 'usage tracking failed')
  })
}

/**
 * The last `days` UTC days, oldest first, with missing days filled with 0.
 */
export async function dailyVisitors(days = 30) {
  const end = DateTime.utc().startOf('day')
  const start = end.minus({ days: days - 1 })

  const rows: { day: string; visitors: number }[] = await db
    .from(TABLE)
    .select('day', 'visitors')
    .where('day', '>=', start.toISODate()!)

  const byDay = new Map(rows.map((row) => [row.day, Number(row.visitors)]))

  return Array.from({ length: days }, (_, index) => {
    const day = start.plus({ days: index }).toISODate()!
    return { day, visitors: byDay.get(day) ?? 0 }
  })
}
