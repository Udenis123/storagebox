import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

const PROFILE = {
  name: "Denis Uwihirwe",
  role: "Software & DevOps Engineer",
  photo: "/team/denis-uwihirwe.webp",
  summary:
    "Computer and Software Engineering graduate from the University of Rwanda with 3+ years keeping production systems online — hosting, deployment, monitoring and incident response. I designed and built StorageBox end to end: the API, the dashboard, the SDK and the infrastructure it runs on.",
};

const LINKS = [
  { label: "GitHub", value: "github.com/Udenis123", href: "https://github.com/Udenis123" },
  { label: "LinkedIn", value: "linkedin.com/in/denis-uwihirwe", href: "https://linkedin.com/in/denis-uwihirwe" },
];

const EMAIL = "denisuwihirwe@gmail.com";

const EXPERIENCE = [
  { period: "2025 — 2026", title: "Software Developer & DevOps Engineer", place: "STES Group", note: "Led MuTicket, an event ticketing platform in production in South Africa." },
  { period: "2023 — 2025", title: "Server Administrator & DevOps Engineer", place: "UR Binary Hub", note: "Owned hosting and uptime for every Hub platform." },
  { period: "2022 — 2026", title: "BSc Computer & Software Engineering", place: "University of Rwanda", note: "Networks, operating systems and distributed systems." },
];

const BUILT_WITH = ["Express", "Prisma", "PostgreSQL", "RustFS (S3)", "Valkey", "React", "Tailwind", "TypeScript SDK", "Docker"];

/** Unlisted credits page — reachable only by its URL. */
export default function DeveloperPage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-slate-950 text-white">
      <title>Denis Uwihirwe — StorageBox</title>
      <meta name="robots" content="noindex, nofollow" />
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(79_70_229/0.35),transparent)]" />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link to="/" aria-label="StorageBox home">
          <Logo isLight className="[&_img]:size-8 [&>span]:text-lg" />
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" /> Back to StorageBox
        </Link>
      </header>

      <main className="mx-auto grid max-w-5xl gap-16 px-6 pt-10 pb-24">
        <section className="grid items-center gap-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-14">
          <div className="relative mx-auto size-56 sm:size-64">
            <div aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 opacity-60 blur-2xl" />
            <img
              src={PROFILE.photo}
              alt={PROFILE.name}
              className="relative size-full rounded-full bg-gradient-to-b from-slate-700 to-slate-900 object-cover object-top ring-1 ring-white/15"
            />
          </div>
          <div className="grid gap-5 text-center md:text-left">
            <p className="text-sm font-medium tracking-wide text-indigo-300">The developer behind StorageBox</p>
            <h1 className="text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">{PROFILE.name}</h1>
            <p className="text-xl text-slate-300">{PROFILE.role}</p>
            <p className="max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">{PROFILE.summary}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2 md:justify-start">
              <a href={`mailto:${EMAIL}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 font-medium text-slate-950 transition hover:bg-slate-200">
                <Mail className="size-4" /> Get in touch
              </a>
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-slate-200 ring-1 ring-white/15 transition hover:bg-white/10"
                >
                  {link.label} <ArrowUpRight className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-10 border-t border-white/10 pt-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
          <div className="grid content-start gap-6">
            <h2 className="text-sm font-semibold tracking-wider text-slate-500 uppercase">Experience</h2>
            <ol className="grid gap-7">
              {EXPERIENCE.map((item) => (
                <li key={item.title} className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6">
                  <span className="font-mono text-sm text-slate-500">{item.period}</span>
                  <div className="grid gap-1">
                    <p className="font-medium">
                      {item.title} <span className="text-slate-400">· {item.place}</span>
                    </p>
                    <p className="text-slate-400">{item.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid content-start gap-6">
            <h2 className="text-sm font-semibold tracking-wider text-slate-500 uppercase">StorageBox is built with</h2>
            <ul className="flex flex-wrap gap-2">
              {BUILT_WITH.map((tool) => (
                <li key={tool} className="rounded-full bg-white/5 px-3.5 py-1.5 text-sm text-slate-300 ring-1 ring-white/10">
                  {tool}
                </li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed text-slate-500">Designed, built and deployed in Kigali for Binary Hub.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
