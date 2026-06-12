# T-2026-0612-002 deploy v6 report

## Summary
v6 attempted to inject backend code via docker cp and restart container. Backend failed to start (502), so backend contract verification failed. Frontend chunk exists and is served, but dimensionAverages field not found in chunk.

## Log Excerpts
### Step A: confirm correct container path
- Container workdir: /app
- routes/compare.js exists
- grep for dimensionAverages: 0 matches (NO_MATCH) before cp

### Step C: verify code inside container AFTER cp
- grep: routes/compare.js: Permission denied (could not verify code injection success)

### Step D: restart backend
- `no such service: food-backend` (docker compose restart issue; container restarted directly)
- Container restarting, waited 6s (still restarting when checked step F)

## 4 Verification Results
| # | Verification | Result | Details |
|---|---|---|---|
| 1 | backend contract | FAIL | 502 Bad Gateway (nginx), response not JSON |
| 2 | ComparePage chunk in nginx html | PASS | ComparePage-DfKEWcCt.js found |
| 3 | public serves new chunk (dimensionAverages) | FAIL | dimensionAverages matches in chunk: 0 (field missing) |
| 4 | /compare route 200 | PASS | compare_route=200 |

Pass count: 2/4

verdict: PARTIAL
