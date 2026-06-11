import re, json

with open('backend/seeds/seed.js', 'r') as f:
    content = f.read()

lines = content.split('\n')
titles = []
ctags = []
ids = []

for i, line in enumerate(lines):
    tm = re.search(r"title:\s*['\"]([^'\"]+?)['\"]", line)
    if tm: titles.append((i, tm.group(1)))
    cm = re.search(r'categoryTags:\s*"(\\"|.)*?"', line)
    if cm:
        raw = cm.group(0)
        start = raw.index('"') + 1
        end = raw.rindex('"')
        ct_str = raw[start:end].replace('\\"', '"')
        ctags.append((i, ct_str))
    idm = re.search(r"id:\s*'([^']+)'", line)
    if idm: ids.append((i, idm.group(1)))

id_map = {}
for (li, tid), (li_ct, ct_str), (li_id, rid) in zip(titles, ctags, ids):
    id_map[rid] = {'title': tid, 'ct': ct_str}

with open('/tmp/seed_catags.json', 'w') as f:
    json.dump(id_map, f, ensure_ascii=False)

print(f"Wrote {len(id_map)} entries to /tmp/seed_catags.json")
