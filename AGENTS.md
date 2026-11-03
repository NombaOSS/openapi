# openapi

OpenAPI 3.0 spec for the Nomba API, generated from the API reference at developer.nomba.com. Source is split under `openapi/`; releases attach the bundled file.

## Rules
- Conventional commits; main squash-merges, so the PR title becomes the commit. Stage files by name.
- Never push to main. Branch and open a PR. Merge only when Sam says so.
- No AI attribution in commits, PRs or code comments.
- Public repo: don't name private Nomba repos.

## Editing the spec
- The docs are the source of truth. Prefer fixing the docs and running `npm run sync` over hand-editing `openapi/`; a hand edit makes `npm run sync -- --check` fail until the docs catch up.
- Never add entries to `.redocly.lint-ignore.yaml`. Remove them as problems are fixed, and update `ALIGNMENT.md`.

## Before pushing
`npm run lint && npm run bundle`
