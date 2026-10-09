import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Eye,
  FolderTree,
  Gauge,
  ImageIcon,
  KeyRound,
  Link2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { CodeBlock } from "@/components/shared/CopyField";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { MarketingBackdrop } from "@/features/auth/AuthLayout";
import { ProductPreview } from "@/features/marketing/ProductPreview";
import { API_DOCS_URL, SDK_PACKAGE } from "@/lib/constants";
import { homePathFor } from "@/lib/session";

type Feature = { icon: LucideIcon; title: string; text: string };

const FEATURES: Feature[] = [
  { icon: FolderTree, title: "Collections", text: "Organise PDFs, Word files, images and video in nested folders like invoices/2026." },
  { icon: Link2, title: "Public & signed links", text: "A permanent link for public files, expiring signed links for private ones." },
  { icon: ImageIcon, title: "On-the-fly images", text: "Resize, crop and convert to WebP or AVIF just by changing the URL." },
  { icon: Eye, title: "Instant previews", text: "Open PDFs, Word documents, images, audio and video right in the browser." },
  { icon: KeyRound, title: "API keys & SDK", text: "Cloud name, API key and secret — upload from any backend in one call." },
  { icon: Webhook, title: "Webhooks & usage", text: "Get notified on every upload and follow storage and bandwidth per day." },
];

const STEPS: Feature[] = [
  { icon: UserCheck, title: "Request an account", text: "Sign up in a minute. An administrator reviews every new account." },
  { icon: Gauge, title: "Get approved", text: "Your storage space is set for you and your cloud name is ready." },
  { icon: KeyRound, title: "Create credentials", text: "Generate an API key and secret, then drop them in your .env file." },
  { icon: Sparkles, title: "Upload & share", text: "Upload from the dashboard or your code and share links instantly." },
];

const SDK_SNIPPET = `npm install ${SDK_PACKAGE}

# .env
STORAGEBOX_CLOUD_NAME=acme
STORAGEBOX_API_KEY=482917365028174
STORAGEBOX_API_SECRET=••••••••••••••••••••••••••`;

const CODE_SNIPPET = `import { StorageBox } from "${SDK_PACKAGE}";

// Reads STORAGEBOX_* from the environment
const storagebox = new StorageBox();

const file = await storagebox.files.upload(pdf, {
  collection: "invoices/2026",
});
console.log(file.url);
// → https://storagebox.urbinaryhub.com/f/acme/invoice.pdf

// Private files: a link that expires in 1 hour
const { url } = await storagebox.files.signedUrl(file.publicId, {
  expiresIn: 3600,
});`;

const DARK_CODE_CLASS = "[&_pre]:bg-slate-900 [&_pre]:ring-1 [&_pre]:ring-white/10";

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto grid max-w-2xl gap-3 text-center">
      <p className="text-sm font-semibold tracking-wider text-indigo-600 uppercase">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      <p className="text-lg text-slate-600">{text}</p>
    </div>
  );
}

function SiteHeader() {
  const { isAuthenticated, user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" aria-label="StorageBox home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
          <a href="#developers" className="hover:text-slate-900">Developers</a>
        </nav>
        {isAuthenticated ? (
          <Button size="lg" render={<Link to={homePathFor(user)} />}>
            Open dashboard <ArrowRight />
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="lg" className="hidden sm:inline-flex" render={<Link to="/login" />}>
              Sign in
            </Button>
            <Button size="lg" render={<Link to="/register" />}>
              Get started
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

export default function HomePage() {
  return (
    <div className="relative isolate min-h-dvh bg-slate-50 text-slate-900">
      <SiteHeader />

      <section className="relative isolate overflow-hidden">
        <MarketingBackdrop />
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-5 pt-16 pb-24 sm:px-8 lg:grid-cols-2 lg:pt-24">
          <div className="grid gap-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-100">
              <ShieldCheck className="size-4" /> Secure file storage by Binary Hub
            </span>
            <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              Store files.
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">Share them anywhere.</span>
            </h1>
            <p className="max-w-xl text-lg text-slate-600 sm:text-xl">
              StorageBox keeps your documents, images and videos in one place and gives every file a fast link — public or
              private and expiring. Built for teams and for developers.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-12 px-6 text-base shadow-lg shadow-indigo-600/25" render={<Link to="/register" />}>
                Request an account <ArrowRight />
              </Button>
              <Button variant="outline" size="lg" className="h-12 bg-white px-6 text-base" render={<a href="#developers" />}>
                <BookOpen /> For developers
              </Button>
            </div>
            <dl className="grid max-w-lg grid-cols-3 gap-6 pt-2">
              {[
                ["100 MB", "per file"],
                ["7 days", "max signed link"],
                ["WebP · AVIF", "image formats"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-xl font-bold text-slate-900">{value}</dt>
                  <dd className="text-sm text-slate-500">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ProductPreview className="lg:ml-8" />
        </div>
      </section>

      <section id="features" className="scroll-mt-20 bg-white py-24">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8">
          <SectionHeading
            eyebrow="Features"
            title="Everything files need"
            text="Upload once, then organise, preview, transform and share — from the dashboard or from your code."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="group grid gap-3 rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5">
                <span className="grid size-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <Icon className="size-6" />
                </span>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-base text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 py-24">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8">
          <SectionHeading eyebrow="How it works" title="From sign-up to first link" text="Every account is reviewed, so your storage stays private and under control." />
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="relative grid gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <span className="absolute top-5 right-5 text-5xl font-black text-slate-100">{index + 1}</span>
                <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-base text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="developers" className="scroll-mt-20 bg-slate-950 py-24 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="grid gap-6">
            <p className="text-sm font-semibold tracking-wider text-indigo-300 uppercase">Developers</p>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Three credentials. One line to upload.</h2>
            <p className="text-lg text-slate-300">
              Like Cloudinary: your cloud name, API key and API secret go in your environment, and the{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-base">{SDK_PACKAGE}</code> package does the rest. Prefer
              plain HTTP? Every feature is a REST call.
            </p>
            <CodeBlock code={SDK_SNIPPET} className={DARK_CODE_CLASS} />
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-12 px-6 text-base" render={<Link to="/register" />}>
                Get your API keys <ArrowRight />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 border-white/20 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
                render={<a href={API_DOCS_URL} target="_blank" rel="noreferrer" />}
              >
                API reference
              </Button>
            </div>
          </div>
          <CodeBlock code={CODE_SNIPPET} className={DARK_CODE_CLASS} />
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="relative isolate grid gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 px-8 py-14 text-center text-white shadow-2xl shadow-indigo-900/20 sm:px-16">
            <div aria-hidden className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-white/10 blur-2xl" />
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to store your first file?</h2>
            <p className="mx-auto max-w-xl text-lg text-indigo-100">Request an account today. Once approved, you can upload and share in minutes.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" className="h-12 bg-white px-6 text-base text-indigo-700 hover:bg-indigo-50" render={<Link to="/register" />}>
                Request an account
              </Button>
              <Button variant="ghost" size="lg" className="h-12 px-6 text-base text-white hover:bg-white/10 hover:text-white" render={<Link to="/login" />}>
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} Binary Hub · storagebox.urbinaryhub.com</p>
        </div>
      </footer>
    </div>
  );
}
