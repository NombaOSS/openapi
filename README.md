# openapi

[![CI](https://github.com/NombaOSS/openapi/actions/workflows/ci.yml/badge.svg)](https://github.com/NombaOSS/openapi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

OpenAPI 3.0 specification for the [Nomba API](https://developer.nomba.com): accounts, virtual accounts, checkout, card charges, transfers, direct debits, terminals, transactions and bill payments.

100 operations across 94 paths. Production `https://api.nomba.com`, sandbox `https://sandbox.nomba.com`.

## Get the spec

Every release attaches a single bundled file:

- JSON: `https://github.com/NombaOSS/openapi/releases/latest/download/openapi.json`
- YAML: `https://github.com/NombaOSS/openapi/releases/latest/download/openapi.yaml`

Pin a tag (`/releases/download/v0.1.0/openapi.json`) if you generate code from it.

## Use it

Generate a client:

```bash
npx @openapitools/openapi-generator-cli generate -i openapi.json -g typescript-fetch -o ./nomba-client
```

Import into Postman: **Import → Link** and paste the JSON URL above.

Browse it locally:

```bash
npm ci && npm run preview
```

## Where it comes from

The source of truth is the API reference at [developer.nomba.com](https://developer.nomba.com/nomba-api-reference/introduction). Each reference page embeds the OpenAPI definition for its endpoint; `npm run sync` fetches every page, merges them, and splits the result into `openapi/` (one file per path and per schema).

The content is copied as-is with two exceptions, both in [`scripts/sync-from-docs.mjs`](scripts/sync-from-docs.mjs): the `info` block is filled in, and a query string is removed from one path key. Known issues inherited from the docs are tracked in [ALIGNMENT.md](ALIGNMENT.md).

This replaces the older `kudi-inc/vendor-openapi-spec` file, which covers 67 operations and was last updated in December 2024.

## Layout

```
openapi/
  openapi.yaml           root: info, servers, tags, path index
  paths/                 one file per path
  components/schemas/    one file per schema
scripts/sync-from-docs.mjs
redocly.yaml             lint rules (Redocly recommended)
.redocly.lint-ignore.yaml  baseline of known issues; shrink it, never grow it
```

## Development

| Command | What it does |
|---------|--------------|
| `npm run lint` | Lint against the recommended ruleset and the baseline |
| `npm run bundle` | Write `dist/openapi.yaml` and `dist/openapi.json` |
| `npm run sync` | Rebuild `openapi/` from the docs |
| `npm run sync -- --check` | Exit 1 if `openapi/` and the docs differ |
| `npm run preview` | Serve rendered docs locally |
| `npm run stats` | Count paths, operations, schemas |

CI lints and bundles every pull request and checks for drift against the docs every Monday.

## Releasing

Bump `version` in `package.json`, add a `CHANGELOG.md` entry, merge, then tag `vX.Y.Z` on main. The release workflow bundles the spec and attaches both files to a GitHub release.

## License

[MIT](LICENSE)
