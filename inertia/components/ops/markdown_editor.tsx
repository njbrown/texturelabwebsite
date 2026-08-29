import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bold,
  Code,
  Eye,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pencil,
  Quote,
  SquareCode,
  Strikethrough,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import {
  continueList,
  insertBlock,
  insertLink,
  toggleLinePrefix,
  toggleWrap,
  type EditorState,
  type Selection,
} from '~/lib/markdown_commands'
import { cn } from '~/lib/utils'

type MarkdownEditorProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  invalid?: boolean
}

/**
 * markdown-it is a server dependency, so it is pulled in lazily and only when
 * the preview is opened — it stays out of the editor's chunk until then. The
 * preview skips Shiki (the server adds it when rendering for real), so code
 * blocks show up here unhighlighted.
 */
let previewRenderer: Promise<{ render: (source: string) => string }> | null = null

function getPreviewRenderer() {
  if (!previewRenderer) {
    previewRenderer = import('markdown-it').then(({ default: MarkdownIt }) =>
      MarkdownIt({ html: true, linkify: true, typographer: false })
    )
  }

  return previewRenderer
}

/**
 * A markdown field with a formatting toolbar, the usual editor shortcuts and a
 * rendered preview — the notes are still stored as markdown, because the
 * desktop app reads the raw text off the public API.
 */
export default function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  rows = 16,
  invalid,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingSelection = useRef<Selection | null>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [preview, setPreview] = useState('')

  /**
   * The textarea is controlled, so an edit lands one render later — the caret
   * a command wants to leave behind is queued and restored here.
   */
  useLayoutEffect(() => {
    const selection = pendingSelection.current
    if (!selection || !textareaRef.current) return

    pendingSelection.current = null
    textareaRef.current.focus()
    textareaRef.current.setSelectionRange(selection.start, selection.end)
  }, [value])

  useEffect(() => {
    if (tab !== 'preview') return

    let cancelled = false

    getPreviewRenderer().then((renderer) => {
      if (!cancelled) setPreview(renderer.render(value))
    })

    return () => {
      cancelled = true
    }
  }, [tab, value])

  function state(): EditorState {
    const element = textareaRef.current
    const caret = { start: value.length, end: value.length }

    return {
      value,
      selection: element
        ? { start: element.selectionStart, end: element.selectionEnd }
        : { ...caret },
    }
  }

  function run(command: (state: EditorState) => EditorState | null) {
    const next = command(state())
    if (!next) return false

    onChange(next.value)
    pendingSelection.current = next.selection

    return true
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const modifier = event.metaKey || event.ctrlKey

    if (modifier && !event.altKey) {
      const shortcut = {
        b: (current: EditorState) => toggleWrap(current, '**', 'bold text'),
        i: (current: EditorState) => toggleWrap(current, '_', 'italic text'),
        k: (current: EditorState) => insertLink(current),
      }[event.key.toLowerCase()]

      if (shortcut) {
        event.preventDefault()
        run(shortcut)
      }

      return
    }

    if (event.key === 'Enter' && !event.shiftKey && run(continueList)) {
      event.preventDefault()
    }
  }

  const groups: { label: string; hint?: string; icon: ReactNode; run: () => void }[][] = [
    [
      {
        label: 'Bold',
        hint: '⌘B',
        icon: <Bold />,
        run: () => run((s) => toggleWrap(s, '**', 'bold text')),
      },
      {
        label: 'Italic',
        hint: '⌘I',
        icon: <Italic />,
        run: () => run((s) => toggleWrap(s, '_', 'italic text')),
      },
      {
        label: 'Strikethrough',
        icon: <Strikethrough />,
        run: () => run((s) => toggleWrap(s, '~~', 'struck text')),
      },
      { label: 'Inline code', icon: <Code />, run: () => run((s) => toggleWrap(s, '`', 'code')) },
    ],
    [
      {
        label: 'Heading',
        icon: <Heading2 />,
        run: () => run((s) => toggleLinePrefix(s, () => '## ')),
      },
      {
        label: 'Subheading',
        icon: <Heading3 />,
        run: () => run((s) => toggleLinePrefix(s, () => '### ')),
      },
    ],
    [
      {
        label: 'Bulleted list',
        icon: <List />,
        run: () => run((s) => toggleLinePrefix(s, () => '- ')),
      },
      {
        label: 'Numbered list',
        icon: <ListOrdered />,
        run: () => run((s) => toggleLinePrefix(s, (index) => `${index + 1}. `)),
      },
      { label: 'Quote', icon: <Quote />, run: () => run((s) => toggleLinePrefix(s, () => '> ')) },
    ],
    [
      { label: 'Link', hint: '⌘K', icon: <Link2 />, run: () => run((s) => insertLink(s)) },
      { label: 'Image', icon: <ImageIcon />, run: () => run((s) => insertLink(s, true)) },
      {
        label: 'Code block',
        icon: <SquareCode />,
        run: () => run((s) => insertBlock(s, '```\n', '\n```', 'code')),
      },
      { label: 'Divider', icon: <Minus />, run: () => run((s) => insertBlock(s, '---', '', '')) },
    ],
  ]

  return (
    <Tabs value={tab} onValueChange={(next) => setTab(next as 'write' | 'preview')}>
      <div
        className={cn(
          'overflow-hidden rounded-md border border-input',
          invalid && 'border-destructive'
        )}
      >
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1.5">
          <TooltipProvider>
            {groups.map((group, index) => (
              <div key={index} className="flex items-center gap-0.5">
                {index > 0 && <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />}
                {group.map((action) => (
                  <Tooltip key={action.label}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={tab === 'preview'}
                        onClick={action.run}
                      >
                        {action.icon}
                        <span className="sr-only">{action.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {action.label}
                      {action.hint && <span className="ml-2 opacity-60">{action.hint}</span>}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </TooltipProvider>

          <TabsList className="ml-auto">
            <TabsTrigger value="write">
              <Pencil />
              Write
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="write">
          <textarea
            id={id}
            ref={textareaRef}
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-invalid={invalid}
            className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground"
          />
        </TabsContent>

        <TabsContent value="preview">
          <div style={{ minHeight: `${rows * 1.5}rem` }} className="px-3 py-2">
            {value.trim() ? (
              <div className="markdown" dangerouslySetInnerHTML={{ __html: preview }} />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}
