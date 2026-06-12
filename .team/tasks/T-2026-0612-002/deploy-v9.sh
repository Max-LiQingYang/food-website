#!/bin/bash
# T-2026-0612-002 deploy v9 — 简化: stop+rm 死循环容器, compose 拉起, docker cp 覆盖, chown, restart
# 不用 image 重建（v7/v8 太慢且与 compose image 名不匹配易出问题）
set +e
LOG=/Users/max_yang/Projects/food-website/.team/tasks/T-2026-0612-002/deploy-v9.log
exec > >(tee -a "$LOG") 2>&1
echo "=== T-2026-0612-002 deploy v9 START $(date) ==="

cd /Users/max_yang/Projects/food-website

echo "--- A. local source sanity ---"
grep -c aggregateDimensionAverages backend/routes/compare.js

echo "--- B. transfer backend code to server ---"
COPYFILE_DISABLE=1 tar --no-xattrs -cf - -C backend . | \
  ssh -o ConnectTimeout=30 root@39.103.68.205 \
    'rm -rf /tmp/backend-overlay && mkdir -p /tmp/backend-overlay && tar xf - -C /tmp/backend-overlay && echo "transferred $(find /tmp/backend-overlay -type f | wc -l) files"'

echo "--- C. stop & remove dead-loop container ---"
ssh -o ConnectTimeout=15 root@39.103.68.205 \
  'docker stop food-backend 2>&1; docker rm -f food-backend 2>&1'

echo "--- D. compose up food-backend (will use baked image) ---"
ssh -o ConnectTimeout=60 root@39.103.68.205 \
  'cd /root/food-website && (docker compose -f docker-compose.yml up -d --force-recreate --no-deps food-backend 2>&1 || docker compose up -d --force-recreate --no-deps food-backend 2>&1)'

echo "--- E. wait 12s for backend boot ---"
sleep 12

echo "--- F. container state ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 'docker ps --format "{{.Names}}\t{{.Status}}"'

echo "--- G. verify code inside container (BEFORE cp, should be 0) ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-backend sh -c "grep -c aggregateDimensionAverages routes/compare.js 2>&1"'

echo "--- H. copy new compare.js into container + chown ---"
ssh -o ConnectTimeout=15 root@39.103.68.205 \
  'docker cp /tmp/backend-overlay/routes/compare.js food-backend:/app/routes/compare.js 2>&1 && \
   docker exec food-backend chown nodeapp:nodejs /app/routes/compare.js 2>&1 && \
   echo "cp+chown done"'

echo "--- I. verify code inside container (AFTER cp, should be 3) ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-backend sh -c "grep -c aggregateDimensionAverages routes/compare.js 2>&1"'

echo "--- J. restart backend (load new code) ---"
ssh -o ConnectTimeout=15 root@39.103.68.205 'docker restart food-backend 2>&1'
sleep 10

echo "--- K. container state after restart ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 'docker ps --format "{{.Names}}\t{{.Status}}"'

echo "--- L. verify code after restart (should still be 3) ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-backend sh -c "grep -c aggregateDimensionAverages routes/compare.js 2>&1"'

echo "=== verify 1: backend contract ==="
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

echo "=== verify 3: chunk content ==="
CNT=$(curl -s http://39.103.68.205/assets/ComparePage-DfKEWcCt.js | grep -c dimensionAverages)
echo "dimensionAverages matches: $CNT"
[ "$CNT" -ge 1 ] && echo "PASS" || echo "FAIL"

echo "=== verify 4: /compare route 200 ==="
curl -s -o /dev/null -w "compare_route=%{http_code}\n" http://39.103.68.205/compare

echo "=== T-2026-0612-002 deploy v9 END $(date) ==="
