/**
 * The text transformations behind the release notes toolbar. They are kept
 * free of React so each one is a plain `state in, state out` function that can
 * be exercised on its own.
 */

export type Selection = { start: number; end: number }

export type EditorState = {
  value: string
  selection: Selection
}

/**
 * Leading list / heading / quote marker on a line, with its indentation kept
 * in the first capture so toggling a block style never eats nesting.
 */
const LINE_MARKER = /^(\s*)(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+)?/

const LIST_ITEM = /^(\s*)(?:([-*+])|(\d+)\.)\s+(.*)$/

function splice(
  state: EditorState,
  start: number,
  end: number,
  text: string,
  selection: Selection
): EditorState {
  return {
    value: state.value.slice(0, start) + text + state.value.slice(end),
    selection,
  }
}

/**
 * Wraps the selection in `marker`, or unwraps it when the markers are already
 * sitting either side — so the button behaves like a toggle.
 */
export function toggleWrap(state: EditorState, marker: string, fallback: string): EditorState {
  const { value } = state
  const { start, end } = state.selection
  const width = marker.length

  if (value.slice(start - width, start) === marker && value.slice(end, end + width) === marker) {
    return splice(state, start - width, end + width, value.slice(start, end), {
      start: start - width,
      end: end - width,
    })
  }

  const body = value.slice(start, end) || fallback

  return splice(state, start, end, `${marker}${body}${marker}`, {
    start: start + width,
    end: start + width + body.length,
  })
}

/**
 * Applies a block style to every line the selection touches, and removes it
 * again when all of them already carry it.
 */
export function toggleLinePrefix(
  state: EditorState,
  prefixFor: (index: number) => string
): EditorState {
  const { value } = state
  const { start, end } = state.selection

  const from = value.lastIndexOf('\n', start - 1) + 1
  const newline = value.indexOf('\n', end)
  const to = newline === -1 ? value.length : newline

  const lines = value.slice(from, to).split('\n')
  const stripped = lines.map((line) => line.replace(LINE_MARKER, '$1'))
  const prefixed = stripped.map((line, index) => {
    const indent = line.match(/^\s*/)![0]
    return `${indent}${prefixFor(index)}${line.slice(indent.length)}`
  })

  const applied = lines.join('\n') === prefixed.join('\n')
  const text = (applied ? stripped : prefixed).join('\n')

  return splice(state, from, to, text, { start: from, end: from + text.length })
}

/**
 * Wraps the selection in a block that needs lines of its own, padding with
 * blank lines only where the surrounding text does not already have them.
 */
export function insertBlock(
  state: EditorState,
  before: string,
  after: string,
  fallback: string
): EditorState {
  const { value } = state
  const { start, end } = state.selection

  const body = value.slice(start, end) || fallback
  const lead = start === 0 || value.slice(0, start).endsWith('\n\n') ? '' : '\n\n'
  const trail = value.slice(end).startsWith('\n') ? '\n' : '\n\n'
  const bodyStart = start + lead.length + before.length

  return splice(state, start, end, `${lead}${before}${body}${after}${trail}`, {
    start: bodyStart,
    end: bodyStart + body.length,
  })
}

/**
 * A selected URL becomes the destination and the caret lands on the label;
 * anything else becomes the label with the caret on the destination.
 */
export function insertLink(state: EditorState, image = false): EditorState {
  const { value } = state
  const { start, end } = state.selection

  const selected = value.slice(start, end)
  const isUrl = /^(https?:\/\/|\/)\S*$/.test(selected)

  const label = isUrl ? (image ? 'alt text' : 'link text') : selected || 'link text'
  const url = isUrl ? selected : 'https://'

  const labelStart = start + (image ? 2 : 1)
  const urlStart = labelStart + label.length + 2

  return splice(state, start, end, `${image ? '!' : ''}[${label}](${url})`, {
    start: isUrl ? labelStart : urlStart,
    end: isUrl ? labelStart + label.length : urlStart + url.length,
  })
}

/**
 * Enter inside a list carries the marker onto the next line, and clears it
 * when the item was left empty. Returns `null` when the caret is not in a
 * list, so the browser handles the key itself.
 */
export function continueList(state: EditorState): EditorState | null {
  const { value } = state
  const { start, end } = state.selection

  if (start !== end) return null

  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const match = value.slice(lineStart, start).match(LIST_ITEM)
  if (!match) return null

  const [, indent, bullet, number, content] = match

  if (!content) {
    return splice(state, lineStart, start, indent, {
      start: lineStart + indent.length,
      end: lineStart + indent.length,
    })
  }

  const inserted = `\n${indent}${bullet ? `${bullet} ` : `${Number(number) + 1}. `}`

  return splice(state, start, start, inserted, {
    start: start + inserted.length,
    end: start + inserted.length,
  })
}
