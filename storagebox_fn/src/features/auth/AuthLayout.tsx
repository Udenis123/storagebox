import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { FileWall } from "./FileWall";

type AuthLayoutProps = { title: string; subtitle: ReactNode; children: ReactNode };

const PROOF_POINTS = [
  { value: "100 MB", label: "per file" },
  { value: "7 days", label: "signed links" },
  { value: "WebP · AVIF", label: "on the fly" },
];

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh bg-card lg:h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:overflow-hidden">
      <div className="flex flex-col px-6 py-5 sm:px-12 lg:overflow-y-auto">
        <Link to="/" aria-label="StorageBox home" className="w-fit">
          <Logo className="[&_img]:size-8 [&>span]:text-lg" />
        </Link>

        <main className="mx-auto grid w-full max-w-[27rem] flex-1 content-center gap-6 py-4">
          <div className="grid gap-2">
            <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[2.25rem]">{title}</h1>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-[1.05rem]">{subtitle}</p>
          </div>
          {children}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Binary Hub</span>
          <nav className="flex gap-5">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <Link to="/documentation" className="hover:text-foreground">
              Docs
            </Link>
          </nav>
        </footer>
      </div>

      <aside className="relative isolate hidden overflow-hidden bg-slate-950 lg:block">
        <FileWall />
        <div className="relative flex h-full flex-col justify-end gap-8 p-12 text-white xl:p-16">
          <blockquote className="grid max-w-md gap-4">
            <p className="text-3xl leading-[1.15] font-semibold tracking-[-0.03em] text-balance xl:text-4xl">
              Store it once.
              <br />
              <span className="text-slate-400">Share it anywhere.</span>
            </p>
            <p className="text-base leading-relaxed text-slate-400">
              Documents, images and video for your team and your apps — with public, private and expiring links.
            </p>
          </blockquote>
          <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6">
            {PROOF_POINTS.map((point) => (
              <div key={point.label} className="grid gap-0.5">
                <dt className="order-2 text-sm text-slate-500">{point.label}</dt>
                <dd className="text-lg font-semibold">{point.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
