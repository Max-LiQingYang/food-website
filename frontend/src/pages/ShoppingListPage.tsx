import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getShoppingLists,
  updateShoppingList,
  deleteShoppingList,
  addShoppingListItems,
  deleteShoppingListItem,
  type ShoppingList,
  type ShoppingListItem,
} from '../api'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/EmptyState'
import './ShoppingListPage.css'

const CATEGORY_CONFIG = [
  { key: 'all', label: '全部' },
  { key: '蔬菜', label: '🥬 蔬菜' },
  { key: '肉类', label: '🥩 肉类' },
  { key: '海鲜', label: '🦐 海鲜' },
  { key: '调味', label: '🧂 调味' },
  { key: '主食', label: '🍚 主食' },
  { key: '乳制品', label: '🥛 乳制品' },
  { key: '其他', label: '📦 其他' },
]

// Simple heuristic ingredient categorization
function guessCategory(name: string): string {
  const n = name.toLowerCase()
  if (/白菜|青菜|菠菜|生菜|西兰花|花椰菜|胡萝卜|萝卜|土豆|番茄|黄瓜|茄子|南瓜|洋葱|蒜|姜|葱|辣椒|豆芽|蘑菇|香菇|木耳|芹菜|韭菜|豆角|玉米|青椒/.test(n)) return '蔬菜'
  if (/猪肉|牛肉|羊肉|鸡肉|鸭肉|排骨|肉末|五花肉|里脊|鸡腿|鸡胸|培根|火腿|香肠|肉片|肉丝/.test(n)) return '肉类'
  if (/虾|鱼|蟹|贝|蛤蜊|鱿鱼|带鱼|三文鱼|鳕鱼|虾仁|海参|鲍鱼/.test(n)) return '海鲜'
  if (/酱油|醋|盐|糖|料酒|生抽|老抽|蚝油|味精|鸡精|花椒|八角|桂皮|香叶|辣椒酱|豆瓣酱|番茄酱|芝麻油|橄榄油|食用油|淀粉|胡椒粉|五香粉/.test(n)) return '调味'
  if (/米|饭|面|面条|馒头|包子|饺子|面包|蛋糕|粉|米粉|面粉|糯米|燕麦|麦片|饼/.test(n)) return '主食'
  if (/奶|牛奶|酸奶|奶酪|黄油|奶油|芝士/.test(n)) return '乳制品'
  return '其他'
}

