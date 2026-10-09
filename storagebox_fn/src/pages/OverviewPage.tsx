import { Link } from "react-router-dom";
import { ArrowRight, Download, Folder, HardDrive, KeyRound, Upload } from "lucide-react";
import { CodeBlock } from "@/components/shared/CopyField";
import { PageHeader, SectionTitle } from "@/components/shared/PageHeader";
import { StatCard, UsageBar } from "@/components/shared/StatCard";
import { ErrorDisplay, PageSkeleton } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityChart, StorageByKindChart } from "@/features/developer/UsageCharts";
import { RecentFiles } from "@/features/files/RecentFiles";
import { useUsage } from "@/features/developer/hooks";
import { API_BASE_URL } from "@/lib/constants";
import { formatBytes, percentOf } from "@/lib/format";

export default function OverviewPage() {
  const { user } = useAuth();
  const { data: usage, isLoading, error } = useUsage();

  if (isLoading) return <PageSkeleton />;
  if (error || !usage) return <ErrorDisplay error={error} />;

  const storagePercent = percentOf(usage.storageBytes, usage.quotaBytes);
  const deliveries = usage.daily.reduce((sum, day) => sum + day.deliveries, 0);
  const curlSnippet = `curl -u API_KEY:API_SECRET \\
  -F "file=@invoice.pdf" -F "collection=invoices" \\
  ${API_BASE_URL}/v1/files`;

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.name.split(" ")[0] ?? "there"} 👋`}
        description={
          <>
            Your cloud name is <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{usage.cloudName}</code>
          </>
        }
        actions={
          <Button size="lg" className="h-11 px-4 text-base" render={<Link to="/library" />}>
            <Upload /> Upload files
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Storage used" value={formatBytes(usage.storageBytes)} icon={HardDrive} hint={`of ${formatBytes(usage.quotaBytes)}`}>
          <UsageBar percent={storagePercent} />
        </StatCard>
        <StatCard title="Files" value={usage.fileCount.toLocaleString()} icon={Upload} tone="emerald" hint={`in ${usage.collectionCount} collections`} />
        <StatCard title="Deliveries (30 days)" value={deliveries.toLocaleString()} icon={Download} tone="amber" hint="Link views and downloads" />
        <StatCard title="Active API keys" value={usage.activeApiKeyCount} icon={KeyRound} tone="slate" hint={<Link className="text-primary hover:underline" to="/keys">Manage keys</Link>} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityChart daily={usage.daily} />
        </div>
        <StorageByKindChart byKind={usage.byKind} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="grid content-start gap-3 rounded-xl border bg-card p-4 shadow-xs sm:p-6">
          <SectionTitle
            actions={
              <Button variant="ghost" render={<Link to="/library" />}>
                Open library <ArrowRight />
              </Button>
            }
          >
            Recent uploads
          </SectionTitle>
          <RecentFiles />
        </section>
        <section className="grid content-start gap-3 rounded-xl border bg-card p-4 shadow-xs sm:p-6">
          <SectionTitle
            actions={
              <Button variant="ghost" render={<Link to="/docs" />}>
                <Folder /> Full docs
              </Button>
            }
          >
            Upload from your code
          </SectionTitle>
          <p className="text-base text-muted-foreground">
            Create an API key, then upload with one request. The response contains the file's link.
          </p>
          <CodeBlock code={curlSnippet} />
        </section>
      </div>
    </>
  );
}
