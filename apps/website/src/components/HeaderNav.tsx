"use client";

import { useState } from "react";
import NotificationBell from "./NotificationBell";
import { useLanguage } from "./LanguageProvider";

type Props = {
  sessionUser: boolean;
  user: { role?: string | null; language?: string | null } | null;
};

export default function HeaderNav({ sessionUser, user }: Props) {
  const [open, setOpen] = useState(false);
  const { hindi } = useLanguage();

  const links = [
    { href: "/search", label: hindi ? "बस बुक करें" : "Book a Bus" },
    ...(sessionUser ? [{ href: "/support", label: hindi ? "सहायता" : "Help" }] : []),
    ...(user?.role === "ADMIN"
      ? [{ href: "/admin", label: hindi ? "डैशबोर्ड" : "Dashboard" }]
      : []),
    ...(sessionUser ? [{ href: "/settings", label: hindi ? "सेटिंग्स" : "Settings" }] : []),
    ...(!sessionUser ? [{ href: "/login", label: "Login" }] : []),
  ];

  return (
    <div className="relative flex items-center gap-2">
      {/* Desktop nav: always visible */}
      <nav className="hidden items-center gap-2 sm:flex">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/25 active:scale-95"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Notification Bell: visible on desktop, hidden on mobile when menu open */}
      <div className={open ? "hidden sm:block" : "block"}>
        {sessionUser && <NotificationBell hindi={hindi} />}
      </div>

      {/* Mobile: hamburger button + dropdown */}
      <div className="flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={hindi ? "मेनू खोलें" : "Open menu"}
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-white/20 bg-[#C84310] py-1 shadow-xl sm:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}