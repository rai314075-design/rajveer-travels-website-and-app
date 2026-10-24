import type { Metadata } from "next";
import { getCustomSession } from "@/lib/session";
import HeaderNav from "@/components/HeaderNav";
import LanguageProvider from "@/components/LanguageProvider";
import QueryClientProvider from "./QueryClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rajveer Travels",
  description: "Book bus tickets across India with Rajveer Travels",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getCustomSession();
  const user = sessionUser;

  return (
    <html lang="en">
      <body>
        <LanguageProvider initialLanguage={(user?.language as "ENGLISH" | "HINDI") || "ENGLISH"}>
          <header className="bg-[#C84310] text-white">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-7 sm:px-6">
              <a href="/" className="text-xl font-bold tracking-tight">
                Rajveer Travels
              </a>
              <HeaderNav sessionUser={!!sessionUser} user={user} />
            </div>
          </header>

          <QueryClientProvider>
            <main>{children}</main>
          </QueryClientProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
