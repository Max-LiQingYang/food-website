# 🥘 食材推荐增强功能 — UI/UX 设计文档

> **版本**：v1.0 | **日期**：2026-05-23 | **作者**：QClaw Design  
> **设计系统**：暖橙系 · 圆角 · 柔和阴影 · 米白基调

---

## 目录

1. [交互方案](#1-交互方案)
   - [1.1 AI 菜谱生成增强 (P0)](#11-ai-菜谱生成增强-p0)
   - [1.2 AI 食材替代建议 (P0)](#12-ai-食材替代建议-p0)
   - [1.3 清空冰箱模式 (P1)](#13-清空冰箱模式-p1)
   - [1.4 AI 对话式推荐 (P1)](#14-ai-对话式推荐-p1)
   - [1.5 饮食偏好设置 (P1)](#15-饮食偏好设置-p1)
2. [组件树](#2-组件树)
3. [样式指南](#3-样式指南)
4. [响应式适配](#4-响应式适配)
5. [动效和过渡](#5-动效和过渡)
6. [附录：ASCII 交互示意图](#6-附录ascii-交互示意图)

---

## 1. 交互方案

### 1.1 AI 菜谱生成增强 (P0)

**目标**：将 AI 推荐区域的卡片从「标题 + 食材列表」的简单展示，升级为含完整步骤、烹饪小贴士和保存操作的富信息卡片。

#### 1.1.1 用户操作路径

```
正常流程：

  用户输入食材 → AI 返回推荐菜谱卡片列表
       │
       ├─ [A] 用户点击某张 AI 推荐卡片
       │      → 卡片展开，显示完整内容区：
       │        ├─ 📝 步骤列表（默认展开前 2 步，其余折叠）
       │        ├─ 💡 烹饪小贴士（tips 区，橙色背景轻提示）
       │        ├─ ⏱️ 烹饪时间 + 🔥 难度
       │        └─ [📥 保存到我的食谱] 按钮
       │
       ├─ [B] 用户点击「展开全部步骤」
       │      → 步骤列表平滑展开，按钮文案变为「收起」
       │
       ├─ [C] 用户点击「保存到我的食谱」
       │      → 按钮变为 loading spinner
       │      → 成功：按钮变为 ✅「已保存」+ toast「食谱已保存到我的食谱」
       │      → 失败：按钮恢复原状 + toast 错误提示
       │
       └─ [D] 用户点击卡片外部 / 再次点击已展开卡片
              → 卡片折叠回摘要态
```

#### 1.1.2 卡片两种状态

**摘要态（默认）**：

```
┌──────────────────────────────────────┐
│  🍝 番茄意面                         │
│  ┌──────────────────────────────┐   │
│  │        [封面图占位]           │   │
│  └──────────────────────────────┘   │
│  🏷️ 匹配度 85%                      │
│  主料：番茄、意面、罗勒、大蒜          │
│  ⏱️ 25分钟  🔥 简单                  │
│  「番茄和意面的经典搭配...」           │
│  [❤️ 收藏]              [展开 ▼]    │
└──────────────────────────────────────┘
```

**展开态（点击后）**：

```
┌──────────────────────────────────────┐
│  🍝 番茄意面                         │
│  ┌──────────────────────────────┐   │
│  │        [封面图占位]           │   │
│  └──────────────────────────────┘   │
│  🏷️ 匹配度 85%                      │
│  ✅ 番茄  ✅ 意面  ✅ 罗勒  ❌ 大蒜  │
│                                      │
│  ── 📝 烹饪步骤 ──────────────────   │
│  1. 烧一锅水，加盐，煮意面至弹牙       │
│  2. 橄榄油炒香蒜末，加入番茄翻炒        │
│  3. 加入罗勒叶，调味后与意面拌匀        │
│     [收起步骤 ▲]                      │
│                                      │
│  ┌─ 💡 小贴士 ──────────────────┐    │
│  │ 意面水留半碗，炒酱时加入可让    │    │
│  │ 酱汁更浓郁顺滑               │    │
│  └──────────────────────────────┘    │
│                                      │
│  ⏱️ 25分钟  🔥 简单  🍽️ 2人份       │
│                                      │
│  [❤️ 收藏]  [📥 保存到我的食谱]  [收起 ▲]│
└──────────────────────────────────────┘
```

#### 1.1.3 状态机

```
        ┌──────────────────────────┐
        │      摘要态 (collapsed)    │
        │   展示标题+食材+匹配度      │
        └──────┬───────────┬───────┘
               │ 点击展开    │ 点击另一张卡片
               ▼            ▼
        ┌──────────┐  ┌──────────────┐
        │ 展开态    │  │ 旧卡片折叠    │
        │ 步骤+tips│  │ 新卡片展开    │
        └────┬─────┘  └──────────────┘
             │ 点击收起 / 点击外部 / 点另一张卡
             ▼
        ┌──────────┐
        │ 摘要态    │
        └──────────┘
```

**规则**：同时只允许一张卡片处于展开态（手风琴模式）。

---

### 1.2 AI 食材替代建议 (P0)

**目标**：AI 推荐结果中的 ❌ 未匹配食材可点击，弹出替代建议气泡，帮助用户灵活替换。

#### 1.2.1 用户操作路径

```
完整流程：

  AI 卡片的食材标签行：
  ✅ 番茄  ✅ 意面  ✅ 罗勒  ❌ 大蒜  ✅ 橄榄油
                            │
  用户点击 ❌ 大蒜
       │
       ▼
  ┌─────────────────────────────┐
  │ 💡 替代建议            ✕    │
  │                             │
  │ 大蒜可以用以下食材替代：     │
  │                             │
  │ ○ 洋葱 — 相似辛辣感，更温和  │
  │ ○ 蒜苗 — 清香蒜味，口感脆嫩  │
  │ ○ 蒜粉 — 干制蒜香，方便快捷  │
  │ ○ 小葱 — 清淡葱香，适合凉拌  │
  │                             │
  │ [以「洋葱」重新推荐]         │
  └─────────────────────────────┘
       │
       ├─ 用户选择一个替代品（点击 ○ 变为 ● 选中态）
       │    → 气泡底部按钮文案更新：「以「洋葱」重新推荐」
       │
       ├─ 用户点击「以 XX 重新推荐」
       │    → 气泡关闭 + 输入框自动填入替换后的食材 + 触发重新搜索
       │
       ├─ 用户点击 ✕ / 点击气泡外部
       │    → 气泡关闭（带动画）
       │
       └─ 用户同时点击另一个 ❌ 标签
            → 当前气泡关闭，新食材的替代气泡打开
```

#### 1.2.2 气泡定位策略

```
桌面端 (viewport >= 768px):
┌────────────────────────────────────────┐
│  卡片                                    │
│  ✅ A  ✅ B  ❌ C  ❌ D                  │
│             │                           │
│             └──────┐                    │
│                    ▼                    │
│           ┌──────────────┐              │
│           │ 替代建议气泡   │              │
│           └──────────────┘              │
│  (气泡出现在标签下方，左对齐标签)          │
└────────────────────────────────────────┘

移动端 (viewport < 768px):
┌──────────────────────┐
│  卡片                 │
│  ✅ A  ✅ B  ❌ C     │
│  ❌ D                 │
│       │               │
│       └───┐           │
│           ▼           │
│  ┌──────────────┐     │
│  │ 替代建议气泡   │     │
│  │ (底部弹出)    │     │
│  └──────────────┘     │
│  (气泡以 bottom sheet │
│   形式从底部弹出)      │
└──────────────────────┘
```

#### 1.2.3 气泡状态机

```
     idle ──点击❌标签──▶ 气泡展示 (默认未选中替代品)
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
               点击○选项   点击✕关闭   点击外部区域
                    │         │          │
                    ▼         ▼          ▼
              ● 选中态   气泡关闭     气泡关闭
              (按钮激活)  (fadeOut)   (fadeOut)
                    │
             点击「重新推荐」
                    │
                    ▼
              触发搜索 → 气泡关闭
```

---

### 1.3 清空冰箱模式 (P1)

**目标**：Tab 切换「精准推荐」与「清空冰箱」两种模式，清空冰箱模式帮助用户以消耗库存为目标获得食谱推荐。

#### 1.3.1 用户操作路径

```
模式切换：

  ┌──────────────┬──────────────────┐
  │ 🎯 精准推荐   │ 🧊 清空冰箱      │    ← Tab 栏
  └──────────────┴──────────────────┘
       │ 默认选中             │ 用户点击
       ▼                     ▼
  现有推荐页面           清空冰箱模式


清空冰箱模式完整流程：

  [切换 Tab 到 🧊 清空冰箱]
       │
       ▼
  Hero 区变化：
  ┌─────────────────────────────────────────┐
  │                                         │
  │  🧊 清空冰箱 · 智慧消耗库存                │
  │                                         │
  │  ┌─────────────────────────────────┐    │
  │  │ 输入食材名称，按回车添加...      🔍 │    │  ← 搜索框 + 确认按钮
  │  └─────────────────────────────────┘    │
  │                                         │
  │  🏷️ [番茄 ✕] [鸡蛋 ✕] [青椒 ✕]          │  ← 已选食材标签区
  │      [+ 添加食材]                       │  ← 手动添加占位标签
  │                                         │
  │  🍳 偏好：中式 · 30分钟内 · 2人份        │  ← 快捷筛选
  │                                         │
  └─────────────────────────────────────────┘
       │
       │ 用户添加 >= 2 个食材后自动触发搜索
       │ (debounce 800ms，或点击🔍手动触发)
       ▼
  结果区变化：
  ┌─────────────────────────────────────────┐
  │  📊 清空率                               │
  │  ████████████░░░░░░░░  60% (3/5 食材)    │  ← 清空率进度条
  │                                         │
  │  ✅ 已消耗：番茄、鸡蛋、青椒               │
  │  ❌ 未消耗：蘑菇、豆腐                     │
  └─────────────────────────────────────────┘

  推荐卡片排序逻辑：按清空率降序排列。
  每张卡片额外展示：清空率 badge + 已消耗食材标签
```

#### 1.3.2 视觉差异化策略

| 维度 | 精准推荐模式 | 清空冰箱模式 |
|------|-------------|-------------|
| **主色调** | 暖橙 `#E8663E` | 冷蓝渐变 `#4ECDC4 -> #44B09E` |
| **Hero 背景** | 橙色微渐变 | 蓝绿色微渐变（冰箱冷感） |
| **卡片 Badge** | 🏷️ 匹配度 % | 🧊 清空率 % |
| **输入区** | 单行搜索框 | 搜索框 + 标签区 |
| **空状态** | "输入食材获得推荐" | "添加至少 2 种食材" |
| **图标体系** | 🔍 🥘 🏷️ | 🧊 📊 ✅ ❌ |

#### 1.3.3 食材标签交互

```
输入框输入 "牛" → 下拉联想菜单：
┌──────────────┐
│ 牛肉          │ ← 联想推荐
│ 牛奶          │
│ 牛排          │
│ 牛油果        │
└──────────────┘

用户点击/回车选中「牛肉」：
→ "牛肉" 作为标签出现在标签区，输入框清空
→ 联想菜单关闭

用户点击标签上的 ✕：
→ 标签移除（带缩小动画 200ms）
→ 剩余食材数 >= 2 则自动重新搜索
```

---

### 1.4 AI 对话式推荐 (P1)

**目标**：推荐结果下方提供对话面板，支持快捷回复和自由文本，通过 SSE 流式返回 AI 建议。

#### 1.4.1 用户操作路径

```
完整对话流程：

  当用户浏览推荐结果后，底部出现对话入口：

  ┌─ 💬 对推荐不满意？告诉我更多 ─────────────────────────────────┐
  │                                                              │
  │  快捷回复：                                                  │
  │  [少油少盐] [减脂版] [更快手] [中式口味] [西式] [一人份]       │
  │                                                              │
  │  ┌────────────────────────────────────────┐ [发送 >>]        │
  │  │ 或者直接输入你的想法...                  │                 │
  │  └────────────────────────────────────────┘                 │
  └──────────────────────────────────────────────────────────────┘
       │
       ├─ 用户点击「少油少盐」
       │    → 快捷回复以气泡形式加入对话区
       │    → AI 开始流式返回（逐字显示）
       │    → 推荐结果区实时刷新
       │
       ├─ 用户输入「家里还有虾，想做个海鲜类的」→ 回车
       │    → 用户消息气泡加入对话区
       │    → AI 流式回复（SSE，光标闪烁动画）
       │    → 推荐结果区同步刷新
       │
       └─ 用户可继续多轮对话
```

#### 1.4.2 对话面板布局

**桌面端 — 侧边栏模式**：

```
┌────────────────────────────────────────────────────┐
│  Hero 区                                           │
├────────────────────────────────────────────────────┤
│                     │                              │
│   推荐结果区         │  💬 对话面板                  │
│   (卡片网格)        │  ┌──────────────────────┐   │
│                     │  │ 用户: 少油少盐         │   │
│   ┌────┐ ┌────┐    │  │ AI: 好的，我重新推荐   │   │
│   │卡片│ │卡片│    │  │ 以下少油版菜谱...      │   │
│   └────┘ └────┘    │  │                      │   │
│                     │  │ [快捷回复按钮区]       │   │
│   ┌────┐ ┌────┐    │  │ [输入框 + 发送]       │   │
│   │卡片│ │卡片│    │  └──────────────────────┘   │
│   └────┘ └────┘    │                              │
│                     │                              │
└────────────────────────────────────────────────────┘
```

**移动端 — 底部弹出式**：

```
┌──────────────────────┐
│  Hero 区 (紧凑版)     │
├──────────────────────┤
│  推荐结果区           │
│  ┌────┐ ┌────┐      │
│  │卡片│ │卡片│      │
│  └────┘ └────┘      │
│                      │
│  ┌────┐ ┌────┐      │
│  │卡片│ │卡片│      │
│  └────┘ └────┘      │
│                      │
├──────────────────────┤
│ 💬 对推荐不满意？     │  ← 对话入口浮动条
│ [快捷回复标签 横向滚动]│
│   点击展开 ▼          │
└──────────────────────┘
        │ 点击展开
        ▼
┌──────────────────────┐
│  Hero 区 (隐藏)       │
├──────────────────────┤
│  💬 对话面板 (占满)    │
│                      │
│  用户: 少油少盐        │
│  AI: 好的，我重新...   │
│                      │
│  [结果预览卡片]       │  ← 1~2 张预览
│                      │
│  [快捷回复]           │
│  [______________] 📤  │
│                      │
│  [查看全部结果 ▲]     │  ← 收起面板，返回结果页
└──────────────────────┘
```

#### 1.4.3 SSE 流式渲染策略

```
用户发送消息
    │
    ▼
对话区插入 AI 消息占位（含闪烁光标 ▍）
    │
    ▼
收到第一个 SSE chunk -> 开始逐字渲染
    │
    ▼
每个 chunk 追加到消息内容 + 光标跟随
    │
    ▼
收到 [DONE] -> 移除光标 + 消息完成
    │
    ▼
结果卡片区根据 AI 返回的 recipe_ids 刷新（带 crossfade 过渡）
```

---

### 1.5 饮食偏好设置 (P1)

**目标**：搜索框旁的偏好设置入口，让用户可预设口味、忌口、烹饪方式、人数等偏好。

#### 1.5.1 用户操作路径

```
偏好设置流程：

  搜索框旁出现齿轮图标 ⚙️
       │
       │ 用户点击 ⚙️
       ▼
  ┌─ 饮食偏好设置 ────────────────────────── ✕ ─┐
  │                                              │
  │  🍳 烹饪方式                                 │
  │  [不限] [炒] [蒸] [煮] [烤] [炖] [凉拌]       │  多选标签
  │                                              │
  │  🌍 菜系偏好                                 │
  │  [不限] [中式] [日式] [韩式] [西式] [东南亚]   │
  │                                              │
  │  🚫 忌口 / 过敏源                            │
  │  [花生] [海鲜] [牛奶] [鸡蛋] [麸质]           │  多选标签
  │  ┌──────────────────────────────────┐       │
  │  │ 添加其他忌口...                    │       │  自定义输入
  │  └──────────────────────────────────┘       │
  │                                              │
  │  🌶️ 口味偏好                                 │
  │  ○ 清淡  ● 适中  ○ 重口                     │  单选
  │                                              │
  │  ⏱️ 烹饪时长                                 │
  │  ○ 不限  ○ 15分钟  ● 30分钟  ○ 1小时内       │  单选
  │                                              │
  │  🍽️ 用餐人数                                 │
  │  [−]  2 人  [+]                             │  步进器
  │                                              │
  │  ┌──────────┐  ┌──────────────┐             │
  │  │ 恢复默认  │  │ 💾 保存偏好   │             │
  │  └──────────┘  └──────────────┘             │
  └──────────────────────────────────────────────┘
       │
       ├─ 保存偏好 -> 抽屉关闭 -> Toast「偏好已保存」
       │            -> 后续所有搜索自动附加偏好参数
       │            -> ⚙️ 图标变为 ⚙️✓（表示已设置偏好）
       │
       └─ 恢复默认 -> 所有选项重置 -> 抽屉关闭
```

#### 1.5.2 偏好设置入口态

```
搜索框区域：

┌──────────────────────────────────────────────────┐
│  🔍 ┌────────────────────────────────┐ [⚙️ 偏好] │
│     │ 输入食材名称...                  │           │
│     └────────────────────────────────┘           │
│                                                   │
│  无偏好设置时：⚙️ 灰色 (--color-text-light)         │
│  已设置偏好时：⚙️✓ 暖橙色 + badge 圆点             │
└──────────────────────────────────────────────────┘
```

---

## 2. 组件树

```
RecommendPage
│
├─ ModeTabs                              # [新增] 模式切换 Tab
│   ├─ Tab "🎯 精准推荐"
│   └─ Tab "🧊 清空冰箱"
│
├─ HeroSection
│   ├─ HeroTitle ("🥘 食材推荐菜谱" | "🧊 清空冰箱 · 智慧消耗库存")
│   ├─ SearchBar
│   │   ├─ SearchInput (text input)
│   │   ├─ PreferenceButton (⚙️)         # [新增] 偏好设置入口
│   │   └─ SearchButton (🔍)
│   ├─ [FridgeMode] IngredientTagInput   # [新增] 标签式输入区
│   │   ├─ TagInput (输入框 + 联想下拉)
│   │   ├─ SelectedTags[] (已选食材标签)
│   │   └─ QuickFilters (偏好/时长/人数行)
│   ├─ HotTags (快捷标签，精准模式下)
│   └─ SearchHistory (搜索历史)
│
├─ PreferenceDrawer                      # [新增] 偏好设置抽屉
│   ├─ DrawerHeader (标题 + 关闭按钮)
│   ├─ PreferenceSection "烹饪方式" (多选标签)
│   ├─ PreferenceSection "菜系偏好" (多选标签)
│   ├─ PreferenceSection "忌口/过敏源" (多选标签 + 自定义输入)
│   ├─ PreferenceSection "口味偏好" (单选)
│   ├─ PreferenceSection "烹饪时长" (单选)
│   ├─ PreferenceSection "用餐人数" (步进器)
│   ├─ ResetButton
│   └─ SaveButton
│
├─ ResultArea
│   ├─ [FridgeMode] ClearRateProgress    # [新增] 清空率进度条
│   │   ├─ ProgressBar
│   │   ├─ ConsumedList (✅ 标签)
│   │   └─ UnconsumedList (❌ 标签)
│   │
│   ├─ SkeletonGrid (骨架屏)
│   │   └─ SkeletonCard[]
│   │
│   ├─ EmptyState (空状态引导)
│   │   ├─ StepGuide (3步引导)
│   │   └─ HotIngredients
│   │
│   ├─ RecipeCardGrid
│   │   └─ RecipeCard[]                  # [增强] 可展开卡片
│   │       ├─ CardHeader (标题 + Badge)
│   │       ├─ CoverImage
│   │       ├─ IngredientTags (✅/❌ 标签行)
│   │       ├─ CollapsibleContent        # [新增] 可折叠内容区
│   │       │   ├─ StepList (步骤列表)
│   │       │   │   └─ StepItem[] (单步骤)
│   │       │   └─ ExpandToggle ("展开全部"/"收起")
│   │       ├─ TipsBanner (💡 小贴士)     # [新增]
│   │       ├─ MetaRow (时间 + 难度 + 份数)
│   │       ├─ ActionBar
│   │       │   ├─ FavoriteButton
│   │       │   ├─ SaveToMyRecipeButton   # [新增]
│   │       │   └─ CollapseToggle
│   │       └─ SubstituteBubble           # [新增] 替代建议气泡
│   │           ├─ BubbleHeader (标题 + ✕)
│   │           ├─ SubstituteOption[] (○ 选项列表)
│   │           └─ ReSearchButton
│   │
│   └─ AIRecommendSection (无结果兜底)
│       └─ AIRecommendCard[] (同 RecipeCard 展开态)
│
├─ ChatPanel                             # [新增] AI 对话面板
│   ├─ ChatToggle (浮动入口条，移动端)
│   ├─ ChatHeader (标题 "💬 对话推荐" + 收起按钮)
│   ├─ MessageList
│   │   ├─ UserMessage[] (用户消息气泡)
│   │   └─ AIMessage[] (AI 消息气泡 + 流式光标)
│   ├─ QuickReplies (快捷回复标签行)
│   ├─ ChatInput (文本输入框)
│   └─ SendButton (发送按钮)
│
└─ ToastContainer (全局 toast 通知)
    └─ Toast[] (成功/错误/信息提示)
```

---

## 3. 样式指南

### 3.1 新增 CSS 变量

```css
:root {
  /* ===== 清空冰箱模式专属色系 ===== */
  --color-fridge-primary: #4ECDC4;        /* 冷蓝绿主色 */
  --color-fridge-accent: #44B09E;         /* 深蓝绿强调 */
  --color-fridge-bg: #F2FBFA;             /* 极浅蓝绿背景 */
  --color-fridge-tag-bg: #E0F7F5;         /* 标签背景 */
  --color-fridge-tag-text: #2C7A7B;       /* 标签文字 */
  --color-fridge-progress-bg: #E0F0EF;    /* 进度条底色 */
  --color-fridge-progress-fill: linear-gradient(90deg, #4ECDC4, #44B09E);

  /* ===== 替代建议气泡 ===== */
  --color-substitute-bg: #FFF9F5;         /* 气泡背景（暖白） */
  --color-substitute-border: #FFD1B3;     /* 气泡边框 */
  --color-substitute-hover: #FFF0E5;      /* 选项悬停 */
  --color-substitute-selected: #FFE8D6;   /* 选项选中 */
  --color-substitute-option-dot: #E8663E; /* 选项圆点（未选中） */

  /* ===== 对话面板 ===== */
  --color-chat-bg: #FFFAF6;              /* 对话面板背景 */
  --color-chat-user-bubble: #E8663E;     /* 用户气泡（暖橙） */
  --color-chat-user-text: #FFFFFF;       /* 用户气泡文字 */
  --color-chat-ai-bubble: #FFFFFF;       /* AI 气泡 */
  --color-chat-ai-border: #F0E0D6;       /* AI 气泡边框 */
  --color-chat-quick-reply: #FFF0E5;     /* 快捷回复背景 */
  --color-chat-quick-reply-hover: #FFD1B3; /* 快捷回复悬停 */
  --color-chat-quick-reply-active: #E8663E; /* 快捷回复激活 */
  --color-chat-input-bg: #FFFFFF;        /* 输入框背景 */
  --color-chat-input-border: #F0E0D6;    /* 输入框边框 */

  /* ===== 偏好设置抽屉 ===== */
  --color-drawer-overlay: rgba(0,0,0,0.4); /* 遮罩 */
  --color-option-active: #E8663E;        /* 选项激活 */
  --color-option-bg: #F5F0EB;            /* 未选中选项背景 */
  --color-option-active-bg: #FFF0E5;     /* 选中选项背景 */
  --color-option-text: #2D2D2D;          /* 未选中文字 */
  --color-option-active-text: #E8663E;   /* 选中文字 */

  /* ===== 展开/折叠 ===== */
  --color-collapse-border: #F0E8E0;      /* 折叠区边框 */
  --color-tips-bg: #FFF7F0;              /* 小贴士背景 */
  --color-tips-border: #FF8C42;          /* 小贴士左边框 */

  /* ===== 阴影增强 ===== */
  --shadow-bubble: 0 4px 16px rgba(232, 102, 62, 0.12), 0 2px 6px rgba(0,0,0,0.06);
  --shadow-drawer: -4px 0 24px rgba(0,0,0,0.12);
  --shadow-chat: 0 -4px 16px rgba(0,0,0,0.08);
  --shadow-toast: 0 8px 24px rgba(0,0,0,0.12);

  /* ===== 圆角补充 ===== */
  --radius-xl: 16px;                     /* 卡片/气泡大圆角 */
  --radius-full: 9999px;                 /* 胶囊/标签全圆角 */

  /* ===== 过渡时间 ===== */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);

  /* ===== 布局尺寸 ===== */
  --chat-panel-width: 380px;             /* 桌面端对话面板宽度 */
  --drawer-width: 400px;                 /* 偏好设置抽屉宽度 */
  --max-content-width: 1200px;           /* 内容最大宽度 */
  --hero-padding-y: 48px;                /* Hero 区上下内边距 */
  --hero-padding-y-mobile: 32px;         /* 移动端 Hero 区内边距 */

  /* ===== 清空率进度条 ===== */
  --progress-height: 8px;
  --progress-radius: 4px;
  --progress-glow: 0 0 8px rgba(78, 205, 196, 0.3); /* 冰箱模式进度条发光 */
}
```

### 3.2 关键组件样式

#### 3.2.1 可展开卡片 (ExpandableCard)

```css
/* 卡片容器 */
.recipe-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-normal),
              transform var(--transition-normal);
  cursor: pointer;
  overflow: hidden;
}

.recipe-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.recipe-card.is-expanded {
  box-shadow: var(--shadow-md);
  transform: none;
  cursor: default;
}

/* 卡片折叠内容区 - 使用 max-height 动画 */
.recipe-card__collapsible {
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--transition-slow);
}

.recipe-card__collapsible.is-open {
  max-height: 600px;
}

/* 步骤列表 */
.recipe-card__steps {
  padding: 12px 16px;
  border-top: 1px solid var(--color-collapse-border);
}

.recipe-card__step {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text);
}

.recipe-card__step-num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 展开/收起按钮 */
.recipe-card__expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 0;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
}

.recipe-card__expand-toggle:hover {
  color: #D4552E;
}

/* 小贴士横幅 */
.recipe-card__tips {
  margin: 12px 16px;
  padding: 10px 14px;
  background: var(--color-tips-bg);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-tips-border);
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text);
}

/* 保存按钮 */
.recipe-card__save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.recipe-card__save-btn:hover:not(.is-saved):not(.is-loading) {
  background: #D4552E;
  transform: scale(1.03);
}

.recipe-card__save-btn.is-saved {
  background: #4CAF50;
  pointer-events: none;
}

.recipe-card__save-btn.is-loading {
  opacity: 0.8;
  pointer-events: none;
}

/* 操作栏 */
.recipe-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
}

/* 食材标签 */
.recipe-card__ingredient-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
}

.recipe-card__ingredient-tag--matched {
  background: #E8F5E9;
  color: #2E7D32;
}

.recipe-card__ingredient-tag--unmatched {
  background: #FFF0E5;
  color: #E8663E;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.recipe-card__ingredient-tag--unmatched:hover {
  background: #FFD1B3;
}

/* 清空冰箱模式下的卡片
   -- 继承 recipe-card，差异由 .card--fridge 修饰符控制 -- */
.recipe-card--fridge {
  border-top: 3px solid var(--color-fridge-primary);
}

.recipe-card--fridge .recipe-card__badge {
  background: var(--color-fridge-tag-bg);
  color: var(--color-fridge-tag-text);
}
```

#### 3.2.2 替代建议气泡 (SubstituteBubble)

```css
/* 气泡容器 */
.substitute-bubble {
  position: absolute;
  z-index: 100;
  width: 280px;
  background: var(--color-substitute-bg);
  border: 1px solid var(--color-substitute-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-bubble);
  padding: 0;
  overflow: hidden;
  animation: bubbleIn var(--transition-bounce);
}

/* 桌面端：箭头指向 */
.substitute-bubble::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 24px;
  width: 12px;
  height: 12px;
  background: var(--color-substitute-bg);
  border: 1px solid var(--color-substitute-border);
  border-right: none;
  border-bottom: none;
  transform: rotate(45deg);
}

/* 移动端：底部弹出无箭头 */
@media (max-width: 767px) {
  .substitute-bubble {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    animation: slideUp var(--transition-slow);
  }

  .substitute-bubble::before {
    display: none;
  }
}

/* 气泡头部 */
.substitute-bubble__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-substitute-border);
}

.substitute-bubble__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.substitute-bubble__close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--color-text-light);
  cursor: pointer;
  border-radius: 50%;
  transition: background var(--transition-fast);
}

.substitute-bubble__close:hover {
  background: #F5F0EB;
}

/* 选项列表 */
.substitute-bubble__options {
  padding: 8px 0;
}

.substitute-bubble__option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.substitute-bubble__option:hover {
  background: var(--color-substitute-hover);
}

.substitute-bubble__option.is-selected {
  background: var(--color-substitute-selected);
}

/* 选项圆点 (○ / ●) */
.substitute-bubble__dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--color-substitute-option-dot);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.substitute-bubble__option.is-selected .substitute-bubble__dot {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.substitute-bubble__option.is-selected .substitute-bubble__dot::after {
  content: '';
  width: 6px;
  height: 6px;
  background: #fff;
  border-radius: 50%;
}

.substitute-bubble__option-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
}

.substitute-bubble__option-desc {
  font-size: 12px;
  color: var(--color-text-light);
  margin-left: auto;
  text-align: right;
}

/* 操作按钮 */
.substitute-bubble__action {
  padding: 12px 16px;
  border-top: 1px solid var(--color-substitute-border);
}

.substitute-bubble__research-btn {
  width: 100%;
  padding: 10px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  opacity: 0.5;
  pointer-events: none;
}

.substitute-bubble__research-btn.is-active {
  opacity: 1;
  pointer-events: auto;
}

.substitute-bubble__research-btn.is-active:hover {
  background: #D4552E;
  transform: scale(1.02);
}

/* 退出动画 */
.substitute-bubble.is-closing {
  animation: bubbleOut var(--transition-fast) forwards;
}

@keyframes bubbleIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes bubbleOut {
  to {
    opacity: 0;
    transform: scale(0.9) translateY(-4px);
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

#### 3.2.3 ModeTabs — 模式切换

```css
.mode-tabs {
  display: flex;
  background: #FFF;
  border-radius: var(--radius-full);
  padding: 4px;
  box-shadow: var(--shadow-sm);
  width: fit-content;
  margin: 0 auto;
}

.mode-tabs__tab {
  padding: 8px 20px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-light);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.mode-tabs__tab:hover {
  color: var(--color-text);
}

/* 精准推荐 tab 激活 */
.mode-tabs__tab--recommend.is-active {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(232, 102, 62, 0.3);
}

/* 清空冰箱 tab 激活 */
.mode-tabs__tab--fridge.is-active {
  background: var(--color-fridge-primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(78, 205, 196, 0.3);
}
```

#### 3.2.4 清空率进度条 (ClearRateProgress)

```css
.clear-rate {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
}

.clear-rate__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.clear-rate__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-fridge-tag-text);
}

.clear-rate__value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-fridge-primary);
}

/* 进度条轨道 */
.clear-rate__track {
  width: 100%;
  height: var(--progress-height);
  background: var(--color-fridge-progress-bg);
  border-radius: var(--progress-radius);
  overflow: hidden;
  margin-bottom: 12px;
}

.clear-rate__fill {
  height: 100%;
  background: var(--color-fridge-progress-fill);
  border-radius: var(--progress-radius);
  transition: width var(--transition-slow);
  position: relative;
}

/* 进度条发光效果 */
.clear-rate__fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.clear-rate__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.clear-rate__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
}

.clear-rate__tag--consumed {
  background: #E8F5E9;
  color: #2E7D32;
}

.clear-rate__tag--unconsumed {
  background: #FFF0E5;
  color: #E8663E;
}
```

#### 3.2.5 对话面板 (ChatPanel)

```css
/* 桌面端 — 侧边栏 */
.chat-panel {
  width: var(--chat-panel-width);
  height: 100%;
  background: var(--color-chat-bg);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.chat-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.chat-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.chat-panel__close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--color-text-light);
  cursor: pointer;
  border-radius: 50%;
}

.chat-panel__close:hover {
  background: #F5F0EB;
}

/* 消息列表 */
.chat-panel__messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 用户消息气泡 */
.chat-message--user {
  align-self: flex-end;
  max-width: 80%;
  padding: 10px 14px;
  background: var(--color-chat-user-bubble);
  color: var(--color-chat-user-text);
  border-radius: 16px 16px 4px 16px;
  font-size: 14px;
  line-height: 1.5;
  animation: messageIn var(--transition-bounce);
}

/* AI 消息气泡 */
.chat-message--ai {
  align-self: flex-start;
  max-width: 85%;
  padding: 10px 14px;
  background: var(--color-chat-ai-bubble);
  color: var(--color-text);
  border: 1px solid var(--color-chat-ai-border);
  border-radius: 16px 16px 16px 4px;
  font-size: 14px;
  line-height: 1.6;
  animation: messageIn var(--transition-bounce);
}

/* 流式光标 */
.chat-message__cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: var(--color-primary);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 快捷回复区 */
.chat-panel__quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid var(--color-border);
}

.chat-quick-reply {
  padding: 6px 14px;
  background: var(--color-chat-quick-reply);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.chat-quick-reply:hover {
  background: var(--color-chat-quick-reply-hover);
}

.chat-quick-reply:active {
  background: var(--color-chat-quick-reply-active);
  color: #fff;
  transform: scale(0.95);
}

/* 输入区 */
.chat-panel__input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  background: #fff;
}

.chat-panel__input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-chat-input-border);
  border-radius: var(--radius-full);
  background: var(--color-chat-input-bg);
  font-size: 14px;
  color: var(--color-text);
  outline: none;
  transition: border var(--transition-fast);
}

.chat-panel__input:focus {
  border-color: var(--color-primary);
}

.chat-panel__input::placeholder {
  color: var(--color-text-light);
}

.chat-panel__send {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.chat-panel__send:hover {
  background: #D4552E;
  transform: scale(1.05);
}

.chat-panel__send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* 移动端 — 底部弹出式 */
@media (max-width: 767px) {
  /* 浮动入口条 */
  .chat-toggle {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-card);
    border-top: 1px solid var(--color-border);
    box-shadow: var(--shadow-chat);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    z-index: 50;
  }

  .chat-toggle__hint {
    font-size: 14px;
    color: var(--color-text);
    font-weight: 500;
  }

  .chat-toggle__quick-tags {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .chat-toggle__quick-tags::-webkit-scrollbar {
    display: none;
  }

  .chat-toggle__arrow {
    color: var(--color-text-light);
    transition: transform var(--transition-normal);
  }

  /* 展开后面板占满屏幕 */
  .chat-panel--mobile {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    z-index: 200;
    flex-direction: column;
    animation: slideUp var(--transition-slow);
  }
}
```

#### 3.2.6 偏好设置抽屉 (PreferenceDrawer)

```css
/* 遮罩层 */
.preference-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-drawer-overlay);
  z-index: 150;
  animation: fadeIn var(--transition-normal);
}

/* 抽屉主体 - 桌面端从右侧滑入 */
.preference-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--drawer-width);
  max-width: 100vw;
  background: var(--color-card);
  box-shadow: var(--shadow-drawer);
  z-index: 151;
  display: flex;
  flex-direction: column;
  animation: slideInRight var(--transition-slow);
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes slideOutRight {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

.preference-drawer.is-closing {
  animation: slideOutRight var(--transition-normal) forwards;
}

.preference-overlay.is-closing {
  animation: fadeOut var(--transition-normal) forwards;
}

/* 抽屉头部 */
.preference-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.preference-drawer__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.preference-drawer__close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 18px;
  color: var(--color-text-light);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preference-drawer__close:hover {
  background: #F5F0EB;
}

/* 抽屉内容 */
.preference-drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.preference-section {
  margin-bottom: 24px;
}

.preference-section__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
}

.preference-section__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 选项标签 */
.preference-option {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: var(--color-option-bg);
  color: var(--color-option-text);
  transition: all var(--transition-fast);
}

.preference-option:hover {
  border-color: var(--color-primary);
}

.preference-option.is-active {
  background: var(--color-option-active-bg);
  color: var(--color-option-active-text);
  border-color: var(--color-primary);
  font-weight: 600;
}

/* 单选 */
.preference-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text);
}

