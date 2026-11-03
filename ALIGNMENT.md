# Alignment backlog

Problems in the spec as published on developer.nomba.com (synced 2026-11-03). Fix them upstream in the docs, run `npm run sync`, and delete the matching entries from `.redocly.lint-ignore.yaml`.

To see each problem with its file and line, move the baseline aside and lint:

```bash
mv .redocly.lint-ignore.yaml /tmp/ && npm run lint; mv /tmp/.redocly.lint-ignore.yaml .
```

## Breaks the spec

| Problem | Where | Fix |
|---------|-------|-----|
| Two paths differ only by parameter name | `POST /v1/accounts/virtual/{subAccountId}` and `GET/PUT/DELETE /v1/accounts/virtual/{identifier}` | Use one parameter name, or move the sub-account create under a distinct path |
| Path parameter not declared | `POST /v1/terminals/payment-request/{terminalId}` | Add `terminalId` as `in: path, required: true` |
| Query string in path key (patched by the sync script) | `GET /v1/direct-debits/status?mandateId={mandateId}` | Change the docs path to `/v1/direct-debits/status`; `mandateId` is already a query parameter |
| `operationId` contains spaces | 91 operations, e.g. `Fetch account balance` | Use camelCase IDs (`fetchAccountBalance`). Code generators turn these into method names |
| Missing `operationId` | 5 direct-debit operations | Add one |

## Missing content

| Problem | Where |
|---------|-------|
| No tag, summary or 4XX responses | All 14 global payout and global collection operations (`/v1/global-payout/*`, `/v1/global-collection/*`, `/v1/sandbox/global-payout/*`) |
| No tags declared for global payout, global collection | Root `tags` |
| Tag used but not declared | `Cable & Bill Payments` (1 operation) |
| No tag descriptions | All 13 tags |
| No webhooks | `payment_success` and other events are documented in prose only. Add a `webhooks` section (needs OpenAPI 3.1) or `x-webhooks` |
| Info block | Docs title is `Vendor API` with an empty description and no license. `redocly.yaml` overrides it in the release files |

## Wrong examples or schemas

| Problem | Where |
|---------|-------|
| Example is a string where the schema says boolean | 21 schema properties, e.g. `CheckoutCancelTransactionRequest.forceCancel`, `CheckoutDataResponse.success` |
| `required` lists properties that are not defined | `CreateVirtualAccountResponse` (`accountId`, `status`, `type`, `banks`) |
| Dates in examples are not `date-time` | `POST /v1/direct-debits` `startDate`, `endDate` |
| Non-UUID example for a `uuid` parameter | `GET /v1/accounts/sub-account-details` |
| Ambiguous routes | `/v1/accounts/{subAccountId}/balance` vs `/v1/accounts/virtual/{...}` |

## Not in the docs, in the old spec

`kudi-inc/vendor-openapi-spec` has these; the docs do not. Confirm whether each is still live, then document or drop it.

- `GET /v1/accounts`, `POST /v1/accounts` (list and create sub-accounts)
- `PUT /v1/accounts/suspend/{subAccountId}`, `PUT /v1/accounts/reactivate/{subAccountId}`, `PUT /v1/accounts/{subAccountId}/access`
- `GET /v1/accounts/{subAccountId}/terminals` (docs use `{accountId}`)
- `GET /v1/transactions/bank/{subAccountId}`
- `POST /v1/transfers/bank`, `POST /v1/transfers/wallet` and their sub-account variants (docs have only `/v2/transfers/*`)

## Suggested next steps

1. Move to OpenAPI 3.1 once the docs platform supports it, to get `webhooks`.
2. Add request and response examples from sandbox calls to every operation.
3. Add contract tests that call the sandbox and validate responses against the spec.
