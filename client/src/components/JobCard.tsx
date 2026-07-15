import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CATEGORY_BADGE, normalizeCategory } from "@/lib/jobUtils";
import type { Job } from "@shared/types";
import { Building2, Clock, MapPin, Wallet } from "lucide-react";
import { Link } from "wouter";

export function JobCard({ job }: { job: Job }) {
  const category = normalizeCategory(job.category);
  const badgeClass = CATEGORY_BADGE[category] ?? "bg-muted text-muted-foreground border-border";
  const skills = (job.skills as string[] | null) ?? [];

  return (
    <Link href={`/offres/${job.id}`}>
      <Card className="group relative h-full overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {job.title}
          </h3>
          <Badge variant="outline" className={`shrink-0 text-[11px] ${badgeClass}`}>
            {category}
          </Badge>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-foreground/80">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          {job.company}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
          )}
          {job.contractType && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {job.contractType}
            </span>
          )}
          {job.salary && job.salary !== "Non spécifié" && (
            <span className="flex items-center gap-1 text-accent">
              <Wallet className="h-3.5 w-3.5" />
              {job.salary}
            </span>
          )}
        </div>

        {job.shortDescription && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {job.shortDescription}
          </p>
        )}

        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.slice(0, 5).map((s) => (
              <span
                key={s}
                className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
              >
                {s}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground">
                +{skills.length - 5}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
          <span className="text-muted-foreground">{job.source}</span>
          {job.publicationDate && (
            <span className="text-muted-foreground">{job.publicationDate}</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
