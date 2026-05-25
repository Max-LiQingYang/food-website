# PRD: 迭代#46 内容质量增强（方向C）

## 一、概述
提升食谱内容深度 + 建立作者成长体系 + 优化优质内容发现。

## 二、当前存量
- Recipe 模型已有：tips(烹饪小贴士)，nutriScore/smartDifficulty(运行时计算)，qualityScore(views*0.3+fav*2+avgRating*5+com*1.5)
- 无：story/culturalBackground 字段，作者级别系统
- 推荐系统已有时令/热门/个性化（收藏历史）三种模式

## 三、功能规格

### 3.1 食谱内容深度增强
| 字段 | 类型 | 说明 |
|------|------|------|
| story | TEXT | 烹饪故事/食谱来源/缘起（千字以内） |
| culturalBackground | TEXT | 文化背景/地域特色/时节讲究 |

- RecipeDetailPage 新增折叠区：📖 故事与文化（可展开折叠）
- 编辑/创建表单新增 story/culturalBackground 字段

### 3.2 作者等级系统
| 等级 | 名称 | 所需积分 | 徽章 |
|------|------|----------|------|
| 1 | 🥚 烹饪新手 | 0 | 蛋 |
| 2 | 🍳 家庭厨手 | 50 | 平底锅 |
| 3 | 👨‍🍳 厨房达人 | 200 | 厨师帽 |
| 4 | ⭐ 美食行家 | 500 | 星 |
| 5 | 👑 厨神 | 1000 | 皇冠 |

积分公式：`recipeCount * 30 + Σ(qualityScore) * 5 + totalFavorites * 2 + totalComments * 1`

- Compute: 在 User 模型中添加 `authorLevel` VIRTUAL 字段（运行时从 Recipe 聚合计算）
- 端点: `GET /api/users/:id/author-info` 返回级别+积分+下一级进度
- 前端展示: RecipeCard 作者名旁显示等级徽章，UserProfilePage 头部显示等级+进度条

### 3.3 优质内容推荐加权
- 推荐列表按 `qualityScore * (1 + authorLevel * 0.15)` 排序
- 首页/搜索/热门列表中 authorLevel ≥3 的作者食谱标记 [🌟 优质作者]
- 推荐接口 /api/recommendations 增加 authorLevel 权重参数

## 四、API 设计

### 新增端点
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/users/:id/author-info | 作者等级信息（积分/等级/下一级进度） |
| GET | /api/recipes/enhanced-search | 增强搜索（支持作者等级加权排序） |

### 修改端点
| 端点 | 变更 |
|------|------|
| GET /api/recipes/:id/detail | 返回 story/culturalBackground |
| POST/PUT /api/recipes | 接受 story/culturalBackground 字段 |
| GET /api/recommendations | 返回 authorLevel 并加权排序 |

## 五、前端变更

| 组件/页面 | 变更 |
|-----------|------|
| RecipeDetailPage | 新增故事与文化折叠区（Accordion），显示作者等级 |
| RecipeCard | 作者名旁显示等级徽章 + 优质作者标记 |
| UserProfilePage | 头部新增作者等级/积分/进度条 |
| CreateRecipePage | 表单新增 story/culturalBackground 字段 |
| api.ts | 新增接口函数 |

## 六、优先级
| 优先级 | 内容 |
|--------|------|
| P0 | Recipe 模型 story/culturalBackground 字段 + 后端 CRUD |
| P0 | 作者等级计算 + author-info 端点 |
| P0 | RecipeDetailPage 故事区 + 作者等级展示 |
| P1 | RecipeCard 等级徽章 + UserProfilePage 等级 |
| P1 | 推荐加权排序 |
| P2 | 种子数据补充（故事+文化背景 + 种子作者数据） |

## 七、测试计划
- 后端：测试 story/culturalBackground CRUD，author-info 计算
- 前端：测试食谱详情页故事区渲染，RecipeCard 徽章展示