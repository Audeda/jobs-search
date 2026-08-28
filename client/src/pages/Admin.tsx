import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import type { Scan, SearchCriterion } from "@shared/types";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const PLATFORMS = ["Indeed", "LinkedIn", "Welcome to the Jungle", "HelloWork", "Free-Work", "APEC"];

export default function Admin() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <CenteredMessage
        title="Accès réservé"
        body="Vous devez vous connecter pour accéder au panneau d'administration."
        action={
          <div className="flex flex-col items-center gap-2">
            <a href={getLoginUrl()}>
              <Button className="gap-1.5">
                <Shield className="h-4 w-4" /> Se connecter
              </Button>
            </a>
            {import.meta.env.DEV && (
              <a href="/api/dev/login">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  Connexion dev (local, sans OAuth)
                </Button>
              </a>
            )}
          </div>
        }
      />
    );
  }

  if (user.role !== "admin") {
    return (
      <CenteredMessage
        title="Accès non autorisé"
        body="Seul le propriétaire de la veille peut accéder à cet espace."
        action={
          <Link href="/">
            <Button variant="outline" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
            </Button>
          </Link>
        }
      />
    );
  }

  return <AdminPanel />;
}

function AdminPanel() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-sm font-bold">Administration · Veille IA Bordeaux</span>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Tableau de bord
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="criteria">
          <TabsList className="mb-6">
            <TabsTrigger value="criteria">Critères de recherche</TabsTrigger>
            <TabsTrigger value="scans">Historique des scans</TabsTrigger>
          </TabsList>
          <TabsContent value="criteria">
            <CriteriaManager />
          </TabsContent>
          <TabsContent value="scans">
            <ScansManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ------------------------- Critères ------------------------- */

