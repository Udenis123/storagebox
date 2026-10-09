import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocsContent } from "@/features/docs/DocsContent";
import { DocsNav } from "@/features/docs/DocsNav";
import { SiteFooter, SiteHeader } from "@/features/marketing/SiteChrome";
import { useHashScroll } from "@/hooks/useHashScroll";
import { API_DOCS_URL } from "@/lib/constants";

export default function DocumentationPage() {
  useHashScroll();
  return (
    <div className="min-h-dvh bg-card text-foreground">
      <SiteHeader />
      <div className="border-b bg-background">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-14 sm:px-8">
          <p className="text-sm font-medium text-primary">Documentation</p>
          <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Build with StorageBox</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Upload, organise and deliver files from your own app. Start with the quick start, then come back to the parts you need.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button className="h-11 rounded-full px-6 text-base" render={<Link to="/register" />}>
              Get API keys
            </Button>
            <Button variant="outline" className="h-11 rounded-full px-5 text-base" render={<a href={API_DOCS_URL} target="_blank" rel="noreferrer" />}>
              API reference <ExternalLink />
            </Button>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <DocsNav className="sticky top-24" />
        </aside>
        <DocsContent />
      </div>
      <SiteFooter />
    </div>
  );
}
