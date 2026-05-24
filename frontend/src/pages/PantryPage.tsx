import React, { useState, useEffect, useCallback } from 'react';
import {
  getPantryItems, addPantryItem, updatePantryItem, deletePantryItem,
  getExpiringItems, getExpiredItems, quickAddPantryItems, getPantrySuggestions,
  PantryItem,
} from '../api';
import { useToast } from '../context/ToastContext';
import './PantryPage.css';

const CATEGORIES = ['全部', '蔬菜', '水果', '肉类', '海鲜', '蛋奶', '调味料', '主食', '干货', '饮料', '其他'];
const UNITS = ['个', '克', '千克', '毫升', '升', '汤匙', '茶匙', '根', '片', '块', '包', '盒', '瓶', '袋', '条'];

const emptyItem = { name: '', quantity: 1, unit: '个', category: '其他', expiryDate: '', notes: '' };

const PantryPage: React.FC = () => {
  const { showToast } = useToast();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'expiryDate'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [quickItems, setQuickItems] = useState([{ name: '', quantity: 1, unit: '个', category: '其他' as string }]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expiring, setExpiring] = useState<PantryItem[]>([]);
  const [expired, setExpired] = useState<PantryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (category !== '全部') params.category = category;
      if (search) params.search = search;
      params.sortBy = sortBy;
      params.sortOrder = sortAsc ? 'asc' : 'desc';
      const res = await getPantryItems(params);
      setItems(Array.isArray(res) ? res : (res as any).list || []);

      // Expiring / expired
      try { const e = await getExpiringItems(7); setExpiring(Array.isArray(e) ? e : (e as any).list || []); } catch {}
      try { const e = await getExpiredItems(); setExpired(Array.isArray(e) ? e : (e as any).list || []); } catch {}
    } catch (err: any) {
      setError(err?.message || '加载库存失败');
    } finally {
      setLoading(false);
    }
  }, [category, search, sortBy, sortAsc]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const fetchSuggestions = async () => {
    try {
      const res = await getPantrySuggestions();
      setSuggestions(Array.isArray(res) ? res : (res as any).list || []);
      setShowSuggestions(true);
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确认删除「${name}」？`)) return;
    try {
      await deletePantryItem(id);
      showToast?.('已删除', 'success');
      await fetchItems();
    } catch (err: any) {
      showToast?.(err?.message || '删除失败', 'error');
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await addPantryItem({
        name: form.name.trim(),
        quantity: form.quantity,
        unit: form.unit,
        category: form.category || '其他',
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
      });
      showToast?.('食材已添加', 'success');
      setShowAddModal(false);
      setForm(emptyItem);
      await fetchItems();
    } catch (err: any) {
      showToast?.(err?.message || '添加失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAdd = async () => {
    const valid = quickItems.filter(q => q.name.trim());
    if (valid.length === 0) return;
    setSubmitting(true);
    try {
      await quickAddPantryItems(valid.map(q => ({
        name: q.name.trim(),
        quantity: q.quantity,
        unit: q.unit,
        category: q.category || '其他',
      })));
      showToast?.(`已添加 ${valid.length} 项`, 'success');
      setShowQuickAdd(false);
      setQuickItems([{ name: '', quantity: 1, unit: '个', category: '其他' }]);
      await fetchItems();
    } catch (err: any) {
      showToast?.(err?.message || '批量添加失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingItem || !form.name.trim()) return;
    setSubmitting(true);
    try {
      await updatePantryItem(editingItem.id, {
        name: form.name.trim(),
        quantity: form.quantity,
        unit: form.unit,
        category: form.category || '其他',
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
      });
      showToast?.('已更新', 'success');
      setEditingItem(null);
      setForm(emptyItem);
      await fetchItems();
    } catch (err: any) {
      showToast?.(err?.message || '更新失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (item: PantryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiryDate: item.expiryDate || '',
      notes: item.notes || '',
    });
  };

  const getExpiryClass = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateStr);
    const diff = (expiry.getTime() - today.getTime()) / 86400000;
    if (diff < 0) return 'expiry-expired';
    if (diff <= 1) return 'expiry-today';
    if (diff <= 7) return 'expiry-soon';
    return 'expiry-ok';
  };

  const getExpiryLabel = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateStr);
    const diff = Math.round((expiry.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return `已过期 ${Math.abs(diff)}天`;
    if (diff === 0) return '今天过期';
    if (diff <= 7) return `剩 ${diff}天`;
    return `${dateStr.slice(5)}`;
  };

  // Sort
  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'zh');
    else if (sortBy === 'category') cmp = a.category.localeCompare(b.category, 'zh');
    else if (sortBy === 'expiryDate') cmp = (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999');
    return sortAsc ? cmp : -cmp;
  });

  return (
    <div className="pantry-page">
      <h1 className="pantry-title">食材库存</h1>

      {/* Alert: expiring / expired */}
      {(expired.length > 0 || expiring.length > 0) && (
        <div className="pantry-alerts">
          {expired.length > 0 && (
            <div className="pantry-alert expired">
              <span>⚠️ {expired.length} 项食材已过期</span>
              <button onClick={() => { expired.forEach(e => deletePantryItem(e.id).catch(() => {})); fetchItems(); }}>
                一键清理
              </button>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="pantry-alert soon">
              <span>⏰ {expiring.length} 项食材即将过期</span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="pantry-controls">
        <input
          className="pantry-search"
          placeholder="搜索食材..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="pantry-sort" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="name">按名称</option>
          <option value="category">按分类</option>
          <option value="expiryDate">按过期日</option>
        </select>
        <button className="pantry-sort-order" onClick={() => setSortAsc(!sortAsc)} title={sortAsc ? '升序' : '降序'}>
          {sortAsc ? '↑' : '↓'}
        </button>
      </div>

      {/* Category sidebar + grid */}
      <div className="pantry-layout">
        <aside className="pantry-sidebar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`pantry-cat-btn ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </aside>

        <main className="pantry-content">
          {loading && <div className="pantry-loading">加载中...</div>}
          {error && <div className="pantry-error">{error}</div>}
          {!loading && !error && sorted.length === 0 && (
            <div className="pantry-empty">
              <p>食材库存为空</p>
              <button onClick={() => setShowAddModal(true)}>添加食材</button>
            </div>
          )}

          <div className="pantry-grid">
            {sorted.map(item => (
              <div
                key={item.id}
                className={`pantry-card ${getExpiryClass(item.expiryDate)}`}
                onClick={() => openEdit(item)}
              >
                <span className="pantry-card-cat">{item.category}</span>
                <h3 className="pantry-card-name">{item.name}</h3>
                <p className="pantry-card-qty">{item.quantity} {item.unit}</p>
                {item.expiryDate && (
                  <span className={`pantry-card-expiry ${getExpiryClass(item.expiryDate)}`}>
                    {getExpiryLabel(item.expiryDate)}
                  </span>
                )}
                <button
                  className="pantry-card-delete"
                  onClick={e => { e.stopPropagation(); handleDelete(item.id, item.name); }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Action buttons */}
      <div className="pantry-actions">
        <button className="pantry-action-btn primary" onClick={() => setShowAddModal(true)}>
          ＋ 添加食材
        </button>
        <button className="pantry-action-btn secondary" onClick={() => setShowQuickAdd(true)}>
          ⚡ 快速添加
        </button>
        <button className="pantry-action-btn secondary" onClick={fetchSuggestions}>
          💡 建议食谱
        </button>
      </div>

      {/* Suggestions section */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="pantry-suggestions">
          <h3>用现有食材可以做这些菜</h3>
          <div className="pantry-suggestion-grid">
            {suggestions.map((rec: any) => (
              <div key={rec.id || rec.recipeId} className="pantry-suggestion-card">
                <img src={rec.coverImage || ''} alt={rec.title || ''} />
                <span>{rec.title || rec.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAddModal && (
        <div className="pantry-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="pantry-modal" onClick={e => e.stopPropagation()}>
            <h3>添加食材</h3>
            <label>
              名称 <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              数量 <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Math.max(0, parseFloat(e.target.value) || 0) })} />
            </label>
            <label>
              单位
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label>
              分类
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              过期日期 <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
            </label>
            <label>
              备注 <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </label>
            <div className="pantry-modal-actions">
              <button onClick={() => setShowAddModal(false)}>取消</button>
              <button className="primary" onClick={handleAdd} disabled={!form.name.trim() || submitting}>
                {submitting ? '添加中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Add Modal ── */}
      {showQuickAdd && (
        <div className="pantry-modal-overlay" onClick={() => setShowQuickAdd(false)}>
          <div className="pantry-modal" onClick={e => e.stopPropagation()}>
            <h3>快速批量添加</h3>
            {quickItems.map((q, i) => (
              <div key={i} className="pantry-quick-row">
                <input
                  placeholder="食材名称"
                  value={q.name}
                  onChange={e => {
                    const next = [...quickItems];
                    next[i] = { ...next[i], name: e.target.value };
                    // Auto-add row
                    if (i === quickItems.length - 1 && e.target.value) next.push({ name: '', quantity: 1, unit: '个', category: '其他' });
                    setQuickItems(next);
                  }}
                />
                <input
                  type="number"
                  value={q.quantity}
                  onChange={e => {
                    const next = [...quickItems];
                    next[i] = { ...next[i], quantity: Math.max(0, parseFloat(e.target.value) || 0) };
                    setQuickItems(next);
                  }}
                  className="pantry-quick-qty"
                />
                <select
                  value={q.unit}
                  onChange={e => {
                    const next = [...quickItems];
                    next[i] = { ...next[i], unit: e.target.value };
                    setQuickItems(next);
                  }}
                >
                  {UNITS.slice(0, 5).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {i < quickItems.length - 1 && (
                  <button className="pantry-quick-remove" onClick={() => setQuickItems(quickItems.filter((_, j) => j !== i))}>
                    ×
                  </button>
                )}
              </div>
            ))}
            <div className="pantry-modal-actions">
              <button onClick={() => setShowQuickAdd(false)}>取消</button>
              <button className="primary" onClick={handleQuickAdd} disabled={submitting}>
                {submitting ? '添加中...' : `确认添加 (${quickItems.filter(q => q.name.trim()).length}项)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Panel ── */}
      {editingItem && (
        <div className="pantry-modal-overlay" onClick={() => { setEditingItem(null); setForm(emptyItem); }}>
          <div className="pantry-modal" onClick={e => e.stopPropagation()}>
            <h3>编辑食材</h3>
            <label>
              名称 <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              数量 <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Math.max(0, parseFloat(e.target.value) || 0) })} />
            </label>
            <label>
              单位
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label>
              分类
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              过期日期 <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
            </label>
            <label>
              备注 <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </label>
            <div className="pantry-modal-actions">
              <button onClick={() => { setEditingItem(null); setForm(emptyItem); }}>取消</button>
              <button className="primary" onClick={handleEdit} disabled={!form.name.trim() || submitting}>
                {submitting ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PantryPage;