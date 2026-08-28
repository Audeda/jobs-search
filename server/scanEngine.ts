import { notifyOwner } from "./_core/notification";
import {
  createScan,
  insertJobIfNew,
  listActiveCriteria,
  updateScan,
  type JobInput,
} from "./db";

/**
 * Schéma d'une offre telle que renvoyée par l'agent de scan externe.
 * L'agent (cron Manus) découvre les offres puis POST ce format vers /api/scheduled/ingestJobs.
 */
export type IncomingJob = {
  title: string;
  company: string;
  location?: string;
  contractType?: string;
  salary?: string;
  publicationDate?: string;
  source?: string;
  url?: string;
  category?: string;
  remoteWork?: string;
  experience?: string;
  sector?: string;
  shortDescription?: string;
  fullDescription?: string;
  contactEmail?: string;
  skills?: string[];
};

function toJobInput(job: IncomingJob, scanId?: number): JobInput {
  return {
    title: job.title,
    company: job.company,
    location: job.location ?? null,
    contractType: job.contractType ?? null,
    salary: job.salary ?? null,
    publicationDate: job.publicationDate ?? null,
    source: job.source ?? null,
    url: job.url ?? null,
    category: job.category ?? null,
    remoteWork: job.remoteWork ?? null,
    experience: job.experience ?? null,
    sector: job.sector ?? null,
    shortDescription: job.shortDescription ?? null,
    fullDescription: job.fullDescription ?? null,
    contactEmail: job.contactEmail ?? null,
    skills: job.skills ?? null,
    isActive: true,
    scanId: scanId ?? null,
  };
}

/**
 * Ingère un lot d'offres dans la base avec déduplication.
 * Retourne le nombre total reçu et le nombre de nouvelles offres effectivement insérées.
 */
export async function ingestJobs(
  incoming: IncomingJob[],
  scanId?: number,
): Promise<{ totalFound: number; newJobs: number }> {
  let newJobs = 0;
  for (const job of incoming) {
    if (!job.title || !job.company) continue;
    const inserted = await insertJobIfNew(toJobInput(job, scanId));
    if (inserted) newJobs += 1;
  }
  return { totalFound: incoming.length, newJobs };
}

/**
 * Construit un résumé textuel des nouvelles offres pour la notification owner.
 */
export function buildScanSummary(newJobs: number, totalFound: number, samples: IncomingJob[]): string {
  if (newJobs === 0) {
    return `Le scan hebdomadaire est terminé. ${totalFound} offre(s) analysée(s), aucune nouvelle offre détectée depuis le dernier scan.`;
  }
  const lines = samples
    .slice(0, 8)
    .map((j) => `• ${j.title} — ${j.company}${j.location ? ` (${j.location})` : ""}`)
    .join("\n");
  return `Le scan hebdomadaire a détecté ${newJobs} nouvelle(s) offre(s) sur ${totalFound} analysée(s) :\n\n${lines}${
    newJobs > 8 ? `\n… et ${newJobs - 8} autre(s).` : ""
  }`;
}

const MOCK_COMPANIES = [
  "Neurons Bordeaux",
  "Aquitaine Data Lab",
  "Cortex Sud-Ouest",
  "Vignes & Vecteurs",
  "Gironde AI Studio",
];

/**
 * Génère de fausses offres à partir des critères actifs, pour simuler un scan en local
 * quand aucun LLM n'est configuré (cf. CLAUDE.md, "Contournement scan LLM en local").
 * Ne doit jamais être appelée en production.
 */
export function generateMockJobs(
  criteria: { jobTitle: string; location: string }[],
): IncomingJob[] {
  const today = new Date().toISOString().split("T")[0];
  return criteria.slice(0, 5).map((c, i) => ({
    title: c.jobTitle,
    company: MOCK_COMPANIES[i % MOCK_COMPANIES.length],
    location: c.location || "Bordeaux",
    contractType: "CDI",
    salary: "Non spécifié",
    publicationDate: today,
    source: "Indeed",
    url: "https://example.com/mock-job",
    category: "Spécialiste IA",
    remoteWork: "Télétravail partiel",
    experience: "2-5 ans",
    sector: "Tech",
    shortDescription:
      "Offre simulée générée localement (mock LLM — aucun appel réseau, pas de credentials Manus/OpenAI requis).",
    fullDescription:
      "Cette offre est un jeu de données factice utilisé pour tester le flux de scan en local, sans dépendre d'un LLM réel. Elle ne doit jamais apparaître en production.",
    contactEmail: "mock@example.com",
    skills: ["Python", "Machine Learning"],
  }));
}

/**
 * Enregistre un nouveau scan, ingère les offres fournies, met à jour le scan et notifie l'owner.
 * Utilisé par l'endpoint d'ingestion appelé par l'agent cron.
 */
export async function recordScanWithJobs(
  trigger: "scheduled" | "manual" | "seed",
  incoming: IncomingJob[],
  taskUid?: string | null,
  existingScanId?: number,
): Promise<{ scanId?: number; totalFound: number; newJobs: number }> {
  const scanId =
    existingScanId ??
    (await createScan({
      status: "running",
      trigger,
      scheduleCronTaskUid: taskUid ?? null,
    }));

  try {
    const { totalFound, newJobs } = await ingestJobs(incoming, scanId);

    await updateScan(scanId!, {
      status: "completed",
      totalFound,
      newJobs,
      completedAt: new Date(),
      notes: `${newJobs} nouvelle(s) offre(s) sur ${totalFound} analysée(s).`,
    });

    // Notifier le propriétaire
    const newSamples = incoming.slice(0, 8);
    await notifyOwner({
      title:
        newJobs > 0
          ? `Veille IA Bordeaux : ${newJobs} nouvelle(s) offre(s)`
          : "Veille IA Bordeaux : scan terminé (aucune nouveauté)",
      content: buildScanSummary(newJobs, totalFound, newSamples),
    }).catch((e) => console.warn("[scanEngine] notifyOwner failed:", e));

    return { scanId, totalFound, newJobs };
  } catch (error) {
    await updateScan(scanId!, {
      status: "failed",
      completedAt: new Date(),
      notes: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Déclenche un scan "manuel" depuis l'admin.
 * Comme le scraping direct est peu fiable, ce déclenchement crée un enregistrement de scan
 * en attente que l'agent cron alimentera. Ici on enregistre simplement un scan vide marqué
 * en attente d'ingestion, et on retourne les critères actifs qui seront utilisés.
 *
 * NOTE: le scan réel des plateformes est effectué par l'agent cron Manus qui POST ses
 * résultats vers /api/scheduled/ingestJobs. Le bouton "Scan manuel" sert à enregistrer
 * une demande et fournir un retour immédiat sur les critères qui seront scannés.
 */
export async function runScanForAllCriteria(
  trigger: "scheduled" | "manual",
): Promise<{ scanId?: number; criteriaCount: number; message: string }> {
  const criteria = await listActiveCriteria();

  const scanId = await createScan({
    status: "pending",
    trigger,
    notes: `Scan ${trigger} demandé pour ${criteria.length} critère(s) actif(s). En attente d'exécution par l'agent de veille.`,
  });

  return {
    scanId,
    criteriaCount: criteria.length,
    message:
      criteria.length === 0
        ? "Aucun critère actif. Ajoutez des critères de recherche pour lancer un scan."
        : `Demande de scan enregistrée pour ${criteria.length} critère(s) actif(s). L'agent de veille traitera la demande et alimentera les résultats.`,
  };
}