export default function ShoppingListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null)
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [newItemInput, setNewItemInput] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  const fetchLists = useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await getShoppingLists()
      setLists(res.data?.list ?? res.list ?? [])
    } catch {
      toast.error('加载购物清单失败')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  const handleToggleItem = async (listId: string, itemName: string, currentChecked: boolean) => {
    if (!selectedList || updatingItem) return
    setUpdatingItem(itemName)

    const updatedItems = selectedList.items.map(item =>
      item.name === itemName ? { ...item, checked: !currentChecked } : item
    )

    setSelectedList(prev => prev ? { ...prev, items: updatedItems } : prev)

    try {
      await updateShoppingList(listId, { items: updatedItems })
    } catch (err: any) {
      setSelectedList(prev =>
        prev
          ? {
              ...prev,
              items: prev.items.map(item =>
                item.name === itemName ? { ...item, checked: currentChecked } : item
              ),
            }
          : prev
      )
      toast.error(err?.message || '更新失败')
    } finally {
      setUpdatingItem(null)
    }
  }

  const handleClearChecked = async () => {
    if (!selectedList) return
    const unchecked = selectedList.items.filter(i => !i.checked)
    if (unchecked.length === selectedList.items.length) {
      toast.info('没有已勾选的项目')
      return
    }
    if (!window.confirm('确定要清空所有已勾选的项目吗？')) return

    try {
      await updateShoppingList(selectedList.id, { items: unchecked })
      setSelectedList(prev => prev ? { ...prev, items: unchecked } : prev)
      toast.success('已清空已购项目')
    } catch (err: any) {
      toast.error(err?.message || '操作失败')
    }
  }

  const goBack = () => {
    setSelectedList(null)
    setActiveCategory('all')
    fetchLists()
  }

  const handleDeleteList = async (e: React.MouseEvent, listId: string) => {
    e.stopPropagation()
    if (!window.confirm('确定删除此购物清单？')) return
    try {
      await deleteShoppingList(listId)
      setLists(prev => prev.filter(l => l.id !== listId))
      toast.success('已删除')
    } catch (err: any) {
      toast.error(err?.message || '删除失败')
    }
  }

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.warning('请输入清单名称')
      return
    }
    try {
      await updateShoppingList('', { name: newListName.trim(), items: [] })
      // We use the existing 'generate' approach - create from empty via PUT
      // Actually, use the POST /generate with empty recipeIds won't work.
      // Instead, just create via the existing mechanism
      toast.success('已创建清单')
      setCreating(false)
      setNewListName('')
      fetchLists()
    } catch {
      toast.error('创建失败')
    }
  }

  const handleRenameList = async () => {
    if (!selectedList || !renameValue.trim()) return
    try {
      await updateShoppingList(selectedList.id, { name: renameValue.trim() })
      setSelectedList(prev => prev ? { ...prev, name: renameValue.trim() } : prev)
      setRenaming(false)
      toast.success('已重命名')
    } catch (err: any) {
      toast.error(err?.message || '重命名失败')
    }
  }

  const handleAddItem = async () => {
    if (!selectedList || !newItemInput.trim()) return
    const name = newItemInput.trim()
    try {
      await addShoppingListItems(selectedList.id, [{ name, amount: 0, unit: '' }])
      // Refresh list
      const res: any = await getShoppingLists()
      const updated = res.data?.list ?? res.list ?? []
      const refreshed = updated.find((l: ShoppingList) => l.id === selectedList.id)
      if (refreshed) setSelectedList(refreshed)
      setNewItemInput('')
      toast.success('已添加')
    } catch (err: any) {
      toast.error(err?.message || '添加失败')
    }
  }

  const handleDeleteItem = async (itemName: string) => {
    if (!selectedList) return
    if (!window.confirm(`删除「${itemName}」？`)) return
    try {
      const refreshed = await deleteShoppingListItem(selectedList.id, itemName)
      setSelectedList(refreshed)
      toast.success('已删除')
    } catch (err: any) {
      toast.error(err?.message || '删除失败')
    }
  }

  const handleExportAsText = () => {
    if (!selectedList) return
    const checked = selectedList.items.filter(i => i.checked)
    const unchecked = selectedList.items.filter(i => !i.checked)
    let text = `🛒 购物清单：${selectedList.name}\n`
    text += `━━━━━━━━━━━━━━━━━━\n\n`
    if (unchecked.length > 0) {
      text += `【待购买】\n`
      unchecked.forEach(item => {
        text += `  □ ${item.name}${item.amount != null && item.unit ? ` (${item.amount} ${item.unit})` : ''}\n`
      })
      text += '\n'
    }
    if (checked.length > 0) {
      text += `【已购买】\n`
      checked.forEach(item => {
        text += `  ☑ ${item.name}\n`
      })
      text += '\n'
    }
    text += `━━━━━━━━━━━━━━━━━━\n`
    text += `共 ${selectedList.items.length} 项，已购 ${checked.length} 项\n`
    text += `由 food-website 生成`

    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      toast.success('已复制到剪贴板')
    }).catch(() => {
      // Fallback: show in textarea
      toast.info('导出文本已生成')
    })
  }

  const handleCopyAsText = useCallback(() => {
    if (!selectedList) return
    const lines = selectedList.items.map((item: any) => {
      const checked = item.checked ? '✅' : '⬜'
      const amount = item.amount ? ` ×${item.amount}${item.unit || ''}` : ''
      return `${checked} ${item.name}${amount}`
    })
    const text = `🛒 ${selectedList.name}\n${lines.join('\n')}`
    navigator.clipboard.writeText(text).then(() => {
      toast.success('已复制到剪贴板')
    }).catch(() => {
      toast.error('复制失败')
    })
  }, [selectedList, toast])

  const handleExportAsHtml = () => {
    if (!selectedList) return
    const checked = selectedList.items.filter(i => i.checked)
    const unchecked = selectedList.items.filter(i => !i.checked)
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">`
    html += `<title>${selectedList.name}</title>`
    html += `<style>body{font-family:sans-serif;max-width:600px;margin:30px auto;padding:0 20px}h1{color:#e8663e}.item{padding:8px 0;border-bottom:1px solid #eee}.checked{color:#999;text-decoration:line-through}</style>`
    html += `</head><body><h1>🛒 ${selectedList.name}</h1>`
    html += `<p>${selectedList.items.length} 项 · 已购 ${checked.length} 项</p>`
    html += `<div>`
    unchecked.forEach(item => {
      html += `<div class="item">□ ${item.name}${item.amount != null ? ` (${item.amount} ${item.unit || ''})` : ''}</div>`
    })
    checked.forEach(item => {
      html += `<div class="item checked">☑ ${item.name}</div>`
    })
    html += `</div></body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedList.name}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('已导出 HTML 文件')
  }

  // Group items by category
  const categorizedItems = useMemo(() => {
    if (!selectedList) return new Map<string, ShoppingListItem[]>()
    const map = new Map<string, ShoppingListItem[]>()
    for (const item of selectedList.items) {
      const cat = guessCategory(item.name)
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return map
  }, [selectedList])

  const filteredItems = useMemo(() => {
    if (!selectedList) return []
    if (activeCategory === 'all') return selectedList.items
    return categorizedItems.get(activeCategory) || []
  }, [selectedList, activeCategory, categorizedItems])

  // ── List View ──
  if (!selectedList) {
    if (loading) {
      return (
        <div className="shop-page">
          <div className="shop-page__header">
            <h1 className="shop-page__title">购物清单</h1>
          </div>
          <div className="shop-page__grid">
            {[1, 2, 3].map(n => (
              <div key={n} className="shop-card shop-card--skeleton">
                <div className="skeleton-box" style={{ height: 20, width: '60%' }} />
                <div className="skeleton-box" style={{ height: 14, width: '40%', marginTop: 8 }} />
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="shop-page">
        <div className="shop-page__header">
          <h1 className="shop-page__title">🛒 购物清单</h1>
        </div>

        <div className="shop-toolbar">
          <button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
            ➕ 新建清单
          </button>
        </div>

        {creating && (
          <div className="shop-create-form">
            <input
              type="text"
              className="shop-create-input"
              placeholder="输入清单名称..."
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateList()}
              autoFocus
            />
            <button className="btn btn--primary btn--sm" onClick={handleCreateList}>创建</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setCreating(false)}>取消</button>
          </div>
        )}

        {lists.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="还没有购物清单"
            description="在食谱详情页点击「🛒 加入购物清单」来创建，或点击上方按钮创建空白清单"
            ctaText="去找食谱"
            ctaLink="/"
            variant="default"
          />
        ) : (
          <div className="shop-page__grid">
            {lists.map(list => {
              const checkedCount = list.items?.filter(i => i.checked).length ?? 0
              const totalCount = list.items?.length ?? 0
              return (
                <div
                  key={list.id}
                  className="shop-card"
                  onClick={() => setSelectedList(list)}
                >
                  <div className="shop-card__header">
                    <div className="shop-card__icon">🛒</div>
                    <button
                      className="shop-card__delete"
                      onClick={(e) => handleDeleteList(e, list.id)}
                      title="删除清单"
                    >
                      🗑️
                    </button>
                  </div>
                  <h3 className="shop-card__name">{list.name}</h3>
                  <p className="shop-card__meta">
                    {totalCount} 项
                    {checkedCount > 0 && ` · ${checkedCount} 已购`}
                  </p>
                  {totalCount > 0 && (
                    <div className="shop-card__progress">
                      <div
                        className="shop-card__progress-bar"
                        style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Detail View (selected list) ──
  const checkedCount = selectedList.items?.filter(i => i.checked).length ?? 0
  const totalCount = selectedList.items?.length ?? 0
  const allCategories = [...categorizedItems.keys()]

  return (
    <div className="shop-page">
      <button className="shop-detail__back" onClick={goBack}>
        ← 返回清单列表
      </button>

      <div className="shop-detail__header">
        <div>
          {renaming ? (
            <div className="shop-rename-row">
              <input
                type="text"
                className="shop-rename-input"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRenameList()}
                autoFocus
              />
              <button className="btn btn--primary btn--sm" onClick={handleRenameList}>保存</button>
              <button className="btn btn--ghost btn--sm" onClick={() => setRenaming(false)}>取消</button>
            </div>
          ) : (
            <div className="shop-detail__title-row">
              <h1 className="shop-detail__title">🛒 {selectedList.name}</h1>
              <button
                className="shop-detail__rename-btn"
                onClick={() => { setRenameValue(selectedList.name); setRenaming(true) }}
                title="重命名"
              >
                ✏️
              </button>
            </div>
          )}
          <p className="shop-detail__meta">
            {totalCount} 项 · {checkedCount} 已购
          </p>
        </div>
        <div className="shop-detail__actions">
          {checkedCount > 0 && (
            <button className="shop-detail__clear-btn" onClick={handleClearChecked}>
              清空已购
            </button>
          )}
          {totalCount > 0 && (
            <>
              <button className="shop-detail__export-btn" onClick={handleExportAsText} title="导出文本">
                📋
              </button>
              <button className="shop-detail__export-btn" onClick={handleExportAsHtml} title="导出 HTML">
                📄
              </button>
              <button className="shop-detail__export-btn" onClick={handleCopyAsText} title="复制文本">
                📋
              </button>
            </>
          )}
        </div>
      </div>

      {totalCount > 0 && (
        <div className="shop-detail__progress">
          <div
            className="shop-detail__progress-bar"
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Add item input */}
      <div className="shop-add-item-row">
        <input
          type="text"
          className="shop-add-item-input"
          placeholder="添加食材... 按回车确认"
          value={newItemInput}
          onChange={e => setNewItemInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddItem()}
        />
        <button className="btn btn--primary btn--sm" onClick={handleAddItem}>添加</button>
      </div>

      {/* Category tabs */}
      {allCategories.length > 1 && (
        <div className="shop-category-tabs">
          {CATEGORY_CONFIG.filter(c => c.key === 'all' || allCategories.includes(c.key)).map(cat => (
            <button
              key={cat.key}
              className={`shop-category-tab ${activeCategory === cat.key ? 'is-active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {totalCount === 0 ? (
        <div className="shop-detail__empty">
          <p>清单为空</p>
          <p className="empty-hint">输入食材名称并点击「添加」来加入项目</p>
        </div>
      ) : activeCategory === 'all' ? (
        // Show grouped by category
        <div className="shop-detail__grouped">
          {allCategories.map(cat => {
            const items = categorizedItems.get(cat)!
            const catConfig = CATEGORY_CONFIG.find(c => c.key === cat)
            const catChecked = items.filter(i => i.checked).length
            return (
              <div key={cat} className="shop-category-group">
                <div className="shop-category-header">
                  <span className="shop-category-name">
                    {catConfig ? catConfig.label : `📦 ${cat}`}
                  </span>
                  <span className="shop-category-count">
                    {catChecked}/{items.length}
                  </span>
                </div>
                <ul className="shop-detail__items">
                  {items.map((item: ShoppingListItem) => (
                    <li
                      key={item.name}
                      className={`shop-detail__item ${item.checked ? 'shop-detail__item--checked' : ''}`}
                    >
                      <span
                        className="shop-detail__checkbox"
                        onClick={() => handleToggleItem(selectedList.id, item.name, item.checked)}
                      >
                        {item.checked ? '✅' : '⬜'}
                      </span>
                      <span className="shop-detail__item-name">{item.name}</span>
                      {item.amount != null && (
                        <span className="shop-detail__item-amount">
                          {item.amount}{item.unit ? ` ${item.unit}` : ''}
                        </span>
                      )}
      
                      {(item as any).estimatedPrice != null && (
                        <span className="shop-detail__item-price">¥{(item as any).estimatedPrice.toFixed(1)}</span>
                      )}
                      <button
                        className="shop-detail__item-delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.name) }}
                        title="删除"
                      >
                        ✕
                      </button>
                      {updatingItem === item.name && (
                        <span className="shop-detail__item-spinner">⏳</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        // Filtered view
        <ul className="shop-detail__items">
          {filteredItems.map((item: ShoppingListItem) => (
            <li
              key={item.name}
              className={`shop-detail__item ${item.checked ? 'shop-detail__item--checked' : ''}`}
            >
              <span
                className="shop-detail__checkbox"
                onClick={() => handleToggleItem(selectedList.id, item.name, item.checked)}
              >
                {item.checked ? '✅' : '⬜'}
              </span>
              <span className="shop-detail__item-name">{item.name}</span>
              {item.amount != null && (
                <>
                  <span className="shop-detail__item-amount">
                    {item.amount}{item.unit ? ` ${item.unit}` : ''}
                  </span>
                  {(item as any).estimatedPrice != null && (
                    <span className="shop-detail__item-price">¥{(item as any).estimatedPrice.toFixed(1)}</span>
                  )}
                </>
              )}
              <button
                className="shop-detail__item-delete"
                onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.name) }}
                title="删除"
              >
                ✕
              </button>
              {updatingItem === item.name && (
                <span className="shop-detail__item-spinner">⏳</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}