/**
 * Browser-only rendering of .texture files with the TextureLab web runtime.
 * Import this with `await import(...)` from an effect or event handler, never
 * at the top of a page: it pulls in WebGL and three.js, which neither SSR nor
 * the gallery grid needs.
 */

import {
  applyPreset,
  createRuntime,
  parseTexture,
  resetVariables,
  setVariable,
  type ChannelPixels,
  type EvaluationResult,
  type EvaluationWarning,
  type TextureChannel,
  type TextureDocument,
  type TextureRuntime,
  type VariableValue,
} from '@njbrown/texturelab-runtime'
import { encode } from 'fast-png'
import { Color } from 'three'
import type { TextureViewer as Viewer } from '@njbrown/texturelab-runtime/viewer'
import { strToU8, zipSync, type Zippable } from 'fflate'
import type { ChannelSpec } from '~/lib/textures'

export { createViewer, SKY_PRESETS } from '@njbrown/texturelab-runtime/viewer'
export type { TextureViewer, MeshKind, SkyPreset } from '@njbrown/texturelab-runtime/viewer'
export type { EvaluationWarning, TextureDocument, VariableValue }

export function webgl2Available() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return Boolean(gl)
  } catch {
    return false
  }
}

/*
|--------------------------------------------------------------------------
| The runtime
|--------------------------------------------------------------------------
|
| One WebGL context for the page, shared by every session. Browsers cap the
| number of live contexts, and the viewer needs one of its own.
*/

let runtime: TextureRuntime | null = null

export function getRuntime() {
  runtime ??= createRuntime({ maxResolution: 4096 })
  return runtime
}

export function disposeRuntime() {
  runtime?.dispose()
  runtime = null
}

/** The largest render this GPU allows, from the sizes the site offers. */
export function resolutionOptions() {
  const gl = getRuntime().gl
  const max = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number)
  return [512, 1024, 2048, 4096].filter((size) => size <= max)
}

/*
|--------------------------------------------------------------------------
| PNG export
|--------------------------------------------------------------------------
*/

/**
 * One channel as a PNG, converted exactly like the desktop exporter
 * (Exporter::convertToImage): components 0 RGBA, 1 RGB, 2..5 one channel as
 * greyscale; precision 1 is 16 bits. Values are truncated, then clamped. Rows
 * come back from GL bottom-to-top and are flipped.
 */
export function encodeChannelPng(pixels: ChannelPixels<Float32Array>, spec: ChannelSpec) {
  const { width, height, data } = pixels
  const components = spec.components
  const channels = components === 1 ? 3 : components >= 2 && components <= 5 ? 1 : 4
  const sixteen = spec.precision === 1
  const max = sixteen ? 65535 : 255
  const out = sixteen
    ? new Uint16Array(width * height * channels)
    : new Uint8Array(width * height * channels)
  const quantize = (value: number) => Math.min(max, Math.max(0, Math.trunc(value * max))) || 0
  const pick = components - 2

  for (let y = 0; y < height; y++) {
    const sourceRow = (height - 1 - y) * width
    for (let x = 0; x < width; x++) {
      const i = (sourceRow + x) * 4
      const o = (y * width + x) * channels

      if (channels === 1) {
        out[o] = quantize(data[i + pick])
      } else {
        out[o] = quantize(data[i])
        out[o + 1] = quantize(data[i + 1])
        out[o + 2] = quantize(data[i + 2])
        if (channels === 4) out[o + 3] = quantize(data[i + 3])
      }
    }
  }

  return encode({ width, height, data: out, depth: sixteen ? 16 : 8, channels })
}

/**
 * An 8-bit, opaque, top-down image of a channel for looking at (not for
 * download), as a blob: URL. The caller revokes it.
 */
function previewUrl(pixels: ChannelPixels<Uint8Array>): Promise<string> {
  const { width, height, data } = pixels
  const flipped = new Uint8ClampedArray(width * height * 4)
  const row = width * 4

  for (let y = 0; y < height; y++) {
    flipped.set(data.subarray((height - 1 - y) * row, (height - y) * row), y * row)
  }
  for (let i = 3; i < flipped.length; i += 4) flipped[i] = 255

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.putImageData(new ImageData(flipped, width, height), 0, 0)

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('toBlob failed'))),
      'image/png'
    )
  )
}

export function zipFiles(files: { name: string; bytes: Uint8Array }[], readme: string) {
  const entries: Zippable = { 'README.txt': strToU8(readme) }
  // PNGs are already deflated; storing them is as small and much faster.
  for (const file of files) entries[file.name] = [file.bytes, { level: 0 }]
  return zipSync(entries)
}

/**
 * The viewer as a square PNG, with whatever background it shows (an HDRI,
 * blurred or sharp).
 */
export async function captureOpaque(viewer: Viewer, size: number): Promise<Blob> {
  const { renderer, scene, camera } = viewer
  const pixelRatio = renderer.getPixelRatio()
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  try {
    renderer.setPixelRatio(1)
    renderer.setSize(size, size, false)
    renderer.render(scene, camera)
    // Copied in the same task: the drawing buffer isn't preserved.
    canvas.getContext('2d')!.drawImage(renderer.domElement, 0, 0, size, size)
  } finally {
    renderer.setPixelRatio(pixelRatio)
    viewer.resize()
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't capture the preview"))),
      'image/png'
    )
  )
}

