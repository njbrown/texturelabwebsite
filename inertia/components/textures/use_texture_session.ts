import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { RenderOutcome, TextureSession, TextureViewer } from '~/lib/texture_engine'

type Engine = typeof import('~/lib/texture_engine')

export type SessionState =
  | { status: 'loading' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string }
  | { status: 'ready' }

/**
 * Loads the runtime (lazily, client-only), fetches and parses the .texture,
 * and owns a three.js viewer in `containerRef`. Everything is torn down on
 * unmount.
 */
export function useTextureSession(sourceUrl: string, containerRef: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [outcome, setOutcome] = useState<RenderOutcome | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const engineRef = useRef<Engine | null>(null)
  const sessionRef = useRef<TextureSession | null>(null)
  const viewerRef = useRef<TextureViewer | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const engine = await import('~/lib/texture_engine')
      if (cancelled) return

      if (!engine.webgl2Available()) {
        setState({ status: 'unsupported' })
        return
      }

      const session = await engine.TextureSession.fetch(sourceUrl)
      if (cancelled) {
        session.dispose()
        return
      }

      engineRef.current = engine
      sessionRef.current = session
      if (containerRef.current) {
        viewerRef.current = engine.createViewer(containerRef.current, { mesh: 'sphere' })
      }
      setState({ status: 'ready' })
    }

    load().catch((error: Error) => {
      if (!cancelled) setState({ status: 'error', message: error.message })
    })

    return () => {
      cancelled = true
      sessionRef.current?.dispose()
      viewerRef.current?.dispose()
      // Give the GPU memory back once nothing on the page renders.
      engineRef.current?.disposeRuntime()
      sessionRef.current = null
      viewerRef.current = null
    }
  }, [sourceUrl, containerRef])

  /**
   * Render at `resolution` and show it in the viewer. Resolves with null when
   * a newer render superseded this one.
   */
  const render = useCallback(async (resolution: number) => {
    const session = sessionRef.current
    if (!session) return null

    setRenderError(null)
    setProgress({ done: 0, total: 1 })
    try {
      const result = await session.render(resolution, (done, total) => setProgress({ done, total }))
      if (!result) return null
      viewerRef.current?.setMaps(session.maps())
      setOutcome(result)
      setProgress(null)
      return result
    } catch (error) {
      setRenderError((error as Error).message)
      setProgress(null)
      return null
    }
  }, [])

  return {
    state,
    progress,
    outcome,
    renderError,
    render,
    engine: engineRef,
    session: sessionRef,
    viewer: viewerRef,
  }
}

/**
 * blob: URLs for each channel's preview image, revoked when replaced or on
 * unmount.
 */
export function usePreviewUrls() {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const current = useRef<Record<string, string>>({})

  const replace = useCallback((next: Record<string, string>) => {
    for (const url of Object.values(current.current)) URL.revokeObjectURL(url)
    current.current = next
    setUrls(next)
  }, [])

  useEffect(() => () => replace({}), [replace])

  return [urls, replace] as const
}
