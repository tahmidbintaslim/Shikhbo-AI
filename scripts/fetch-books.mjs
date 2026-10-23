#!/usr/bin/env node
// Downloads the NCTB textbooks listed in books/sources.json into books/,
// where scripts/ingest.ts expects them. Each file is checked against its
// recorded sha256; a mismatch stops the script and leaves nothing behind.
//
//   node scripts/fetch-books.mjs          # textbooks only
//   node scripts/fetch-books.mjs --ocr    # also the tesseract language data
//   node scripts/fetch-books.mjs --force  # download again even if present
//
// Run from the repository root.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const withOcr = args.has("--ocr");

const sources = JSON.parse(await readFile(path.join(root, "books", "sources.json"), "utf8"));
const entries = [...sources.books, ...(withOcr ? sources.ocrData : [])];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

function resolveInside(relative) {
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) {
    throw new Error(`refusing to write outside the repository: ${relative}`);
  }
  return target;
}

let failed = 0;
for (const entry of entries) {
  const target = resolveInside(entry.path);
  if (!entry.url) {
    console.warn(`skip  ${entry.path} (no verified download URL)`);
    continue;
  }
  if (!force && existsSync(target) && sha256(await readFile(target)) === entry.sha256) {
    console.log(`ok    ${entry.path} (already present)`);
    continue;
  }

  process.stdout.write(`fetch ${entry.path} ... `);
  try {
    const res = await fetch(entry.url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let data = Buffer.from(await res.arrayBuffer());
    if (entry.gzip) data = gunzipSync(data);
    const digest = sha256(data);
    if (entry.sha256 && digest !== entry.sha256) {
      throw new Error(
        `sha256 mismatch (got ${digest}). The source may have published a new edition; ` +
          "check it and update books/sources.json.",
      );
    }
    await mkdir(path.dirname(target), { recursive: true });
    const partial = `${target}.part`;
    await writeFile(partial, data);
    await rename(partial, target);
    console.log(`done (${(data.length / 1e6).toFixed(1)} MB)`);
  } catch (err) {
    failed++;
    await rm(`${target}.part`, { force: true });
    console.log("failed");
    console.error(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} file(s) failed. Mirrors and the NCTB listing page are in books/sources.json.`);
  process.exit(1);
}
