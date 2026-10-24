"use client";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="8" fill="currentColor" />
      <path
        d="M10 22L16 16L26 26"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14L16 8L26 18"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoWithText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo />
      <span className="text-xl font-bold text-brand-700">Rajveer Travels</span>
    </div>
  );
}