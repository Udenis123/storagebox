import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Plus } from "lucide-react";
import { CodeBlock } from "@/components/shared/CopyField";
import { Button } from "@/components/ui/button";
import { buildSnippets, SNIPPET_LANGUAGES, type SnippetLanguage } from "@/features/developer/snippets";
import { LibraryMock, SignedLinkMock, TransformMock, UploadMock } from "@/features/marketing/mocks";
import { SiteFooter, SiteHeader } from "@/features/marketing/SiteChrome";
import { useHashScroll } from "@/hooks/useHashScroll";
import { API_BASE_URL, MAX_FILES_PER_UPLOAD, MAX_UPLOAD_LABEL, SDK_PACKAGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DISPLAY = "font-semibold tracking-[-0.035em] text-balance";

const FACTS = [
  { value: MAX_UPLOAD_LABEL, label: "per file" },
  { value: String(MAX_FILES_PER_UPLOAD), label: "files per upload" },
  { value: "7 days", label: "longest signed link" },
  { value: "WebP · AVIF", label: "images on the fly" },
];

type Story = { id: string; eyebrow: string; title: string; text: string; points: string[]; visual: ReactNode };

const STORIES: Story[] = [
  {
    id: "library",
    eyebrow: "Media library",
    title: "Drop files in. Find them again in seconds.",
    text: "Invoices, contracts, photos and videos live in collections you name yourself — the same way you already sort folders.",
    points: ["Nested collections like invoices/2026", "PDF, Word, video and images open right in the browser", "Search by name, tag or public ID"],
    visual: <UploadMock />,
  },
  {
    id: "images",
    eyebrow: "Images",
    title: "Change the link, get a new image.",
    text: "Add a few letters to any image link to resize, crop or convert it. Each version is made once, then served from cache.",
    points: ["Width, height, crop, quality and format", "WebP and AVIF for lighter pages", "Works on private files through signed links"],
    visual: <TransformMock />,
  },
  {
    id: "access",
    eyebrow: "Access",
    title: "Public when you want it. Private when you don't.",
    text: "Public files get a permanent link. Private files can only be opened through a signed link that stops working when you say so.",
    points: ["Signed links from 5 minutes to 7 days", "Switch a file between public and private anytime", "Every view and download counted in your usage"],
    visual: <SignedLinkMock />,
  },
];

const STEPS = [
  { title: "Request an account", text: "Tell us who you are. A person on our team approves it and sets your storage." },
  { title: "Create an API key", text: "Copy your cloud name, key and secret into your .env — the same idea as Cloudinary." },
  { title: "Upload from your code", text: `npm install ${SDK_PACKAGE}, call upload(), and save the link you get back.` },
];

const FAQ = [
  {
    question: "What can I store?",
    answer: `Documents (PDF, Word, Excel, PowerPoint, text, CSV), images, audio, video and zip archives — up to ${MAX_UPLOAD_LABEL} per file.`,
  },
  {
    question: "Why does an administrator approve accounts?",
    answer: "Storage is a shared resource, so we look at every request. It keeps the service fast and stops spam accounts. You can sign in as soon as yours is approved.",
  },
  {
    question: "What happens when my storage is full?",
    answer: "You see a warning at 80%. Ask for more space from the dashboard in one click — the administrator raises your limit, and your files stay where they are.",
  },
  {
    question: "Do I have to use the SDK?",
    answer: "No. The SDK is a thin wrapper around a REST API. Anything that can send an HTTP request — cURL, Python, PHP, Go — can upload and fetch files.",
  },
  {
    question: "How is it different from Cloudinary?",
    answer: "The ideas are the same — cloud name, API key and secret, transformations in the URL — but StorageBox treats documents as first-class files and is run locally by Binary Hub.",
  },
];

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm font-medium text-primary", className)}>{children}</p>;
}

