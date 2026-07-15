import { Card } from "@/components/ui/card";
import { aggregateBy, contractGroup, normalizeCategory, topSkills } from "@/lib/jobUtils";
import type { Job } from "@shared/types";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_PALETTE = [
  "oklch(0.68 0.18 285)",
  "oklch(0.72 0.15 195)",
  "oklch(0.74 0.17 150)",
  "oklch(0.8 0.15 80)",
  "oklch(0.7 0.2 25)",
  "oklch(0.62 0.16 320)",
];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-[240px] w-full">{children}</div>
    </Card>
  );
}

const tooltipStyle = {
  backgroundColor: "oklch(0.22 0.028 265)",
  border: "1px solid oklch(0.32 0.025 265)",
  borderRadius: "0.5rem",
  color: "oklch(0.93 0.01 250)",
  fontSize: "12px",
};

export function JobAnalytics({ jobs }: { jobs: Job[] }) {
  const byCategory = useMemo(
    () => aggregateBy(jobs, (j) => normalizeCategory(j.category)),
    [jobs],
  );
  const byContract = useMemo(
    () => aggregateBy(jobs, (j) => contractGroup(j.contractType)),
    [jobs],
  );
  const bySector = useMemo(
    () => aggregateBy(jobs, (j) => j.sector || "Non précisé").slice(0, 6),
    [jobs],
  );
  const skills = useMemo(() => topSkills(jobs, 8), [jobs]);

  if (jobs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ChartCard title="Répartition par catégorie de poste" subtitle="Distribution des intitulés">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={byCategory}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={3}
            >
              {byCategory.map((_, i) => (
                <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <Legend items={byCategory.map((d, i) => ({ label: d.name, value: d.value, color: CHART_PALETTE[i % CHART_PALETTE.length] }))} />
      </ChartCard>

      <ChartCard title="Types de contrats" subtitle="Nature des offres">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byContract} layout="vertical" margin={{ left: 10, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(0.27 0.03 265 / 40%)" }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {byContract.map((_, i) => (
                <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Compétences IA les plus demandées" subtitle="Top des technologies citées">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={skills} margin={{ left: -16, right: 8, bottom: 30 }}>
            <XAxis
              dataKey="skill"
              tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(0.27 0.03 265 / 40%)" }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="oklch(0.72 0.15 195)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Secteurs qui recrutent" subtitle="Domaines d'activité">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={bySector} outerRadius={85}>
            <PolarGrid stroke="oklch(0.32 0.025 265)" />
            <PolarAngleAxis dataKey="name" tick={{ fill: "oklch(0.68 0.02 260)", fontSize: 10 }} />
            <Radar dataKey="value" stroke="oklch(0.74 0.17 150)" fill="oklch(0.74 0.17 150)" fillOpacity={0.4} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function Legend({ items }: { items: { label: string; value: number; color: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label} ({it.value})
        </span>
      ))}
    </div>
  );
}
