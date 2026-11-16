interface ZenLogoProps {
  className?: string;
}

export function ZenLogo({ className = 'w-7 h-7' }: ZenLogoProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="zenGrad" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="55%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="15.5" stroke="url(#zenGrad)" strokeWidth="1.75" opacity="0.9" />
      <circle cx="18" cy="18" r="10.5" stroke="url(#zenGrad)" strokeWidth="1.5" opacity="0.6" />
      <path
        d="M18 9.5C20.5 13 20.5 16.5 18 19.5C15.5 16.5 15.5 13 18 9.5Z"
        fill="url(#zenGrad)"
        opacity="0.92"
      />
      <path
        d="M11.5 21.5C14.5 20 16.8 21.2 18 24C19.2 21.2 21.5 20 24.5 21.5C22.2 24.8 19.8 26.5 18 26.5C16.2 26.5 13.8 24.8 11.5 21.5Z"
        fill="url(#zenGrad)"
        opacity="0.72"
      />
    </svg>
  );
}
