import fs from "node:fs";
import Database from "better-sqlite3";
import { dataDir, dbPath } from "./paths";
import { normalizePublicOpportunityUrl } from "./urlSecurity";
import type {
  ActivityLog,
  ArtistProfile,
  Application,
  AutomationRunMode,
  CvEntry,
  MaterialKind,
  Opportunity,
  OpportunityStatus,
  PackageManifest,
  SourceMaterial,
  SubmissionApprovalMode,
  SubmissionMethod,
  Work
} from "@/types/domain";
import type { SearchCoverageReport, SearchQuery, ScoredCandidate, ShortlistedCandidate } from "./opportunityDiscovery";

let db: Database.Database | null = null;

type ReadArtistDataOptions = {
  materialLimit?: number;
  materialContentLimit?: number;
  opportunityLimit?: number;
  opportunityRawContentLimit?: number;
  applicationLimit?: number;
};

type ArtistPayload = {
  profile: ArtistProfile;
  works: Work[];
  cv: CvEntry[];
  materialSources: Pick<SourceMaterial, "id" | "kind" | "title" | "content" | "analysis" | "fileName" | "filePath" | "mimeType">[];
};

type ProfileRow = {
  id: number;
  name: string;
  name_zh: string;
  name_en: string;
  email: string;
  location: string;
  location_zh: string;
  location_en: string;
  website: string;
  instagram: string;
  bio_zh_short: string;
  bio_zh_medium: string;
  bio_zh_long: string;
  bio_en_short: string;
  bio_en_medium: string;
  bio_en_long: string;
  statement_zh: string;
  statement_en: string;
  preferences: string;
  preferences_zh: string;
  preferences_en: string;
  application_region: string;
  automation_batch_limit: number;
  submission_approval_mode: string;
  opportunity_fee_preference: string;
  opportunity_tier_preference: string;
  updated_at: string;
};

type WorkRow = {
  id: number;
  title: string;
  title_zh: string;
  title_en: string;
  year: string;
  medium: string;
  medium_zh: string;
  medium_en: string;
  dimensions: string;
  dimensions_zh: string;
  dimensions_en: string;
  image_path: string;
  description_zh: string;
  description_en: string;
};

type CvRow = {
  id: number;
  category: string;
  category_zh: string;
  category_en: string;
  year: string;
  title: string;
  title_zh: string;
  title_en: string;
  organization: string;
  organization_zh: string;
  organization_en: string;
  location: string;
  location_zh: string;
  location_en: string;
  notes: string;
  notes_zh: string;
  notes_en: string;
};

type SourceMaterialRow = {
  id: number;
  kind: string;
  title: string;
  content: string;
  analysis_json: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
};

type OpportunityRow = {
  id: number;
  title: string;
  organization: string;
  url: string;
  location: string;
  deadline: string;
  fee: string;
  funding: string;
  eligibility: string;
  materials: string;
  submission_method: string;
  summary: string;
  score: number | null;
  risks: string;
  status: string;
  source: string;
  raw_content: string;
  created_at: string;
  updated_at: string;
};

type ApplicationRow = {
  id: number;
  opportunity_id: number;
  run_mode: string;
  boundary_model: string;
  draft_zh: string;
  draft_en: string;
  checklist: string;
  selected_works: string;
  package_path: string;
  submission_log: string;
  created_at: string;
  updated_at: string;
};

type ActivityLogRow = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  metadata: string;
  created_at: string;
};

