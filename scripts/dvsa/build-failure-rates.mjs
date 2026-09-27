#!/usr/bin/env node
/**
 * DVSA anonymised MOT results → `model_failure_rates`.
 *
 * Source: "Anonymised MOT tests and results", Department for Transport,
 * Open Government Licence. One zip per year for test results, one for test
 * items (defects), one for the lookup tables.
 *   https://www.data.gov.uk/dataset/e3939ef8-30c7-4ca8-9c7c-ad9475cc9b2f/anonymised-mot-tests-and-results
 *
 * What comes out: for every (make, model family, age band, mileage band,
 * system) with enough tests, how many normal MOT tests happened, how many had
 * at least one failure item in that system, how many had an advisory. Plus
 * the same cells with age band = ALL, per-model totals, and a fleet-wide
 * baseline (make = '*'). That is the "on this model, X % fail on brakes at
 * your mileage" layer of the Health page.
 *
 * Usage
 *   node scripts/dvsa/build-failure-rates.mjs --dir ./data/dvsa/2023 [--dir ./data/dvsa/2022 …]
 *        [--db ./data/dvsa/work.sqlite] [--out ./data/model-failure-rates.json]
 *        [--min-tests 50] [--upload]
 *
 * `--dir` folders must contain the extracted CSVs: test_result*.csv,
 * test_item*.csv and the lookups (item_detail*.csv, item_group*.csv).
 * Delimiter (comma or pipe) is auto-detected. `--upload` upserts the JSON into
 * Supabase using SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the env.
 *
 * Runtime: the 2023 year is ~40 M tests / ~60 M items; loading into SQLite
 * takes 15–40 min on a laptop, aggregation a few minutes. Node ≥ 22.5 for
 * `node:sqlite`.
 */

import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve, dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { classifySystem, ageBand, kmBand, MI_TO_KM, normaliseMake, normaliseModel, SYSTEMS } from './systems.mjs';

// ── CLI ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);
const dirs = args.flatMap((a, i) => (a === '--dir' && args[i + 1] ? [resolve(args[i + 1])] : []));
const dbPath = resolve(opt('db', './data/dvsa/work.sqlite'));
const outPath = resolve(opt('out', './data/model-failure-rates.json'));
const minTests = Number(opt('min-tests', '50'));
const skipLoad = flag('skip-load');

if (dirs.length === 0 && !skipLoad) {
  console.error('Give at least one --dir with extracted DVSA CSVs (or --skip-load to reuse an existing --db).');
  process.exit(1);
}

