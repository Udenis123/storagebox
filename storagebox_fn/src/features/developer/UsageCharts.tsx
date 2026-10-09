import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/States";
import { formatBytes } from "@/lib/format";
import { KIND_META } from "@/lib/files";
import type { UsageSummary } from "@/lib/types";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const CARD = "grid gap-4 rounded-xl border bg-card p-4 shadow-xs sm:p-6";

export function ActivityChart({ daily }: { daily: UsageSummary["daily"] }) {
  const data = daily.map((day) => ({ ...day, label: format(new Date(day.date), "d MMM") }));
  return (
    <section className={CARD}>
      <div>
        <h2 className="text-lg font-semibold md:text-xl">Last 30 days</h2>
        <p className="text-sm text-muted-foreground md:text-base">Uploads and file deliveries (link views and downloads).</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -16, right: 8 }}>
            <defs>
              <linearGradient id="deliveries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="uploads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} minTickGap={24} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }} />
            <Legend />
            <Area type="monotone" dataKey="deliveries" name="Deliveries" stroke="var(--chart-1)" fill="url(#deliveries)" strokeWidth={2} />
            <Area type="monotone" dataKey="uploads" name="Uploads" stroke="var(--chart-2)" fill="url(#uploads)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function StorageByKindChart({ byKind }: { byKind: UsageSummary["byKind"] }) {
  const data = byKind.map((entry) => ({ name: KIND_META[entry.kind].label, value: entry.bytes, count: entry.count }));
  return (
    <section className={CARD}>
      <div>
        <h2 className="text-lg font-semibold md:text-xl">Storage by type</h2>
        <p className="text-sm text-muted-foreground md:text-base">Where your space goes.</p>
      </div>
      {data.length === 0 ? (
        <EmptyState title="No files yet" description="Upload something to see the breakdown." />
      ) : (
        <>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={2}>
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatBytes(value)} contentStyle={{ borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="grid gap-2">
            {data.map((entry, index) => (
              <li key={entry.name} className="flex items-center justify-between gap-3 text-sm md:text-base">
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                  {entry.name}
                  <span className="text-muted-foreground">({entry.count})</span>
                </span>
                <span className="font-medium">{formatBytes(entry.value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
