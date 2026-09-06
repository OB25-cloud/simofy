// Runsite brand mark: a bold geometric "R" whose leg is cut away from the
// bowl — a forward "stride" that reads as motion at large sizes and as a
// clean R at 16px. Same geometry as app/icon.svg so the favicon, PWA icon
// and sidebar all share one mark. Renders in currentColor.
export default function BrandMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M9.5 27.5V4.75H17.75A5.9 5.9 0 0 1 17.75 16.55H9.5" />
      <path d="M16.9 21.1L23.5 27.5" />
    </svg>
  )
}
