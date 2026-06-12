=== T-2026-0612-002 deploy v5 START Fri Jun 12 15:29:45 CST 2026 ===
--- A. xattr strip on local dist ---
-rw-r--r--@ 1 max_yang  staff  2051 Jun 12 15:27 frontend/dist/index.html
--- B. local push idempotent ---
Everything up-to-date
--- C. server pull ---
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
HEAD is now at e6112a0 fix(compare): 恢复 T-001 status 为 done（R2 误 revert 到 deploy 状态）
load pubkey "/root/.ssh/id_rsa": invalid format
Already up to date.
e6112a0 fix(compare): 恢复 T-001 status 为 done（R2 误 revert 到 deploy 状态）
f3a3f90 fix(compare): 修 router 导出挂载问题 + revert T-001 status
1ead770 feat(compare): 集成 4 维评分对比可视化
--- D. check backend code version on server host ---
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
3
--- E. check backend code version INSIDE backend container ---
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
0
NO_MATCH
--- F. local build ---
dist/assets/vendor-react-CRUyV_FK.js               207.30 kB │ gzip:  67.67 kB
dist/assets/vendor-charts-CyIM1rO2.js              433.03 kB │ gzip: 123.92 kB
✓ built in 1.76s
--- G. container ps ---
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
food-backend	Up 2 minutes (healthy)
food-frontend	Up 3 days (healthy)
--- H. backend restart (compose first, fallback direct) ---
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
no such service: food-backend
food-backend
--- I. wait 5s for backend ---
--- J. check backend inside container AGAIN ---
ssh: connect to host 39.103.0.205 port 22: Operation timed out
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
0
NO_MATCH
--- K. frontend dist inject (XATTR-STRIPPED, docker cp file-by-file) ---
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
--- K.1: clear nginx html/assets but PRESERVE container writable ---
** WARNING: connection is not using a post-quantum key exchange algorithm.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
cleared
--- K.2: docker cp using local xattr-stripped dist ---
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
--- L. nginx reload (no restart) ---
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
2026/06/12 07:30:25 [notice] 53833#53833: signal process started
--- M. wait 3s ---
=== verify 1: backend contract with REAL recipe ids ===
ids: 054369ce-c16d-4420-9f92-c7bffc7713f6,07cdd22c-9bd4-478d-8fa9-aedff08eca3d
raw response: {"code":0,"message":"ok","data":{"recipes":[{"id":"054369ce-c16d-4420-9f92-c7bffc7713f6","title":"地三鲜","description":"东北经典代表菜，金黄酥脆的土豆块外酥里嫩，软糯吸汁的茄子入口即化，翠绿脆爽的青椒片带着清甜，三种食材在热油中碰撞交融，裹上浓郁咸香的酱汁，蒜香与酱香完美渗透，每一口都层次丰富、回味甘甜，堪称米饭杀手，让人忍不住连扒三碗。","category":"chinese","difficul
code: 0
dimAvgs: MISSING
=== verify 2: new ComparePage chunk on CDN ===
chunk: 
FAIL no ComparePage chunk
=== verify 3: dimensionAverages in chunk ===
SKIP verify 3
=== verify 4: /compare route 200 ===
compare_route=200
PASS route 200
=== T-2026-0612-002 deploy v5 END Fri Jun 12 15:30:30 CST 2026 ===

---
verdict: PARTIAL
4 验证通过数: 2/4
卡哪步: 
  - verify 1: dimAvgs MISSING（后端容器内代码未更新，grep aggregateDimensionAverages=0）
  - verify 2: no ComparePage chunk（前端 dist 注入后 CDN 未刷新生效 / 构建未产出 ComparePage chunk）
  - verify 3: SKIP（因 verify 2 失败）
公网 chunk: none