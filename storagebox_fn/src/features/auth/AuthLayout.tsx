import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

const HIGHLIGHTS = [
  "Upload PDFs, Word documents, images and any file",
  "Permanent public links or private links that expire",
  "Organise everything in collections",
  "API keys, SDK and webhooks for your apps",
];

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-brand-darker p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-16 -left-16 size-64 rounded-full bg-white/5" />
        <Logo isLight className="relative" />
        <div className="relative grid gap-6">
          <h2 className="text-4xl leading-tight font-extrabold xl:text-5xl">
            Your files, delivered
            <br />
            anywhere by link or API.
          </h2>
          <ul className="grid gap-3 text-lg text-indigo-100">
            {HIGHLIGHTS.map((text) => (
              <li key={text} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-indigo-200" /> {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200">Powered by RustFS object storage.</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="grid w-full max-w-md gap-8">
          <Logo className="lg:hidden" />
          <div className="grid gap-2">
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{title}</h1>
            <p className="text-base text-muted-foreground md:text-lg">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
