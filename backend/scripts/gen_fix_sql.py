import re, json, sys

with open('backend/seeds/seed.js', 'r') as f:
    content = f.read()

lines = content.split('\n')
titles, ctags, ids = [], [], []

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

PRICE = {'medium':'中等','low':'经济','high':'高级','中档':'中等','普通家常':'中等','经济实惠':'经济'}
METHOD = {'bake':'烤','braise':'炖','raw':'生食','blend':'搅拌','wrap':'卷','simmer':'煮','grill':'煎烤'}
CUISINE = {'mexican':'墨西哥','mediterranean':'地中海','indian':'印度','vietnamese':'越南','french':'法式',
  'japanese':'日式','korean':'韩式','thai':'泰式','法餐':'法式','日料':'日式','韩料':'韩式',
  '西餐':'西式','家常菜':'家常','东南亚菜':'东南亚','西北菜':'西北','苏菜':'苏式','东北菜':'东北','中式':'家常'}
INGRED = {'almond-egg':'杏仁/鸡蛋','flour-dairy':'面粉/乳制品','avocado-vegetables':'牛油果/蔬菜',
  'chicken-dairy':'鸡肉/乳制品','chicken-cheese':'鸡肉/芝士','chickpeas-sesame':'鹰嘴豆/芝麻',
  'vegetables-cheese':'蔬菜/芝士','seafood-rice':'海鲜/米饭','beef-rice_noodles':'牛肉/河粉',
  'cheese-egg':'芝士/鸡蛋','beef-corn':'牛肉/玉米','rice-seafood':'米饭/海鲜'}
FLAVOR = {'sweet':'甜','mild':'温和','tangy-creamy':'酸甜/奶香','creamy-spicy':'奶香/微辣',
  'spicy-rich':'香辣/浓郁','nutty-tangy':'坚果/酸甜','fresh-tangy':'清新/酸甜','fresh':'清新',
  'savory':'咸鲜','sweet-creamy':'甜/奶香','spicy':'辣','savory-saffron':'咸鲜/藏红花'}

def is_ok(s):
    if not s: return False
    if len(s) == 1 and ord(s) < 128: return False
    return True

def norm_method(v):
    if not v: return ''
    if isinstance(v, list):
        cleaned = [x.strip() for x in v if is_ok(x.strip())]
        if not cleaned: return ''
        return METHOD.get(cleaned[0], cleaned[0])
    s = v.strip()
    if not is_ok(s): return ''
    return METHOD.get(s, s)

count = min(len(titles), len(ctags), len(ids))
sql_statements = []
for j in range(count):
    _, title = titles[j]
    _, ct_str = ctags[j]
    _, rid = ids[j]
    ct = json.loads(ct_str)
    method = norm_method(ct.get('method', ''))
    if method:
        escaped_method = method.replace("'", "\\'")
        sql_statements.append(
            f"UPDATE recipes SET categoryTags = JSON_SET(categoryTags, '$.method', '{escaped_method}') WHERE id = '{rid}' AND (JSON_UNQUOTE(JSON_EXTRACT(categoryTags, '$.method')) = '' OR JSON_EXTRACT(categoryTags, '$.method') IS NULL);"
        )

with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(sql_statements))
    f.write('\n')

print(f"Generated {len(sql_statements)} SQL statements to {sys.argv[1]}")
