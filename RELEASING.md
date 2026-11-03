# Releasing

Releasing is automated; you never create tags or Releases by hand.

## Steps

1. Merge your PRs to `main`. Main squash-merges, so each PR title must be a valid Conventional Commit.
2. Open a `chore: release X.Y.Z` PR that bumps the version with `npm version X.Y.Z --no-git-tag-version` and adds a `## [X.Y.Z] - YYYY-MM-DD` section to `CHANGELOG.md` (Breaking, Added, Fixed, Changed, in plain language).
3. Merge it. `release.yml` lints and bundles the spec, then waits. Open the run in **Actions** and approve the **release** deployment. Only then does it create the `vX.Y.Z` tag and GitHub Release with `openapi.json` and `openapi.yaml` attached.

## Choosing the version

| Change since the last release | Bump |
|-------------------------------|------|
| An operation, parameter or schema field removed or renamed, or a type changed | major |
| An operation, parameter or schema field added | minor |
| Descriptions, examples or lint fixes only | patch |
| only `chore:` `docs:` `refactor:` `test:` `ci:` with no spec change | no release |

Before 1.0.0, breaking changes bump the minor version.

## After releasing

Confirm the tag, the Release and both files:

```bash
curl -sIL https://github.com/NombaOSS/openapi/releases/latest/download/openapi.json | grep -E '^HTTP' | tail -1
```

## One-time setup (repo owner)

- GitHub: an environment named `release` with yourself as required reviewer, limited to protected branches. Done for this repo.
