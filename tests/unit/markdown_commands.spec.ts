import { test } from '@japa/runner'
import {
  continueList,
  insertBlock,
  insertLink,
  toggleLinePrefix,
  toggleWrap,
  type EditorState,
} from '../../inertia/lib/markdown_commands.js'

/**
 * `[` and `]` mark the selection, so each case reads as the text the editor
 * had and the text it should be left with.
 */
function parse(annotated: string): EditorState {
  const start = annotated.indexOf('[')
  const end = annotated.indexOf(']') - 1

  return {
    value: annotated.replace(/[[\]]/g, ''),
    selection: { start, end },
  }
}

function print(state: EditorState): string {
  const { start, end } = state.selection

  return `${state.value.slice(0, start)}[${state.value.slice(start, end)}]${state.value.slice(end)}`
}

test.group('toggleWrap', () => {
  test('wraps the selection', ({ assert }) => {
    assert.equal(print(toggleWrap(parse('a [word] b'), '**', 'bold text')), 'a **[word]** b')
  })

  test('unwraps a selection that already carries the marker', ({ assert }) => {
    assert.equal(print(toggleWrap(parse('a **[word]** b'), '**', 'bold text')), 'a [word] b')
  })

  test('drops in a placeholder when nothing is selected', ({ assert }) => {
    assert.equal(print(toggleWrap(parse('a []b'), '_', 'italic text')), 'a _[italic text]_b')
  })
})

test.group('toggleLinePrefix', () => {
  test('prefixes every line the selection touches', ({ assert }) => {
    assert.equal(print(toggleLinePrefix(parse('on[e\ntw]o'), () => '- ')), '[- one\n- two]')
  })

  test('removes the prefix when all lines already have it', ({ assert }) => {
    assert.equal(print(toggleLinePrefix(parse('- on[e\n- tw]o'), () => '- ')), '[one\ntwo]')
  })

  test('replaces a different marker rather than stacking onto it', ({ assert }) => {
    assert.equal(print(toggleLinePrefix(parse('- it[]em'), () => '## ')), '[## item]')
  })

  test('numbers the lines of an ordered list', ({ assert }) => {
    assert.equal(
      print(toggleLinePrefix(parse('[one\ntwo\nthree]'), (index) => `${index + 1}. `)),
      '[1. one\n2. two\n3. three]'
    )
  })

  test('keeps indentation outside the marker', ({ assert }) => {
    assert.equal(print(toggleLinePrefix(parse('  it[]em'), () => '- ')), '[  - item]')
  })
})

test.group('insertBlock', () => {
  test('fences the selection and pads it onto its own lines', ({ assert }) => {
    assert.equal(
      print(insertBlock(parse('intro[]'), '```\n', '\n```', 'code')),
      'intro\n\n```\n[code]\n```\n\n'
    )
  })

  test('skips the leading blank line at the top of the field', ({ assert }) => {
    assert.equal(print(insertBlock(parse('[]'), '---', '', '')), '---[]\n\n')
  })

  test('reuses a blank line the text already ends with', ({ assert }) => {
    assert.equal(print(insertBlock(parse('intro\n\n[]'), '---', '', '')), 'intro\n\n---[]\n\n')
  })
})

test.group('insertLink', () => {
  test('turns the selection into the label and selects the url', ({ assert }) => {
    assert.equal(print(insertLink(parse('see [the docs]'))), 'see [the docs]([https://])')
  })

  test('turns a selected url into the destination and selects the label', ({ assert }) => {
    assert.equal(
      print(insertLink(parse('[https://texturelab.io]'))),
      '[[link text]](https://texturelab.io)'
    )
  })

  test('writes an image when asked', ({ assert }) => {
    assert.equal(print(insertLink(parse('[shot]'), true)), '![shot]([https://])')
  })
})

test.group('continueList', () => {
  test('carries a bullet onto the next line', ({ assert }) => {
    assert.equal(print(continueList(parse('- one[]'))!), '- one\n- []')
  })

  test('increments an ordered marker', ({ assert }) => {
    assert.equal(print(continueList(parse('1. one\n2. two[]'))!), '1. one\n2. two\n3. []')
  })

  test('ends the list when the item was left empty', ({ assert }) => {
    assert.equal(print(continueList(parse('- one\n- []'))!), '- one\n[]')
  })

  test('keeps the indentation of a nested item', ({ assert }) => {
    assert.equal(print(continueList(parse('- one\n  - two[]'))!), '- one\n  - two\n  - []')
  })

  test('leaves plain text alone', ({ assert }) => {
    assert.isNull(continueList(parse('just a line[]')))
  })

  test('leaves a range selection alone', ({ assert }) => {
    assert.isNull(continueList(parse('- [one]')))
  })
})
