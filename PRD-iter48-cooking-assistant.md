# 迭代#48 PRD: 智能烹饪助手

## P0 — 必须实现
1. **语音播报** — Web Speech Synthesis API，食谱步骤朗读（播放/暂停/停止/自动进下一步）
2. **烹饪模式** — 全屏专注模式，大字体显示当前步骤，一键切换，计时+语音联动

## P1 — 锦上添花
3. **食材推荐增强** — 已有 `/api/recipes/recommend` 端点，前端推荐页提示

## 实现方案

### 1. 语音播报
- 新建 `frontend/src/hooks/useSpeechSynthesis.ts` hook
- API: `speak(text, onEnd)`, `pause()`, `resume()`, `stop()`, `speaking`, `paused`
- 处理 `speechSynthesis` 浏览器兼容（Chrome 需要用户交互后初始化）
- RecipeDetailPage 步骤区底部添加播报按钮组

### 2. 烹饪模式
- 新建 `frontend/src/components/CookingModeOverlay.tsx` + `.css`
- 全屏 Modal（fixed inset-0, z-index 9999）
- 当前步骤大字体、大 prev/next 触摸按钮（≥48px）
- 集成 StepTimer 显示
- 集成语音播报（进入模式后自动朗读当前步骤）
- CSS 暗色适配 + 安全区适配