// Rebuild the spec from developer.nomba.com.
//
// Each API reference page embeds the OpenAPI fragment for its endpoint (the
// path plus every component it references). We fetch every page listed in
// llms.txt, merge the fragments, and split the result into openapi/.
//
// Usage: npm run sync            (writes openapi/)
//        npm run sync -- --check (exits 1 if the docs differ from openapi/)

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";

const DOCS = "https://developer.nomba.com";
const PAGE = /^````yaml ([a-z]+) (\S+)\n([\s\S]*?)^````/m;
const check = process.argv.includes("--check");

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const index = await get(`${DOCS}/llms.txt`);
const urls = [
  ...new Set(index.match(/https:\/\/developer\.nomba\.com\/nomba-api-reference\/[^)\s]+\.md/g)),
].sort();

const pages = [];
for (let i = 0; i < urls.length; i += 10) {
  pages.push(...(await Promise.all(urls.slice(i, i + 10).map(async (u) => [u, await get(u)]))));
}

let spec;
const conflicts = [];
let ops = 0;
for (const [url, text] of pages) {
  const m = text.match(PAGE);
  if (!m) continue;
  ops++;
  const frag = parse(m[3]);
  spec ??= { ...frag, tags: [], paths: {}, components: {} };
  for (const tag of frag.tags ?? []) {
    if (!spec.tags.some((t) => t.name === tag.name)) spec.tags.push(tag);
  }
  for (const [path, item] of Object.entries(frag.paths ?? {})) {
    spec.paths[path] ??= {};
    for (const [method, op] of Object.entries(item)) {
      const prev = spec.paths[path][method];
      if (prev && JSON.stringify(prev) !== JSON.stringify(op)) {
        conflicts.push(`${method.toUpperCase()} ${path} (${url})`);
      }
      spec.paths[path][method] = op;
    }
  }
  for (const [section, entries] of Object.entries(frag.components ?? {})) {
    spec.components[section] ??= {};
    for (const [name, value] of Object.entries(entries)) {
      const prev = spec.components[section][name];
      if (prev && JSON.stringify(prev) !== JSON.stringify(value)) {
        conflicts.push(`components.${section}.${name} (${url})`);
      }
      spec.components[section][name] = value;
    }
  }
}

// The only edits made to the docs content. Everything else is copied as-is;
// content fixes belong upstream in the docs (see ALIGNMENT.md).
spec.info = {
  title: "Nomba API",
  version: spec.info?.version ?? "1.0.0",
  description:
    "Accounts, virtual accounts, checkout, transfers, direct debits, terminals, " +
    "transactions and bill payments. Generated from https://developer.nomba.com.",
  contact: { name: "Nomba Developers", url: DOCS, email: "docs@nomba.com" },
  license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
};
for (const path of Object.keys(spec.paths)) {
  // A query string in a path key is invalid OpenAPI and an invalid file name
  // on Windows. The query parameter is already declared on the operation.
  if (path.includes("?")) {
    const clean = path.slice(0, path.indexOf("?"));
    spec.paths[clean] = { ...spec.paths[clean], ...spec.paths[path] };
    delete spec.paths[path];
  }
}

console.log(`${ops} endpoint pages, ${Object.keys(spec.paths).length} paths`);
for (const c of conflicts) console.warn(`conflicting definition: ${c}`);

const dir = mkdtempSync(join(tmpdir(), "nomba-openapi-"));
const merged = join(dir, "merged.yaml");
writeFileSync(merged, stringify(spec, { lineWidth: 0 }));

if (check) {
  // Compare the docs against the bundled repo spec, ignoring file layout.
  const local = join(dir, "local.yaml");
  execFileSync("npx", ["redocly", "bundle", "openapi/openapi.yaml", "-o", local], {
    stdio: "ignore",
  });
  const norm = (f) => JSON.stringify(sortKeys(parse(readFileSync(f, "utf8"))));
  const same = norm(merged) === norm(local);
  rmSync(dir, { recursive: true });
  console.log(same ? "openapi/ matches the docs" : "openapi/ differs from the docs");
  process.exit(same ? 0 : 1);
}

rmSync("openapi", { recursive: true, force: true });
execFileSync("npx", ["redocly", "split", merged, "--outDir", "openapi"], { stdio: "inherit" });
rmSync(dir, { recursive: true });

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys(v[k])])
    );
  }
  return v;
}
