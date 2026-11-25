import { useId } from 'react'
import type { VariableSummary } from '~/lib/textures'

type Color = { r: number; g: number; b: number; a: number }
export type VariableValues = Record<string, unknown>

type VariableControlsProps = {
  variables: VariableSummary[]
  values: VariableValues
  onChange: (name: string, value: unknown) => void
  disabled?: boolean
}

function toHex(color: Color) {
  const channel = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`
}

function fromHex(hex: string, alpha: number): Color {
  const n = Number.parseInt(hex.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: alpha }
}

/** Enough decimals to show the step, no more. */
function decimalsFor(step: number | undefined) {
  if (!step || step >= 1) return 0
  return Math.min(4, Math.ceil(-Math.log10(step)))
}

function NumberControl({
  variable,
  value,
  onChange,
  disabled,
}: {
  variable: VariableSummary
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const id = useId()
  const isInt = variable.type === 'int'
  const step = variable.step || (isInt ? 1 : 0.01)
  const min = variable.min ?? 0
  const max = variable.max ?? 1

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm text-gray-300">
          {variable.displayName}
        </label>
        <input
          type="number"
          aria-label={`${variable.displayName} value`}
          className="w-20 rounded border border-gray-700 bg-gray-950 px-1.5 py-0.5 text-right text-sm text-white tabular-nums"
          value={Number(value.toFixed(decimalsFor(step)))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(next)
          }}
        />
      </div>
      <input
        id={id}
        type="range"
        className="w-full accent-brand"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

/**
 * One control per exposed texture variable. Gradient, curve and image
 * variables are shown but can only be edited in the desktop app.
 */
export default function VariableControls({
  variables,
  values,
  onChange,
  disabled,
}: VariableControlsProps) {
  const baseId = useId()

  if (variables.length === 0) {
    return <p className="text-sm text-gray-400">This texture has no adjustable parameters.</p>
  }

  return (
    <div className="grid gap-4">
      {variables.map((variable) => {
        const id = `${baseId}-${variable.name}`
        const value = values[variable.name] ?? variable.value

        switch (variable.type) {
          case 'float':
          case 'int':
            return (
              <NumberControl
                key={variable.name}
                variable={variable}
                value={Number(value ?? 0)}
                onChange={(next) => onChange(variable.name, next)}
                disabled={disabled}
              />
            )

          case 'bool':
            return (
              <label key={variable.name} className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-300">{variable.displayName}</span>
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  checked={Boolean(value)}
                  disabled={disabled}
                  onChange={(event) => onChange(variable.name, event.target.checked)}
                />
              </label>
            )

          case 'enum':
            return (
              <div key={variable.name} className="grid gap-1.5">
                <label htmlFor={id} className="text-sm text-gray-300">
                  {variable.displayName}
                </label>
                <select
                  id={id}
                  className="rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                  value={Number(value ?? 0)}
                  disabled={disabled}
                  onChange={(event) => onChange(variable.name, Number(event.target.value))}
                >
                  {(variable.options ?? []).map((option) => (
                    <option key={option.index} value={option.index}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )

          case 'color': {
            const color = (value as Color) ?? { r: 0, g: 0, b: 0, a: 1 }
            return (
              <label key={variable.name} className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-300">{variable.displayName}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">{toHex(color)}</span>
                  <input
                    type="color"
                    className="h-7 w-10 cursor-pointer rounded border border-gray-700 bg-gray-950"
                    value={toHex(color)}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(variable.name, fromHex(event.target.value, color.a))
                    }
                  />
                </span>
              </label>
            )
          }

          case 'string':
            return (
              <div key={variable.name} className="grid gap-1.5">
                <label htmlFor={id} className="text-sm text-gray-300">
                  {variable.displayName}
                </label>
                <input
                  id={id}
                  className="rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                  value={String(value ?? '')}
                  disabled={disabled}
                  onChange={(event) => onChange(variable.name, event.target.value)}
                />
              </div>
            )

          default:
            return (
              <div key={variable.name} className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-300">{variable.displayName}</span>
                <span className="text-xs text-gray-500">{variable.type} · edit in TextureLab</span>
              </div>
            )
        }
      })}
    </div>
  )
}
