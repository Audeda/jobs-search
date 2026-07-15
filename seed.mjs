import { readFileSync } from "fs";
import { createHash } from "crypto";
import mysql from "mysql2/promise";

const DATA_PATH = process.env.SEED_PATH || "/home/ubuntu/ia-jobs-bordeaux/ia_bordeaux_jobs.json";

function normalize(value) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function computeDedupHash({ title, company, source }) {
  const key = `${normalize(title)}|${normalize(company)}|${normalize(source)}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 64);
}

const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Create a seed scan
const [scanRes] = await conn.execute(
  "INSERT INTO scans (status, `trigger`, total_found, new_jobs, notes, started_at, completed_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
  ["completed", "seed", raw.length, 0, "Import initial des offres collectées manuellement (recherche du 17/06/2026)."],
);
const scanId = scanRes.insertId;

let inserted = 0;
for (const j of raw) {
  const title = j.titre;
  const company = j.entreprise;
  if (!title || !company) continue;
  const source = j.source ?? null;
  const dedupHash = computeDedupHash({ title, company, source });

  const [exists] = await conn.execute("SELECT id FROM jobs WHERE dedup_hash = ? LIMIT 1", [dedupHash]);
  if (exists.length > 0) continue;

  await conn.execute(
    `INSERT INTO jobs
     (dedup_hash, title, company, location, contract_type, salary, publication_date, source, url, category, remote_work, experience, sector, short_description, skills, is_active, scan_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      dedupHash,
      title,
      company,
      j.localisation ?? null,
      j.type_contrat ?? null,
      j.salaire ?? null,
      j.date_publication ?? null,
      source,
      j.url ?? null,
      j.categorie ?? null,
      j.teletravail ?? null,
      j.experience ?? null,
      j.secteur ?? null,
      j.description_courte ?? null,
      JSON.stringify(j.competences ?? []),
      1,
      scanId,
    ],
  );
  inserted += 1;
}

await conn.execute("UPDATE scans SET new_jobs = ?, total_found = ? WHERE id = ?", [inserted, raw.length, scanId]);

// Seed default search criteria
const [critCount] = await conn.execute("SELECT COUNT(*) as c FROM search_criteria");
if (critCount[0].c === 0) {
  const platforms = JSON.stringify(["Indeed", "LinkedIn", "Welcome to the Jungle", "HelloWork", "Free-Work", "APEC"]);
  const defaults = [
    ["Spécialiste IA", "machine learning, NLP, LLM, deep learning, data scientist"],
    ["Product IA", "product manager IA, product owner IA, AI product"],
    ["Chef de projet IA", "transformation IA, IA générative, change manager IA, gestion de projet"],
  ];
  for (const [jobTitle, keywords] of defaults) {
    await conn.execute(
      "INSERT INTO search_criteria (job_title, keywords, location, radius_km, platforms, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [jobTitle, keywords, "Bordeaux", 20, platforms, 1],
    );
  }
}

console.log(`Seed terminé : ${inserted} offres insérées (scan #${scanId}).`);
await conn.end();
