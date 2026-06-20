#!/usr/bin/env node
// Regenerates public/legal/THIRD-PARTY-LICENSES.md from current dependencies.
// Requires: `cargo install cargo-about` and network access for `npx license-checker`.
// Run from the repo root after any dependency change before cutting a release.
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "overmanager-licenses-"));
const rustJsonPath = path.join(tmpDir, "rust-licenses.json");
const npmJsonPath = path.join(tmpDir, "npm-licenses.json");

console.log("Generating Rust crate license data (cargo about)...");
execSync(`cargo about generate --format json -o "${rustJsonPath}"`, {
  cwd: path.join(repoRoot, "src-tauri"),
  stdio: "inherit",
});

console.log("Generating npm package license data (license-checker)...");
execSync(`npx --yes license-checker --json --files > "${npmJsonPath}"`, {
  cwd: repoRoot,
  stdio: ["ignore", "ignore", "inherit"],
  shell: "/bin/sh",
});

const rust = JSON.parse(fs.readFileSync(rustJsonPath));
const npmList = JSON.parse(fs.readFileSync(npmJsonPath));
const appVersion = require(path.join(repoRoot, "package.json")).version;

const out = [];
out.push("# Third-Party Licenses\n");
out.push("OverManager is built on open-source software. This file lists every");
out.push("third-party package bundled into the application and the full text of");
out.push("the license it is distributed under, per the terms of those licenses.\n");
out.push(`Generated for OverManager v${appVersion}.\n`);

out.push("## Rust crates (desktop backend)\n");
for (const lic of rust.licenses) {
  const crateNames = lic.used_by.map((u) => `${u.crate.name} ${u.crate.version}`);
  out.push(`### ${lic.name} (${lic.id})\n`);
  out.push(`Used by: ${crateNames.join(", ")}\n`);
  out.push("```");
  out.push(lic.text.trim());
  out.push("```\n");
}

out.push("## JavaScript/TypeScript packages (frontend)\n");

// Group npm packages by the actual text of their license file, so identical
// boilerplate (same license + same copyright holder) is only printed once —
// mirrors what cargo-about already does for the Rust side.
const groups = new Map();
for (const key in npmList) {
  if (key.startsWith("over-manager@")) continue; // the app itself
  const entry = npmList[key];
  let text = "";
  if (entry.licenseFile) {
    try {
      text = fs.readFileSync(entry.licenseFile, "utf8").trim();
    } catch {
      /* file moved/missing — fall back to license id only */
    }
  }
  const hash = crypto.createHash("sha1").update(text || entry.licenses || key).digest("hex");
  if (!groups.has(hash)) {
    groups.set(hash, { licenses: entry.licenses || "UNKNOWN", text, members: [] });
  }
  groups.get(hash).members.push(key);
}

const sorted = [...groups.values()].sort((a, b) => b.members.length - a.members.length);
for (const g of sorted) {
  out.push(`### ${g.licenses}\n`);
  out.push(`Used by: ${g.members.sort().join(", ")}\n`);
  if (g.text) {
    out.push("```");
    out.push(g.text.slice(0, 6000));
    out.push("```\n");
  }
}

const outPath = path.join(repoRoot, "public", "legal", "THIRD-PARTY-LICENSES.md");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out.join("\n"));
console.log(`Wrote ${outPath} (${out.join("\n").length} bytes, ${sorted.length} unique npm license texts)`);

fs.rmSync(tmpDir, { recursive: true, force: true });
