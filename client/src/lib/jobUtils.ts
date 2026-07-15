import type { Job } from "@shared/types";

/** Normalise une catégorie en l'une des 3 catégories canoniques */
export function normalizeCategory(category?: string | null): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("chef de projet") || c.includes("change manager")) return "Chef de projet IA";
  if (c.includes("product") || c.includes("produit")) return "Product Manager IA";
  return "Spécialiste IA";
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Chef de projet IA": "var(--chart-1)",
  "Product Manager IA": "var(--chart-2)",
  "Spécialiste IA": "var(--chart-3)",
};

export const CATEGORY_BADGE: Record<string, string> = {
  "Chef de projet IA": "bg-chart-1/15 text-chart-1 border-chart-1/30",
  "Product Manager IA": "bg-chart-2/15 text-chart-2 border-chart-2/30",
  "Spécialiste IA": "bg-chart-3/15 text-chart-3 border-chart-3/30",
};

/** Détermine si un contrat est de type CDI/permanent */
export function contractGroup(contractType?: string | null): string {
  const c = (contractType ?? "").toLowerCase();
  if (c.includes("cdi") || c.includes("perm")) return "CDI";
  if (c.includes("freelance") || c.includes("indép")) return "Freelance";
  if (c.includes("altern") || c.includes("appren") || c.includes("stage")) return "Alternance / Stage";
  if (c.includes("fonctionnaire") || c.includes("titulaire")) return "Fonction publique";
  if (c.includes("cdd")) return "CDD";
  return contractType || "Autre";
}

/** Agrège les compétences les plus fréquentes */
export function topSkills(jobs: Job[], limit = 10): { skill: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    const skills = (job.skills as string[] | null) ?? [];
    for (const s of skills) {
      const key = s.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Agrège un champ texte en comptage */
export function aggregateBy(jobs: Job[], accessor: (j: Job) => string): { name: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    const key = accessor(job) || "Non précisé";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