/**
 * The viewer's mesh as a square PNG with a transparent background.
 *
 * The viewer's canvas has no alpha channel, so the scene is drawn twice, on
 * black and on white, and each pixel's coverage is recovered from the
 * difference: a background pixel changes by the full range, a solid one not at
 * all, and antialiased edges in between.
 */
export async function captureTransparent(viewer: Viewer, size: number): Promise<Blob> {
  const { renderer, scene, camera } = viewer
  const saved = {
    background: scene.background,
    blurriness: scene.backgroundBlurriness,
    intensity: scene.backgroundIntensity,
    pixelRatio: renderer.getPixelRatio(),
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })!

  // The drawing buffer isn't preserved, so each frame is copied out in the
  // same task it's drawn in.
  const draw = (background: number) => {
    scene.background = new Color(background)
    renderer.render(scene, camera)
    context.clearRect(0, 0, size, size)
    context.drawImage(renderer.domElement, 0, 0, size, size)
    return context.getImageData(0, 0, size, size)
  }

  let onBlack: ImageData
  let onWhite: ImageData
  try {
    renderer.setPixelRatio(1)
    renderer.setSize(size, size, false)
    scene.backgroundBlurriness = 0
    scene.backgroundIntensity = 1
    onBlack = draw(0x000000)
    onWhite = draw(0xffffff)
  } finally {
    scene.background = saved.background
    scene.backgroundBlurriness = saved.blurriness
    scene.backgroundIntensity = saved.intensity
    renderer.setPixelRatio(saved.pixelRatio)
    viewer.resize()
  }

  const out = new ImageData(size, size)
  const black = onBlack.data
  const white = onWhite.data

  for (let i = 0; i < out.data.length; i += 4) {
    const difference =
      (white[i] - black[i] + white[i + 1] - black[i + 1] + white[i + 2] - black[i + 2]) / 3
    const alpha = Math.min(255, Math.max(0, 255 - difference))
    if (alpha === 0) continue
    // On black, a pixel is its color times its coverage; divide that back out.
    const scale = 255 / alpha
    out.data[i] = Math.min(255, black[i] * scale)
    out.data[i + 1] = Math.min(255, black[i + 1] * scale)
    out.data[i + 2] = Math.min(255, black[i + 2] * scale)
    out.data[i + 3] = alpha
  }

  context.putImageData(out, 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't capture the preview"))),
      'image/png'
    )
  )
}

export function downloadBlob(bytes: Uint8Array | Blob, name: string, type: string) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/*
|--------------------------------------------------------------------------
| A loaded texture
|--------------------------------------------------------------------------
*/

export type RenderOutcome = {
  resolution: number
  timeMs: number
  warnings: EvaluationWarning[]
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * A parsed document and its latest render. Renders run one at a time on the
 * shared runtime; starting one cancels the one in flight.
 */
export class TextureSession {
  readonly doc: TextureDocument
  private result: EvaluationResult | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private controller: AbortController | null = null
  private disposed = false

  constructor(text: string) {
    this.doc = parseTexture(text)
  }

  static async fetch(url: string) {
    const response = await fetch(url, { credentials: 'same-origin' })
    if (!response.ok) throw new Error(`Couldn't load the texture (${response.status})`)
    return new TextureSession(await response.text())
  }

  get renderTargetFormat() {
    return getRuntime().renderTargetFormat
  }

  get resolution() {
    return this.result?.width ?? null
  }

  /**
   * Resolves with null when a newer render (or dispose) cancelled this one.
   */
  render(
    resolution: number,
    onProgress?: (done: number, total: number) => void
  ): Promise<RenderOutcome | null> {
    this.controller?.abort()
    const controller = new AbortController()
    this.controller = controller

    const run = async () => {
      if (controller.signal.aborted || this.disposed) return null
      try {
        const result = await getRuntime().evaluate(this.doc, {
          resolution,
          signal: controller.signal,
          onProgress: ({ done, total }) => onProgress?.(done, total),
        })
        if (controller.signal.aborted || this.disposed) {
          result.dispose()
          return null
        }
        this.result?.dispose()
        this.result = result
        return { resolution: result.width, timeMs: result.timeMs, warnings: result.warnings }
      } catch (error) {
        if (isAbort(error)) return null
        throw error
      }
    }

    const next = this.queue.then(run, run)
    this.queue = next.catch(() => {})
    return next
  }

  get channels(): TextureChannel[] {
    return this.result?.channels ?? []
  }

  /** What the three.js viewer takes. */
  maps() {
    return this.result?.toMaps() ?? {}
  }

  previewUrl(channel: TextureChannel) {
    const pixels = this.result?.readUint8(channel)
    return pixels ? previewUrl(pixels) : Promise.resolve(null)
  }

  encode(spec: ChannelSpec) {
    const pixels = this.result?.readFloat32(spec.channel)
    return pixels ? encodeChannelPng(pixels, spec) : null
  }

  setVariable(name: string, value: VariableValue) {
    setVariable(this.doc, name, value)
  }

  applyPreset(id: string) {
    applyPreset(this.doc, id)
  }

  reset() {
    resetVariables(this.doc)
  }

  /** Current values, for the parameter panel and the zip's README. */
  values() {
    return Object.fromEntries(this.doc.variables.map((v) => [v.name, v.value]))
  }

  dispose() {
    this.disposed = true
    this.controller?.abort()
    this.result?.dispose()
    this.result = null
  }
}