type PackageManifestRow = {
  id: number;
  application_id: number | null;
  opportunity_id: number | null;
  run_mode: string;
  package_path: string;
  manifest_path: string;
  manifest_version: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type SearchCoverageReportRow = {
  id: number;
  search_run_id: number;
  report_json: string;
  created_at: string;
};

export function getDb() {
  if (!db) {
    fs.mkdirSync(dataDir, { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    migrate(db);
  }
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS artist_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT '',
      name_zh TEXT NOT NULL DEFAULT '',
      name_en TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      location_zh TEXT NOT NULL DEFAULT '',
      location_en TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      instagram TEXT NOT NULL DEFAULT '',
      bio_zh_short TEXT NOT NULL DEFAULT '',
      bio_zh_medium TEXT NOT NULL DEFAULT '',
      bio_zh_long TEXT NOT NULL DEFAULT '',
      bio_en_short TEXT NOT NULL DEFAULT '',
      bio_en_medium TEXT NOT NULL DEFAULT '',
      bio_en_long TEXT NOT NULL DEFAULT '',
      statement_zh TEXT NOT NULL DEFAULT '',
      statement_en TEXT NOT NULL DEFAULT '',
      preferences TEXT NOT NULL DEFAULT '',
      preferences_zh TEXT NOT NULL DEFAULT '',
      preferences_en TEXT NOT NULL DEFAULT '',
      application_region TEXT NOT NULL DEFAULT 'worldwide',
      automation_batch_limit INTEGER NOT NULL DEFAULT 5,
      submission_approval_mode TEXT NOT NULL DEFAULT 'review_required',
      opportunity_fee_preference TEXT NOT NULL DEFAULT 'conservative',
      opportunity_tier_preference TEXT NOT NULL DEFAULT 'high_tier',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      title_zh TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      medium TEXT NOT NULL DEFAULT '',
      medium_zh TEXT NOT NULL DEFAULT '',
      medium_en TEXT NOT NULL DEFAULT '',
      dimensions TEXT NOT NULL DEFAULT '',
      dimensions_zh TEXT NOT NULL DEFAULT '',
      dimensions_en TEXT NOT NULL DEFAULT '',
      image_path TEXT NOT NULL DEFAULT '',
      description_zh TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS cv_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'exhibition',
      category_zh TEXT NOT NULL DEFAULT '',
      category_en TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      title_zh TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL DEFAULT '',
      organization TEXT NOT NULL DEFAULT '',
      organization_zh TEXT NOT NULL DEFAULT '',
      organization_en TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      location_zh TEXT NOT NULL DEFAULT '',
      location_en TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      notes_zh TEXT NOT NULL DEFAULT '',
      notes_en TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS material_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL DEFAULT 'other',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      analysis_json TEXT NOT NULL DEFAULT '',
      file_name TEXT NOT NULL DEFAULT '',
      file_path TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      organization TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL UNIQUE,
      location TEXT NOT NULL DEFAULT '',
      deadline TEXT NOT NULL DEFAULT '',
      fee TEXT NOT NULL DEFAULT '',
      funding TEXT NOT NULL DEFAULT '',
      eligibility TEXT NOT NULL DEFAULT '',
      materials TEXT NOT NULL DEFAULT '',
      submission_method TEXT NOT NULL DEFAULT 'unknown',
      summary TEXT NOT NULL DEFAULT '',
      score INTEGER,
      risks TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      source TEXT NOT NULL DEFAULT '',
      raw_content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL,
      run_mode TEXT NOT NULL DEFAULT 'real',
      boundary_model TEXT NOT NULL DEFAULT 'internal_notes/user_review/external_submission',
      draft_zh TEXT NOT NULL DEFAULT '',
      draft_en TEXT NOT NULL DEFAULT '',
      checklist TEXT NOT NULL DEFAULT '',
      selected_works TEXT NOT NULL DEFAULT '',
      package_path TEXT NOT NULL DEFAULT '',
      submission_log TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(opportunity_id) REFERENCES opportunities(id)
    );

    CREATE INDEX IF NOT EXISTS idx_material_sources_updated ON material_sources(updated_at DESC, id DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_material_sources_file_path_unique
      ON material_sources(file_path)
      WHERE file_path <> '';
    CREATE INDEX IF NOT EXISTS idx_opportunities_updated ON opportunities(updated_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_opportunities_source_updated ON opportunities(source, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_applications_updated ON applications(updated_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_applications_opportunity ON applications(opportunity_id, updated_at DESC);
  `);

  database
    .prepare("INSERT OR IGNORE INTO artist_profile (id) VALUES (1)")
    .run();

  addColumn(database, "material_sources", "file_name", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "material_sources", "file_path", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "material_sources", "mime_type", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "material_sources", "analysis_json", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "artist_profile", "name_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "artist_profile", "name_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "artist_profile", "location_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "artist_profile", "location_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "artist_profile", "preferences_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "artist_profile", "preferences_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "artist_profile", "application_region", "TEXT NOT NULL DEFAULT 'worldwide'");
  addColumn(database, "artist_profile", "automation_batch_limit", "INTEGER NOT NULL DEFAULT 5");
  addColumn(database, "artist_profile", "submission_approval_mode", "TEXT NOT NULL DEFAULT 'review_required'");
  addColumn(database, "artist_profile", "opportunity_fee_preference", "TEXT NOT NULL DEFAULT 'conservative'");
  addColumn(database, "artist_profile", "opportunity_tier_preference", "TEXT NOT NULL DEFAULT 'high_tier'");
  addColumn(database, "works", "title_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "works", "title_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "works", "medium_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "works", "medium_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "works", "dimensions_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "works", "dimensions_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "category_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "category_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "title_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "title_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "organization_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "organization_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "location_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "location_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "notes_zh", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "cv_entries", "notes_en", "TEXT NOT NULL DEFAULT ''");
  addColumn(database, "applications", "run_mode", "TEXT NOT NULL DEFAULT 'real'");
  addColumn(database, "applications", "boundary_model", "TEXT NOT NULL DEFAULT 'internal_notes/user_review/external_submission'");

  runMigration(database, 1, "activity log", () => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL DEFAULT '',
        entity_id TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id, created_at DESC);
    `);
  });

  runMigration(database, 2, "package manifests", () => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS package_manifests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER,
        opportunity_id INTEGER,
        run_mode TEXT NOT NULL DEFAULT 'real',
        package_path TEXT NOT NULL,
        manifest_path TEXT NOT NULL UNIQUE,
        manifest_version INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(application_id) REFERENCES applications(id),
        FOREIGN KEY(opportunity_id) REFERENCES opportunities(id)
      );

      CREATE INDEX IF NOT EXISTS idx_package_manifests_updated ON package_manifests(updated_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_package_manifests_opportunity ON package_manifests(opportunity_id, updated_at DESC);
    `);
  });
  addColumn(database, "package_manifests", "run_mode", "TEXT NOT NULL DEFAULT 'real'");

  runMigration(database, 3, "opportunity discovery pipeline", () => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS opportunity_search_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_mode TEXT NOT NULL DEFAULT 'real',
        profile_json TEXT NOT NULL DEFAULT '{}',
        limits_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'completed',
        started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS opportunity_search_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_run_id INTEGER NOT NULL,
        query TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT '',
        region TEXT NOT NULL DEFAULT '',
        opportunity_type TEXT NOT NULL DEFAULT '',
        priority INTEGER NOT NULL DEFAULT 0,
        generated_from TEXT NOT NULL DEFAULT '',
        executed INTEGER NOT NULL DEFAULT 0,
        provider TEXT NOT NULL DEFAULT '',
        result_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(search_run_id) REFERENCES opportunity_search_runs(id)
      );

      CREATE TABLE IF NOT EXISTS opportunity_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        url TEXT NOT NULL DEFAULT '',
        region TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'unknown',
        last_error TEXT NOT NULL DEFAULT '',
        last_checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS opportunity_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_run_id INTEGER NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        normalized_title TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL,
        canonical_url TEXT NOT NULL DEFAULT '',
        normalized_url TEXT NOT NULL DEFAULT '',
        official_source_url TEXT NOT NULL DEFAULT '',
        is_official_source INTEGER NOT NULL DEFAULT 0,
        source_name TEXT NOT NULL DEFAULT '',
        source_type TEXT NOT NULL DEFAULT '',
        discovery_query TEXT NOT NULL DEFAULT '',
        discovery_language TEXT NOT NULL DEFAULT '',
        content_fingerprint TEXT NOT NULL DEFAULT '',
        duplicate_group_id TEXT NOT NULL DEFAULT '',
        triage_status TEXT NOT NULL DEFAULT 'uncertain',
        triage_reasons TEXT NOT NULL DEFAULT '[]',
        first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(search_run_id, normalized_url)
      );

      CREATE TABLE IF NOT EXISTS opportunity_candidate_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER NOT NULL,
        source_name TEXT NOT NULL DEFAULT '',
        source_type TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        discovery_query TEXT NOT NULL DEFAULT '',
        discovery_language TEXT NOT NULL DEFAULT '',
        discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(candidate_id) REFERENCES opportunity_candidates(id)
      );

      CREATE TABLE IF NOT EXISTS opportunity_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_run_id INTEGER NOT NULL,
        candidate_url TEXT NOT NULL,
        official_url TEXT NOT NULL DEFAULT '',
        application_url TEXT NOT NULL DEFAULT '',
        organization TEXT NOT NULL DEFAULT '',
        opportunity_type TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        country TEXT NOT NULL DEFAULT '',
        deadline TEXT NOT NULL DEFAULT '',
        deadline_timezone TEXT NOT NULL DEFAULT '',
        deadline_confidence TEXT NOT NULL DEFAULT 'unknown',
        application_fee TEXT NOT NULL DEFAULT '',
        currency TEXT NOT NULL DEFAULT '',
        eligibility TEXT NOT NULL DEFAULT '',
        required_materials TEXT NOT NULL DEFAULT '[]',
        source_reliability INTEGER NOT NULL DEFAULT 0,
        verification_status TEXT NOT NULL DEFAULT 'unverified',
        score_total INTEGER NOT NULL DEFAULT 0,
        score_json TEXT NOT NULL DEFAULT '{}',
        verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(search_run_id) REFERENCES opportunity_search_runs(id)
      );

      CREATE TABLE IF NOT EXISTS opportunity_search_coverage_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_run_id INTEGER NOT NULL,
        report_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(search_run_id) REFERENCES opportunity_search_runs(id)
      );

      CREATE TABLE IF NOT EXISTS opportunity_fetch_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        normalized_url TEXT NOT NULL UNIQUE,
        content_fingerprint TEXT NOT NULL DEFAULT '',
        content_excerpt TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'unknown',
        fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_opportunity_search_queries_run ON opportunity_search_queries(search_run_id, priority DESC);
      CREATE INDEX IF NOT EXISTS idx_opportunity_candidates_run ON opportunity_candidates(search_run_id, triage_status, last_seen_at DESC);
      CREATE INDEX IF NOT EXISTS idx_opportunity_candidates_dedupe ON opportunity_candidates(duplicate_group_id, canonical_url);
      CREATE INDEX IF NOT EXISTS idx_opportunity_verifications_run ON opportunity_verifications(search_run_id, score_total DESC);
      CREATE INDEX IF NOT EXISTS idx_opportunity_coverage_created ON opportunity_search_coverage_reports(created_at DESC, id DESC);
    `);
  });
}

function addColumn(database: Database.Database, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((item) => item.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function runMigration(database: Database.Database, version: number, name: string, apply: () => void) {
  const existing = database.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
  if (existing) return;
  const tx = database.transaction(() => {
    apply();
    database.prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(version, name);
  });
  tx();
}

const materialKinds = new Set<MaterialKind>(["cv", "bio", "statement", "works", "portfolio", "other"]);
const opportunityStatuses = new Set<OpportunityStatus>([
  "new",
  "recommended",
  "selected_by_user",
  "not_selected",
  "confirmed",
  "preparing",
  "quality_blocked",
  "package_ready_for_final_review",
  "approved_for_submission",
  "ready_to_submit",
  "submitted",
  "waiting",
  "shortlisted",
  "rejected"
]);
const submissionMethods = new Set<SubmissionMethod>(["email", "web_form", "unknown"]);
const submissionApprovalModes = new Set<SubmissionApprovalMode>(["review_required", "review_optional", "direct_apply"]);
const opportunityFeePreferences = new Set(["conservative", "application_fee_ok", "paid_ok"]);
const opportunityTierPreferences = new Set(["high_tier", "balanced", "open"]);
const automationRunModes = new Set<AutomationRunMode>(["real", "test", "mock"]);

function coerceMaterialKind(value: string): MaterialKind {
  return materialKinds.has(value as MaterialKind) ? (value as MaterialKind) : "other";
}

function coerceOpportunityStatus(value: string): OpportunityStatus {
  return opportunityStatuses.has(value as OpportunityStatus) ? (value as OpportunityStatus) : "new";
}

function coerceAutomationRunMode(value: string): AutomationRunMode {
  return automationRunModes.has(value as AutomationRunMode) ? (value as AutomationRunMode) : "real";
}

function coerceSubmissionMethod(value: string): SubmissionMethod {
  return submissionMethods.has(value as SubmissionMethod) ? (value as SubmissionMethod) : "unknown";
}

function coerceSubmissionApprovalMode(value: string): SubmissionApprovalMode {
  return submissionApprovalModes.has(value as SubmissionApprovalMode)
    ? (value as SubmissionApprovalMode)
    : "review_required";
}

function coerceOpportunityFeePreference(value: string): ArtistProfile["opportunityFeePreference"] {
  return opportunityFeePreferences.has(value) ? (value as ArtistProfile["opportunityFeePreference"]) : "conservative";
}

function coerceOpportunityTierPreference(value: string): ArtistProfile["opportunityTierPreference"] {
  return opportunityTierPreferences.has(value) ? (value as ArtistProfile["opportunityTierPreference"]) : "high_tier";
}

const mapProfile = (row: ProfileRow): ArtistProfile => ({
  id: row.id,
  name: row.name,
  nameZh: row.name_zh || row.name,
  nameEn: row.name_en || row.name,
  email: row.email,
  location: row.location,
  locationZh: row.location_zh || row.location,
  locationEn: row.location_en || row.location,
  website: row.website,
  instagram: row.instagram,
  bioZhShort: row.bio_zh_short,
  bioZhMedium: row.bio_zh_medium,
  bioZhLong: row.bio_zh_long,
  bioEnShort: row.bio_en_short,
  bioEnMedium: row.bio_en_medium,
  bioEnLong: row.bio_en_long,
  statementZh: row.statement_zh,
  statementEn: row.statement_en,
  preferences: row.preferences,
  preferencesZh: row.preferences_zh || row.preferences,
  preferencesEn: row.preferences_en || row.preferences,
  applicationRegion: row.application_region || "worldwide",
  automationBatchLimit: Math.max(1, Math.min(100, Number(row.automation_batch_limit) || 5)),
  submissionApprovalMode: coerceSubmissionApprovalMode(row.submission_approval_mode),
  opportunityFeePreference: coerceOpportunityFeePreference(row.opportunity_fee_preference),
  opportunityTierPreference: coerceOpportunityTierPreference(row.opportunity_tier_preference),
  updatedAt: row.updated_at
});

const mapWork = (row: WorkRow): Work => ({
  id: row.id,
  title: row.title,
  titleZh: row.title_zh || row.title,
  titleEn: row.title_en || row.title,
  year: row.year,
  medium: row.medium,
  mediumZh: row.medium_zh || row.medium,
  mediumEn: row.medium_en || row.medium,
  dimensions: row.dimensions,
  dimensionsZh: row.dimensions_zh || row.dimensions,
  dimensionsEn: row.dimensions_en || row.dimensions,
  imagePath: row.image_path,
  descriptionZh: row.description_zh,
  descriptionEn: row.description_en
});

const mapCv = (row: CvRow): CvEntry => ({
  id: row.id,
  category: row.category,
  categoryZh: row.category_zh || row.category,
  categoryEn: row.category_en || row.category,
  year: row.year,
  title: row.title,
  titleZh: row.title_zh || row.title,
  titleEn: row.title_en || row.title,
  organization: row.organization,
  organizationZh: row.organization_zh || row.organization,
  organizationEn: row.organization_en || row.organization,
  location: row.location,
  locationZh: row.location_zh || row.location,
  locationEn: row.location_en || row.location,
  notes: row.notes,
  notesZh: row.notes_zh || row.notes,
  notesEn: row.notes_en || row.notes
});

const mapSourceMaterial = (row: SourceMaterialRow): SourceMaterial => ({
  id: row.id,
  kind: coerceMaterialKind(row.kind),
  title: row.title,
  content: row.content,
  analysis: row.analysis_json || "",
  fileName: row.file_name,
  filePath: row.file_path,
  mimeType: row.mime_type,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapOpportunity = (row: OpportunityRow): Opportunity => ({
  id: row.id,
  title: row.title,
  organization: row.organization,
  url: row.url,
  location: row.location,
  deadline: row.deadline,
  fee: row.fee,
  funding: row.funding,
  eligibility: row.eligibility,
  materials: row.materials,
  submissionMethod: coerceSubmissionMethod(row.submission_method),
  summary: row.summary,
  score: row.score,
  risks: row.risks,
  status: coerceOpportunityStatus(row.status),
  source: row.source,
  rawContent: row.raw_content,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapApplication = (row: ApplicationRow): Application => ({
  id: row.id,
  opportunityId: row.opportunity_id,
  runMode: coerceAutomationRunMode(row.run_mode),
  boundaryModel: row.boundary_model || "internal_notes/user_review/external_submission",
  draftZh: row.draft_zh,
  draftEn: row.draft_en,
  checklist: row.checklist,
  selectedWorks: row.selected_works,
  packagePath: row.package_path,
  submissionLog: row.submission_log,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapActivityLog = (row: ActivityLogRow): ActivityLog => ({
  id: row.id,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  summary: row.summary,
  metadata: row.metadata,
  createdAt: row.created_at
});

const mapPackageManifest = (row: PackageManifestRow): PackageManifest => ({
  id: row.id,
  applicationId: row.application_id,
  opportunityId: row.opportunity_id,
  runMode: coerceAutomationRunMode(row.run_mode),
  packagePath: row.package_path,
  manifestPath: row.manifest_path,
  manifestVersion: row.manifest_version,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

function positiveLimit(value: number | undefined, fallback: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.trunc(value as number), max));
}

function contentLimit(value: number | undefined, fallback: number, max: number) {
  if (value === 0) return 0;
  return positiveLimit(value, fallback, max);
}

function countRows(database: Database.Database, table: string, where = "1=1") {
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`).get() as { count: number };
  return row.count;
}

function deleteRowsMissingFromPayload(database: Database.Database, table: "works" | "cv_entries", ids: number[]) {
  const savedIds = ids.filter((id) => Number.isInteger(id) && id > 0);
  if (savedIds.length === 0) {
    database.prepare(`DELETE FROM ${table}`).run();
    return;
  }
  const placeholders = savedIds.map(() => "?").join(",");
  database.prepare(`DELETE FROM ${table} WHERE id NOT IN (${placeholders})`).run(...savedIds);
}

export function readArtistData(options: ReadArtistDataOptions = {}) {
  const database = getDb();
  const materialLimit = positiveLimit(options.materialLimit, 120, 1000);
  const materialContentLimit = contentLimit(options.materialContentLimit, 12000, 50000);
  const opportunityLimit = positiveLimit(options.opportunityLimit, 200, 2000);
  const opportunityRawContentLimit = contentLimit(options.opportunityRawContentLimit, 4000, 30000);
  const applicationLimit = positiveLimit(options.applicationLimit, 100, 1000);
  const materialContentSql = materialContentLimit > 0 ? "substr(content, 1, @materialContentLimit) AS content" : "'' AS content";
  const materialAnalysisSql = materialContentLimit > 0 ? "substr(analysis_json, 1, @materialContentLimit) AS analysis_json" : "'' AS analysis_json";
  const opportunityRawSql = opportunityRawContentLimit > 0 ? "substr(raw_content, 1, @opportunityRawContentLimit) AS raw_content" : "'' AS raw_content";

  return {
    profile: mapProfile(database.prepare("SELECT * FROM artist_profile WHERE id = 1").get() as ProfileRow),
    works: database.prepare(`
      SELECT * FROM works
      WHERE trim(title || title_zh || title_en || year || medium || medium_zh || medium_en || dimensions || dimensions_zh || dimensions_en || image_path || description_zh || description_en) <> ''
      ORDER BY year DESC, id DESC
    `).all().map((row) => mapWork(row as WorkRow)),
    cv: database.prepare(`
      SELECT * FROM cv_entries
      WHERE trim(year || title || title_zh || title_en || organization || organization_zh || organization_en || location || location_zh || location_en || notes || notes_zh || notes_en) <> ''
      ORDER BY year DESC, id DESC
    `).all().map((row) => mapCv(row as CvRow)),
    materialSources: database.prepare(`
      SELECT id, kind, title, ${materialContentSql}, ${materialAnalysisSql}, file_name, file_path, mime_type, created_at, updated_at
      FROM material_sources
      WHERE trim(title || content || file_name || file_path) <> ''
      ORDER BY updated_at DESC, id DESC
      LIMIT @materialLimit
    `).all({ materialLimit, materialContentLimit }).map((row) => mapSourceMaterial(row as SourceMaterialRow)),
    opportunities: database.prepare(`
      SELECT id, title, organization, url, location, deadline, fee, funding, eligibility, materials,
        submission_method, summary, score, risks, status, source, ${opportunityRawSql}, created_at, updated_at
      FROM opportunities
      ORDER BY updated_at DESC, id DESC
      LIMIT @opportunityLimit
    `).all({ opportunityLimit, opportunityRawContentLimit }).map((row) => mapOpportunity(row as OpportunityRow)),
    applications: database.prepare(`
      SELECT *
      FROM applications
      ORDER BY updated_at DESC, id DESC
      LIMIT @applicationLimit
    `).all({ applicationLimit }).map((row) => mapApplication(row as ApplicationRow)),
    counts: {
      works: countRows(database, "works", "trim(title || title_zh || title_en || year || medium || medium_zh || medium_en || dimensions || dimensions_zh || dimensions_en || image_path || description_zh || description_en) <> ''"),
      cv: countRows(database, "cv_entries", "trim(year || title || title_zh || title_en || organization || organization_zh || organization_en || location || location_zh || location_en || notes || notes_zh || notes_en) <> ''"),
      materialSources: countRows(database, "material_sources", "trim(title || content || file_name || file_path) <> ''"),
      opportunities: countRows(database, "opportunities"),
      applications: countRows(database, "applications")
    },
    searchCoverageReport: readLatestSearchCoverageReport()
  };
}

export function readMaterialFilePaths() {
  return getDb()
    .prepare("SELECT file_path FROM material_sources WHERE file_path <> ''")
    .all()
    .map((row) => (row as { file_path: string }).file_path);
}

export function saveArtistData(payload: ArtistPayload) {
  const database = getDb();
  const tx = database.transaction(() => {
    database.prepare(`
      UPDATE artist_profile SET
        name=@name, name_zh=@nameZh, name_en=@nameEn, email=@email,
        location=@location, location_zh=@locationZh, location_en=@locationEn,
        website=@website, instagram=@instagram,
        bio_zh_short=@bioZhShort, bio_zh_medium=@bioZhMedium, bio_zh_long=@bioZhLong,
        bio_en_short=@bioEnShort, bio_en_medium=@bioEnMedium, bio_en_long=@bioEnLong,
        statement_zh=@statementZh, statement_en=@statementEn,
        preferences=@preferences, preferences_zh=@preferencesZh, preferences_en=@preferencesEn,
        application_region=@applicationRegion,
        automation_batch_limit=@automationBatchLimit,
        submission_approval_mode=@submissionApprovalMode,
        opportunity_fee_preference=@opportunityFeePreference,
        opportunity_tier_preference=@opportunityTierPreference,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=1
    `).run(payload.profile);

    const updateWork = database.prepare(`
      UPDATE works SET title=@title, title_zh=@titleZh, title_en=@titleEn,
        year=@year, medium=@medium, medium_zh=@mediumZh, medium_en=@mediumEn,
        dimensions=@dimensions, dimensions_zh=@dimensionsZh, dimensions_en=@dimensionsEn,
        image_path=@imagePath, description_zh=@descriptionZh, description_en=@descriptionEn
      WHERE id=@id
    `);
    const insertWork = database.prepare(`
      INSERT INTO works (
        title, title_zh, title_en, year, medium, medium_zh, medium_en,
        dimensions, dimensions_zh, dimensions_en, image_path, description_zh, description_en
      )
      VALUES (
        @title, @titleZh, @titleEn, @year, @medium, @mediumZh, @mediumEn,
        @dimensions, @dimensionsZh, @dimensionsEn, @imagePath, @descriptionZh, @descriptionEn
      )
    `);
    for (const work of payload.works) {
      if (work.id > 0 && updateWork.run(work).changes > 0) continue;
      const result = insertWork.run(work);
      work.id = Number(result.lastInsertRowid);
    }
    deleteRowsMissingFromPayload(database, "works", payload.works.map((work) => work.id));

    const updateCv = database.prepare(`
      UPDATE cv_entries SET category=@category, category_zh=@categoryZh, category_en=@categoryEn,
        year=@year, title=@title, title_zh=@titleZh, title_en=@titleEn,
        organization=@organization, organization_zh=@organizationZh, organization_en=@organizationEn,
        location=@location, location_zh=@locationZh, location_en=@locationEn,
        notes=@notes, notes_zh=@notesZh, notes_en=@notesEn
      WHERE id=@id
    `);
    const insertCv = database.prepare(`
      INSERT INTO cv_entries (
        category, category_zh, category_en, year, title, title_zh, title_en,
        organization, organization_zh, organization_en, location, location_zh, location_en,
        notes, notes_zh, notes_en
      )
      VALUES (
        @category, @categoryZh, @categoryEn, @year, @title, @titleZh, @titleEn,
        @organization, @organizationZh, @organizationEn, @location, @locationZh, @locationEn,
        @notes, @notesZh, @notesEn
      )
    `);
    for (const entry of payload.cv) {
      if (entry.id > 0 && updateCv.run(entry).changes > 0) continue;
      const result = insertCv.run(entry);
      entry.id = Number(result.lastInsertRowid);
    }
    deleteRowsMissingFromPayload(database, "cv_entries", payload.cv.map((entry) => entry.id));

    const updateSource = database.prepare(`
      UPDATE material_sources SET kind=@kind, title=@title, content=@content, analysis_json=@analysis, file_name=@fileName,
        file_path=@filePath, mime_type=@mimeType, updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `);
    const insertSource = database.prepare(`
      INSERT OR IGNORE INTO material_sources (kind, title, content, analysis_json, file_name, file_path, mime_type, updated_at)
      VALUES (@kind, @title, @content, @analysis, @fileName, @filePath, @mimeType, CURRENT_TIMESTAMP)
    `);
    for (const source of payload.materialSources) {
      if (source.id > 0 && updateSource.run(source).changes > 0) continue;
      insertSource.run(source);
    }
  });

  tx();
  logActivity({
    action: "artist_data_saved",
    entityType: "artist_profile",
    entityId: "1",
    summary: "Artist profile, works, CV entries, and material sources were saved from the app.",
    metadata: {
      works: payload.works.length,
      cv: payload.cv.length,
      materialSources: payload.materialSources.length
    }
  });
}

export function deleteMaterialSource(id: number) {
  const result = getDb().prepare("DELETE FROM material_sources WHERE id = ?").run(id);
  return result.changes > 0;
}

export function deleteCvEntry(id: number) {
  const result = getDb().prepare("DELETE FROM cv_entries WHERE id = ?").run(id);
  return result.changes > 0;
}

export function deleteWorkEntry(id: number) {
  const result = getDb().prepare("DELETE FROM works WHERE id = ?").run(id);
  return result.changes > 0;
}

export function upsertOpportunity(input: Partial<Opportunity> & { url: string }) {
  const database = getDb();
  database.prepare(`
    INSERT INTO opportunities (
      title, organization, url, location, deadline, fee, funding, eligibility, materials,
      submission_method, summary, score, risks, status, source, raw_content, updated_at
    ) VALUES (
      @title, @organization, @url, @location, @deadline, @fee, @funding, @eligibility, @materials,
      @submissionMethod, @summary, @score, @risks, @status, @source, @rawContent, CURRENT_TIMESTAMP
    )
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      organization = excluded.organization,
      location = excluded.location,
      deadline = excluded.deadline,
      fee = excluded.fee,
      funding = excluded.funding,
      eligibility = excluded.eligibility,
      materials = excluded.materials,
      submission_method = excluded.submission_method,
      summary = excluded.summary,
      score = excluded.score,
      risks = excluded.risks,
      status = excluded.status,
      source = excluded.source,
      raw_content = excluded.raw_content,
      updated_at = CURRENT_TIMESTAMP
  `).run({
    title: input.title ?? "",
    organization: input.organization ?? "",
    url: input.url,
    location: input.location ?? "",
    deadline: input.deadline ?? "",
    fee: input.fee ?? "",
    funding: input.funding ?? "",
    eligibility: input.eligibility ?? "",
    materials: input.materials ?? "",
    submissionMethod: input.submissionMethod ?? "unknown",
    summary: input.summary ?? "",
    score: input.score ?? null,
    risks: input.risks ?? "",
    status: input.status ?? "new",
    source: input.source ?? "",
    rawContent: input.rawContent ?? ""
  });
  logActivity({
    action: "opportunity_upserted",
    entityType: "opportunity",
    entityId: input.url,
    summary: input.title || input.url,
    metadata: { source: input.source ?? "", status: input.status ?? "new" }
  });
}

export function addManualOpportunityLink(input: { url: string; title?: string; notes?: string }) {
  const url = normalizePublicOpportunityUrl(input.url);
  upsertOpportunity({
    url,
    title: input.title?.trim() || url,
    summary: input.notes?.trim() || "User-provided opportunity link. Codex automation or project automation must verify eligibility, deadline, fees, funding, requirements, and submission method before recommending or preparing an application.",
    source: "user-provided-link",
    status: "new",
    risks: "Unverified user-provided link. Must verify source page before applying."
  });
  logActivity({
    action: "manual_opportunity_added",
    entityType: "opportunity",
    entityId: url,
    summary: input.title?.trim() || url,
    metadata: { notes: input.notes?.trim() || "" }
  });
}

export function getOpportunity(id: number) {
  const row = getDb().prepare("SELECT * FROM opportunities WHERE id = ?").get(id);
  return row ? mapOpportunity(row as OpportunityRow) : null;
}

export function updateOpportunityStatus(id: number, status: OpportunityStatus) {
  const result = getDb().prepare("UPDATE opportunities SET status = @status, updated_at = CURRENT_TIMESTAMP WHERE id = @id").run({ id, status });
  if (result.changes > 0) {
    logActivity({
      action: "opportunity_status_updated",
      entityType: "opportunity",
      entityId: id,
      summary: status,
      metadata: { status }
    });
  }
  return result.changes > 0;
}

export function getApplication(id: number) {
  const row = getDb().prepare("SELECT * FROM applications WHERE id = ?").get(id);
  return row ? mapApplication(row as ApplicationRow) : null;
}

export function getApplicationByOpportunity(opportunityId: number) {
  const row = getDb().prepare("SELECT * FROM applications WHERE opportunity_id = ? ORDER BY updated_at DESC LIMIT 1").get(opportunityId);
  return row ? mapApplication(row as ApplicationRow) : null;
}

export function createApplication(input: Omit<Application, "id" | "createdAt" | "updatedAt">) {
  const result = getDb().prepare(`
    INSERT INTO applications (opportunity_id, run_mode, boundary_model, draft_zh, draft_en, checklist, selected_works, package_path, submission_log)
    VALUES (@opportunityId, @runMode, @boundaryModel, @draftZh, @draftEn, @checklist, @selectedWorks, @packagePath, @submissionLog)
  `).run(input);
  const id = Number(result.lastInsertRowid);
  logActivity({
    action: "application_created",
    entityType: "application",
    entityId: String(id),
    summary: input.packagePath,
    metadata: { opportunityId: input.opportunityId, runMode: input.runMode }
  });
  return id;
}

export function logActivity(input: {
  action: string;
  entityType?: string;
  entityId?: string | number;
  summary?: string;
  metadata?: unknown;
}) {
  const metadata = input.metadata === undefined ? "{}" : JSON.stringify(input.metadata);
  getDb().prepare(`
    INSERT INTO activity_log (action, entity_type, entity_id, summary, metadata)
    VALUES (@action, @entityType, @entityId, @summary, @metadata)
  `).run({
    action: input.action,
    entityType: input.entityType ?? "",
    entityId: input.entityId === undefined ? "" : String(input.entityId),
    summary: input.summary ?? "",
    metadata
  });
}

export function readActivityLog(limit = 100) {
  return getDb()
    .prepare("SELECT * FROM activity_log ORDER BY created_at DESC, id DESC LIMIT ?")
    .all(positiveLimit(limit, 100, 1000))
    .map((row) => mapActivityLog(row as ActivityLogRow));
}

export function recordPackageManifest(input: {
  applicationId?: number | null;
  opportunityId?: number | null;
  packagePath: string;
  manifestPath: string;
  manifestVersion?: number;
  status?: string;
  runMode?: AutomationRunMode;
}) {
  getDb().prepare(`
    INSERT INTO package_manifests (
      application_id, opportunity_id, run_mode, package_path, manifest_path, manifest_version, status, updated_at
    ) VALUES (
      @applicationId, @opportunityId, @runMode, @packagePath, @manifestPath, @manifestVersion, @status, CURRENT_TIMESTAMP
    )
    ON CONFLICT(manifest_path) DO UPDATE SET
      application_id = excluded.application_id,
      opportunity_id = excluded.opportunity_id,
      run_mode = excluded.run_mode,
      package_path = excluded.package_path,
      manifest_version = excluded.manifest_version,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).run({
    applicationId: input.applicationId ?? null,
    opportunityId: input.opportunityId ?? null,
    runMode: input.runMode ?? "real",
    packagePath: input.packagePath,
    manifestPath: input.manifestPath,
    manifestVersion: input.manifestVersion ?? 1,
    status: input.status ?? "draft"
  });
  logActivity({
    action: "package_manifest_recorded",
    entityType: "package_manifest",
    entityId: input.manifestPath,
    summary: input.packagePath,
    metadata: { opportunityId: input.opportunityId ?? null, applicationId: input.applicationId ?? null, runMode: input.runMode ?? "real" }
  });
}

export function readPackageManifests(limit = 100) {
  return getDb()
    .prepare("SELECT * FROM package_manifests ORDER BY updated_at DESC, id DESC LIMIT ?")
    .all(positiveLimit(limit, 100, 1000))
    .map((row) => mapPackageManifest(row as PackageManifestRow));
}

export function recordOpportunityDiscoveryRun(input: {
  runMode: AutomationRunMode;
  profile: unknown;
  limits: unknown;
  queries: SearchQuery[];
  candidates: ScoredCandidate[];
  shortlist: ShortlistedCandidate[];
  coverage: SearchCoverageReport;
}) {
  const database = getDb();
  const tx = database.transaction(() => {
    const run = database.prepare(`
      INSERT INTO opportunity_search_runs (run_mode, profile_json, limits_json, status, completed_at)
      VALUES (@runMode, @profileJson, @limitsJson, 'completed', CURRENT_TIMESTAMP)
    `).run({
      runMode: input.runMode,
      profileJson: JSON.stringify(input.profile),
      limitsJson: JSON.stringify(input.limits)
    });
    const runId = Number(run.lastInsertRowid);
    const insertQuery = database.prepare(`
      INSERT INTO opportunity_search_queries (
        search_run_id, query, language, region, opportunity_type, priority, generated_from, executed, provider, result_count
      ) VALUES (
        @runId, @query, @language, @region, @opportunityType, @priority, @generatedFrom, @executed, @provider, @resultCount
      )
    `);
    for (const query of input.queries) {
      insertQuery.run({
        runId,
        query: query.query,
        language: query.language,
        region: query.region,
        opportunityType: query.opportunityType,
        priority: query.priority,
        generatedFrom: query.generatedFrom.join(", "),
        executed: 1,
        provider: "",
        resultCount: 0
      });
    }

    const insertCandidate = database.prepare(`
      INSERT OR IGNORE INTO opportunity_candidates (
        search_run_id, title, normalized_title, url, canonical_url, normalized_url, official_source_url,
        is_official_source, source_name, source_type, discovery_query, discovery_language, content_fingerprint,
        duplicate_group_id, triage_status, triage_reasons, discovered_at, last_seen_at
      ) VALUES (
        @runId, @title, @normalizedTitle, @url, @canonicalUrl, @normalizedUrl, @officialSourceUrl,
        @isOfficialSource, @sourceName, @sourceType, @discoveryQuery, @discoveryLanguage, @contentFingerprint,
        @duplicateGroupId, @triageStatus, @triageReasons, @discoveredAt, CURRENT_TIMESTAMP
      )
    `);
    const insertVerification = database.prepare(`
      INSERT INTO opportunity_verifications (
        search_run_id, candidate_url, official_url, application_url, organization, opportunity_type, location,
        country, deadline, deadline_timezone, deadline_confidence, application_fee, currency, eligibility,
        required_materials, source_reliability, verification_status, score_total, score_json, verified_at
      ) VALUES (
        @runId, @candidateUrl, @officialUrl, @applicationUrl, @organization, @opportunityType, @location,
        @country, @deadline, @deadlineTimezone, @deadlineConfidence, @applicationFee, @currency, @eligibility,
        @requiredMaterials, @sourceReliability, @verificationStatus, @scoreTotal, @scoreJson, @verifiedAt
      )
    `);
    for (const candidate of input.candidates) {
      insertCandidate.run({
        runId,
        title: candidate.title,
        normalizedTitle: candidate.normalizedTitle,
        url: candidate.url,
        canonicalUrl: candidate.canonicalUrl,
        normalizedUrl: candidate.normalizedUrl,
        officialSourceUrl: candidate.officialSourceUrl || "",
        isOfficialSource: candidate.isOfficialSource ? 1 : 0,
        sourceName: candidate.sourceName,
        sourceType: candidate.sourceType,
        discoveryQuery: candidate.discoveryQuery || "",
        discoveryLanguage: candidate.discoveryLanguage || "",
        contentFingerprint: candidate.contentFingerprint,
        duplicateGroupId: candidate.duplicateGroupId,
        triageStatus: candidate.triageStatus,
        triageReasons: JSON.stringify(candidate.triageReasons),
        discoveredAt: candidate.discoveredAt
      });
      insertVerification.run({
        runId,
        candidateUrl: candidate.url,
        officialUrl: candidate.officialUrl,
        applicationUrl: candidate.applicationUrl || "",
        organization: candidate.organization,
        opportunityType: candidate.opportunityType,
        location: candidate.location,
        country: candidate.country,
        deadline: candidate.deadline,
        deadlineTimezone: candidate.deadlineTimezone,
        deadlineConfidence: candidate.deadlineConfidence,
        applicationFee: candidate.applicationFee,
        currency: candidate.currency,
        eligibility: candidate.eligibility,
        requiredMaterials: JSON.stringify(candidate.requiredMaterials),
        sourceReliability: candidate.sourceReliability,
        verificationStatus: candidate.verificationStatus,
        scoreTotal: candidate.scoreBreakdown.total,
        scoreJson: JSON.stringify(candidate.scoreBreakdown),
        verifiedAt: candidate.verifiedAt
      });
    }
    database.prepare(`
      INSERT INTO opportunity_search_coverage_reports (search_run_id, report_json)
      VALUES (?, ?)
    `).run(runId, JSON.stringify(input.coverage));
    return runId;
  });
  const runId = tx();
  logActivity({
    action: "opportunity_discovery_run_recorded",
    entityType: "opportunity_search_run",
    entityId: runId,
    summary: `Opportunity discovery run recorded with ${input.coverage.shortlistedCount} shortlisted recommendation(s).`,
    metadata: input.coverage
  });
  return runId;
}

export function readLatestSearchCoverageReport(): SearchCoverageReport | null {
  const database = getDb();
  const table = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='opportunity_search_coverage_reports'").get();
  if (!table) return null;
  const row = database.prepare(`
    SELECT * FROM opportunity_search_coverage_reports
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).get() as SearchCoverageReportRow | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.report_json) as SearchCoverageReport;
  } catch {
    return null;
  }
}
