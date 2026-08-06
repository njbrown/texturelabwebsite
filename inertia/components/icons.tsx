import type { SVGProps } from 'react'

/**
 * Brand marks. lucide-react dropped its brand icons, so the three logos the
 * site links out to are inlined here.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function BrandIcon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function GithubIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.95 3.21 9.15 7.66 10.63.56.1.77-.24.77-.54v-2.1c-3.12.68-3.78-1.32-3.78-1.32-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.49-.28-5.11-1.25-5.11-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.44.11-3 0 0 .94-.3 3.09 1.15a10.7 10.7 0 0 1 5.62 0c2.15-1.45 3.09-1.15 3.09-1.15.61 1.56.23 2.71.11 3 .72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.13 5.55.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.78.54a11.26 11.26 0 0 0 7.65-10.63C23.25 5.48 18.27.5 12 .5Z" />
    </BrandIcon>
  )
}

export function TwitterIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M18.9 2.25h3.37l-7.36 8.41 8.66 11.09h-6.78l-5.31-6.73-6.08 6.73H2.02l7.87-8.99L1.6 2.25h6.95l4.8 6.15 5.55-6.15Zm-1.18 17.5h1.87L7.4 4.15H5.4l12.32 15.6Z" />
    </BrandIcon>
  )
}

export function DiscordIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M20.32 4.9A19.8 19.8 0 0 0 15.43 3.4a14.4 14.4 0 0 0-.63 1.28 18.3 18.3 0 0 0-5.6 0A14 14 0 0 0 8.57 3.4 19.7 19.7 0 0 0 3.68 4.9C.58 9.5-.27 13.98.16 18.4a19.9 19.9 0 0 0 6 3.03c.48-.66.91-1.36 1.28-2.09a12.9 12.9 0 0 1-2.02-.97c.17-.12.34-.25.5-.38a14.2 14.2 0 0 0 12.16 0c.16.14.33.26.5.38-.64.38-1.32.7-2.02.97.37.73.8 1.43 1.28 2.09a19.8 19.8 0 0 0 6-3.03c.5-5.12-.85-9.56-3.52-13.5ZM8.02 15.68c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.41 2.15-2.41s2.17 1.09 2.15 2.4c0 1.33-.95 2.41-2.15 2.41Zm7.95 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.41 2.15-2.41s2.17 1.09 2.15 2.4c0 1.33-.94 2.41-2.15 2.41Z" />
    </BrandIcon>
  )
}
