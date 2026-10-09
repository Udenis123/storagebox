import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DocsContent } from "@/features/docs/DocsContent";
import { DocsNav } from "@/features/docs/DocsNav";
import { API_DOCS_URL } from "@/lib/constants";

export default function DocsPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        title="API Docs"
        description="Everything you need to store files and get links from your own apps. Examples use your cloud name."
        actions={
          <Button variant="outline" size="lg" className="h-11 text-base" render={<a href={API_DOCS_URL} target="_blank" rel="noreferrer" />}>
            Interactive reference <ExternalLink />
          </Button>
        }
      />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="min-w-0 rounded-xl border bg-card p-5 sm:p-8">
          <DocsContent cloudName={user?.account.cloudName} />
        </div>
        <aside className="hidden xl:block">
          <DocsNav className="sticky top-6" />
        </aside>
      </div>
    </>
  );
}
