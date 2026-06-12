#!/bin/bash
# T-2026-0612-002 deploy v6 — 修复后端代码未进容器（v5 grep 路径写错，容器内代码是 /app/routes/compare.js）
set +e
LOG=/Users/max_yang/Projects/food-website/.team/tasks/T-2026-0612-002/deploy-v6.log
exec > >(tee -a "$LOG") 2>&1
echo "=== T-2026-0612-002 deploy v6 START $(date) ==="

echo "--- A. confirm correct container path ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-backend sh -c "pwd && ls routes/compare.js && grep -c aggregateDimensionAverages routes/compare.js || echo NO_MATCH"'

echo "--- B. copy backend code into container ---"
cd /Users/max_yang/Projects/food-website
# Use COPYFILE_DISABLE + --no-xattrs to avoid macOS metadata
COPYFILE_DISABLE=1 tar --no-xattrs -cf - -C backend . | \
  ssh -o ConnectTimeout=30 root@39.103.68.205 \
    'cat | docker cp - food-backend:/app/ 2>&1'

echo "--- C. verify code inside container AFTER cp ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-backend sh -c "grep -c aggregateDimensionAverages routes/compare.js && echo IN_CONTAINER_OK"'

echo "--- D. restart backend (new code load) ---"
ssh -o ConnectTimeout=15 root@39.103.68.205 \
  '(docker compose -f /root/food-website/docker-compose.yml restart food-backend 2>&1 || docker restart food-backend 2>&1)'

echo "--- E. wait 6s for backend ready ---"
sleep 6

echo "--- F. check container code version after restart ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-backend sh -c "grep -c aggregateDimensionAverages routes/compare.js"'

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
  echo "raw response (truncated): $RESP" | head -c 800
  echo ""
  echo "$RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);print('code:',d.get('code'));da=d.get('data',{}).get('recipes',[{}])[0].get('dimensionAverages');print('dimAvgs:',json.dumps(da,ensure_ascii=False,indent=2) if da else 'MISSING')"
fi

echo "=== verify 2: ComparePage chunk in nginx html ==="
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-frontend ls /usr/share/nginx/html/assets/ | grep -i compare'

echo "=== verify 3: hit frontend hash to confirm public serves new chunk ==="
CHUNK=$(ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-frontend ls /usr/share/nginx/html/assets/ | grep "^ComparePage.*\.js$" | head -1' 2>&1 | tr -d '\r\n')
echo "chunk: $CHUNK"
if [ -n "$CHUNK" ]; then
  CNT=$(curl -s "http://39.103.68.205/assets/$CHUNK" | grep -c 'dimensionAverages')
  echo "dimensionAverages matches in chunk: $CNT"
  [ "$CNT" -ge 1 ] && echo "PASS field in chunk" || echo "FAIL field missing"
else
  echo "SKIP"
fi

echo "=== verify 4: /compare route 200 ==="
RC=$(curl -s -o /dev/null -w "%{http_code}" http://39.103.68.205/compare)
echo "compare_route=$RC"

echo "=== T-2026-0612-002 deploy v6 END $(date) ==="
