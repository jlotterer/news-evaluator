/**
 * update-archive-index.js
 * Scans public/data/archive/ and writes public/data/archive-index.json
 * Run automatically by the GitHub Action after generate.js completes.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE_DIR = path.join(__dirname, "..", "public", "data", "archive");
const INDEX_PATH = path.join(__dirname, "..", "public", "data", "archive-index.json");

const files = fs
  .readdirSync(ARCHIVE_DIR)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .map((f) => f.replace(".json", ""))
  .sort();

fs.writeFileSync(INDEX_PATH, JSON.stringify(files, null, 2));
console.log(`Archive index updated: ${files.length} entries`);
console.log(files.slice(-5).join(", "));
