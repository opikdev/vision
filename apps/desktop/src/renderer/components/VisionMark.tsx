export function VisionMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="262 262 500 500"
      fill="none"
      stroke="currentColor"
      strokeWidth={116}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M340 320L512 704" strokeOpacity={0.6} />
      <path d="M684 320L512 704" />
    </svg>
  );
}
