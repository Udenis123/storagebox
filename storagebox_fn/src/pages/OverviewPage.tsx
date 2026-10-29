import { Link } from "react-router-dom";
import { ArrowRight, Download, Folder, HardDrive, KeyRound, Upload } from "lucide-react";
import { CodeBlock } from "@/components/shared/CopyField";
import { PageHeader, SectionTitle } from "@/components/shared/PageHeader";
import { StatCard, UsageBar } from "@/components/shared/StatCard";
import { ErrorDisplay, PageSkeleton } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { RecentFiles } from "@/features/files/RecentFiles";
import { useUsage } from "@/features/developer/hooks";
import { useStorageUpgrade } from "@/features/storage/upgradeContext";
import { credentialsEnv } from "@/features/developer/credentials";
import { SDK_PACKAGE } from "@/lib/constants";
import { formatBytes, percentOf } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const ActivityChart = lazy(() => import("@/features/developer/UsageCharts").then((m) => ({ default: m.ActivityChart })));
const StorageByKindChart = lazy(() => import("@/features/developer/UsageCharts").then((m) => ({ default: m.StorageByKindChart })));

export default function OverviewPage() {
  const { user } = useAuth();
  const { data: usage, isLoading, error } = useUsage();
  const { openUpgrade } = useStorageUpgrade();

  if (isLoading) return <PageSkeleton />;
  if (error || !usage) return <ErrorDisplay error={error} />;

  const storagePercent = percentOf(usage.storageBytes, usage.quotaBytes);
  const deliveries = usage.daily.reduce((sum, day) => sum + day.deliveries, 0);
  const sdkSnippet = `npm install ${SDK_PACKAGE}

# .env
${credentialsEnv({ cloudName: usage.cloudName })}

// app.ts
import { StorageBox } from "${SDK_PACKAGE}";

const storagebox = new StorageBox();
const file = await storagebox.files.upload(invoice, { collection: "invoices" });
const { url } = await storagebox.files.signedUrl(file.publicId, { expiresIn: 3600 });
console.log(url);`;

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
        <StatCard
          title="Storage used"
          value={formatBytes(usage.storageBytes)}
          icon={HardDrive}
          hint={
            <span className="flex items-center justify-between gap-2">
              of {formatBytes(usage.quotaBytes)}
              <button type="button" onClick={openUpgrade} className="font-medium text-primary hover:underline">
                Upgrade
              </button>
            </span>
          }
        >
          <UsageBar percent={storagePercent} />
        </StatCard>
        <StatCard title="Files" value={usage.fileCount.toLocaleString()} icon={Upload} tone="emerald" hint={`in ${usage.collectionCount} collections`} />
        <StatCard title="Deliveries (30 days)" value={deliveries.toLocaleString()} icon={Download} tone="amber" hint="Link views and downloads" />
        <StatCard title="Active API keys" value={usage.activeApiKeyCount} icon={KeyRound} tone="slate" hint={<Link className="text-primary hover:underline" to="/keys">Manage keys</Link>} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Suspense fallback={<Skeleton className="h-72" />}>
            <ActivityChart daily={usage.daily} />
          </Suspense>
        </div>
        <Suspense fallback={<Skeleton className="h-72" />}>
          <StorageByKindChart byKind={usage.byKind} />
        </Suspense>
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
            Install the package, add your credentials from <Link to="/keys" className="text-primary hover:underline">API Keys</Link>, then upload in one line.
          </p>
          <CodeBlock code={sdkSnippet} />
        </section>
      </div>
    </>
  );
}
