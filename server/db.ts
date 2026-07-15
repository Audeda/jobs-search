import { createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertJob,
  InsertScan,
  InsertSearchCriterion,
  jobs,
  scans,
  searchCriteria,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/* ----------------------------- Users ----------------------------- */

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/* --------------------------- Déduplication --------------------------- */

/** Normalise une chaîne pour le hash (minuscules, sans accents, sans espaces multiples) */
function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Calcule le hash de déduplication d'une offre à partir de titre + entreprise + source */
export function computeDedupHash(input: { title: string; company: string; source?: string | null }): string {
  const key = `${normalize(input.title)}|${normalize(input.company)}|${normalize(input.source)}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 64);
}

/* ----------------------------- Jobs ----------------------------- */

export type JobInput = Omit<InsertJob, "dedupHash" | "id" | "createdAt" | "updatedAt"> & {
  title: string;
  company: string;
};

/**
 * Insère une offre si son hash n'existe pas déjà.
 * Retourne true si l'offre a été insérée (nouvelle), false si c'était un doublon.
 */
export async function insertJobIfNew(job: JobInput): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const dedupHash = computeDedupHash({ title: job.title, company: job.company, source: job.source });

  const existing = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.dedupHash, dedupHash)).limit(1);
  if (existing.length > 0) {
    return false;
  }

  await db.insert(jobs).values({ ...job, dedupHash }).onDuplicateKeyUpdate({
    set: { updatedAt: new Date() },
  });
  return true;
}

export async function listJobs(options?: { activeOnly?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const activeOnly = options?.activeOnly ?? true;
  const query = db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const rows = await query;
  return activeOnly ? rows.filter((j) => j.isActive) : rows;
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setJobActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobs).set({ isActive }).where(eq(jobs.id, id));
}

/* ----------------------- Search Criteria ----------------------- */

export async function listCriteria() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(searchCriteria).orderBy(desc(searchCriteria.createdAt));
}

export async function listActiveCriteria() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(searchCriteria).where(eq(searchCriteria.isActive, true));
}

export async function createCriterion(input: InsertSearchCriterion) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(searchCriteria).values(input).$returningId();
  return result[0]?.id;
}

export async function updateCriterion(id: number, patch: Partial<InsertSearchCriterion>) {
  const db = await getDb();
  if (!db) return;
  await db.update(searchCriteria).set(patch).where(eq(searchCriteria.id, id));
}

export async function deleteCriterion(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(searchCriteria).where(eq(searchCriteria.id, id));
}

/* ----------------------------- Scans ----------------------------- */

export async function createScan(input: InsertScan) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(scans).values(input).$returningId();
  return result[0]?.id;
}

export async function updateScan(id: number, patch: Partial<InsertScan>) {
  const db = await getDb();
  if (!db) return;
  await db.update(scans).set(patch).where(eq(scans.id, id));
}

export async function listScans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scans).orderBy(desc(scans.startedAt));
}

export async function getScanByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(scans)
    .where(and(eq(scans.scheduleCronTaskUid, taskUid)))
    .orderBy(desc(scans.startedAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
