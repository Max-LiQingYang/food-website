import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getShoppingLists,
  updateShoppingList,
  type ShoppingList,
  type ShoppingListItem,
} from '../api'
import { useToast } from '../context/ToastContext'
import './ShoppingListPage.css'

export default function ShoppingListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null)
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)

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

    // Optimistic update
    setSelectedList(prev => prev ? { ...prev, items: updatedItems } : prev)

    try {
      await updateShoppingList(listId, { items: updatedItems })
    } catch (err: any) {
      // Revert on error
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
    fetchLists()
  }

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
          <h1 className="shop-page__title">购物清单</h1>
        </div>

        {lists.length === 0 ? (
          <div className="shop-page__empty">
            <div className="empty-icon">🛒</div>
            <p className="empty-text">还没有购物清单</p>
            <p className="empty-hint">
              在食谱详情页点击「🛒 加入购物清单」来创建购物清单
            </p>
            <button className="btn btn--primary" onClick={() => navigate('/')}>
              去找食谱
            </button>
          </div>
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
                  <div className="shop-card__icon">🛒</div>
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

  return (
    <div className="shop-page">
      <button className="shop-detail__back" onClick={goBack}>
        ← 返回清单列表
      </button>

      <div className="shop-detail__header">
        <div>
          <h1 className="shop-detail__title">🛒 {selectedList.name}</h1>
          <p className="shop-detail__meta">
            {totalCount} 项 · {checkedCount} 已购
          </p>
        </div>
        {checkedCount > 0 && (
          <button className="shop-detail__clear-btn" onClick={handleClearChecked}>
            清空已购
          </button>
        )}
      </div>

      {totalCount > 0 && (
        <div className="shop-detail__progress">
          <div
            className="shop-detail__progress-bar"
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {totalCount === 0 ? (
        <div className="shop-detail__empty">
          <p>清单为空</p>
        </div>
      ) : (
        <ul className="shop-detail__items">
          {selectedList.items.map((item: ShoppingListItem) => (
            <li
              key={item.name}
              className={`shop-detail__item ${item.checked ? 'shop-detail__item--checked' : ''}`}
              onClick={() => handleToggleItem(selectedList.id, item.name, item.checked)}
            >
              <span className="shop-detail__checkbox">
                {item.checked ? '✅' : '⬜'}
              </span>
              <span className="shop-detail__item-name">{item.name}</span>
              {item.amount != null && item.unit && (
                <span className="shop-detail__item-amount">
                  {item.amount} {item.unit}
                </span>
              )}
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