mkdirSync(dirname(dbPath), { recursive: true });
mkdirSync(dirname(outPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = OFF;
  PRAGMA synchronous = OFF;
  PRAGMA temp_store = MEMORY;
  PRAGMA cache_size = -400000;
  CREATE TABLE IF NOT EXISTS tests (
    test_id INTEGER PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    age_band TEXT,
    km_band TEXT,
    failed INTEGER NOT NULL,
    year INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rfr_system (rfr_id INTEGER PRIMARY KEY, system TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS items (
    test_id INTEGER NOT NULL,
    system TEXT NOT NULL,
    kind TEXT NOT NULL  -- 'F' fail (incl. major/dangerous/PRS) | 'A' advisory/minor
  );
`);

// ── CSV streaming (delimiter auto-detected from the header) ─────────
function splitLine(line, delim) {
  // The DVSA files never quote fields, so a plain split is safe and fast.
  return line.split(delim);
}

async function* rows(file) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let header = null;
  let delim = ',';
  for await (const line of rl) {
    if (!line) continue;
    if (!header) {
      delim = (line.match(/\|/g)?.length ?? 0) > (line.match(/,/g)?.length ?? 0) ? '|' : ',';
      header = splitLine(line, delim).map((h) => h.trim().toLowerCase());
      continue;
    }
    const cells = splitLine(line, delim);
    const row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = cells[i]?.trim() ?? '';
    yield row;
  }
}

function filesMatching(dir, pattern) {
  return readdirSync(dir)
    .filter((f) => pattern.test(f) && statSync(join(dir, f)).isFile())
    .map((f) => join(dir, f));
}

function pick(row, ...names) {
  for (const n of names) if (row[n] !== undefined && row[n] !== '') return row[n];
  return '';
}

// ── 1. Lookups → rfr_id → system ─────────────────────────────────────
async function loadLookups(dir) {
  const groups = new Map(); // test_item_id → { parent, name }
  for (const f of filesMatching(dir, /item_group.*\.csv$/i)) {
    for await (const r of rows(f)) {
      const id = Number(pick(r, 'test_item_id', 'item_id'));
      if (!Number.isFinite(id)) continue;
      groups.set(id, { parent: Number(pick(r, 'parent_id')) || null, name: pick(r, 'item_name', 'name') });
    }
  }
  const rootName = (id) => {
    let cur = groups.get(id);
    let name = cur?.name ?? '';
    let guard = 0;
    while (cur && cur.parent && groups.has(cur.parent) && guard++ < 10) {
      cur = groups.get(cur.parent);
      name = `${cur.name} > ${name}`;
    }
    return name;
  };

  const insert = db.prepare('INSERT OR REPLACE INTO rfr_system (rfr_id, system) VALUES (?, ?)');
  let n = 0;
  db.exec('BEGIN');
  for (const f of filesMatching(dir, /item_detail.*\.csv$/i)) {
    for await (const r of rows(f)) {
      const rfrId = Number(pick(r, 'rfr_id'));
      if (!Number.isFinite(rfrId)) continue;
      const itemId = Number(pick(r, 'test_item_id'));
      const system = classifySystem(rootName(itemId), pick(r, 'rfr_desc'), pick(r, 'rfr_insp_manual_desc'), pick(r, 'rfr_advisory_text'));
      insert.run(rfrId, system);
      n++;
    }
  }
  db.exec('COMMIT');
  console.log(`  lookups: ${n} reasons-for-rejection classified (${groups.size} item groups)`);
}

// ── 2. Test results → tests (cars, normal tests only) ────────────────
async function loadTests(dir) {
  const insert = db.prepare('INSERT OR IGNORE INTO tests (test_id, make, model, age_band, km_band, failed, year) VALUES (?, ?, ?, ?, ?, ?, ?)');
  let n = 0, kept = 0;
  db.exec('BEGIN');
  for (const f of filesMatching(dir, /test_result.*\.csv$/i)) {
    console.log(`  reading ${f}`);
    for await (const r of rows(f)) {
      n++;
      if (n % 2_000_000 === 0) {
        db.exec('COMMIT; BEGIN');
        console.log(`    ${n.toLocaleString()} rows…`);
      }
      // Class 4 = cars (and small vans). NT = normal test; retests inflate failure rates.
      if (pick(r, 'test_class_id') !== '4') continue;
      const type = pick(r, 'test_type');
      if (type && type !== 'NT' && type !== 'N') continue;
      const result = pick(r, 'test_result');
      if (!['P', 'F', 'PRS'].includes(result)) continue; // skip abandoned/aborted

      const make = normaliseMake(pick(r, 'make'));
      const model = normaliseModel(pick(r, 'model'));
      if (!make || !model || make === 'UNCLASSIFIED') continue;

      const testDate = new Date(pick(r, 'test_date'));
      const firstUse = new Date(pick(r, 'first_use_date'));
      const age = Number.isNaN(testDate.getTime()) || Number.isNaN(firstUse.getTime()) ? null : (testDate - firstUse) / (365.25 * 86400000);
      const miles = Number(pick(r, 'test_mileage'));
      const km = Number.isFinite(miles) && miles > 0 ? miles * MI_TO_KM : null;

      insert.run(Number(pick(r, 'test_id')), make, model, ageBand(age), kmBand(km), result === 'P' ? 0 : 1, testDate.getFullYear() || 0);
      kept++;
    }
  }
  db.exec('COMMIT');
  console.log(`  tests: ${kept.toLocaleString()} kept of ${n.toLocaleString()}`);
}

// ── 3. Test items → items (system, fail/advisory) ────────────────────
async function loadItems(dir) {
  const systemOf = new Map(db.prepare('SELECT rfr_id, system FROM rfr_system').all().map((r) => [Number(r.rfr_id), r.system]));
  const known = db.prepare('SELECT 1 FROM tests WHERE test_id = ?');
  const insert = db.prepare('INSERT INTO items (test_id, system, kind) VALUES (?, ?, ?)');
  let n = 0, kept = 0;
  db.exec('BEGIN');
  for (const f of filesMatching(dir, /test_item.*\.csv$/i)) {
    console.log(`  reading ${f}`);
    for await (const r of rows(f)) {
      n++;
      if (n % 2_000_000 === 0) {
        db.exec('COMMIT; BEGIN');
        console.log(`    ${n.toLocaleString()} rows…`);
      }
      const testId = Number(pick(r, 'test_id'));
      if (!known.get(testId)) continue;
      const code = pick(r, 'rfr_type_code').toUpperCase();
      // Observed codes (2024 files): F fail, P = PRS (failed then fixed at the station),
      // M = minor defect (car still passes), A advisory. D (dangerous) appears in
      // older extracts. Failures = F, D, P/PRS; advisories = A, M.
      const kind = ['F', 'D', 'P', 'PRS'].includes(code) ? 'F' : ['A', 'M', 'MI', 'N'].includes(code) ? 'A' : null;
      if (!kind) continue;
      const system = systemOf.get(Number(pick(r, 'rfr_id'))) ?? 'other';
      insert.run(testId, system, kind);
      kept++;
    }
  }
  db.exec('COMMIT');
  console.log(`  items: ${kept.toLocaleString()} kept of ${n.toLocaleString()}`);
}

// ── 4. Aggregate ─────────────────────────────────────────────────────
function aggregate() {
  console.log('Aggregating…');
  db.exec(`
    CREATE INDEX IF NOT EXISTS items_test ON items(test_id);
    DROP TABLE IF EXISTS test_sys;
    -- One row per (test, system) with whether it had a fail / an advisory.
    CREATE TABLE test_sys AS
      SELECT test_id, system,
             MAX(CASE WHEN kind = 'F' THEN 1 ELSE 0 END) AS failed,
             MAX(CASE WHEN kind = 'A' THEN 1 ELSE 0 END) AS advised
      FROM items GROUP BY test_id, system;
    CREATE INDEX test_sys_test ON test_sys(test_id);
  `);

  const years = db.prepare('SELECT MIN(year) AS a, MAX(year) AS b FROM tests WHERE year > 0').get();
  const sourceYears = years?.a && years?.b ? (years.a === years.b ? String(years.a) : `${years.a}-${years.b}`) : 'unknown';

  // Denominators: tests per cell (make, model, age_band|ALL, km_band).
  // Numerators: joined per system. We compute the four groupings in SQL and
  // emit one JSON array. `*` stands for "all makes/models".
  const groupings = [
    { make: 't.make', model: 't.model', age: 't.age_band' },
    { make: 't.make', model: 't.model', age: `'ALL'` },
    { make: `'*'`, model: `'*'`, age: 't.age_band' },
    { make: `'*'`, model: `'*'`, age: `'ALL'` },
  ];
  const out = [];
  for (const g of groupings) {
    const sql = `
      WITH cells AS (
        SELECT ${g.make} AS make, ${g.model} AS model, ${g.age} AS age_band, t.km_band AS km_band,
               COUNT(*) AS tests, SUM(t.failed) AS failed_tests
        FROM tests t
        WHERE t.km_band IS NOT NULL ${g.age === 't.age_band' ? 'AND t.age_band IS NOT NULL' : ''}
        GROUP BY 1,2,3,4
        HAVING COUNT(*) >= ?
      ),
      sys AS (
        SELECT ${g.make} AS make, ${g.model} AS model, ${g.age} AS age_band, t.km_band AS km_band, s.system,
               SUM(s.failed) AS failures, SUM(s.advised) AS advisories
        FROM tests t JOIN test_sys s ON s.test_id = t.test_id
        WHERE t.km_band IS NOT NULL ${g.age === 't.age_band' ? 'AND t.age_band IS NOT NULL' : ''}
        GROUP BY 1,2,3,4,5
      )
      SELECT c.make, c.model, c.age_band, c.km_band, c.tests, c.failed_tests, s.system, s.failures, s.advisories
      FROM cells c LEFT JOIN sys s ON s.make = c.make AND s.model = c.model AND s.age_band = c.age_band AND s.km_band = c.km_band
    `;
    const rowsOut = db.prepare(sql).all(minTests);
    // Pivot: one record per cell with a systems map, plus an 'any' pseudo-system for the overall fail rate.
    const byCell = new Map();
    for (const r of rowsOut) {
      const key = `${r.make}|${r.model}|${r.age_band}|${r.km_band}`;
      let cell = byCell.get(key);
      if (!cell) {
        cell = { make: r.make, model: r.model, age_band: r.age_band, km_band: r.km_band, tests: Number(r.tests), failed_tests: Number(r.failed_tests), systems: {} };
        byCell.set(key, cell);
      }
      if (r.system) cell.systems[r.system] = { failures: Number(r.failures ?? 0), advisories: Number(r.advisories ?? 0) };
    }
    for (const cell of byCell.values()) {
      out.push({ ...cell, system: 'any', failures: cell.failed_tests, advisories: 0, fail_rate: round(cell.failed_tests / cell.tests) });
      for (const system of SYSTEMS) {
        const s = cell.systems[system];
        if (!s || (s.failures === 0 && s.advisories === 0)) continue;
        out.push({ make: cell.make, model: cell.model, age_band: cell.age_band, km_band: cell.km_band, tests: cell.tests, system, failures: s.failures, advisories: s.advisories, fail_rate: round(s.failures / cell.tests) });
      }
    }
  }
  const records = out.map(({ systems, failed_tests, ...r }) => ({ ...r, source_years: sourceYears }));
  writeFileSync(outPath, JSON.stringify(records));
  console.log(`  ${records.length.toLocaleString()} rows → ${outPath} (${(statSync(outPath).size / 1e6).toFixed(1)} MB)`);
  return records;
}

function round(x) {
  return Math.round(x * 10000) / 10000;
}

// ── 5. Optional upload to Supabase ───────────────────────────────────
async function upload(records) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --upload');
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const computedAt = new Date().toISOString();
  const BATCH = 1000;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH).map((r) => ({ ...r, computed_at: computedAt }));
    const { error } = await supabase.from('model_failure_rates').upsert(batch, { onConflict: 'make,model,age_band,km_band,system' });
    if (error) throw new Error(`upsert failed at ${i}: ${error.message}`);
    if ((i / BATCH) % 20 === 0) console.log(`  uploaded ${Math.min(i + BATCH, records.length).toLocaleString()} / ${records.length.toLocaleString()}`);
  }
  // Rows from a previous run that no longer exist stay behind; wipe them by computed_at.
  const { error } = await supabase.from('model_failure_rates').delete().lt('computed_at', computedAt);
  if (error) console.warn(`  could not prune stale rows: ${error.message}`);
  console.log('  upload complete');
}

// ── main ─────────────────────────────────────────────────────────────
const t0 = Date.now();
if (!skipLoad) {
  for (const dir of dirs) {
    if (!existsSync(dir)) throw new Error(`No such directory: ${dir}`);
    console.log(`Loading ${dir}`);
    await loadLookups(dir);
    await loadTests(dir);
    await loadItems(dir);
  }
}
const records = aggregate();
if (flag('upload')) await upload(records);
db.close();
console.log(`Done in ${Math.round((Date.now() - t0) / 1000)} s`);
