// Lightweight inline SVG icons for the landing page (no icon dependency).
// Each accepts a className so size/color can be controlled by the caller.

type IconProps = {
  className?: string;
};

export function BalloonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2C7.6 2 4.5 5.4 4.5 9.6c0 3.9 3 7.4 6.3 8.9l-1 1.6a.7.7 0 0 0 .6 1.1h3.2a.7.7 0 0 0 .6-1.1l-1-1.6c3.3-1.5 6.3-5 6.3-8.9C19.5 5.4 16.4 2 12 2Z"
        fill="currentColor"
      />
      <path
        d="M10.5 18.2c.5.6 2.5.6 3 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15Z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z" />
      <path d="M12 4v15" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 21s-7-4.4-9.3-9C1.3 9 2.6 5.5 5.9 5.1c2-.3 3.4.9 4.1 2 .7-1.1 2.1-2.3 4.1-2 3.3.4 4.6 3.9 3.2 6.9C19 16.6 12 21 12 21Z" />
    </svg>
  );
}

export function PuzzleIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 3.5h4a1 1 0 0 1 1 1V6a1 1 0 0 0 1 1h1.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H16a1 1 0 0 0-1 1v1.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V13a1 1 0 0 0-1-1H6.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H8a1 1 0 0 0 1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M4.5 17v2.5A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V17" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function BlocksIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function RocketIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.5 14.5c-1.5 1-2 4-2 4s3-.5 4-2c.6-.9.4-2-.3-2.7-.7-.7-1.8-.9-1.7-1.3Z" />
      <path d="M9 15c-1-3 0-6.5 2.5-9C14 3.5 17 3 18.5 3 19 4.5 18.5 7.5 16 10c-2.5 2.5-6 3.5-9 2.5l2 2Z" />
      <circle cx="14.5" cy="9.5" r="1.6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.5 4h3l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 21s-6.5-5.5-6.5-10A6.5 6.5 0 0 1 18.5 11c0 4.5-6.5 10-6.5 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 9V7.5c0-.7.5-1 1.2-1H17V3.5L14.3 3.4C11.8 3.4 10 5 10 7.6V9H7.5v3H10v9h4v-9h2.5l.5-3H14Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TwitterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 3h3.3l-7.2 8.2L23 21h-6.6l-5.2-6.8L5.4 21H2.1l7.7-8.8L1.5 3h6.8l4.7 6.2L18.9 3Zm-1.2 16h1.8L7.1 4.8H5.2L17.7 19Z" />
    </svg>
  );
}

const ICONS = {
  book: BookIcon,
  heart: HeartIcon,
  puzzle: PuzzleIcon,
  shield: ShieldIcon,
  blocks: BlocksIcon,
  rocket: RocketIcon,
} as const;

export function HighlightIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name as keyof typeof ICONS] ?? StarIcon;
  return <Cmp className={className} />;
}

// ─── Custom Colorful Flat Emojis ──────────────────────────────────────────

export function EmojiPalette({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      {/* Wooden Base */}
      <path d="M48.5,12.5C36.9,4.3,19.3,7.6,11.2,19.1C3,30.7,5.5,47.8,17.1,56s30.8,3.9,38.9-7.7
        C64.1,36.8,60,20.6,48.5,12.5z M23.6,46c-2.8,2-6.5,1.2-8.5-1.6s-1.2-6.5,1.6-8.5s6.5-1.2,8.5,1.6S26.3,44,23.6,46z" fill="#D2935D"/>
      {/* Thumb hole inner shadow */}
      <circle cx="19.3" cy="40.1" r="5.5" fill="#B47A4A"/>
      <circle cx="20.3" cy="39.1" r="5.5" fill="#FFFFFF"/>
      {/* Paint blobs */}
      <circle cx="21" cy="22" r="4.5" fill="#EF4444"/>
      <circle cx="34" cy="16" r="4.5" fill="#FDE047"/>
      <circle cx="48" cy="24" r="4.5" fill="#22C55E"/>
      <circle cx="50" cy="40" r="4.5" fill="#3B82F6"/>
      <circle cx="36" cy="50" r="4.5" fill="#A855F7"/>
    </svg>
  );
}

export function EmojiMagnifyingGlass({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      {/* Handle */}
      <path d="M37.5,39.5l14.1,14.1c1.9,1.9,1.9,5,0,7l0,0c-1.9,1.9-5,1.9-7,0L30.5,46.5L37.5,39.5z" fill="#4B5563"/>
      {/* Metal rim */}
      <circle cx="26" cy="26" r="20" fill="#9CA3AF"/>
      <circle cx="26" cy="26" r="17" fill="#E5E7EB"/>
      {/* Glass */}
      <circle cx="26" cy="26" r="15" fill="#BAE6FD"/>
      {/* Reflection */}
      <path d="M15,20c1.7-5.1,6.5-8.8,12.2-8.8c4.3,0,8,2,10.4,5.1C35,16,33.5,16,32,16c-7.7,0-14,6.3-14,14c0,2.1,0.5,4.1,1.3,5.9
        C16,34,14,30.3,14,26C14,23.9,14.4,21.8,15,20z" fill="#FFFFFF" opacity="0.6"/>
    </svg>
  );
}

