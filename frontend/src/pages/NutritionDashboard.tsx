import React, { useState, useEffect, useCallback } from 'react';
import {
  addNutritionLog, getNutritionLogs, deleteNutritionLog,
  getNutritionGoals, setNutritionGoals,
  getDailyNutritionStats, getWeeklyNutritionStats,
  getMonthlyNutritionStats, getNutritionSuggestions,
  getRecommendedGoals,
  NutritionLog, NutritionGoal,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './NutritionDashboard.css';

const MEAL_TYPES = [
  { key: 'breakfast', label: '早餐', icon: '🌅' },
  { key: 'lunch', label: '午餐', icon: '☀️' },
  { key: 'dinner', label: '晚餐', icon: '🌙' },
  { key: 'snack', label: '加餐', icon: '🍿' },
];

const NUTRIENT_LABELS: Record<string, { label: string; unit: string; color: string }> = {
  calories: { label: '热量', unit: 'kcal', color: '#E8663E' },
  protein: { label: '蛋白质', unit: 'g', color: '#27ae60' },
  fat: { label: '脂肪', unit: 'g', color: '#e67e22' },
  carbs: { label: '碳水', unit: 'g', color: '#3498db' },
  fiber: { label: '纤维', unit: 'g', color: '#9b59b6' },
};

const NutritionDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealTab, setMealTab] = useState<string>('all');
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [goals, setGoals] = useState<NutritionGoal | null>(null);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add log modal
  const [showAdd, setShowAdd] = useState(false);
  const [addRecipeId, setAddRecipeId] = useState('');
  const [addServings, setAddServings] = useState(1);
  const [addMealType, setAddMealType] = useState('lunch');
  const [submitting, setSubmitting] = useState(false);

  // Goals modal
  const [showGoals, setShowGoals] = useState(false);
  const [goalForm, setGoalForm] = useState({ calories: 2000, protein: 60, fat: 65, carbs: 250, fiber: 25 });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [l, ds, ws, ms, g, sug] = await Promise.all([
        getNutritionLogs({ date }),
        getDailyNutritionStats(date).catch(() => null),
        getWeeklyNutritionStats().catch(() => null),
        getMonthlyNutritionStats().catch(() => null),
        getNutritionGoals().catch(() => null),
        getNutritionSuggestions(date).catch(() => null),
      ]);
      setLogs(Array.isArray(l) ? l : (l as any).list || []);
      setDailyStats(ds);
      setWeeklyStats(ws);
      setMonthlyStats(ms);
      if (g) {
        setGoals(g);
        setGoalForm({
          calories: parseFloat((g as any).calories) || 2000,
          protein: parseFloat((g as any).protein) || 60,
          fat: parseFloat((g as any).fat) || 65,
          carbs: parseFloat((g as any).carbs) || 250,
          fiber: parseFloat((g as any).fiber) || 25,
        });
      }
      setSuggestions(sug?.suggestions || []);
    } catch (err: any) {
      setError(err?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [date, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddLog = async () => {
    if (!addRecipeId.trim()) return;
    setSubmitting(true);
    try {
      await addNutritionLog({
        recipeId: addRecipeId.trim(),
        date,
        mealType: addMealType,
        servings: addServings,
      });
      showToast?.('已记录', 'success');
      setShowAdd(false);
      setAddRecipeId('');
      setAddServings(1);
      await fetchAll();
    } catch (err: any) {
      showToast?.(err?.message || '记录失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await deleteNutritionLog(id);
      showToast?.('已删除', 'success');
      await fetchAll();
    } catch (err: any) {
      showToast?.(err?.message || '删除失败', 'error');
    }
  };

  const handleSaveGoals = async () => {
    setSubmitting(true);
    try {
      await setNutritionGoals(goalForm);
      showToast?.('目标已保存', 'success');
      setShowGoals(false);
      await fetchAll();
    } catch (err: any) {
      showToast?.(err?.message || '保存失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetRecommended = async () => {
    try {
      const rec = await getRecommendedGoals({ weight: 60, height: 165, age: 30, gender: 'female', activity: 'moderate' });
      if (rec) {
        setGoalForm({
          calories: parseFloat((rec as any).calories) || 2000,
          protein: parseFloat((rec as any).protein) || 60,
          fat: parseFloat((rec as any).fat) || 65,
          carbs: parseFloat((rec as any).carbs) || 250,
          fiber: parseFloat((rec as any).fiber) || 25,
        });
      }
    } catch {}
  };

  if (!user) {
    return (
      <div className="nutrition-page">
        <h1>营养追踪</h1>
        <p className="nutrition-login-hint">请先登录使用营养追踪功能</p>
      </div>
    );
  }

  // Filter logs by meal tab
  const filteredLogs = mealTab === 'all' ? logs : logs.filter(l => l.mealType === mealTab);

  // SVG ring progress
  const ringProgress = (current: number, goal: number) => {
    const r = 54;
    const circumference = 2 * Math.PI * r;
    const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
    const offset = circumference * (1 - pct);
    const color = pct < 0.5 ? '#e74c3c' : pct < 0.85 ? '#f39c12' : '#27ae60';
    return { circumference, offset, color, pct: Math.round(pct * 100) };
  };

  return (
    <div className="nutrition-page">
      <h1 className="nutrition-title">营养追踪</h1>

      {/* Date picker */}
      <div className="nutrition-date-row">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="nutrition-date-input"
        />
        <button className="nutrition-action-btn small" onClick={fetchAll}>刷新</button>
        <button className="nutrition-action-btn small" onClick={() => setShowGoals(true)}>设置目标</button>
      </div>

      {loading && <div className="nutrition-loading">
        <div className="nutrition-loading__skeleton">
          {/* 日期控件骨架 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div className="skeleton-box" style={{ width: 180, height: 40, borderRadius: 8 }} />
            <div className="skeleton-box" style={{ width: 60, height: 32, borderRadius: 6 }} />
            <div className="skeleton-box" style={{ width: 80, height: 32, borderRadius: 6 }} />
          </div>
          {/* 环形进度骨架 */}
          <div className="nutrition-summary-card" style={{ marginBottom: 20 }}>
            <div className="nutrition-ring-section">
              <div className="skeleton-box" style={{ width: 130, height: 130, borderRadius: '50%' }} />
              <div style={{ flex: 1, marginLeft: 20 }}>
                <div className="skeleton-box" style={{ width: '60%', height: 20, borderRadius: 6 }} />
                <div className="skeleton-box" style={{ width: '80%', height: 14, borderRadius: 6, marginTop: 8 }} />
                <div className="skeleton-box" style={{ width: '40%', height: 14, borderRadius: 6, marginTop: 6 }} />
              </div>
            </div>
          </div>
          {/* 营养元素骨架 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton-box" style={{ height: 80, borderRadius: 10 }} />
            ))}
          </div>
        </div>
      </div>}
      {error && <div className="nutrition-error">{error}</div>}

      {!loading && !error && (
        <>
          {/* ── Daily Summary ── */}
          <div className="nutrition-summary-card">
            <div className="nutrition-ring-section">
              <svg width="130" height="130" viewBox="0 0 130 130">
                {dailyStats?.totals && goals && (() => {
                  const { circumference, offset, color, pct } = ringProgress(
                    parseFloat(dailyStats.totals.calories) || 0,
                    parseFloat(goals.calories) || 2000
                  );
                  return (
                    <>
                      <circle cx="65" cy="65" r="54" fill="none" stroke="var(--border-color, #eee)" strokeWidth="10" />
                      <circle cx="65" cy="65" r="54" fill="none" stroke={color} strokeWidth="10"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        transform="rotate(-90 65 65)" strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s' }}
                      />
                      <text x="65" y="58" textAnchor="middle" fontSize="22" fontWeight="bold" fill="var(--text-primary, #333)">
                        {pct}%
                      </text>
                      <text x="65" y="78" textAnchor="middle" fontSize="12" fill="var(--text-secondary, #999)">
                        / {Math.round(parseFloat(goals.calories) || 2000)} kcal
                      </text>
                    </>
                  );
                })()}
              </svg>
              <div className="nutrition-ring-label">
                <p className="nutrition-cal-value">{Math.round(parseFloat(dailyStats?.totals?.calories) || 0)}</p>
                <p className="nutrition-cal-label">已摄入 kcal</p>
              </div>
            </div>

            <div className="nutrition-bars">
              {Object.entries(NUTRIENT_LABELS).map(([key, cfg]) => {
                const current = parseFloat(dailyStats?.totals?.[key]) || 0;
                const goal = parseFloat((goals as any)?.[key]) || 1;
                const pct = Math.min((current / goal) * 100, 100);
                return (
                  <div key={key} className="nutrition-bar-row">
                    <span className="nutrition-bar-label">{cfg.label}</span>
                    <div className="nutrition-bar-track">
                      <div
                        className="nutrition-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: cfg.color,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <span className="nutrition-bar-value">
                      {current.toFixed(1)} / {goal.toFixed(0)} {cfg.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Suggestions ── */}
          {suggestions.length > 0 && (
            <div className="nutrition-suggestions">
              {suggestions.map((s: any, i: number) => (
                <div key={i} className={`nutrition-suggestion ${s.severity || 'info'}`}>
                  {s.message}
                </div>
              ))}
            </div>
          )}

          {/* ── Meal Tabs + Logs ── */}
          <div className="nutrition-meals">
            <div className="nutrition-meal-tabs">
              <button
                className={`nutrition-meal-tab ${mealTab === 'all' ? 'active' : ''}`}
                onClick={() => setMealTab('all')}
              >
                全部
              </button>
              {MEAL_TYPES.map(mt => (
                <button
                  key={mt.key}
                  className={`nutrition-meal-tab ${mealTab === mt.key ? 'active' : ''}`}
                  onClick={() => setMealTab(mt.key)}
                >
                  {mt.icon} {mt.label}
                </button>
              ))}
            </div>

            <div className="nutrition-log-list">
              {filteredLogs.length === 0 && <p className="nutrition-empty">暂无记录</p>}
              {filteredLogs.map(log => (
                <div key={log.id} className="nutrition-log-item">
                  <div className="nutrition-log-info">
                    <span className="nutrition-log-meal">
                      {MEAL_TYPES.find(m => m.key === log.mealType)?.icon} {MEAL_TYPES.find(m => m.key === log.mealType)?.label}
                    </span>
                    <strong className="nutrition-log-recipe">{log.recipe?.title || log.recipeId}</strong>
                    <span className="nutrition-log-servings">{log.servings} 份</span>
                    <span className="nutrition-log-cal">{Math.round(parseFloat(log.calories))} kcal</span>
                  </div>
                  <button className="nutrition-log-delete" onClick={() => handleDeleteLog(log.id)}>×</button>
                </div>
              ))}
            </div>

            <button className="nutrition-add-btn" onClick={() => setShowAdd(true)}>＋ 添加饮食记录</button>
          </div>

          {/* ── Weekly bar chart ── */}
          {weeklyStats?.days && weeklyStats.days.length > 0 && (
            <div className="nutrition-weekly">
              <h3>本周热量趋势</h3>
              <div className="nutrition-bar-chart">
                {weeklyStats.days.map((day: any) => {
                  const max = Math.max(...weeklyStats.days.map((d: any) => d.calories), 1);
                  const h = (day.calories / max) * 100;
                  return (
                    <div key={day.date} className="nutrition-bar-col" title={`${day.date}: ${Math.round(day.calories)} kcal`}>
                      <div className="nutrition-bar-col-fill" style={{ height: `${Math.max(h, 2)}%` }} />
                      <span className="nutrition-bar-col-label">{day.date.slice(5)}</span>
                      <span className="nutrition-bar-col-val">{Math.round(day.calories)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Monthly stats ── */}
          {monthlyStats && (
            <div className="nutrition-monthly">
              <h3>月度统计</h3>
              <div className="nutrition-monthly-grid">
                <div className="nutrition-monthly-item">
                  <span className="nm-label">活跃天数</span>
                  <span className="nm-value">{monthlyStats.activeDays || 0}</span>
                </div>
                <div className="nutrition-monthly-item">
                  <span className="nm-label">总记录</span>
                  <span className="nm-value">{monthlyStats.totalLogs || 0}</span>
                </div>
                <div className="nutrition-monthly-item">
                  <span className="nm-label">日均热量</span>
                  <span className="nm-value">{Math.round(monthlyStats.averageDaily || 0)} <small>kcal</small></span>
                </div>
                <div className="nutrition-monthly-item">
                  <span className="nm-label">早餐</span>
                  <span className="nm-value">{monthlyStats.mealDistribution?.breakfast?.count || 0}</span>
                </div>
                <div className="nutrition-monthly-item">
                  <span className="nm-label">午餐</span>
                  <span className="nm-value">{monthlyStats.mealDistribution?.lunch?.count || 0}</span>
                </div>
                <div className="nutrition-monthly-item">
                  <span className="nm-label">晚餐</span>
                  <span className="nm-value">{monthlyStats.mealDistribution?.dinner?.count || 0}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add Log Modal ── */}
      {showAdd && (
        <div className="nutrition-overlay" onClick={() => setShowAdd(false)}>
          <div className="nutrition-modal" onClick={e => e.stopPropagation()}>
            <h3>添加饮食记录</h3>
            <label>
              食谱 ID
              <input value={addRecipeId} onChange={e => setAddRecipeId(e.target.value)} placeholder="输入食谱ID" />
            </label>
            <label>
              餐次
              <select value={addMealType} onChange={e => setAddMealType(e.target.value)}>
                {MEAL_TYPES.map(mt => <option key={mt.key} value={mt.key}>{mt.icon} {mt.label}</option>)}
              </select>
            </label>
            <label>
              份数
              <input type="number" min={0.5} max={10} step={0.5} value={addServings}
                onChange={e => setAddServings(Math.max(0.5, parseFloat(e.target.value) || 1))} />
            </label>
            <div className="nutrition-modal-actions">
              <button onClick={() => setShowAdd(false)}>取消</button>
              <button className="primary" onClick={handleAddLog} disabled={!addRecipeId.trim() || submitting}>
                {submitting ? '保存中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Goals Modal ── */}
      {showGoals && (
        <div className="nutrition-overlay" onClick={() => setShowGoals(false)}>
          <div className="nutrition-modal wide" onClick={e => e.stopPropagation()}>
            <h3>营养目标</h3>
            <button className="nutrition-rec-btn" onClick={handleGetRecommended}>智能推荐</button>
            <label>
              每日热量 (kcal)
              <div className="nutrition-slider-row">
                <input type="range" min={800} max={4000} step={50} value={goalForm.calories}
                  onChange={e => setGoalForm({ ...goalForm, calories: parseInt(e.target.value) })} />
                <span className="nutrition-slider-val">{goalForm.calories}</span>
              </div>
            </label>
            <label>
              蛋白质 (g)
              <div className="nutrition-slider-row">
                <input type="range" min={20} max={200} step={5} value={goalForm.protein}
                  onChange={e => setGoalForm({ ...goalForm, protein: parseInt(e.target.value) })} />
                <span className="nutrition-slider-val">{goalForm.protein}</span>
              </div>
            </label>
            <label>
              脂肪 (g)
              <div className="nutrition-slider-row">
                <input type="range" min={10} max={150} step={5} value={goalForm.fat}
                  onChange={e => setGoalForm({ ...goalForm, fat: parseInt(e.target.value) })} />
                <span className="nutrition-slider-val">{goalForm.fat}</span>
              </div>
            </label>
            <label>
              碳水化合物 (g)
              <div className="nutrition-slider-row">
                <input type="range" min={50} max={400} step={10} value={goalForm.carbs}
                  onChange={e => setGoalForm({ ...goalForm, carbs: parseInt(e.target.value) })} />
                <span className="nutrition-slider-val">{goalForm.carbs}</span>
              </div>
            </label>
            <label>
              膳食纤维 (g)
              <div className="nutrition-slider-row">
                <input type="range" min={5} max={60} step={1} value={goalForm.fiber}
                  onChange={e => setGoalForm({ ...goalForm, fiber: parseInt(e.target.value) })} />
                <span className="nutrition-slider-val">{goalForm.fiber}</span>
              </div>
            </label>
            <div className="nutrition-modal-actions">
              <button onClick={() => setShowGoals(false)}>取消</button>
              <button className="primary" onClick={handleSaveGoals} disabled={submitting}>
                {submitting ? '保存中...' : '保存目标'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionDashboard;