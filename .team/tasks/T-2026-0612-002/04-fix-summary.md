# Fix Summary — T-2026-0612-002 R2

## B1 修复方式
`backend/routes/compare.js` 末尾导出从 `module.exports = { router, aggregateDimensionAverages }` 改为：
```js
module.exports = router
module.exports.aggregateDimensionAverages = aggregateDimensionAverages
```
这样 `require('./compare')` 返回 router 函数，Express `router.use('/recipes/compare', compareRoutes)` 正常挂载；同时 `require('./compare').aggregateDimensionAverages` 仍可访问纯函数。

`backend/tests/compare.test.js` 对应改为 `const compareRouter = require('../routes/compare')` + `compareRouter.aggregateDimensionAverages`。

## 后端 jest 跑通证据
```
PASS tests/compare.test.js
  Compare Route Module
    ✓ 导出 router 对象
    ✓ router 有 post 处理函数
    ✓ 导出 aggregateDimensionAverages 纯函数
  aggregateDimensionAverages
    ✓ 正确聚合多个食谱的维度评分
    ✓ 无评分时返回 {average:0, count:0}
    ✓ 部分维度为 NULL 时仅计算非 NULL 维度
    ✓ 忽略不在 recipeIds 列表中的评论
    ✓ 保留 1 位小数精度
Tests: 8 passed, 8 total
```

## node -e 验证 typeof 结果
```
const r=require('./routes/compare'); console.log(typeof r, typeof r.aggregateDimensionAverages, r.stack?.length>0)
→ function function true
```

## N1/N2 处理
- **N1**：未修 — 项目纯 JS，无 DIMENSION_LABELS/DIMENSION_ORDER 常量，类型收紧不适用
- **N2**：已修 — `git checkout HEAD~1 -- .team/tasks/T-2026-0612-001/99-status.yaml` 还原了被 R1 意外修改的上一个任务状态文件

## Commit
`f3a3f90` fix(compare): 修 router 导出挂载问题 + revert T-001 status