export function EmojiLightbulb({ className }: IconProps) {
  return (
    <svg viewBox="-4 -4 72 72" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      {/* Glowing rays */}
      <path d="M32,2v7 M17.9,8L21.4,14.1 M9.3,19.3L15.4,22.8 M4.1,34.5h7 M46.1,8L42.6,14.1 M54.7,19.3L48.6,22.8 M59.9,34.5h-7" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Bulb body */}
      <path d="M32,14c-9.9,0-18,8.1-18,18c0,5.9,2.8,11.1,7.2,14.4V50c0,1.1,0.9,2,2,2h17.6c1.1,0,2-0.9,2-2v-3.6
        c4.4-3.3,7.2-8.5,7.2-14.4C50,22.1,41.9,14,32,14z" fill="#FDE047"/>
      {/* Inner highlight */}
      <path d="M18,32c0-7.7,6.3-14,14-14c4,0,7.6,1.7,10.1,4.4C39.6,17.4,36,16,32,16c-8.8,0-16,7.2-16,16c0,5,2.3,9.4,5.9,12.3l0.1-2.1
        C19.6,39.6,18,36,18,32z" fill="#FFFFFF" opacity="0.5"/>
      {/* Base */}
      <path d="M23.2,52h17.6c1.1,0,2,0.9,2,2v2c0,1.1-0.9,2-2,2H23.2c-1.1,0-2-0.9-2-2v-2C21.2,52.9,22.1,52,23.2,52z" fill="#D1D5DB"/>
      <path d="M25.2,58h13.6c1.1,0,2,0.9,2,2s-0.9,2-2,2H25.2c-1.1,0-2-0.9-2-2S24.1,58,25.2,58z" fill="#9CA3AF"/>
    </svg>
  );
}

export function EmojiRainbow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      {/* Red */}
      <path d="M7,48c0-13.8,11.2-25,25-25s25,11.2,25,25" fill="none" stroke="#EF4444" strokeWidth="4"/>
      {/* Orange */}
      <path d="M11,48c0-11.6,9.4-21,21-21s21,9.4,21,21" fill="none" stroke="#F97316" strokeWidth="4"/>
      {/* Yellow */}
      <path d="M15,48c0-9.4,7.6-17,17-17s17,7.6,17,17" fill="none" stroke="#FBBF24" strokeWidth="4"/>
      {/* Green */}
      <path d="M19,48c0-7.2,5.8-13,13-13s13,5.8,13,13" fill="none" stroke="#4ADE80" strokeWidth="4"/>
      {/* Blue */}
      <path d="M23,48c0-5,4-9,9-9s9,4,9,9" fill="none" stroke="#3B82F6" strokeWidth="4"/>
      
      {/* Cloud Left */}
      <path d="M18,48c0,2.2-1.8,4-4,4H8c-2.2,0-4-1.8-4-4s1.8-4,4-4c0.5,0,1,0.1,1.5,0.3C10.6,42.3,12.6,41,15,41c2.4,0,4.5,1.5,5.3,3.6
        C21,45,21.5,46,21.5,47c0,1.7-1.3,3-3,3" fill="#FFFFFF"/>
      <path d="M18,48c0,2.2-1.8,4-4,4H8c-2.2,0-4-1.8-4-4s1.8-4,4-4c0.5,0,1,0.1,1.5,0.3C10.6,42.3,12.6,41,15,41c2.4,0,4.5,1.5,5.3,3.6
        C21,45,21.5,46,21.5,47c0,1.7-1.3,3-3,3" fill="none" stroke="#E5E7EB" strokeWidth="1.5"/>
        
      {/* Cloud Right */}
      <path d="M56,48c0,2.2-1.8,4-4,4h-6c-2.2,0-4-1.8-4-4s1.8-4,4-4c0.5,0,1,0.1,1.5,0.3c1.1-2,3.1-3.3,5.5-3.3c2.4,0,4.5,1.5,5.3,3.6
        c0.7,0.4,1.2,1.4,1.2,2.4c0,1.7-1.3,3-3,3" fill="#FFFFFF"/>
      <path d="M56,48c0,2.2-1.8,4-4,4h-6c-2.2,0-4-1.8-4-4s1.8-4,4-4c0.5,0,1,0.1,1.5,0.3c1.1-2,3.1-3.3,5.5-3.3c2.4,0,4.5,1.5,5.3,3.6
        c0.7,0.4,1.2,1.4,1.2,2.4c0,1.7-1.3,3-3,3" fill="none" stroke="#E5E7EB" strokeWidth="1.5"/>
    </svg>
  );
}
