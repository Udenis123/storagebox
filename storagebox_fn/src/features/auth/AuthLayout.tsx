import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { LibraryMock } from "@/features/marketing/mocks";

type AuthLayoutProps = { title: string; subtitle: ReactNode; children: ReactNode };

const HIGHLIGHTS = ["Collections for every project", "Public, private and expiring links", "API keys for your own apps"];

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh bg-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="StorageBox home">
            <Logo className="[&_img]:size-8 [&>span]:text-lg" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </header>

        <main className="mx-auto grid w-full max-w-sm flex-1 content-center gap-8 py-12">
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
            <p className="text-base leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </main>

        <footer className="text-sm text-muted-foreground">© {new Date().getFullYear()} Binary Hub</footer>
      </div>

      <aside className="relative hidden overflow-hidden border-l bg-muted/50 lg:flex lg:flex-col lg:justify-center lg:gap-10 lg:p-14 xl:p-20">
        <div className="grid max-w-lg gap-4">
          <p className="text-2xl leading-snug font-semibold tracking-[-0.02em] text-balance xl:text-3xl">
            Your documents, images and videos — sorted, previewed and one link away.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {HIGHLIGHTS.map((highlight) => (
              <li key={highlight} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
        <LibraryMock className="w-[125%] max-w-none" />
      </aside>
    </div>
  );
}
