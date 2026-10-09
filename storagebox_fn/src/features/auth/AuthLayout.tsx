import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { ProductPreview } from "@/features/marketing/ProductPreview";

type AuthLayoutProps = { title: string; subtitle: ReactNode; children: ReactNode };

export function MarketingBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#c7d2fe_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] opacity-60" />
      <div className="absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-400/25 blur-3xl" />
      <div className="absolute top-1/3 -right-40 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" />
    </div>
  );
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-slate-50">
      <MarketingBackdrop />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" aria-label="StorageBox home">
          <Logo />
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="size-4" /> Back to home
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 pb-12 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <section className="hidden lg:grid lg:gap-10">
          <div className="grid gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-100">
              <ShieldCheck className="size-4" /> Files, links and APIs in one place
            </span>
            <h2 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-slate-900 xl:text-5xl">
              Store every file.
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">Share it with one link.</span>
            </h2>
            <p className="max-w-md text-lg text-slate-600">
              Documents, images and video for your apps and your team — organised in collections and delivered fast.
            </p>
          </div>
          <ProductPreview className="max-w-lg" />
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="grid gap-7 rounded-3xl bg-white/90 p-7 shadow-xl ring-1 shadow-slate-900/5 ring-slate-200/70 backdrop-blur sm:p-10">
            <div className="grid gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
              <p className="text-base text-slate-600">{subtitle}</p>
            </div>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