.preference-radio__dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--transition-fast);
}

.preference-radio.is-active .preference-radio__dot {
  border-color: var(--color-primary);
}

.preference-radio.is-active .preference-radio__dot::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
}

/* 步进器 */
.preference-stepper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.preference-stepper__btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-text);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.preference-stepper__btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.preference-stepper__value {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  min-width: 40px;
  text-align: center;
}

/* 抽屉底部 */
.preference-drawer__footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

.preference-drawer__reset {
  flex: 1;
  padding: 10px;
  background: var(--color-option-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preference-drawer__reset:hover {
  background: #E8E0D8;
}

.preference-drawer__save {
  flex: 2;
  padding: 10px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preference-drawer__save:hover {
  background: #D4552E;
}

/* 移动端：底部弹出替代右侧滑入 */
@media (max-width: 767px) {
  .preference-drawer {
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 85vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    animation: slideUp var(--transition-slow);
  }

  .preference-drawer.is-closing {
    animation: slideDown var(--transition-normal) forwards;
  }
}

@keyframes slideDown {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
```

#### 3.2.7 Toast 通知 (Toast)

```css
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--color-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-toast);
  font-size: 14px;
  color: var(--color-text);
  pointer-events: auto;
  animation: toastIn var(--transition-bounce);
  border-left: 3px solid var(--color-primary);
}

.toast--success {
  border-left-color: #4CAF50;
}

.toast--error {
  border-left-color: #F44336;
}

.toast.is-closing {
  animation: toastOut var(--transition-fast) forwards;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toastOut {
  to {
    opacity: 0;
    transform: translateX(40px);
  }
}
```

#### 3.2.8 Hero 区模式变体

```css
/* 精准推荐模式 Hero */
.hero--recommend {
  background: linear-gradient(135deg, #FFF5F0 0%, #FDF8F4 50%, #FFF0E5 100%);
}

/* 清空冰箱模式 Hero */
.hero--fridge {
  background: linear-gradient(135deg, #F2FBFA 0%, #E8F8F5 50%, #D4F1F0 100%);
}

.hero--fridge .hero__title {
  color: var(--color-fridge-tag-text);
}
```

#### 3.2.9 食材标签输入区 (FridgeMode)

```css
.ingredient-tag-input {
  margin-top: 16px;
}

/* 已选标签行 */
.ingredient-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.ingredient-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-fridge-tag-bg);
  color: var(--color-fridge-tag-text);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  animation: tagIn var(--transition-bounce);
}

.ingredient-tag__remove {
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: var(--color-fridge-tag-text);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.ingredient-tag__remove:hover {
  opacity: 1;
  background: rgba(0,0,0,0.08);
}

.ingredient-tag.is-removing {
  animation: tagOut var(--transition-fast) forwards;
}

@keyframes tagIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes tagOut {
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}

/* 添加占位标签 */
.ingredient-tag--placeholder {
  background: transparent;
  border: 1px dashed var(--color-fridge-primary);
  color: var(--color-fridge-primary);
  cursor: pointer;
}

.ingredient-tag--placeholder:hover {
  background: var(--color-fridge-tag-bg);
}

/* 联想下拉菜单 */
.tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 50;
}

.tag-suggestions__item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text);
  transition: background var(--transition-fast);
}

.tag-suggestions__item:hover,
.tag-suggestions__item.is-highlighted {
  background: var(--color-fridge-tag-bg);
}

.tag-suggestions__item:first-child {
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.tag-suggestions__item:last-child {
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}
```---

## 4. 响应式适配

### 4.1 断点定义

| 断点 | 宽度 | 目标设备 |
|------|------|---------|
| `mobile` | < 768px | 手机（竖屏） |
| `tablet` | 768px ~ 1024px | 平板 / 手机横屏 |
| `desktop` | >= 1025px | 桌面 / 大屏平板 |

### 4.2 各组件响应式布局

#### 4.2.1 推荐卡片网格

```
Desktop (>= 1025px):
┌──────────────────────────────────────────────┐
│  3 列网格                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐                 │
│  │ 卡片  │ │ 卡片  │ │ 卡片  │                 │
│  └──────┘ └──────┘ └──────┘                 │
│  ┌──────┐ ┌──────┐ ┌──────┐                 │
│  │ 卡片  │ │ 卡片  │ │ 卡片  │                 │
│  └──────┘ └──────┘ └──────┘                 │
└──────────────────────────────────────────────┘

Tablet (768px ~ 1024px):
┌──────────────────────────────┐
│  2 列网格                     │
│  ┌────────┐ ┌────────┐      │
│  │  卡片   │ │  卡片   │      │
│  └────────┘ └────────┘      │
│  ┌────────┐ ┌────────┐      │
│  │  卡片   │ │  卡片   │      │
│  └────────┘ └────────┘      │
└──────────────────────────────┘

Mobile (< 768px):
┌─────────────────┐
│  单列             │
│  ┌─────────────┐ │
│  │    卡片      │ │
│  └─────────────┘ │
│  ┌─────────────┐ │
│  │    卡片      │ │
│  └─────────────┘ │
└─────────────────┘
```

对应的 CSS：

```css
.recipe-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 1024px) {
  .recipe-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 767px) {
  .recipe-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
```

#### 4.2.2 页面整体布局（含对话面板）

```
Desktop — 双栏布局:
┌───────────────────────────────────────────────────────┐
│  Hero / ModeTabs / SearchBar                            │
├─────────────────────────────────────┬─────────────────┤
│                                      │                  │
│  结果区 (flex: 1)                     │  💬 对话面板      │
│  - 清空率进度条                       │  (380px 固定)    │
│  - 卡片网格                          │                  │
│  - AI 推荐区                         │                  │
│                                      │                  │
└──────────────────────────────────────┴─────────────────┘

Tablet — 叠加模式（对话面板浮层）:
┌───────────────────────────────────────┐
│  Hero / ModeTabs / SearchBar            │
├───────────────────────────────────────┤
│                                         │
│  结果区 (全宽)                            │
│                                         │
│                                ┌──────┐ │
│  [💬 对话] 浮动按钮 ──────────▶│ 面板  │ │
│                                └──────┘ │
└───────────────────────────────────────┘

Mobile — 底部入口 + 全屏面板:
┌─────────────────┐
│  Hero (紧凑)     │
├─────────────────┤
│  结果区(全宽)     │
│                  │
│                  │
├─────────────────┤
│ 💬 对话入口条    │
└─────────────────┘
```

对应 CSS：

```css
/* 页面主内容区 */
.recommend-content {
  display: flex;
  gap: 0;
  max-width: var(--max-content-width);
  margin: 0 auto;
}

.recommend-content__results {
  flex: 1;
  min-width: 0;
  padding: 24px;
}

/* 桌面端始终展示对话面板 */
@media (min-width: 1025px) {
  .recommend-content__results {
    padding-right: calc(var(--chat-panel-width) + 24px);
  }

  .chat-panel {
    position: fixed;
    right: max(0px, calc((100vw - var(--max-content-width)) / 2));
    top: 0;
    bottom: 0;
    height: 100vh;
    overflow-y: auto;
  }
}

/* 平板端：对话面板作为浮层 */
@media (min-width: 768px) and (max-width: 1024px) {
  .chat-panel {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 200;
    box-shadow: var(--shadow-drawer);
    animation: slideInRight var(--transition-slow);
  }
}

/* 移动端 */
@media (max-width: 767px) {
  .recommend-content__results {
    padding: 12px;
  }
}
```

#### 4.2.3 Hero 区 + ModeTabs 响应式

```css
/* Hero 区内边距 */
.hero {
  padding: var(--hero-padding-y) 24px;
  text-align: center;
}

.hero__title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 20px;
}

@media (max-width: 767px) {
  .hero {
    padding: var(--hero-padding-y-mobile) 16px;
  }

  .hero__title {
    font-size: 22px;
  }
}

/* ModeTabs 居中 */
.mode-tabs {
  margin: 0 auto 20px;
}

@media (max-width: 767px) {
  .mode-tabs {
    margin-bottom: 12px;
  }

  .mode-tabs__tab {
    padding: 6px 14px;
    font-size: 13px;
  }
}
```

#### 4.2.4 替代建议气泡响应式

| 场景 | 桌面 (>=768px) | 移动 (<768px) |
|------|---------------|--------------|
| **定位** | absolute，在触发标签下方 | fixed，bottom sheet |
| **宽度** | 280px 固定 | 100vw 全宽 |
| **圆角** | 16px 全圆角 | 顶部 16px，底部 0 |
| **关闭方式** | ✕ 按钮 + 点击外部 | ✕ 按钮 + 下滑手势 + 点击遮罩 |
| **箭头** | 有三角箭头指向标签 | 无箭头 |

#### 4.2.5 响应式适配检查清单

| 组件 | Desktop | Tablet | Mobile | 备注 |
|------|---------|--------|--------|------|
| ModeTabs | 水平居中 | 水平居中 | 全宽/缩小字号 | ✅ |
| 搜索框 | 480px 宽 | 400px | 全宽 | ✅ |
| 偏好抽屉 | 右侧滑入 400px | 右侧滑入 360px | 底部弹出 85vh | ✅ |
| 卡片网格 | 3 列 | 2 列 | 1 列 | ✅ |
| 替代建议气泡 | inline 弹出 | inline 弹出 | bottom sheet | ✅ |
| 对话面板 | 右侧侧边栏 | 右侧浮层 | 全屏 bottom sheet | ✅ |
| 清空率进度条 | 全宽 | 全宽 | 全宽 | ✅ |
| 食材标签区 | 内联标签 | 内联标签 | 内联+可滚动 | ✅ |
| Toast | 右上角 | 右上角 | 顶部居中 | ✅ |
| 热门食材标签 | 6个单行 | 6个可能换行 | 可横向滚动 | ✅ |

---

## 5. 动效和过渡

### 5.1 动效总览

| 触发场景 | 动画类型 | 时长 | 缓动函数 | 说明 |
|---------|---------|------|---------|------|
| 卡片展开/折叠 | max-height 过渡 | 350ms | cubic-bezier(0.4,0,0.2,1) | 平滑展开 |
| 卡片 hover | transform + shadow | 250ms | ease | 微上浮 + 阴影加深 |
| 替代气泡出现 | scale + fade | 400ms | cubic-bezier(0.34,1.56,0.64,1) | 弹性弹出 |
| 替代气泡关闭 | scale + fade | 150ms | ease | 快速缩小消失 |
| 气泡选项选中 | border-color + bg | 150ms | ease | 即时反馈 |
| Tab 切换 | 交叉淡入淡出 | 250ms | ease | 内容区渐变切换 |
| 清空率进度条填充 | width 过渡 | 350ms | cubic-bezier(0.4,0,0.2,1) | 进度条动画 |
| 进度条光泽 | shimmer 循环 | 2000ms | linear | 无限循环光泽 |
| 食材标签添加 | scale + fade | 400ms | cubic-bezier(0.34,1.56,0.64,1) | 弹入 |
| 食材标签移除 | scale + fade | 150ms | ease | 缩小消失 |
| 偏好抽屉打开 | translateX / slideUp | 350ms | cubic-bezier(0.4,0,0.2,1) | 滑入 |
| 偏好抽屉关闭 | translateX / slideDown | 250ms | ease | 滑出 |
| 对话面板打开(移动) | slideUp | 350ms | cubic-bezier(0.4,0,0.2,1) | 从底部弹入 |
| 消息气泡出现 | translateY + fade | 400ms | cubic-bezier(0.34,1.56,0.64,1) | 弹入 |
| SSE 光标闪烁 | opacity blink | 800ms | infinite ease | 打字机光标 |
| 快捷回复点击 | scale(0.95) | 150ms | ease | 按压反馈 |
| Toast 出现 | translateX + fade | 400ms | cubic-bezier(0.34,1.56,0.64,1) | 右侧弹入 |
| Toast 消失 | translateX + fade | 150ms | ease | 右侧滑出 |
| 保存按钮成功 | bg-color 变化 | 250ms | ease | 橙→绿 |
| 骨架屏 | shimmer 脉冲 | 1500ms | infinite ease | 加载占位 |

### 5.2 关键动画详解

#### 5.2.1 卡片展开动画（手风琴）

```
技术方案：CSS max-height 过渡 + overflow: hidden

实现细节：
┌─ 初始状态 ──────────────────────────────────────────┐
│  .collapsible-content {                             │
│    max-height: 0;                                   │
│    overflow: hidden;                                │
│    transition: max-height 350ms cubic-bezier(...);  │
│  }                                                  │
│                                                     │
│  触发展开时：                                        │
│  1. 用 JS 测量内容的 scrollHeight                     │
│  2. 设置 max-height = scrollHeight + 安全余量        │
│  3. 展开完成后可选择设为 max-height: none             │
│     (避免内容变化导致溢出)                             │
│                                                     │
│  触发折叠时：                                        │
│  1. 先设置 max-height = 当前 scrollHeight            │
│  2. requestAnimationFrame 后设 max-height: 0        │
└─────────────────────────────────────────────────────┘
```

#### 5.2.2 替代建议气泡动画

```
出现动画：bubbleIn

  0ms ────── 400ms
  │          │
  │  opacity: 0 -> 1
  │  scale: 0.9 -> 1.0
  │  translateY: -4px -> 0
  │          │
  └─ 弹性缓动 (回弹效果)

消失动画：bubbleOut (is-closing class)

  0ms ────── 150ms
  │          │
  │  opacity: 1 -> 0
  │  scale: 1.0 -> 0.9
  │  translateY: 0 -> -4px
  │          │
  └─ 快速淡出

移动端底部弹出：slideUp

  0ms ────── 350ms
  │          │
  │  translateY: 100% -> 0
  │          │
  └─ 底部滑入
```

#### 5.2.3 Tab 切换过渡

```
模式切换流程：

  用户点击 Tab
      │
      ▼
  1. 当前内容区添加 .is-leaving 类
     → opacity: 1 → 0, transform: translateY(-8px)
     → 持续 200ms
      │
      ▼
  2. 200ms 后切换内容
     → 新内容区添加 .is-entering 类
     → opacity: 0 → 1, transform: translateY(8px) → 0
     → 持续 300ms（带弹性）
      │
      ▼
  3. Hero 背景色平滑过渡
     → background 过渡 500ms ease
```

#### 5.2.4 SSE 流式渲染动画

```
AI 回复流式展示：

[AI 消息气泡]
│
├─ 「好的，我为你推荐以下少油版菜谱：」  ← 已渲染文本
│   ▍                                    ← 闪烁光标 (CSS animation: blink)
│
├─ 每个 SSE chunk 到达时：
│   1. 追加文本到消息内容
│   2. 光标始终在最后
│   3. 自动 scrollIntoView({ behavior: 'smooth' })
│
├─ 收到 [DONE] 时：
│   1. 移除光标元素
│   2. 消息气泡完成态（无光标）
│
└─ 结果卡片刷新：
    现有卡片 → opacity: 0.5, filter: blur(2px)  (200ms)
    新卡片加载 → 旧卡片移除, 新卡片 fadeIn (300ms)
```

#### 5.2.5 保存按钮状态转换

```
保存到我的食谱 状态机 + 动画：

  [📥 保存到我的食谱]  (idle)
      │ 点击
      ▼
  [⏳ 保存中...]  (loading)
      │ - 按钮内出现 spinner (旋转动画 600ms/圈)
      │ - 按钮 opacity: 0.8
      │ - pointer-events: none
      │
      ├─ 成功 (200ms 后)
      │    ▼
      │  [✅ 已保存]  (saved)
      │  - 背景色过渡: #E8663E → #4CAF50
      │  - ✅ 图标弹入 (scale 0→1.2→1)
      │  - Toast「食谱已保存到我的食谱」
      │
      └─ 失败
           ▼
         [📥 保存到我的食谱]  (idle, 恢复)
         - Toast「保存失败，请重试」 (红色边框)
```

#### 5.2.6 清空率进度条动画

```
页面加载 / 数据更新时：

  1. 进度条从 0% 开始
     width: 0% ──350ms──▶ width: 60%

  2. 数字从 0 递增到目标值（counter 动画）
     requestAnimationFrame 驱动，约 500ms

  3. 光泽效果持续循环
     shimmer keyframe:
       0%   → translateX(-100%)
       100% → translateX(100%)
     duration: 2s, infinite

  4. ✅ ❌ 标签逐个弹入
     每个标签延迟 50ms (stagger)
```

#### 5.2.7 全局 Toast 通知

```
Toast 生命周期：

  ┌─ 出现 ──────────────────────────────────────────┐
  │  toastIn: 400ms, bounce easing                   │
  │  opacity: 0 → 1, translateX: 40px → 0           │
  └──────────────────────────────────────────────────┘
  ┌─ 停留 ──────────────────────────────────────────┐
  │  默认 3000ms                                     │
  │  成功后自动消失                                   │
  │  错误需手动关闭                                   │
  └──────────────────────────────────────────────────┘
  ┌─ 消失 ──────────────────────────────────────────┐
  │  toastOut: 150ms, ease                          │
  │  opacity: 1 → 0, translateX: 0 → 40px           │
  │  动画完成后从 DOM 移除                             │
  └──────────────────────────────────────────────────┘

  堆叠规则：
  - 多个 toast 垂直堆叠，每个间距 8px
  - 新 toast 插入到顶部
  - 最多同时显示 3 个，超过则移除最旧的
```

### 5.3 无障碍与性能

#### 5.3.1 减少动画 (prefers-reduced-motion)

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  /* 但保留必要的即时反馈（如按钮 hover 颜色变化） */
  .chat-quick-reply:active {
    transform: none; /* 移除缩放效果 */
  }
}
```

#### 5.3.2 性能优化

| 优化点 | 方案 |
|-------|------|
| **卡片展开** | 使用 `max-height` 而非 `height: auto`（避免 layout thrashing） |
| **进度条** | 使用 `transform: translateX()` 驱动 shimmer 而非 `left`（避免 repaint） |
| **虚拟滚动** | 卡片超过 50 张时启用虚拟列表（react-window / vue-virtual-scroller） |
| **SSE 渲染** | 使用 `requestAnimationFrame` 批量更新 DOM，避免每 chunk 触发重排 |
| **图片懒加载** | 卡片封面图使用 `loading="lazy"` + Intersection Observer |
| **骨架屏** | 纯 CSS gradient 动画，无 JS |

---

## 6. 附录：ASCII 交互示意图

### 6.1 完整页面布局总览

```
┌─────────────────────────────────────────────────────────────┐
│                        🔧 Navigation Bar                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┬──────────────────┐                        │
│   │ 🎯 精准推荐   │ 🧊 清空冰箱      │    ← ModeTabs           │
│   └──────────────┴──────────────────┘                        │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │                                                      │  │
│   │           🥘 食材推荐菜谱                              │  │
│   │                                                      │  │
│   │   ┌────────────────────────────────────┐ [⚙️ 偏好]    │  │
│   │   │ 🔍 输入食材名称...                  │              │  │
│   │   └────────────────────────────────────┘              │  │
│   │                                                      │  │
│   │   [番茄] [鸡蛋] [牛肉] [青椒] [豆腐] [蘑菇]             │  │
│   │                                                      │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
├───────────────────────────────┬──────────────────────────────┤
│                               │                               │
│   ┌─────────────────────────┐│  ┌─────────────────────────┐  │
│   │  📊 清空率: 60%          ││  │  💬 对话推荐             │  │
│   │  ████████░░░░ (3/5)     ││  │                         │  │
│   │  ✅ 番茄 ✅ 鸡蛋 ✅ 青椒  ││  │  用户: 少油少盐          │  │
│   │  ❌ 蘑菇 ❌ 豆腐         ││  │                         │  │
│   └─────────────────────────┘│  │  AI: 好的，为你推荐      │  │
│                               │  │  以下少油版菜谱...       │  │
│   ┌───────┐ ┌───────┐ ┌─────┐│  │  ▍                       │  │
│   │ 卡片1  │ │ 卡片2  │ │卡片3││  │                         │  │
│   │ 🧊 80%│ │ 🧊 60%│ │ ... ││  │  [少油少盐][减脂版]     │  │
│   └───────┘ └───────┘ └─────┘│  │  [更快手] [中式口味]     │  │
│                               │  │                         │  │
│   ┌───────┐ ┌───────┐ ┌─────┐│  │  [______________]  📤    │  │
│   │ 卡片4  │ │ 卡片5  │ │卡片6││  │                         │  │
│   └───────┘ └───────┘ └─────┘│  └─────────────────────────┘  │
│                               │                               │
└───────────────────────────────┴──────────────────────────────┘
```

### 6.2 替代建议气泡交互流

```
   Card Content
┌──────────────────────┐
│  🍝 番茄意面          │
│  ✅ 番茄  ✅ 意面     │
│  ❌ 大蒜  ← 可点击    │
│      │               │
│      │ 用户点击       │
│      ▼               │
│ ┌──────────────┐     │
│ │ 💡 替代建议   ✕│    │
│ │              │     │
│ │ ○ 洋葱       │     │
│ │ ○ 蒜苗       │     │
│ │ ● 蒜粉    ← 选中│   │
│ │ ○ 小葱       │     │
│ │              │     │
│ │ [以蒜粉重新推荐]│   │
│ └──────────────┘     │
└──────────────────────┘
        │
        │ 点击「以蒜粉重新推荐」
        ▼
  ┌──────────────────────┐
  │ 🔍 [番茄, 意面, 蒜粉] │  ← 搜索框自动更新
  └──────────────────────┘
        │
        ▼
    结果刷新，不包含"大蒜"的菜谱
```

### 6.3 清空冰箱模式 — 标签输入流程

```
  ┌───────────────────────────────────────────┐
  │  🧊 清空冰箱 · 智慧消耗库存                  │
  │                                            │
  │  ┌──────────────────────────────┐          │
  │  │ 输入食材名称...               │ 🔍       │
  │  └──────────────────────────────┘          │
  │         │                                  │
  │         │ 输入 "番"                          │
  │         ▼                                  │
  │  ┌──────────────┐                          │
  │  │ 番茄          │ ← 联想下拉               │
  │  │ 番石榴        │                          │
  │  │ 番薯叶        │                          │
  │  └──────────────┘                          │
  │         │                                  │
  │         │ 点击 "番茄" 或 回车                │
  │         ▼                                  │
  │  [番茄 ✕] [鸡蛋 ✕] [+ 添加食材]              │
  │                      │                     │
  │                      │ 继续添加...           │
  │                      ▼                     │
  │  [番茄 ✕] [鸡蛋 ✕] [青椒 ✕] [+ 添加食材]     │
  │                                            │
  │  🍳 中式 · 30分钟 · 2人                     │
  └───────────────────────────────────────────┘
          │
          │ >= 2个食材，自动触发搜索
          ▼
  ┌───────────────────────────────────────────┐
  │  📊 清空率 ████████░░░░ 60% (3/5)          │
  │  ✅ 已消耗：番茄、鸡蛋、青椒                  │
  │  ❌ 未消耗：蘑菇、豆腐                        │
  │                                            │
  │  推荐结果（按清空率降序）...                   │
  └───────────────────────────────────────────┘
```

### 6.4 对话面板 — 移动端交互流

```
  初始状态 (结果页)              展开对话面板后
┌─────────────────┐          ┌─────────────────┐
│  Hero 区         │          │  💬 对话推荐  ✕  │
├─────────────────┤          ├─────────────────┤
│                  │          │                  │
│  ┌────┐ ┌────┐  │          │  用户: 少油少盐    │
│  │卡片│ │卡片│  │          │                  │
│  └────┘ └────┘  │          │  AI: 好的，为你   │
│                  │          │  重新推荐...      │
│  ┌────┐ ┌────┐  │          │                  │
│  │卡片│ │卡片│  │          │  ┌─────────────┐ │
│  └────┘ └────┘  │          │  │ 预览卡片 80%  │ │
│                  │          │  └─────────────┘ │
├─────────────────┤          │                  │
│ 💬 对推荐不满意？ │          │  [少油][减脂]     │
│ [快捷标签...] ▼  │          │  [______________]│
└─────────────────┘          │              📤  │
        │ 点击                │                  │
        └───────────────────▶│  [▼ 查看全部结果]  │
                             └─────────────────┘
                                     │ 点击
                                     ▼
                             返回结果页（卡片已刷新）
```

### 6.5 偏好设置 — 完整交互流

```
  SearchBar
┌────────────────────────────┐
│ 🔍 [输入食材...]    [⚙️ 偏好]│
└────────────────────────────┘
         │ 用户点击 ⚙️
         ▼
┌──────────────────────────────────┐
│                            ╳     │
│  ⚙️ 饮食偏好设置                  │
│                                  │
│  🍳 烹饪方式                     │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐           │
│  │不限│ │炒 │ │蒸 │ │煮 │ ...     │
│  └──┘ └──┘ └──┘ └──┘           │
│                                  │
│  🌍 菜系偏好                     │
│  ┌──┐ ┌────┐ ┌──┐ ┌──┐         │
│  │不限│ │中式●│ │日式│ │韩式│ ...  │
│  └──┘ └────┘ └──┘ └──┘         │
│                                  │
│  🚫 忌口 / 过敏源                │
│  ┌──┐ ┌──┐                      │
│  │花生│ │海鲜│ ...                │
│  └──┘ └──┘                      │
│  ┌──────────────────────┐       │
│  │ 添加其他忌口...       │       │
│  └──────────────────────┘       │
│                                  │
│  🌶️ 口味偏好                     │
│  ○ 清淡  ● 适中  ○ 重口          │
│                                  │
│  ⏱️ 烹饪时长                     │
│  ○ 不限  ○ 15分钟  ● 30分钟  ○ 1h │
│                                  │
│  🍽️ 用餐人数                     │
│  [−]  2 人  [+]                 │
│                                  │
│  ┌──────────┐ ┌──────────────┐  │
│  │ 恢复默认  │ │  💾 保存偏好  │  │
│  └──────────┘ └──────────────┘  │
└──────────────────────────────────┘
         │
         │ 保存偏好
         ▼
  SearchBar 更新：
┌────────────────────────────┐
│ 🔍 [输入食材...]   [⚙️✓ 偏好]│  ← 已设置偏好标识
└────────────────────────────┘
         │
         │ 后续搜索自动附加偏好参数
         ▼
  搜索结果已应用偏好筛选
```

### 6.6 整体状态流转（页面级）

```
            ┌──────────┐
            │  初始加载  │
            └────┬─────┘
                 │
       ┌─────────┼──────────┐
       ▼         ▼          ▼
  ┌─────────┐ ┌──────┐ ┌──────────┐
  │ 空状态   │ │搜索中 │ │ 有历史结果 │
  │ (引导)   │ │(骨架屏)│ │ (展示)   │
  └────┬────┘ └──┬───┘ └────┬─────┘
       │         │          │
       │    ┌────▼────┐     │
       └───▶│ 有结果   │◀────┘
            └────┬────┘
                 │
       ┌─────────┼──────────┐
       ▼         ▼          ▼
  ┌─────────┐ ┌──────┐ ┌──────────┐
  │ 无结果   │ │展开卡片│ │ 替代建议  │
  │(AI推荐区)│ │(手风琴)│ │ (气泡)   │
  └────┬────┘ └──────┘ └──────────┘
       │
       ▼
  ┌─────────┐
  │ AI兜底   │
  │ 推荐     │
  └─────────┘
```

---

> **文档结束**  
> 所有新增组件的设计均遵循现有暖橙色系设计语言，保持视觉一致性。  
> 如有细节调整，请参照本指南的 CSS 变量体系进行修改。