function CriteriaManager() {
  const utils = trpc.useUtils();
  const { data: criteria, isLoading } = trpc.criteria.list.useQuery();
  const [editing, setEditing] = useState<SearchCriterion | null>(null);
  const [open, setOpen] = useState(false);

  const createMut = trpc.criteria.create.useMutation({
    onSuccess: () => {
      utils.criteria.list.invalidate();
      toast.success("Critère ajouté");
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.criteria.update.useMutation({
    onSuccess: () => {
      utils.criteria.list.invalidate();
      toast.success("Critère mis à jour");
      setOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.criteria.delete.useMutation({
    onSuccess: () => {
      utils.criteria.list.invalidate();
      toast.success("Critère supprimé");
    },
    onError: (e) => toast.error(e.message),
  });

  const list = (criteria ?? []) as SearchCriterion[];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Critères de recherche</h2>
          <p className="text-sm text-muted-foreground">
            Configurez les intitulés, mots-clés et zones géographiques scannés chaque semaine.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-1.5" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" /> Nouveau critère
            </Button>
          </DialogTrigger>
          {open && (
            <CriterionDialog
              key={editing ? `edit-${editing.id}` : "new"}
              editing={editing}
              onSubmit={(values) => {
                if (editing) updateMut.mutate({ id: editing.id, ...values });
                else createMut.mutate(values);
              }}
              pending={createMut.isPending || updateMut.isPending}
            />
          )}
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Aucun critère configuré. Ajoutez votre premier critère de recherche.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold">{c.jobTitle}</h3>
                    {!c.isActive && (
                      <Badge variant="outline" className="text-[11px] text-muted-foreground">
                        Inactif
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.location} · rayon {c.radiusKm} km · {c.maxAgeMonths} mois max
                  </p>
                  {c.keywords && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      <span className="text-foreground">Mots-clés :</span> {c.keywords}
                    </p>
                  )}
                  {Array.isArray(c.platforms) && c.platforms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(c.platforms as string[]).map((p) => (
                        <span key={p} className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteMut.mutate({ id: c.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CriterionDialog({
  editing,
  onSubmit,
  pending,
}: {
  editing: SearchCriterion | null;
  onSubmit: (values: {
    jobTitle: string;
    keywords?: string;
    location: string;
    radiusKm: number;
    platforms?: string[];
    maxAgeMonths?: number;
    isActive: boolean;
  }) => void;
  pending: boolean;
}) {
  const [jobTitle, setJobTitle] = useState(editing?.jobTitle ?? "");
  const [keywords, setKeywords] = useState(editing?.keywords ?? "");
  const [location, setLocation] = useState(editing?.location ?? "Bordeaux");
  const [radiusKm, setRadiusKm] = useState(editing?.radiusKm ?? 20);
  const [maxAgeMonths, setMaxAgeMonths] = useState(editing?.maxAgeMonths ?? 1);
  const [platforms, setPlatforms] = useState<string[]>(
    (editing?.platforms as string[] | null) ?? [...PLATFORMS],
  );
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Modifier le critère" : "Nouveau critère de recherche"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Intitulé du poste *</Label>
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="ex : Chef de projet IA" />
        </div>
        <div className="space-y-1.5">
          <Label>Mots-clés (séparés par des virgules)</Label>
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="ex : LLM, RAG, agents, IA générative"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Localisation</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rayon (km)</Label>
            <Input
              type="number"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              min={0}
              max={200}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Âge maximum des offres</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={maxAgeMonths === 1 ? "default" : "outline"}
              onClick={() => setMaxAgeMonths(1)}
            >
              1 mois max
            </Button>
            <Button
              type="button"
              size="sm"
              variant={maxAgeMonths === 2 ? "default" : "outline"}
              onClick={() => setMaxAgeMonths(2)}
            >
              2 mois max
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Plateformes ciblées</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={platforms.includes(p) ? "default" : "outline"}
                onClick={() => togglePlatform(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
          <Label htmlFor="active">Critère actif</Label>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={pending || !jobTitle.trim()}
          onClick={() =>
            onSubmit({ jobTitle: jobTitle.trim(), keywords, location, radiusKm, platforms, maxAgeMonths, isActive })
          }
        >
          {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {editing ? "Enregistrer" : "Ajouter"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ------------------------- Scans ------------------------- */

function ScansManager() {
  const utils = trpc.useUtils();
  const { data: scans, isLoading } = trpc.scans.list.useQuery();
  const runMut = trpc.scans.runNow.useMutation({
    onSuccess: (res) => {
      utils.scans.list.invalidate();
      toast.success(res.message);
    },
    onError: (e) => {
      utils.scans.list.invalidate();
      toast.error(e.message);
    },
  });

  const list = (scans ?? []) as Scan[];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Historique des scans</h2>
          <p className="text-sm text-muted-foreground">
            Suivez les scans hebdomadaires automatiques et déclenchez un scan manuel.
          </p>
        </div>
        <Button className="gap-1.5" disabled={runMut.isPending} onClick={() => runMut.mutate()}>
          {runMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Lancer un scan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Aucun scan pour le moment.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <Card key={s.id} className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  <span className="text-xs text-muted-foreground capitalize">{s.trigger}</span>
                </div>
                <div className="mt-1 text-sm">
                  <span className="font-semibold text-foreground">{s.newJobs}</span> nouvelle(s) offre(s) ·{" "}
                  {s.totalFound} analysée(s)
                </div>
                {s.notes && <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {new Date(s.startedAt).toLocaleString("fr-FR")}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    running: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    pending: "bg-chart-4/15 text-chart-4 border-chart-4/30",
    failed: "bg-destructive/15 text-destructive border-destructive/30",
  };
  const labels: Record<string, string> = {
    completed: "Terminé",
    running: "En cours",
    pending: "En attente",
    failed: "Échec",
  };
  return (
    <Badge variant="outline" className={`text-[11px] ${map[status] ?? ""}`}>
      {labels[status] ?? status}
    </Badge>
  );
}

function CenteredMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Shield className="h-10 w-10 text-primary" />
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="max-w-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
