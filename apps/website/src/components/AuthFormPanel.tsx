"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { safeReturnTo } from "@/lib/safeReturnTo";
import { Logo } from "@/components/Logo";

type AuthMode = "login" | "register";

interface AuthFormPanelProps {
  initialMode: AuthMode;
  initialError?: string;
  returnTo?: string;
}

type ApiResponse = { error?: string };

const inputClassName =
  "mt-1 block min-h-11 w-full rounded-lg border border-[#DEDCD6] bg-white px-3 py-2.5 text-sm text-gray-950 outline-none placeholder:text-gray-400 focus:border-[#C96F54] focus:ring-2 focus:ring-[#C96F54]/15";

async function postJson(path: string, body: Record<string, string>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Something went wrong. Please try again.");
  }
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function AuthFormPanel({ initialMode, initialError, returnTo }: AuthFormPanelProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError || "");
  const [busy, setBusy] = useState(false);
  const destination = safeReturnTo(returnTo);

  const selectMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: AuthMode) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextMode = event.key === "Home" ? "login" : event.key === "End" ? "register" : current === "login" ? "register" : "login";
    selectMode(nextMode);
    document.getElementById(`${nextMode}-tab`)?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>, formMode: AuthMode) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (formMode === "register") {
        await postJson("/api/register", {
          name: name.trim(),
          email: normalizedEmail,
          password,
          ...(phone.trim() ? { phone: phone.replace(/[^\d+]/g, "") } : {}),
        });
      }

      // The JSON login route sets the same httpOnly session cookie used by web pages.
      await postJson("/api/login", { email: normalizedEmail, password });
      window.location.assign(destination);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const googleHref = `/api/auth/login?method=google&returnTo=${encodeURIComponent(destination)}`;

  return (
    <section className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-[#F7F7F3] px-4 py-8 font-sans text-gray-900 sm:px-6">
      <div className="w-full max-w-md">
        <header className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-10 w-10 text-[#A65343]" />
          <p className="mt-2 text-lg font-bold tracking-tight text-[#A65343]">Rajveer Travels</p>
        </header>

        <div className="rounded-xl border border-[#E7E5DF] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-950">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-1.5 text-sm text-gray-500">{mode === "login" ? "Log in to your Rajveer Travels account" : "Join Rajveer Travels today"}</p>
          </div>

          <div role="tablist" aria-label="Account access" className="mb-5 grid grid-cols-2 rounded-lg bg-[#F7F7F3] p-1">
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                id={`${tab}-tab`}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                tabIndex={mode === tab ? 0 : -1}
                aria-controls={`${tab}-panel`}
                onClick={() => selectMode(tab)}
                onKeyDown={(event) => handleTabKeyDown(event, tab)}
                className={`min-h-9 rounded-md px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C96F54] focus-visible:ring-offset-2 ${mode === tab ? "bg-white text-[#A65343] shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                {tab === "login" ? "Log in" : "Register"}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" aria-live="polite" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <section id="login-panel" role="tabpanel" aria-labelledby="login-tab" aria-hidden={mode !== "login"} className={mode === "login" ? "block" : "hidden"}>
              <form onSubmit={(event) => void submit(event, "login")} className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Email
                  <input className={inputClassName} type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                  <input className={inputClassName} type="password" name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
                </label>
                <button type="submit" disabled={busy} className="min-h-11 w-full rounded-lg bg-[#C96F54] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#B85F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C96F54] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
                  {busy ? "Logging in…" : "Log in"}
                </button>
              </form>
            </section>

            <section id="register-panel" role="tabpanel" aria-labelledby="register-tab" aria-hidden={mode !== "register"} className={mode === "register" ? "block" : "hidden"}>
              <form onSubmit={(event) => void submit(event, "register")} className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Full name
                  <input className={inputClassName} type="text" name="name" autoComplete="name" autoCapitalize="words" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Email
                  <input className={inputClassName} type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                  <input className={inputClassName} type="password" name="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Phone <span className="font-normal text-gray-500">(optional)</span>
                  <input className={inputClassName} type="tel" name="phone" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" />
                </label>
                <button type="submit" disabled={busy} className="min-h-11 w-full rounded-lg bg-[#C96F54] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#B85F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C96F54] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
                  {busy ? "Creating account…" : "Register"}
                </button>
              </form>
            </section>
          </div>

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[#E7E5DF]" />
            <span className="whitespace-nowrap text-xs text-gray-500">{mode === "login" ? "Or continue with" : "Or sign up with"}</span>
            <div className="h-px flex-1 bg-[#E7E5DF]" />
          </div>

          <a href={googleHref} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#DEDCD6] bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors duration-150 hover:bg-[#FAF9F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C96F54] focus-visible:ring-offset-2">
            <GoogleIcon />
            Continue with Google
          </a>

          <p className="mt-5 min-h-5 text-center text-sm text-gray-500">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => selectMode(mode === "login" ? "register" : "login")} className="font-semibold text-[#A65343] transition-colors hover:text-[#8F4437]">
              {mode === "login" ? "Register" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
