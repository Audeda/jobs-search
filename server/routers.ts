import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createCriterion,
  createScan,
  deleteCriterion,
  getJobById,
  listActiveCriteria,
  listCriteria,
  listJobs,
  listScans,
  setJobActive,
  updateCriterion,
  updateScan,
} from "./db";
import { generateMockJobs, recordScanWithJobs, type IncomingJob } from "./scanEngine";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  /* ----------------------------- Jobs (public) ----------------------------- */
  jobs: router({
    list: publicProcedure.query(async () => {
      return listJobs({ activeOnly: true });
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return getJobById(input.id);
    }),
    setActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await setJobActive(input.id, input.isActive);
        return { success: true } as const;
      }),
  }),

  /* ----------------------- Critères de recherche (admin) ----------------------- */
  criteria: router({
    list: adminProcedure.query(async () => {
      return listCriteria();
    }),
    create: adminProcedure
      .input(
        z.object({
          jobTitle: z.string().min(1),
          keywords: z.string().optional(),
          location: z.string().default("Bordeaux"),
          radiusKm: z.number().int().min(0).max(200).default(20),
          platforms: z.array(z.string()).optional(),
          maxAgeMonths: z.number().int().min(1).max(2).default(1),
          isActive: z.boolean().default(true),
        }),
      )
      .mutation(async ({ input }) => {
        const id = await createCriterion(input);
        return { id };
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          jobTitle: z.string().min(1).optional(),
          keywords: z.string().optional(),
          location: z.string().optional(),
          radiusKm: z.number().int().min(0).max(200).optional(),
          platforms: z.array(z.string()).optional(),
          maxAgeMonths: z.number().int().min(1).max(2).optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const { id, ...patch } = input;
        await updateCriterion(id, patch);
        return { success: true } as const;
      }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteCriterion(input.id);
      return { success: true } as const;
    }),
  }),

  /* ----------------------------- Scans (admin) ----------------------------- */
  scans: router({
    list: adminProcedure.query(async () => {
      return listScans();
    }),
    runNow: adminProcedure.mutation(async () => {
      const criteria = await listActiveCriteria();
      if (criteria.length === 0) {
        return { message: "Aucun critère actif. Ajoutez des critères de recherche pour lancer un scan." };
      }

      const scanId = await createScan({ status: "running", trigger: "manual" });

      // Construire le prompt pour l'LLM
      const criteriaText = criteria
        .map(
          (c) =>
            `- Poste: ${c.jobTitle}, Mots-clés: ${c.keywords || "aucun"}, Localisation: ${c.location} (rayon ${c.radiusKm}km), Plateformes: ${Array.isArray(c.platforms) ? (c.platforms as string[]).join(", ") : "toutes"}`,
        )
        .join("\n");

      // Calculer les dates récentes selon l'âge maximum des critères
      const today = new Date();
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      
      // Utiliser la plage la plus permissive (2 mois) pour le scan
      const twoMonthsAgo = new Date(today.getTime() - 2 * 30 * 24 * 60 * 60 * 1000);
      const dateRange = `entre le ${formatDate(twoMonthsAgo)} et le ${formatDate(today)}`;

      const prompt = `Tu es un agent de recherche d'offres d'emploi. Génère une liste réaliste d'offres d'emploi en IA basées sur ces critères de recherche :

${criteriaText}

**IMPORTANT**: Les offres DOIVENT avoir des dates de publication ${dateRange} (au maximum 2 mois). Les offres trop anciennes ne sont pas acceptées.

Pour chaque offre, fournis un JSON valide avec cette structure (tableau):
[
  {
    "title": "Titre du poste",
    "company": "Nom de l'entreprise",
    "location": "Localisation",
    "contractType": "CDI|Freelance|Alternance|Stage",
    "salary": "Salaire ou Non spécifié",
    "publicationDate": "YYYY-MM-DD (OBLIGATOIREMENT entre aujourd'hui et 2 mois max)",
    "source": "Indeed|LinkedIn|Welcome to the Jungle|HelloWork|Free-Work|APEC",
    "url": "https://example.com/job",
    "category": "Spécialiste IA|Product Manager IA|Chef de projet IA",
    "remoteWork": "Télétravail total|Télétravail partiel|Sur site",
    "experience": "0-2 ans|2-5 ans|5+ ans",
    "sector": "Secteur d'activité",
    "shortDescription": "Description courte et détaillée",
    "fullDescription": "Description complète et détaillée de l'offre (2-3 paragraphes)",
    "contactEmail": "email@example.com ou https://example.com/apply",
    "skills": ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5"]
  }
]

Génère 3-5 offres réalistes et récentes (moins de 2 mois). Retourne UNIQUEMENT le JSON valide, sans texte supplémentaire.`;

      try {
        let validatedJobs: IncomingJob[];

        if (!ENV.forgeApiKey && !ENV.isProduction) {
          // Aucun LLM configuré en local (Manus/OpenAI) : on simule le scan plutôt que
          // d'échouer, cf. CLAUDE.md "Contournement scan LLM en local". Ne s'active jamais
          // en production (ENV.isProduction), où un LLM manquant doit rester une vraie erreur.
          console.warn(
            "[scans.runNow] Aucune clé LLM configurée — génération d'offres simulées (mock local).",
          );
          validatedJobs = generateMockJobs(criteria);
        } else {
          const response = await invokeLLM({
            messages: [
              {
                role: "user" as const,
                content: prompt,
              },
            ],
          });

          const messageContent = response.choices[0]?.message.content;
          let contentStr = typeof messageContent === "string" ? messageContent : "[]";

          // Nettoyer la réponse : supprimer les backticks et extraire le JSON valide
          contentStr = contentStr.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();

          // Extraire le JSON valide (tableau d'objets)
          const jsonMatch = contentStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            contentStr = jsonMatch[0];
          }

          const jobs = JSON.parse(contentStr) as IncomingJob[];

          // Valider et filtrer les offres selon les critères
          validatedJobs = jobs.filter((job) => {
            // Vérifier que l'offre a au moins un titre et une entreprise
            if (!job.title || !job.company) return false;

            // Vérifier la date de publication (moins de 2 mois)
            if (job.publicationDate) {
              const jobDate = new Date(job.publicationDate);
              const twoMonthsAgo = new Date(today.getTime() - 2 * 30 * 24 * 60 * 60 * 1000);
              if (jobDate < twoMonthsAgo) return false;
            }

            // Vérifier que la catégorie correspond à l'une des catégories attendues
            const validCategories = ["Spécialiste IA", "Product Manager IA", "Chef de projet IA"];
            if (job.category && !validCategories.some(cat => job.category?.includes(cat))) {
              return false;
            }

            return true;
          });
        }

        const result = await recordScanWithJobs("manual", validatedJobs, undefined, scanId);
        return {
          message: `Scan terminé. ${result.newJobs} nouvelle(s) offre(s) ajoutée(s) sur ${result.totalFound} analysée(s).`,
        };
      } catch (error) {
        console.error("[scans.runNow] Error:", error);
        const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
        if (scanId) {
          await updateScan(scanId, {
            status: "failed",
            completedAt: new Date(),
            notes: errorMsg,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erreur lors du scan: ${errorMsg}`,
        });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
