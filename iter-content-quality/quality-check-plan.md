# 质量检查脚本执行计划

> 基于 PRD-content-quality.md v1.0

## 执行顺序

1. `content-quality-check.js` — 诊断（只读，不修改 DB）
2. `data-consistency-check.js` — 数据一致性诊断（只读，不修改 DB）
3. 人工审核报告
4. `content-quality-fix.js` — 自动修复（写入 DB）
5. `optimize-content.js` — 内容丰富化（写入 DB）
6. 重新运行 check 验证效果

## 脚本 1：content-quality-check.js

### 功能
遍历所有 Recipe，按 PRD 8 维度打分，输出质量报告。

### 输入
无参数。读取 MariaDB 中 recipes 表全部数据。

### 输出
打印格式化的质量报告，包含：
- 每道食谱：标题、ID、总分、各维度得分、缺失项
- 统计汇总：平均分、分布（各等级数量）、Top/N 低分食谱
- 按分数从低到高排序

### 数据库连接
使用 Sequelize，通过 `backend/models/` 加载 Recipe 模型。
先读取 `backend/config/config.json` 获取数据库配置。

### 关键评分规则（详见 PRD §1）
- 必填字段完整性（10分）
- 图片质量（15分）
- 描述吸引力（15分）
- 食材列表清晰度（15分）
- 步骤详细度（15分）
- 烹饪技巧/tips（10分）
- 营养信息完整（10分）
- 分类与季节标签准确（10分）

### 执行
```bash
cd /root/food-website && node backend/scripts/content-quality-check.js
```

## 脚本 2：data-consistency-check.js

### 功能
按 PRD §3 的规则逐条检查数据一致性。

### 输入
无参数。读取 MariaDB 中 recipes 表全部数据。

### 输出
打印格式化的数据一致性报告，包含：
- 每个违规/警告/建议的详细说明（规则 ID + 描述 + 相关食谱）
- 按严重级别分组（🔴 错误 / 🟡 警告 / 🔵 建议）
- 统计汇总（各严重级别数量）

### 检查规则（详见 PRD §3）
- C-001~006：分类标签合规性
- S-001~006：季节标签合理性
- D-001~006：难度标签与步骤匹配

### 执行
```bash
cd /root/food-website && node backend/scripts/data-consistency-check.js
```

## 脚本 3：content-quality-fix.js

### 功能
根据质量报告自动修复可修复项。使用 AI API（DeepSeek volcengine）优化内容。

### 输入
- 可选参数：`--dry-run` 只打印将要做的修改，不实际写入
- 可选参数：`--batch=N` 一次处理 N 条（默认全部）
- 可选参数：`--min-score=N` 只处理低于 N 分的食谱

### AI API 配置
使用现有配置：
```js
const AI_API_BASE_URL = process.env.AI_API_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'deepseek-v3.2';
```

### 修复项（按优先级）
1. P0：补全缺失 description（AI 基于 title+ingredients 生成）
2. P0：替换 placehold.co 占位图（用 Unsplash 搜索匹配，或硬编码美食图片）
3. P1：扩写短 description 至 80-150 字（AI 扩写）
4. P1：为步骤添加量化信息（AI 补充）
5. P2：补全缺失 tips（AI 生成 2-3 条小贴士）
6. P2：扩写短 tips 至 30-80 字（AI 扩写）
7. P3：补全 nutrition（基于食材估算，用简单规则或 AI）

### 执行
```bash
# 先 dry-run 查看计划
cd /root/food-website && node backend/scripts/content-quality-fix.js --dry-run

# 实际执行
cd /root/food-website && node backend/scripts/content-quality-fix.js
```

## 脚本 4：optimize-content.js

### 功能
在自动修复完成后，对热门食谱进行内容丰富化处理。

### 处理逻辑
1. 按 viewCount 排序，取前 20 道
2. 为每道食谱添加 2-3 条实用小贴士（如果已有则扩写）
3. 优化步骤描述（补充温度/时间/火候细节）
4. 补全营养信息（如果 nutrition 为 NULL 或字段不完整）

### AI 生成策略
所有 AI 调用使用 Promise.allSettled 批量并行，最多 3 并发，避免 429 限流。

### 执行
```bash
cd /root/food-website && node backend/scripts/optimize-content.js
```

## 总体验收

执行顺序验证：
```bash
# 1. 诊断
node backend/scripts/content-quality-check.js > quality-report-1.txt
node backend/scripts/data-consistency-check.js > consistency-report.txt

# 2. 修复
node backend/scripts/content-quality-fix.js

# 3. 丰富化
node backend/scripts/optimize-content.js

# 4. 验证
node backend/scripts/content-quality-check.js > quality-report-2.txt

# 5. 对比报告
diff quality-report-1.txt quality-report-2.txt | head -50
```

验收标准：
- 所有食谱必填字段非空 ✅
- 无 placehold.co 占位图 ✅
- 所有食谱 description 字数 ≥ 50 ✅
- 所有食谱 tips 非空且字数 ≥ 20 ✅
- 所有食谱 nutrition 包含 calories/protein/fat/carbs ✅
- 平均分从修复前提升至少 20 分 ✅
