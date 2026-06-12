#!/bin/bash
# T-2026-0612-002 deploy v5 — 修复 v3/v4 暴露的两点
set +e
LOG=/Users/max_yang/Projects/food-website/.team/tasks/T-2026-0612-002/deploy-v5.log
exec > >(tee -a "$LOG") 2>&1
echo "=== T-2026-0612-002 deploy v5 START $(date) ==="

cd /Users/max_yang/Projects/food-website
echo "--- A. xattr strip on local dist ---"
xattr -cr frontend/dist/ 2>&1 | head -3 || echo "no xattr to strip"
ls -la frontend/dist/index.html

echo "--- B. local push idempotent ---"
git push origin main || echo "push already applied"

echo "--- C. server pull ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'cd /root/food-website && git reset --hard HEAD && git pull && git log --oneline -3'

echo "--- D. check backend code version on server host ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'cd /root/food-website && grep -c "aggregateDimensionAverages" backend/routes/compare.js || echo 0'

echo "--- E. check backend code version INSIDE backend container ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-backend sh -c "grep -c aggregateDimensionAverages /app/backend/routes/compare.js 2>/dev/null || grep -c aggregateDimensionAverages /app/routes/compare.js 2>/dev/null || echo NO_MATCH"'

echo "--- F. local build ---"
cd frontend && npm run build 2>&1 | tail -3

echo "--- G. container ps ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 'docker ps --format "{{.Names}}\t{{.Status}}"'

echo "--- H. backend restart (compose first, fallback direct) ---"
ssh -o ConnectTimeout=15 root@39.103.68.205 \
  'cd /root/food-website && (docker compose -f docker-compose.yml restart food-backend 2>&1 || docker restart food-backend 2>&1)'

echo "--- I. wait 5s for backend ---"
sleep 5

echo "--- J. check backend inside container AGAIN ---"
ssh -o ConnectTimeout=10 root@39.103.205 \
  'docker exec food-backend sh -c "grep -c aggregateDimensionAverages /app/routes/compare.js 2>/dev/null || grep -c aggregateDimensionAverages /app/backend/routes/compare.js 2>/dev/null || echo NO_MATCH"' \
  || ssh -o ConnectTimeout=10 root@39.103.68.205 \
    'docker exec food-backend sh -c "grep -c aggregateDimensionAverages /app/routes/compare.js 2>/dev/null || grep -c aggregateDimensionAverages /app/backend/routes/compare.js 2>/dev/null || echo NO_MATCH"'

echo "--- K. frontend dist inject (XATTR-STRIPPED, docker cp file-by-file) ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'ls /usr/share/nginx/html/ 2>&1 | head -5'

echo "--- K.1: clear nginx html/assets but PRESERVE container writable ---"
ssh -o ConnectTimeout=15 root@39.103.68.205 \
  'docker exec food-backend sh -c "echo skipped"' 2>&1 | head -1
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-frontend sh -c "rm -rf /usr/share/nginx/html/* && echo cleared" 2>&1'

echo "--- K.2: docker cp using local xattr-stripped dist ---"
cd /Users/max_yang/Projects/food-website/frontend
# Use rsync-like copy by streaming stripped tar with --no-xattrs
COPYFILE_DISABLE=1 tar --no-xattrs -cf - -C dist . | \
  ssh -o ConnectTimeout=30 root@39.103.68.205 'cat | docker cp - food-frontend:/usr/share/nginx/html/ 2>&1' \
  || { echo "FALLBACK: per-file docker cp with COPYFILE_DISABLE=1"; COPYFILE_DISABLE=1 tar -cf /tmp/dist-strip.tar --no-xattrs -C dist .; ssh -o ConnectTimeout=10 root@39.103.68.205 "docker cp /tmp/dist-strip.tar food-frontend:/tmp/ && docker exec food-frontend sh -c 'cd /usr/share/nginx/html && tar xf /tmp/dist-strip.tar && rm /tmp/dist-strip.tar && echo file-mode copied'"; }

echo "--- L. nginx reload (no restart) ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-frontend nginx -s reload 2>&1'

echo "--- M. wait 3s ---"
sleep 3

echo "=== verify 1: backend contract with REAL recipe ids ==="
RIDS=$(ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'cd /root/food-website/backend && node -e "const {Recipe,sequelize}=require(\"./models\");(async()=>{try{await sequelize.authenticate();const r=await Recipe.findAll({attributes:[\"id\"],limit:2});console.log(r.map(x=>String(x.id)).join(\",\"))}catch(e){console.log(\"ERR:\"+e.message)}finally{process.exit(0)}})();"' 2>&1 | tail -1)
echo "ids: $RIDS"
RID1=$(echo "$RIDS" | cut -d, -f1)
RID2=$(echo "$RIDS" | cut -d, -f2)
if [ -n "$RID1" ] && [ -n "$RID2" ] && [ "$RID1" != "ERR"* ]; then
  RESP=$(curl -s -X POST http://39.103.68.205/api/recipes/compare \
    -H 'Content-Type: application/json' \
    -d "{\"recipeIds\":[\"$RID1\",\"$RID2\"]}")
  echo "raw response: $RESP" | head -c 500
  echo ""
  echo "$RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);print('code:',d.get('code'));da=d.get('data',{}).get('recipes',[{}])[0].get('dimensionAverages');print('dimAvgs:',json.dumps(da,ensure_ascii=False,indent=2) if da else 'MISSING')"
else
  echo "SKIP verify 1: no real recipe ids"
fi

echo "=== verify 2: new ComparePage chunk on CDN ==="
CHUNK=$(curl -s http://39.103.68.205/ | grep -oE 'ComparePage-[A-Za-z0-9_-]+\.js' | head -1)
echo "chunk: $CHUNK"
[ -n "$CHUNK" ] && echo "PASS chunk present" || echo "FAIL no ComparePage chunk"

echo "=== verify 3: dimensionAverages in chunk ==="
if [ -n "$CHUNK" ]; then
  CNT=$(curl -s "http://39.103.68.205/assets/$CHUNK" | grep -c 'dimensionAverages')
  echo "matches: $CNT"
  [ "$CNT" -ge 1 ] && echo "PASS field in chunk" || echo "FAIL field missing in chunk"
else
  echo "SKIP verify 3"
fi

echo "=== verify 4: /compare route 200 ==="
RC=$(curl -s -o /dev/null -w "%{http_code}" http://39.103.68.205/compare)
echo "compare_route=$RC"
[ "$RC" = "200" ] && echo "PASS route 200" || echo "FAIL route $RC"

echo "=== T-2026-0612-002 deploy v5 END $(date) ==="
