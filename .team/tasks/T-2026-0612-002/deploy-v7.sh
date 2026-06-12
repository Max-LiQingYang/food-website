#!/bin/bash
# T-2026-0612-002 deploy v7 — 重建后端 image 注入新 compare.js
# 根因: Dockerfile COPY --chown=nodeapp:nodejs . . 把 backend/ 整 COPY 进 image,容器内是 baked-in 代码
# v6 docker cp 写入但 permission denied,restart 循环 502
set +e
LOG=/Users/max_yang/Projects/food-website/.team/tasks/T-2026-0612-002/deploy-v7.log
exec > >(tee -a "$LOG") 2>&1
echo "=== T-2026-0612-002 deploy v7 START $(date) ==="

cd /Users/max_yang/Projects/food-website

echo "--- A. confirm source has new code (sanity) ---"
grep -c aggregateDimensionAverages backend/routes/compare.js

echo "--- B. local build of backend image (force no cache for compare.js) ---"
docker build --no-cache -t food-backend:iter137 -f backend/Dockerfile backend 2>&1 | tail -20

echo "--- C. tag image to compose-expected name ---"
# Get current image name from compose
CURRENT_IMG=$(docker inspect food-backend --format '{{.Config.Image}}' 2>/dev/null)
echo "current image: $CURRENT_IMG"
# Tag to match
if [ -n "$CURRENT_IMG" ]; then
  docker tag food-backend:iter137 "$CURRENT_IMG"
  echo "tagged as $CURRENT_IMG"
fi

echo "--- D. recreate backend container (force, no deps, no compose file edit) ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'cd /root/food-website && (docker compose -f docker-compose.yml up -d --force-recreate --no-deps food-backend 2>&1 || docker compose up -d --force-recreate --no-deps food-backend 2>&1)'

echo "--- E. wait 10s for backend boot ---"
sleep 10

echo "--- F. container state ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 'docker ps --format "{{.Names}}\t{{.Status}}"'

echo "--- G. verify code inside container after recreate ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-backend sh -c "grep -c aggregateDimensionAverages routes/compare.js 2>&1; echo ---; ls -la routes/compare.js 2>&1"'

echo "=== verify 1: backend contract ==="
sleep 3
RIDS=$(ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'cd /root/food-website/backend && node -e "const {Recipe,sequelize}=require(\"./models\");(async()=>{try{await sequelize.authenticate();const r=await Recipe.findAll({attributes:[\"id\"],limit:2});console.log(r.map(x=>String(x.id)).join(\",\"))}catch(e){console.log(\"ERR:\"+e.message)}finally{process.exit(0)}})();"' 2>&1 | tail -1)
echo "ids: $RIDS"
RID1=$(echo "$RIDS" | cut -d, -f1)
RID2=$(echo "$RIDS" | cut -d, -f2)
if [ -n "$RID1" ] && [ -n "$RID2" ] && [ "$RID1" != "ERR"* ]; then
  RESP=$(curl -s -X POST http://39.103.68.205/api/recipes/compare \
    -H 'Content-Type: application/json' \
    -d "{\"recipeIds\":[\"$RID1\",\"$RID2\"]}")
  echo "raw response (truncated): $(echo $RESP | head -c 400)"
  echo ""
  echo "$RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);print('code:',d.get('code'));da=d.get('data',{}).get('recipes',[{}])[0].get('dimensionAverages');print('dimAvgs:',json.dumps(da,ensure_ascii=False,indent=2) if da else 'MISSING')"
fi

echo "=== verify 2: ComparePage chunk in nginx html ==="
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-frontend ls /usr/share/nginx/html/assets/ 2>&1 | grep "^ComparePage" || echo NONE'

echo "=== verify 3: chunk content (no warning pollution) ==="
# Use raw curl after stripping ssh warning
CHUNK=$(curl -s http://39.103.68.205/assets/ComparePage-DfKEWcCt.js 2>/dev/null | head -1)
echo "first 200 bytes: $(echo $CHUNK | head -c 200)"
echo "dimensionAverages matches: $(curl -s http://39.103.68.205/assets/ComparePage-DfKEWcCt.js | grep -c dimensionAverages)"

echo "=== verify 4: /compare route 200 ==="
curl -s -o /dev/null -w "compare_route=%{http_code}\n" http://39.103.68.205/compare

echo "=== T-2026-0612-002 deploy v7 END $(date) ==="
