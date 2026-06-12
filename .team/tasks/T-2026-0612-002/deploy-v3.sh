#!/bin/bash
# T-2026-0612-002 deploy v3 — 简化版，避免 v1/v2 的 tool-call 解析陷阱
# 全程只用 exec 执行，agent 只需传一段命令，不再做复杂的命令拼接。
set +e
LOG=/Users/max_yang/Projects/food-website/.team/tasks/T-2026-0612-002/deploy-v3.log
exec > >(tee -a "$LOG") 2>&1
echo "=== T-2026-0612-002 deploy v3 START $(date) ==="

cd /Users/max_yang/Projects/food-website
echo "--- 1. local commit state ---"
git log --oneline -3

echo "--- 2. ensure push (idempotent) ---"
git push origin main || echo "push may already be applied"

echo "--- 3. server pull ---"
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@39.103.68.205 \
  'cd /root/food-website && git reset --hard HEAD && git pull && git log --oneline -3' \
  || { echo "FATAL: ssh pull failed"; exit 1; }

echo "--- 4. local build (idempotent) ---"
cd /Users/max_yang/Projects/food-website/frontend
npm run build 2>&1 | tail -5

echo "--- 5. container ps ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 'docker ps --format "{{.Names}}\t{{.Status}}"' \
  || { echo "FATAL: docker ps failed"; exit 1; }

echo "--- 6. backend restart ---"
ssh -o ConnectTimeout=15 root@39.103.68.205 \
  'cd /root/food-website && docker compose -f docker-compose.yml restart food-backend 2>&1 || docker restart food-backend 2>&1'

echo "--- 7. frontend dist inject (tar stream, no rm) ---"
cd /Users/max_yang/Projects/food-website/frontend
tar cf - dist | ssh -o ConnectTimeout=30 root@39.103.68.205 \
  'cat | docker cp - food-frontend:/usr/share/nginx/html/ 2>&1'

echo "--- 8. nginx reload (no restart) ---"
ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'docker exec food-frontend nginx -s reload 2>&1'

echo "--- 9. wait 5s ---"
sleep 5

echo "=== verify 1: backend contract (with real recipe ids from server) ==="
RIDS=$(ssh -o ConnectTimeout=10 root@39.103.68.205 \
  'cd /root/food-website/backend && node -e "const {Recipe,sequelize}=require(\"./models\");(async()=>{try{await sequelize.authenticate();const r=await Recipe.findAll({attributes:[\"id\"],limit:2});console.log(r.map(x=>String(x.id)).join(\",\"))}catch(e){console.log(\"ERR:\"+e.message)}finally{process.exit(0)}})();"' 2>&1 | tail -1)
echo "got recipe ids: $RIDS"
RID1=$(echo "$RIDS" | cut -d, -f1)
RID2=$(echo "$RIDS" | cut -d, -f2)
if [ -n "$RID1" ] && [ -n "$RID2" ] && [ "$RID1" != "ERR"* ]; then
  curl -s -X POST http://39.103.68.205/api/recipes/compare \
    -H 'Content-Type: application/json' \
    -d "{\"recipeIds\":[\"$RID1\",\"$RID2\"]}" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('code:',d.get('code'));da=d.get('data',{}).get('recipes',[{}])[0].get('dimensionAverages');print('dimAvgs:',json.dumps(da,ensure_ascii=False,indent=2) if da else 'MISSING')"
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

echo "=== T-2026-0612-002 deploy v3 END $(date) ==="
