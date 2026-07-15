import { JobCard } from "@/components/JobCard";
import { JobAnalytics } from "@/components/JobAnalytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { contractGroup, normalizeCategory } from "@/lib/jobUtils";
import { trpc } from "@/lib/trpc";
import type { Job } from "@shared/types";
import { Bot, Briefcase, Building2, Loader2, MapPin, Search, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const CATEGORIES = ["Toutes", "Chef de projet IA", "Product Manager IA", "Spécialiste IA"];

export default function Home() {
  const { user } = useAuth();
  const { data: jobs, isLoading } = trpc.jobs.list.useQuery();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [contract, setContract] = useState<string | null>(null);

  const allJobs = (jobs ?? []) as Job[];

  const contractOptions = useMemo(() => {
    const set = new Set(allJobs.map((j) => contractGroup(j.contractType)));
    return Array.from(set);
  }, [allJobs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allJobs.filter((j) => {
      if (category !== "Toutes" && normalizeCategory(j.category) !== category) return false;
      if (contract && contractGroup(j.contractType) !== contract) return false;
      if (q) {
        const haystack = [
          j.title,
          j.company,
          j.location,
          j.shortDescription,
          j.sector,
          ...((j.skills as string[] | null) ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allJobs, search, category, contract]);

  const companies = new Set(allJobs.map((j) => j.company)).size;
  const sources = new Set(allJobs.map((j) => j.source).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold leading-tight">Veille IA Bordeaux</div>
              <div className="text-[11px] text-muted-foreground">Job Monitor</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" ? (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Shield className="h-4 w-4" />
                  Administration
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Shield className="h-4 w-4" />
                  Espace admin
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background/40 to-background" />
        <div className="container relative py-14">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary">
            Veille automatisée · Mise à jour hebdomadaire
          </Badge>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">
            Le marché de l'emploi <span className="text-primary">Intelligence Artificielle</span> à Bordeaux
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Toutes les offres de Spécialiste IA, Product Manager IA et Chef de projet IA dans un rayon de 20 km autour de
            Bordeaux, collectées automatiquement et centralisées.
          </p>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
            <Stat icon={<Briefcase className="h-4 w-4" />} value={allJobs.length} label="Offres" />
            <Stat icon={<Building2 className="h-4 w-4" />} value={companies} label="Entreprises" />
            <Stat icon={<MapPin className="h-4 w-4" />} value={sources} label="Plateformes" />
          </div>
        </div>
      </section>

      <main className="container space-y-10 py-10">
        {/* Analytics */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold">Analyse du marché</h2>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <JobAnalytics jobs={allJobs} />
          )}
        </section>

        {/* Offers */}
        <section>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-display text-xl font-bold">Offres d'emploi</h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un poste, une entreprise, une compétence…"
                className="pl-9"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={category === c ? "default" : "outline"}
                onClick={() => setCategory(c)}
              >
                {c}
              </Button>
            ))}
            <span className="mx-1 self-center text-border">|</span>
            {contractOptions.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={contract === c ? "default" : "outline"}
                onClick={() => setContract(contract === c ? null : c)}
              >
                {c}
              </Button>
            ))}
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            {filtered.length} offre{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}
            {filtered.length !== allJobs.length ? ` sur ${allJobs.length}` : ""}
          </p>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
              Aucune offre ne correspond à votre recherche.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="container text-center text-xs text-muted-foreground">
          Veille IA Bordeaux · Données collectées automatiquement depuis Indeed, LinkedIn, Welcome to the Jungle,
          HelloWork, Free-Work et autres plateformes.
        </div>
      </footer>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 backdrop-blur">
      <div className="flex items-center gap-1.5 text-primary">{icon}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
