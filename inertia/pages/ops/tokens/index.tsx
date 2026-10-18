import { useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import { Check, Copy, KeyRound, Trash2 } from 'lucide-react'
import OpsLayout from '~/components/ops/ops_layout'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import type { ApiToken, NewApiToken } from '~/lib/types'

const EXPIRY_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
]

function formatDate(value: string | null, fallback = '—') {
  if (!value) return fallback

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

/**
 * Only rendered in the response that created the token. The value is never
 * stored, so once this page is left or reloaded it is gone for good.
 */
function NewTokenCard({ token, secretName }: { token: NewApiToken; secretName: string }) {
  return (
    <Card className="border-emerald-300 dark:border-emerald-900">
      <CardHeader>
        <CardTitle>Copy “{token.name}” now</CardTitle>
        <CardDescription>
          This is the only time it is shown. Add it to the repository's Actions secrets as{' '}
          <code className="font-mono text-foreground">{secretName}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm break-all">
            {token.value}
          </code>
          <CopyButton value={token.value} label="Copy token" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Secret name:</span>
          <code className="font-mono text-foreground">{secretName}</code>
          <CopyButton value={secretName} label="Copy name" />
        </div>
      </CardContent>
    </Card>
  )
}

type TokensIndexProps = {
  tokens: ApiToken[]
  secretName: string
  newToken: NewApiToken | null
}

export default function TokensIndex({ tokens, secretName, newToken }: TokensIndexProps) {
  // Absent (not `{}`) on a server-rendered first load with nothing flashed.
  const pageErrors = (usePage().props.errors ?? {}) as Record<string, string | undefined>
  const [pendingRevoke, setPendingRevoke] = useState<ApiToken | null>(null)
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    expiresIn: '365',
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    post('/ops/tokens', { onSuccess: () => reset('name') })
  }

  function confirmRevoke() {
    if (!pendingRevoke) return

    router.delete(`/ops/tokens/${pendingRevoke.id}`, {
      onFinish: () => setPendingRevoke(null),
    })
  }

  return (
    <OpsLayout title="API tokens" description="For CI to draft releases on the site">
      {newToken && <NewTokenCard token={newToken} secretName={secretName} />}

      {pageErrors.token && <p className="text-sm text-destructive">{pageErrors.token}</p>}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>New token</CardTitle>
          <CardDescription>
            Tokens can only create and update <em>draft</em> releases through{' '}
            <code>POST /api/ops/releases/drafts</code>. Publishing is always done here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="GitHub Actions — texturelab release workflow"
                value={data.name}
                onChange={(event) => setData('name', event.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expiresIn">Expires</Label>
              <Select value={data.expiresIn} onValueChange={(value) => setData('expiresIn', value)}>
                <SelectTrigger id="expiresIn" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.expiresIn && <p className="text-sm text-destructive">{errors.expiresIn}</p>}
            </div>

            <Button type="submit" disabled={processing}>
              <KeyRound className="size-4" />
              Create token
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {tokens.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No tokens yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Abilities</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">
                      {token.name || '—'}
                      <div className="text-xs font-normal text-muted-foreground">
                        by {token.createdBy}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {token.abilities.map((ability) => (
                          <Badge key={ability} variant="secondary" className="font-mono">
                            {ability}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(token.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(token.lastUsedAt, 'Never')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(token.expiresAt, 'Never')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={token.status === 'active' ? 'default' : 'outline'}>
                        {token.status === 'active' ? 'Active' : 'Expired'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingRevoke(token)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pendingRevoke)} onOpenChange={() => setPendingRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke “{pendingRevoke?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using it — such as the release workflow's {secretName} secret — stops
              working immediately. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OpsLayout>
  )
}
