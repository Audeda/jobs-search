import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORY_BADGE, normalizeCategory } from "@/lib/jobUtils";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  GraduationCap,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Wallet,
} from "lucide-react";
import { Link, useParams } from "wouter";

// Normaliser une URL : ajouter https:// si absent
function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("www.")) return `https://${trimmed}`;
  // Si ça ressemble à un domaine, ajouter https://
  if (trimmed.includes(".") && !trimmed.includes("@")) return `https://${trimmed}`;
  return trimmed;
}

// Détecter si c'est une URL ou un email
function isUrl(str: string | null | undefined): boolean {
  if (!str) return false;
  const normalized = normalizeUrl(str);
  return normalized?.startsWith("http") ?? false;
}

export default function JobDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { data: job, isLoading } = trpc.jobs.getById.useQuery({ id }, { enabled: !Number.isNaN(id) });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Offre introuvable.</p>
        <Link href="/">
          <Button variant="outline" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Retour aux offres
          </Button>
        </Link>
      </div>
    );
  }

  const category = normalizeCategory(job.category);
  const badgeClass = CATEGORY_BADGE[category] ?? "bg-muted text-muted-foreground border-border";
  const skills = (job.skills as string[] | null) ?? [];
  const normalizedContactEmail = normalizeUrl(job.contactEmail);
  const normalizedUrl = normalizeUrl(job.url);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Retour aux offres
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-10">
        <Badge variant="outline" className={`mb-3 ${badgeClass}`}>
          {category}
        </Badge>
        <h1 className="font-display text-3xl font-bold leading-tight">{job.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-lg font-medium text-foreground/80">
          <Building2 className="h-5 w-5 text-primary" />
          {job.company}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="Localisation" value={job.location} />
          <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Contrat" value={job.contractType} />
          <InfoRow icon={<Wallet className="h-4 w-4" />} label="Salaire" value={job.salary} />
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Publication" value={job.publicationDate} />
          <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Expérience" value={job.experience} />
          <InfoRow icon={<Building2 className="h-4 w-4" />} label="Secteur" value={job.sector} />
        </div>

        {job.remoteWork && job.remoteWork !== "Non précisé" && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Télétravail :</span> {job.remoteWork}
          </p>
        )}

        {job.shortDescription && (
          <Card className="mt-6 p-5">
            <h2 className="mb-2 font-display text-sm font-semibold">Description courte</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{job.shortDescription}</p>
          </Card>
        )}

        {job.fullDescription && (
          <Card className="mt-6 p-5">
            <h2 className="mb-3 font-display text-sm font-semibold">Description complète</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {job.fullDescription.split("\n").map((paragraph, idx) =>
                paragraph.trim() ? (
                  <p key={idx}>{paragraph}</p>
                ) : null,
              )}
            </div>
          </Card>
        )}

        {skills.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 font-display text-sm font-semibold">Compétences</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {(normalizedContactEmail || normalizedUrl) && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {normalizedContactEmail && (
              <a
                href={isUrl(normalizedContactEmail) ? normalizedContactEmail : `mailto:${normalizedContactEmail}`}
                target={isUrl(normalizedContactEmail) ? "_blank" : undefined}
                rel={isUrl(normalizedContactEmail) ? "noopener noreferrer" : undefined}
              >
                <Button size="lg" className="gap-2" variant="default">
                  {isUrl(normalizedContactEmail) ? (
                    <>
                      Postuler <LinkIcon className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Envoyer CV <Mail className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </a>
            )}
            {normalizedUrl && (
              <a href={normalizedUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2" variant="outline">
                  Voir l'annonce sur {job.source ?? "la source"}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  if (!value || value === "Non spécifié") return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-card/50 p-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