function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-4xl justify-items-center gap-7 px-5 pt-20 pb-14 text-center sm:px-8 lg:pt-28">
        <Link
          to="/documentation#quick-start"
          className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="font-mono text-xs text-foreground">npm install {SDK_PACKAGE}</span>
          <span className="h-3.5 w-px bg-border" />
          Quick start <ArrowRight className="size-3.5" />
        </Link>
        <h1 className={cn(DISPLAY, "text-5xl leading-[1.02] sm:text-7xl")}>
          Every file,
          <br />
          one link away.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          StorageBox keeps documents, images and video for your team and your apps — sorted into collections, previewed in the
          browser and shared through public or expiring links.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Button className="h-12 rounded-full px-7 text-base" render={<Link to="/register" />}>
            Request an account <ArrowRight />
          </Button>
          <Button variant="ghost" className="h-12 rounded-full px-5 text-base" render={<Link to="/documentation" />}>
            Read the documentation
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Accounts reviewed by a person · Built by Binary Hub in Kigali</p>
      </div>

      <dl className="mx-auto grid max-w-4xl grid-cols-2 border-y px-5 sm:px-8 md:grid-cols-4">
        {FACTS.map((fact, index) => (
          <div key={fact.label} className={cn("grid gap-1 py-6 text-center", index % 2 === 1 && "border-l", index >= 2 && "border-t md:border-t-0", index === 2 && "md:border-l")}>
            <dt className="order-2 text-sm text-muted-foreground">{fact.label}</dt>
            <dd className="text-2xl font-semibold tracking-tight">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div id="product" className="mx-auto max-w-5xl scroll-mt-24 px-5 pt-16 pb-24 sm:px-8">
        <LibraryMock />
      </div>
    </section>
  );
}

function StoryRow({ story, isReversed }: { story: Story; isReversed: boolean }) {
  return (
    <article id={story.id} className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 lg:gap-20">
      <div className={cn("grid gap-5", isReversed && "lg:order-2")}>
        <Eyebrow>{story.eyebrow}</Eyebrow>
        <h2 className={cn(DISPLAY, "text-3xl leading-tight sm:text-4xl")}>{story.title}</h2>
        <p className="text-lg leading-relaxed text-muted-foreground">{story.text}</p>
        <ul className="grid gap-3 pt-1">
          {story.points.map((point) => (
            <li key={point} className="flex gap-3 text-base">
              <Check className="mt-1 size-4 shrink-0 text-primary" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0">{story.visual}</div>
    </article>
  );
}

function Developers() {
  const [language, setLanguage] = useState<SnippetLanguage>("sdk");
  const snippets = useMemo(() => buildSnippets(API_BASE_URL), []);

  return (
    <section id="developers" className="scroll-mt-16 bg-slate-950 py-24 text-white">
      <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="grid content-start gap-5">
          <Eyebrow className="text-indigo-300">Developers</Eyebrow>
          <h2 className={cn(DISPLAY, "text-3xl leading-tight sm:text-4xl")}>Live in minutes. Three steps to your first upload.</h2>
          <p className="text-lg leading-relaxed text-slate-400">
            One package for Node and the browser, plain REST for everything else. Webhooks tell your backend when files arrive.
          </p>
          <ol className="mt-4 grid gap-7">
            {STEPS.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4">
                <span className="grid size-8 place-items-center rounded-full border border-white/15 font-mono text-sm text-slate-300">{index + 1}</span>
                <div className="grid gap-1">
                  <p className="font-medium">{step.title}</p>
                  <p className="text-slate-400">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button className="h-11 rounded-full px-6 text-base" render={<Link to="/register" />}>
              Get your API keys
            </Button>
            <Button
              variant="ghost"
              className="h-11 rounded-full px-5 text-base text-white hover:bg-white/10 hover:text-white"
              render={<Link to="/documentation" />}
            >
              Documentation <ArrowRight />
            </Button>
          </div>
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10 lg:sticky lg:top-24">
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 pt-2">
            {SNIPPET_LANGUAGES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                className={cn(
                  "shrink-0 rounded-t-md px-3.5 py-2 text-sm transition-colors",
                  language === option.value ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <CodeBlock code={snippets.upload[language]} className="[&_pre]:rounded-none [&_pre]:bg-slate-800/60 [&_pre]:p-5" />
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="mx-auto grid max-w-6xl scroll-mt-24 gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
      <div className="grid content-start gap-4">
        <Eyebrow>Questions</Eyebrow>
        <h2 className={cn(DISPLAY, "text-3xl leading-tight sm:text-4xl")}>Things people ask before signing up.</h2>
        <p className="text-lg text-muted-foreground">
          Something else? Read the{" "}
          <Link to="/documentation" className="text-foreground underline underline-offset-4 hover:text-primary">
            documentation
          </Link>
          .
        </p>
      </div>
      <div className="divide-y border-y">
        {FAQ.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
            </summary>
            <p className="pt-3 pr-8 text-base leading-relaxed text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  useHashScroll();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <section className="border-t bg-card py-24">
          <div className="mx-auto grid max-w-6xl gap-28 px-5 sm:px-8">
            {STORIES.map((story, index) => (
              <StoryRow key={story.id} story={story} isReversed={index % 2 === 1} />
            ))}
          </div>
        </section>
        <Developers />
        <Faq />
        <section className="border-t bg-card">
          <div className="mx-auto grid max-w-3xl justify-items-center gap-6 px-5 py-24 text-center sm:px-8">
            <h2 className={cn(DISPLAY, "text-4xl leading-tight sm:text-5xl")}>Store your first file today.</h2>
            <p className="max-w-xl text-lg text-muted-foreground">Send a request now — once you're approved you can upload, share and connect your app in a few minutes.</p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button className="h-12 rounded-full px-7 text-base" render={<Link to="/register" />}>
                Request an account <ArrowRight />
              </Button>
              <Button variant="ghost" className="h-12 rounded-full px-5 text-base" render={<Link to="/login" />}>
                I already have one
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
