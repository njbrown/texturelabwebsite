import { createHash } from 'node:crypto'
import {
  parseTexture,
  TextureParseError,
  TEXTURE_CHANNELS,
  type TextureChannel,
  type TextureDocument,
  type TextureVariable,
} from '@njbrown/texturelab-runtime'

/**
 * Larger than any graph needs: image nodes embed their pixels as data URLs,
 * which is what makes a .texture big.
 */
export const MAX_TEXTURE_BYTES = 10 * 1024 * 1024
export const MAX_NODES = 2000

/**
 * How an output node is exported, as on desktop (Exporter::convertToImage):
 * components 0 RGBA, 1 RGB, 2..5 a single channel (R, G, B, A) as greyscale;
 * precision 0 is 8 bits per component, 1 is 16.
 */
export type ChannelSummary = {
  channel: TextureChannel
  /** The output node's name, used in export file names. */
  name: string
  components: number
  precision: number
  bitDepth: 8 | 16
  colorType: 'rgba' | 'rgb' | 'grey'
}

/**
 * What the public page needs to build a parameter panel before the runtime has
 * loaded. Gradient, curve and image values are left out: they can be large and
 * aren't editable on the site.
 */
export type VariableSummary = {
  id: string
  name: string
  displayName: string
  type: TextureVariable['type']
  value?: number | boolean | string | { r: number; g: number; b: number; a: number }
  min?: number
  max?: number
  step?: number
  options?: { index: number; label: string }[]
}

export type PresetSummary = { id: string; name: string }

export type TextureMetadata = {
  sha256: string
  bytes: number
  libraryVersion: string
  appVersion: string | null
  resolution: number
  nodeCount: number
  connectionCount: number
  channels: ChannelSummary[]
  variables: VariableSummary[]
  presets: PresetSummary[]
  activePreset: string | null
  warnings: string[]
}

export class TextureMetadataError extends Error {}

const COMPONENT_LABELS = ['RGBA', 'RGB', 'R', 'G', 'B', 'A']

export function componentsLabel(components: number) {
  return COMPONENT_LABELS[components] ?? 'RGBA'
}

function enumIndex(doc: TextureDocument, nodeId: string, prop: string) {
  const value = doc.nodes.get(nodeId)?.getProp(prop)
  return value && value.type === 'enum' ? value.index : 0
}

function stringValue(doc: TextureDocument, nodeId: string, prop: string) {
  const value = doc.nodes.get(nodeId)?.getProp(prop)
  return value && value.type === 'string' ? value.value : ''
}

export function channelSummaries(doc: TextureDocument): ChannelSummary[] {
  const summaries: ChannelSummary[] = []

  for (const channel of TEXTURE_CHANNELS) {
    const nodeId = doc.textureChannels[channel]
    if (!nodeId || !doc.nodes.has(nodeId)) continue

    const components = enumIndex(doc, nodeId, 'components')
    const precision = enumIndex(doc, nodeId, 'precision') === 1 ? 1 : 0

    summaries.push({
      channel,
      name: stringValue(doc, nodeId, 'name') || channel,
      components,
      precision,
      bitDepth: precision === 1 ? 16 : 8,
      colorType: components === 1 ? 'rgb' : components >= 2 && components <= 5 ? 'grey' : 'rgba',
    })
  }

  return summaries
}

function variableSummary(variable: TextureVariable): VariableSummary {
  const summary: VariableSummary = {
    id: variable.id,
    name: variable.name,
    displayName: variable.displayName,
    type: variable.type,
  }

  switch (variable.type) {
    case 'float':
    case 'int':
      Object.assign(summary, {
        value: variable.defaultValue as number,
        min: variable.min,
        max: variable.max,
        step: variable.step,
      })
      break
    case 'bool':
    case 'string':
      summary.value = variable.defaultValue as boolean | string
      break
    case 'enum':
      summary.value = variable.defaultValue as number
      summary.options = variable.options?.length
        ? variable.options
        : (variable.values ?? []).map((label, index) => ({ index, label }))
      break
    case 'color':
      summary.value = variable.defaultValue as VariableSummary['value']
      break
  }

  return summary
}

function readJson(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch (error) {
    throw new TextureMetadataError(`Not valid JSON: ${(error as Error).message}`)
  }
}

/**
 * Everything the site shows about a .texture that can be known without
 * rendering it. Runs on the server; rendering needs WebGL and happens in the
 * browser.
 */
export function extractMetadata(contents: Uint8Array): TextureMetadata {
  if (contents.byteLength === 0) {
    throw new TextureMetadataError('The file is empty')
  }

  if (contents.byteLength > MAX_TEXTURE_BYTES) {
    throw new TextureMetadataError(
      `The file is ${(contents.byteLength / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_TEXTURE_BYTES / 1024 / 1024} MB`
    )
  }

  const json = readJson(Buffer.from(contents).toString('utf8'))

  let doc: TextureDocument
  try {
    doc = parseTexture(json, { maxNodes: MAX_NODES })
  } catch (error) {
    if (error instanceof TextureParseError) throw new TextureMetadataError(error.message)
    throw error
  }

  const channels = channelSummaries(doc)
  const warnings: string[] = []

  for (const typeName of new Set(doc.skippedTypes)) {
    warnings.push(`Node type "${typeName}" isn't supported by the web runtime and was skipped`)
  }

  if (channels.length === 0) {
    throw new TextureMetadataError(
      'The file has no texture channels. Assign outputs to channels in TextureLab first.'
    )
  }

  return {
    sha256: createHash('sha256').update(contents).digest('hex'),
    bytes: contents.byteLength,
    libraryVersion: doc.libraryVersion,
    appVersion: typeof json.appVersion === 'string' ? json.appVersion : null,
    resolution: doc.width,
    nodeCount: doc.nodes.size,
    connectionCount: doc.connections.length,
    channels,
    variables: doc.variables.map(variableSummary),
    presets: doc.presets.map((preset) => ({ id: preset.id, name: preset.name })),
    activePreset: doc.activePreset,
    warnings,
  }
}
