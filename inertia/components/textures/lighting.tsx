import type { EnvironmentOption } from '~/lib/textures'

type Engine = typeof import('~/lib/texture_engine')
type ViewerEnvironment = Parameters<
  import('~/lib/texture_engine').TextureViewer['setEnvironment']
>[0]

/**
 * What lights the 3D preview: `sky:<preset>`, `studio`, or `hdri:<id>`.
 */
export type Lighting = string

const SKIES = [
  { value: 'sky:default', label: 'Daylight' },
  { value: 'sky:overcast', label: 'Overcast' },
  { value: 'sky:sunset', label: 'Sunset' },
  { value: 'sky:night', label: 'Night' },
  { value: 'studio', label: 'Studio' },
]

/** The HDRI marked default in /ops, else the built-in daylight sky. */
export function defaultLighting(environments: EnvironmentOption[]): Lighting {
  const preferred = environments.find((environment) => environment.isDefault)
  return preferred ? `hdri:${preferred.id}` : 'sky:default'
}

export function viewerEnvironment(
  lighting: Lighting,
  environments: EnvironmentOption[],
  engine: Engine
): ViewerEnvironment {
  if (lighting === 'studio') return { type: 'studio' }

  if (lighting.startsWith('hdri:')) {
    const id = lighting.slice(5)
    const environment = environments.find((option) => option.id === id)
    if (environment) {
      return { type: environment.format, url: new URL(environment.url, location.href).toString() }
    }
  }

  const preset = lighting.startsWith('sky:') ? lighting.slice(4) : 'default'
  return engine.SKY_PRESETS[preset as keyof Engine['SKY_PRESETS']] ?? engine.SKY_PRESETS.default
}

export function LightingSelect({
  value,
  onChange,
  environments,
  className,
  id,
}: {
  value: Lighting
  onChange: (value: Lighting) => void
  environments: EnvironmentOption[]
  className?: string
  id?: string
}) {
  return (
    <select
      id={id}
      aria-label="Lighting"
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {environments.length > 0 && (
        <optgroup label="HDRIs">
          {environments.map((environment) => (
            <option key={environment.id} value={`hdri:${environment.id}`}>
              {environment.name}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Built in">
        {SKIES.map((sky) => (
          <option key={sky.value} value={sky.value}>
            {sky.label}
          </option>
        ))}
      </optgroup>
    </select>
  )
}
