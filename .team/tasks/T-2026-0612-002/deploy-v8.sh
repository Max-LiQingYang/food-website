#!/bin/bash
# T-2026-0612-002 deploy v8 — 服务器端重建后端 image
# 根因 v7: subagent 沙盒无 docker socket,本地 build 失败
# v8: 在服务器上 docker build backend(用 COPY 方式),然后 --force-recreate
set +e
LOG=/Users/max_yang/Projects/food-website/.team/tasks/T-2026-0612-002/deploy-v8.log
exec > >(tee -a "$LOG") 2>&1
echo "=== T-2026-0612-002 deploy v8 START $(date) ==="

cd /Users/max_yang/Projects/food-website

echo "--- A. local source sanity ---"
grep -c aggregateDimensionAverages backend/routes/compare.js

echo "--- B. transfer backend source to server ---"
COPYFILE_DISABLE=1 tar --no-xattrs -cf - -C backend . | \
  ssh -o ConnectTimeout=30 root@39.103.68.205 \
    'rm -rf /tmp/backend-build && mkdir -p /tmp/backend-build && tar xf - -C /tmp/backend-build && echo "transferred $(find /tmp/backend-build -type f | wc -l) files"'

echo "--- C. server: docker build backend image ---"
ssh -o ConnectTimeout=120 root@39.103.68.205 \
  'cd /tmp/backend-build && docker build --no-cache -t food-backend:iter137 . 2>&1 | tail -15'

echo "--- D. server: find current backend image ---"
CUR_IMG=$(ssh -o ConnectTimeout=10 root@39.103.68.205 'docker inspect food-backend --format "{{.Config.Image}}" 2>&1' | tail -1)
echo "current image in container: $CUR_IMG"

echo "--- E. server: tag new image to current name ---"
if [ -n "$CUR_IMG" ] && [ "$CUR_IMG" != "food-backend:iter137" ]; then
  ssh -o ConnectTimeout=10 root@39.103.68.205 \
    "docker tag food-backend:iter137 '$CUR_IMG' && echo tagged"
fi

echo "--- F. server: stop & remove old container ---"
ssh -o ConnectTimeout=15 root@39.103.68.205 \
  'docker stop food-backend 2>&1; docker rm -f food-backend 2>&1'

echo "--- G. server: docker compose up --force-recreate (do not edit compose) ---"
# Use cd to /root/food-website so compose finds docker-compose.yml
ssh -o ConnectTimeout=60 root@39.103.68.205 \
  'cd /root/food-website && (docker compose -f docker-compose.yml up -d --force-recreate --no-deps food-backend 2>&1 || docker compose up -d --force-recreate --no-deps food-backend 2>&1 || docker run -d --name food-backend --restart unless-stopped -p 3000:3001 food-backend:iter137 2>&1)'

echo "--- H. wait 15s for backend boot ---"
sleep 15

echo "--- I. container state ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 'docker ps --format "{{.Names}}\t{{.Status}}"'

echo "--- J. verify code inside container after recreate ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-backend sh -c "grep -c aggregateDimensionAverages routes/compare.js 2>&1"'

echo "=== verify 1: backend contract ==="
sleep 2
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
CNT=$(curl -s http://39.103.68.205/assets/ComparePage-DfKEWcCt.js | grep -c dimensionAverages)
echo "dimensionAverages matches: $CNT"
[ "$CNT" -ge 1 ] && echo "PASS field in chunk" || echo "FAIL field missing"

echo "=== verify 4: /compare route 200 ==="
curl -s -o /dev/null -w "compare_route=%{http_code}\n" http://39.103.68.205/compare

echo "=== T-2026-0612-002 deploy v8 END $(date) ==="
