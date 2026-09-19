import { Head, useForm } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export default function OpsLogin() {
  const { data, setData, post, processing, errors } = useForm({ email: '', password: '' })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    post('/ops/login')
  }

  return (
    <div className="ops-shell flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Head title="Sign in · Ops">
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <img src="/images/logo.svg" alt="" className="size-7" />
            <span className="font-semibold">TextureLab Ops</span>
          </div>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Admin access to releases and site content.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={data.email}
                onChange={(event) => setData('email', event.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={data.password}
                onChange={(event) => setData('password', event.target.value)}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" disabled={processing} className="w-full">
              {processing ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
