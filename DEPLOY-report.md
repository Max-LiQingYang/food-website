=== T-2026-0612-002 deploy v10 START Fri Jun 12 15:51:21 CST 2026 ===
--- A. confirm source ---
3
--- B. transfer backend code to server ---
transferred 760 files
--- C. compose up 'backend' service (NOT food-backend) ---
 Container food-backend  Creating
 Container food-backend  Created
 Container food-backend  Starting
 Container food-backend  Started
--- D. wait 15s ---
--- E. container state ---
food-backend	Up 16 seconds (health: starting)
food-frontend	Up 3 days (healthy)
--- F. verify code (should be 0 - baked image) ---
0
--- G. docker cp + chown ---
chown: /app/routes/compare.js: Operation not permitted
--- H. verify after cp (should be 3) ---
3
--- I. restart backend ---
food-backend
--- J. container state after restart ---
food-backend	Up 13 seconds (health: starting)
food-frontend	Up 3 days (healthy)
--- K. verify after restart (should still be 3) ---
3
=== verify 1: backend contract ===
ids: 054369ce-c16d-4420-9f92-c7bffc7713f6,07cdd22c-9bd4-478d-8fa9-aedff08eca3d
code: 0
dimAvgs: {
  "taste": {
    "average": 3.6,
    "count": 5
  },
  "difficulty": {
    "average": 3.8,
    "count": 6
  },
  "presentation": {
    "average": 3.8,
    "count": 5
  },
  "value": {
    "average": 3.6,
    "count": 5
  }
}
=== verify 2: ComparePage chunk in nginx html ===
ComparePage-DfKEWcCt.js
ComparePage-DmmZJE2u.css
=== verify 3: chunk content ===
dimensionAverages matches: 2
=== verify 4: /compare route 200 ===
compare_route=200
=== T-2026-0612-002 deploy v10 END Fri Jun 12 15:52:05 CST 2026 ===

verdict=SUCCESS
4 验证通过数=4/4
公网 chunk=DfKEWcCt
