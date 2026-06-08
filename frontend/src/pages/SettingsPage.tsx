import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSettings,
  updateNotificationPrefs,
  updatePrivacySettings,
  updateSettingsProfile,
  exportUserData,
  exportCsvFavorites
} from '../api'
import { useToast } from '../context/ToastContext'
import './SettingsPage.css'
import PageSkeleton from '../components/PageSkeleton'

interface Settings {
  profile: { nickname: string; username: string; email: string; role: string; joinedAt: string }
  notifications: { commentReply: boolean; followUpdate: boolean; challenge: boolean; system: boolean }
  privacy: { collectionVisibility: string; cookingLogVisibility: string }
  diet: string
  cuisine: string
  difficulty: string
  maxCookTime: string
  allergies: string[]
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'export'>('profile')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const data = await getSettings()
      setSettings(data)
      setNickname(data.profile?.nickname || '')
    } catch (err) {
      console.error('Failed to load settings:', err)
      showToast('加载设置失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileSave() {
    try {
      setSaving(true)
      await updateSettingsProfile({ nickname })
      showToast('个人资料已更新', 'success')
    } catch (err) {
      showToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleNotificationToggle(key: 'commentReply' | 'followUpdate' | 'challenge' | 'system') {
    if (!settings) return
    const updated = {
      ...settings.notifications,
      [key]: !settings.notifications[key]
    }
    try {
      await updateNotificationPrefs(updated)
      setSettings({ ...settings, notifications: updated })
      showToast('通知偏好已更新', 'success')
    } catch (err) {
      showToast('保存失败', 'error')
    }
  }

  async function handlePrivacyChange(key: string, value: string) {
    if (!settings) return
    try {
      await updatePrivacySettings({ [key]: value })
      setSettings({
        ...settings,
        privacy: { ...settings.privacy, [key]: value }
      })
      showToast('隐私设置已更新', 'success')
    } catch (err) {
      showToast('保存失败', 'error')
    }
  }

  async function handleExportJSON() {
    try {
      const data = await exportUserData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `food-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('数据导出成功', 'success')
    } catch (err) {
      showToast('导出失败', 'error')
    }
  }

  async function handleExportCSV() {
    try {
      const blob = await exportCsvFavorites()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-favorites-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('收藏数据导出成功', 'success')
    } catch (err) {
      showToast('导出失败', 'error')
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <PageSkeleton type="profile" />
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1 className="settings-title">个人设置</h1>

        <div className="settings-tabs">
          {[
            { key: 'profile', label: '个人信息' },
            { key: 'notifications', label: '通知设置' },
            { key: 'privacy', label: '隐私设置' },
            { key: 'export', label: '数据导出' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="settings-section fade-in">
              <h2>个人信息</h2>
              <div className="settings-field">
                <label>用户名</label>
                <input type="text" value={settings?.profile?.username || ''} disabled />
              </div>
              <div className="settings-field">
                <label>邮箱</label>
                <input type="email" value={settings?.profile?.email || ''} disabled />
              </div>
              <div className="settings-field">
                <label>昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="设置昵称"
                />
              </div>
              <div className="settings-field">
                <label>注册时间</label>
                <input type="text" value={settings?.profile?.joinedAt ? new Date(settings.profile.joinedAt).toLocaleDateString('zh-CN') : ''} disabled />
              </div>
              <button
                className="settings-save-btn"
                onClick={handleProfileSave}
                disabled={saving}
              >
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-section fade-in">
              <h2>通知偏好</h2>
              <div className="settings-field">
                <label>评论回复通知</label>
                <div className="settings-toggle">
                  <span>当有人回复你的评论时通知</span>
                  <button
                    className={`toggle-btn ${settings?.notifications?.commentReply ? 'on' : 'off'}`}
                    onClick={() => handleNotificationToggle('commentReply')}
                  >
                    {settings?.notifications?.commentReply ? '已开启' : '已关闭'}
                  </button>
                </div>
              </div>
              <div className="settings-field">
                <label>关注动态通知</label>
                <div className="settings-toggle">
                  <span>当关注的人发布新食谱时通知</span>
                  <button
                    className={`toggle-btn ${settings?.notifications?.followUpdate ? 'on' : 'off'}`}
                    onClick={() => handleNotificationToggle('followUpdate')}
                  >
                    {settings?.notifications?.followUpdate ? '已开启' : '已关闭'}
                  </button>
                </div>
              </div>
              <div className="settings-field">
                <label>挑战赛通知</label>
                <div className="settings-toggle">
                  <span>当有新的烹饪挑战时通知</span>
                  <button
                    className={`toggle-btn ${settings?.notifications?.challenge ? 'on' : 'off'}`}
                    onClick={() => handleNotificationToggle('challenge')}
                  >
                    {settings?.notifications?.challenge ? '已开启' : '已关闭'}
                  </button>
                </div>
              </div>
              <div className="settings-field">
                <label>系统通知</label>
                <div className="settings-toggle">
                  <span>接收系统公告和更新信息</span>
                  <button
                    className={`toggle-btn ${settings?.notifications?.system ? 'on' : 'off'}`}
                    onClick={() => handleNotificationToggle('system')}
                  >
                    {settings?.notifications?.system ? '已开启' : '已关闭'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="settings-section fade-in">
              <h2>隐私设置</h2>
              <div className="settings-field">
                <label>收藏夹可见性</label>
                <div className="settings-radio-group">
                  {[
                    { value: 'public', label: '公开' },
                    { value: 'followers', label: '仅关注者' },
                    { value: 'private', label: '私密' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`radio-btn ${settings?.privacy?.collectionVisibility === opt.value ? 'active' : ''}`}
                      onClick={() => handlePrivacyChange('collectionVisibility', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-field">
                <label>烹饪日志可见性</label>
                <div className="settings-radio-group">
                  {[
                    { value: 'public', label: '公开' },
                    { value: 'followers', label: '仅关注者' },
                    { value: 'private', label: '私密' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`radio-btn ${settings?.privacy?.cookingLogVisibility === opt.value ? 'active' : ''}`}
                      onClick={() => handlePrivacyChange('cookingLogVisibility', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="settings-section fade-in">
              <h2>数据导出</h2>
              <p className="settings-desc">
                导出你的个人数据，包括个人信息、食谱、收藏、烹饪记录和评论。
              </p>
              <div className="export-actions">
                <button className="settings-save-btn" onClick={handleExportJSON}>
                  📥 导出全部数据 (JSON)
                </button>
                <button className="settings-save-btn export-csv-btn" onClick={handleExportCSV}>
                  📊 导出收藏列表 (CSV)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}