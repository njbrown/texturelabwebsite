type UsageDay = { day: string; visitors: number }

function formatDay(day: string, style: 'short' | 'long' = 'short') {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(style === 'long' && { weekday: 'short' }),
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))
}

/**
 * Daily unique app users as a bar per day. Each column is a full-height hover
 * target so short bars are still easy to inspect.
 */
export function UsageChart({ data }: { data: UsageDay[] }) {
  const max = Math.max(1, ...data.map((point) => point.visitors))

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="flex h-40 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums">
          <span>{max}</span>
          <span>0</span>
        </div>

        <div className="relative flex h-40 flex-1 items-end gap-[2px] border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border"
          />
          {data.map((point) => (
            <div key={point.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-primary/80 transition-colors group-hover:bg-primary"
                style={{ height: `${(point.visitors / max) * 100}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block">
                <div className="text-muted-foreground">{formatDay(point.day, 'long')}</div>
                <div className="font-medium tabular-nums">
                  {point.visitors} {point.visitors === 1 ? 'user' : 'users'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.length > 0 && (
        <div className="flex justify-between pl-8 text-xs text-muted-foreground">
          <span>{formatDay(data[0].day)}</span>
          <span>{formatDay(data[data.length - 1].day)}</span>
        </div>
      )}

      <table className="sr-only">
        <caption>Daily unique app users</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Users</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.day}>
              <td>{point.day}</td>
              <td>{point.visitors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
