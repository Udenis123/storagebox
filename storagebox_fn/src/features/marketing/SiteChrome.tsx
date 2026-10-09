import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API_DOCS_URL, SDK_PACKAGE } from "@/lib/constants";
import { homePathFor } from "@/lib/session";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };

const NAV_LINKS: NavLink[] = [
  { label: "Product", href: "/#product" },
  { label: "Developers", href: "/#developers" },
  { label: "Documentation", href: "/documentation" },
  { label: "FAQ", href: "/#faq" },
];

const FOOTER_COLUMNS: { title: string; links: (NavLink & { isExternal?: boolean })[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Media library", href: "/#product" },
      { label: "Image transformations", href: "/#images" },
      { label: "Signed links", href: "/#access" },
      { label: "Questions", href: "/#faq" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/documentation" },
      { label: "Quick start", href: "/documentation#quick-start" },
      { label: "API reference", href: API_DOCS_URL, isExternal: true },
      { label: `npm · ${SDK_PACKAGE}`, href: `https://www.npmjs.com/package/${SDK_PACKAGE}`, isExternal: true },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Request an account", href: "/register" },
    ],
  },
];

function NavAnchor({ link, className, onClick }: { link: NavLink & { isExternal?: boolean }; className?: string; onClick?: () => void }) {
  if (link.isExternal) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={className}>
        {link.label}
      </a>
    );
  }
  return (
    <Link to={link.href} className={className} onClick={onClick}>
      {link.label}
    </Link>
  );
}

export function SiteHeader() {
  const { isAuthenticated, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link to="/" aria-label="StorageBox home" className="shrink-0">
          <Logo className="[&_img]:size-8 [&>span]:text-lg" />
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-8 text-[0.94rem] text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <NavAnchor key={link.href} link={link} className="transition-colors hover:text-foreground" />
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {isAuthenticated ? (
            <Button className="h-10 rounded-full px-5" render={<Link to={homePathFor(user)} />}>
              Dashboard <ArrowRight />
            </Button>
          ) : (
            <>
              <Button variant="ghost" className="hidden h-10 rounded-full px-4 sm:inline-flex" render={<Link to="/login" />}>
                Sign in
              </Button>
              <Button className="h-10 rounded-full px-5" render={<Link to="/register" />}>
                Get started
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" onClick={() => setIsMenuOpen((open) => !open)}>
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      <nav className={cn("grid gap-1 border-t px-5 py-3 md:hidden", !isMenuOpen && "hidden")}>
        {NAV_LINKS.map((link) => (
          <NavAnchor key={link.href} link={link} onClick={() => setIsMenuOpen(false)} className="rounded-md px-2 py-2.5 text-base hover:bg-muted" />
        ))}
        {!isAuthenticated && <NavAnchor link={{ label: "Sign in", href: "/login" }} className="rounded-md px-2 py-2.5 text-base hover:bg-muted" />}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="grid content-start gap-3">
          <Logo className="[&_img]:size-8 [&>span]:text-lg" />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            File storage with links and an API, built and run by Binary Hub in Kigali.
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className="grid content-start gap-3">
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="grid gap-2.5 text-sm text-muted-foreground">
              {column.links.map((link) => (
                <li key={link.label}>
                  <NavAnchor link={link} className="transition-colors hover:text-foreground" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-5 py-6 text-sm text-muted-foreground sm:px-8">© {new Date().getFullYear()} Binary Hub. All rights reserved.</p>
      </div>
    </footer>
  );
}
