# Analyse Offres d'Emploi IA Bordeaux - TODO

## Base de données
- [x] Schéma des tables (users, jobs, searchCriteria, scans)
- [x] Migrations SQL générées et appliquées
- [x] Seed des données initiales depuis ia_bordeaux_jobs.json (12 offres chargées)

## Backend - Moteur de scan
- [x] Helpers de déduplication (normalize, computeDedupHash)
- [x] Ingestion des offres (insertJobIfNew, ingestJobs)
- [x] Gestion des critères de recherche (CRUD)
- [x] Gestion des scans (création, mise à jour, listing)
- [x] Procédure manuelle de scan (runScanForAllCriteria)
- [x] Notification au propriétaire (buildScanSummary)

## Backend - Procédures tRPC
- [x] jobs.list (public)
- [x] jobs.getById (public)
- [x] jobs.setActive (admin)
- [x] criteria.list (admin)
- [x] criteria.create (admin)
- [x] criteria.update (admin)
- [x] criteria.delete (admin)
- [x] scans.list (admin)
- [x] scans.runNow (admin)

## Frontend - Pages publiques
- [x] Home.tsx - Liste des offres avec filtres
- [x] JobCard.tsx - Composant de carte d'offre
- [x] JobDetail.tsx - Page de détail d'une offre
- [x] JobAnalytics.tsx - Graphiques et statistiques

## Frontend - Interface d'administration
- [x] Admin.tsx - Page d'administration (protégée)
- [x] Gestion des critères de recherche
- [x] Déclenchement manuel du scan
- [x] Historique des scans

## Frontend - Utilitaires
- [x] jobUtils.ts - Helpers pour les catégories, contrats, compétences
- [x] const.ts - Constantes et helpers d'authentification (scaffold)

## Tests
- [ ] Tests du moteur de scan (scanEngine.test.ts)
- [ ] Tests des procédures tRPC

## Données
- [x] Charger ia_bordeaux_jobs.json
- [x] Script de seed (seed.mjs)

## Style et UX
- [ ] Thème dark mode avec couleurs OKLCH
- [ ] Typographie élégante
- [ ] Responsive design
- [ ] Animations fluides
