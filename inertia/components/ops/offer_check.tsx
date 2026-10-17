import { useState } from 'react'
import { CheckCircle2, CircleArrowUp } from 'lucide-react'
import ChannelBadge from '~/components/channel_badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { parseIdentifier } from '~/lib/channels'
import type { ApiRelease, ReleaseChannel } from '~/lib/types'

type Offer = {
  channel: ReleaseChannel
  upToDate: boolean
  live: ApiRelease | null
  offered: ApiRelease | null
}

/**
 * "What would this build see?" — asks the server, which answers with the same
 * code the public update check runs.
 */
export default function OfferCheck() {
  const [identifier, setIdentifier] = useState('')
  const [build, setBuild] = useState('')
  const [offer, setOffer] = useState<Offer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  async function check(event: React.FormEvent) {
    event.preventDefault()
    setOffer(null)
    setError(null)

    if (!parseIdentifier(identifier) || !/^[1-9]\d*$/.test(build.trim())) {
      setError('Enter an identifier like 0.4.0-beta-039faa9 and its build number.')
      return
    }

    setChecking(true)

    try {
      const query = new URLSearchParams({ identifier: identifier.trim(), build: build.trim() })
      const response = await fetch(`/ops/releases/offer?${query}`, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        setError(`The check failed (${response.status}).`)
        return
      }

      setOffer((await response.json()).data)
    } catch {
      setError('The check failed — is the server reachable?')
    } finally {
      setChecking(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What would this build see?</CardTitle>
        <CardDescription>The answer the app's update check gets right now.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form onSubmit={check} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="offer-identifier">Identifier</Label>
            <Input
              id="offer-identifier"
              className="font-mono"
              placeholder="0.4.0-beta-039faa9"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="offer-build">Build number</Label>
              <Input
                id="offer-build"
                type="number"
                min={1}
                placeholder="963"
                value={build}
                onChange={(event) => setBuild(event.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={checking}>
              {checking ? 'Checking…' : 'Check'}
            </Button>
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {offer &&
          (offer.offered ? (
            <div className="flex items-start gap-2 text-sm">
              <CircleArrowUp className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p>
                Would be offered{' '}
                <a
                  className="font-mono font-medium hover:underline"
                  href={offer.offered.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {offer.offered.identifier}
                </a>{' '}
                (build {offer.offered.build}) <ChannelBadge channel={offer.offered.channel} />
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <p>
                Up to date.{' '}
                {offer.live ? (
                  <span className="text-muted-foreground">
                    Live on {offer.channel}:{' '}
                    <span className="font-mono">{offer.live.identifier}</span> (build{' '}
                    {offer.live.build}).
                  </span>
                ) : (
                  <span className="text-muted-foreground">Nothing is live on {offer.channel}.</span>
                )}
              </p>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}
