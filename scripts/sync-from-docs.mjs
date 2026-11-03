// Rebuild the spec from developer.nomba.com.
//
// Each API reference page embeds the OpenAPI fragment for its endpoint (the
// path plus every component it references). We fetch every page listed in
// llms.txt, merge the fragments, and split the result into openapi/.
//
// Usage: npm run sync            (writes openapi/)
//        npm run sync -- --check (exits 1 if the docs differ from openapi/)

import { execFileSync } from "node:child_process";
import { mkdtempDisposableSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { parse, stringify } from "yaml";

const DOCS = "https://developer.nomba.com";
const PAGE = /^````yaml ([a-z]+) (\S+)\n([\s\S]*?)^````/m;
// Reference pages that are prose, not endpoints.
const NOT_ENDPOINTS = new Set(["introduction.md", "get-api-keys.md"]);
const REDOCLY = fileURLToPath(new URL("../node_modules/.bin/redocly", import.meta.url));
const check = process.argv.includes("--check");

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function getAll(urls, concurrency = 10) {
  const out = new Array(urls.length);
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      out[i] = await get(urls[i]);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}

const index = await get(`${DOCS}/llms.txt`);
const urls = [
  ...new Set(index.match(/https:\/\/developer\.nomba\.com\/nomba-api-reference\/[^)\s]+\.md/g)),
].sort();
const pages = await getAll(urls);

let spec;
const problems = [];

// Merge one entry, recording a problem if a different definition already exists.
function put(target, key, value, label) {
  if (key in target && !isDeepStrictEqual(target[key], value)) {
    problems.push(`conflicting definition: ${label}`);
  }
  target[key] = value;
}

urls.forEach((url, i) => {
  const m = pages[i].match(PAGE);
  if (!m) {
    if (!NOT_ENDPOINTS.has(url.split("/").pop())) problems.push(`no OpenAPI block: ${url}`);
    return;
  }
  const frag = parse(m[3]);
  spec ??= { ...frag, tags: [], paths: {}, components: {} };
  for (const tag of frag.tags ?? []) {
    if (!spec.tags.some((t) => t.name === tag.name)) spec.tags.push(tag);
  }
  for (const [rawPath, item] of Object.entries(frag.paths ?? {})) {
    // A query string in a path key is invalid OpenAPI and an invalid file
    // name on Windows. Its parameters are declared on the operation.
    const path = rawPath.split("?")[0];
    spec.paths[path] ??= {};
    for (const [method, op] of Object.entries(item)) {
      put(spec.paths[path], method, op, `${method.toUpperCase()} ${rawPath} (${url})`);
    }
  }
  for (const [section, entries] of Object.entries(frag.components ?? {})) {
    spec.components[section] ??= {};
    for (const [name, value] of Object.entries(entries)) {
      put(spec.components[section], name, value, `components.${section}.${name} (${url})`);
    }
  }
});

if (!spec) throw new Error("no OpenAPI blocks found; has the docs page format changed?");
console.log(`${urls.length} pages, ${Object.keys(spec.paths).length} paths`);
if (problems.length) {
  for (const p of problems) console.error(p);
  process.exit(1);
}

using tmp = mkdtempDisposableSync(join(tmpdir(), "nomba-openapi-"));
const merged = join(tmp.path, "merged.yaml");
const outDir = join(tmp.path, "openapi");
writeFileSync(merged, stringify(spec, { lineWidth: 0 }));
execFileSync(REDOCLY, ["split", merged, "--outDir", outDir], { stdio: ["ignore", "ignore", "inherit"] });

if (check) {
  const same = sameTree(outDir, "openapi");
  console.log(same ? "openapi/ matches the docs" : "openapi/ differs from the docs; run npm run sync");
  process.exitCode = same ? 0 : 1;
} else {
  rmSync("openapi", { recursive: true, force: true });
  renameSync(outDir, "openapi");
}

function sameTree(a, b) {
  const list = (d) => readdirSync(d, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(d.length))
    .sort();
  const files = list(a);
  return (
    isDeepStrictEqual(files, list(b)) &&
    files.every((f) => readFileSync(join(a, f)).equals(readFileSync(join(b, f))))
  );
}
