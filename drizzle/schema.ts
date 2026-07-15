import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Critères de recherche configurables depuis le panneau d'administration.
 * Chaque critère définit un intitulé de poste, des mots-clés, une localisation et un rayon.
 */
export const searchCriteria = mysqlTable("search_criteria", {
  id: int("id").autoincrement().primaryKey(),
  /** Intitulé du poste recherché, ex: "Chef de projet IA" */
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  /** Mots-clés additionnels séparés par des virgules, ex: "LLM, RAG, agents" */
  keywords: text("keywords"),
  /** Ville/zone de référence, ex: "Bordeaux" */
  location: varchar("location", { length: 255 }).notNull().default("Bordeaux"),
  /** Rayon géographique en km autour de la localisation */
  radiusKm: int("radius_km").notNull().default(20),
  /** Plateformes ciblées (JSON array de strings) */
  platforms: json("platforms").$type<string[]>(),
  /** Âge maximum des offres en mois (1 ou 2) */
  maxAgeMonths: int("max_age_months").notNull().default(1),
  /** Critère actif ou non */
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SearchCriterion = typeof searchCriteria.$inferSelect;
export type InsertSearchCriterion = typeof searchCriteria.$inferInsert;

/**
 * Offres d'emploi collectées. La déduplication s'appuie sur dedupHash.
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  /** Hash de déduplication (titre + entreprise + source normalisés) */
  dedupHash: varchar("dedup_hash", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  contractType: varchar("contract_type", { length: 100 }),
  salary: varchar("salary", { length: 255 }),
  /** Texte brut de la date de publication tel que trouvé sur la source */
  publicationDate: varchar("publication_date", { length: 100 }),
  source: varchar("source", { length: 100 }),
  url: text("url"),
  /** Catégorie normalisée: Chef de projet IA / Product Manager IA / Spécialiste IA */
  category: varchar("category", { length: 100 }),
  remoteWork: varchar("remote_work", { length: 255 }),
  experience: varchar("experience", { length: 255 }),
  sector: varchar("sector", { length: 255 }),
  shortDescription: text("short_description"),
  /** Description complète de l'offre */
  fullDescription: text("full_description"),
  /** Email ou lien pour postuler */
  contactEmail: varchar("contact_email", { length: 255 }),
  /** Compétences (JSON array de strings) */
  skills: json("skills").$type<string[]>(),
  /** Statut actif (visible) ou archivé */
  isActive: boolean("is_active").notNull().default(true),
  /** ID du scan qui a découvert cette offre (nullable pour les données seed) */
  scanId: int("scan_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Historique des scans hebdomadaires.
 */
export const scans = mysqlTable("scans", {
  id: int("id").autoincrement().primaryKey(),
  /** Statut du scan */
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).notNull().default("pending"),
  /** Déclencheur: scheduled (cron) ou manual (admin) */
  trigger: mysqlEnum("trigger", ["scheduled", "manual", "seed"]).notNull().default("scheduled"),
  /** Nombre total d'offres remontées par le scan */
  totalFound: int("total_found").notNull().default(0),
  /** Nombre de nouvelles offres (après déduplication) */
  newJobs: int("new_jobs").notNull().default(0),
  /** Message d'erreur ou note */
  notes: text("notes"),
  /** task_uid du cron Heartbeat associé (pour lookup) */
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;
