import { usePage } from '@inertiajs/react'
import type { Site } from './types.js'

/**
 * Site metadata shared with every Inertia response from `config/inertia.ts`.
 */
export function useSite(): Site {
  return usePage().props.site as Site
}

export function useCurrentPath(): string {
  return (usePage().props.currentPath as string) ?? '/'
}
