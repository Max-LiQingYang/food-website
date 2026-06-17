import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer__inner">
        {/* Brand */}
        <div className="footer__section">
          <h3 className="footer__brand">🍳 美食食谱</h3>
          <p className="footer__desc">
            发现、收藏、分享你的美食创作。从家常小炒到精致甜点，汇聚万千风味，让每一餐都充满惊喜。
          </p>
          <div className="footer__social">
            <a href="#" className="footer__social-link" aria-label="微博">📱</a>
            <a href="#" className="footer__social-link" aria-label="微信">💬</a>
            <a href="#" className="footer__social-link" aria-label="小红书">📖</a>
            <a href="#" className="footer__social-link" aria-label="GitHub">🐙</a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer__section">
          <h4 className="footer__heading">快速链接</h4>
          <ul className="footer__links">
            <li><Link to="/">首页</Link></li>
            <li><Link to="/recommend">食材推荐</Link></li>
            <li><Link to="/rankings">排行榜</Link></li>
            <li><Link to="/challenges">挑战赛</Link></li>
          </ul>
        </div>

        {/* Browse */}
        <div className="footer__section">
          <h4 className="footer__heading">浏览</h4>
          <ul className="footer__links">
            <li><Link to="/search">搜索食谱</Link></li>
            <li><Link to="/tags">标签云</Link></li>
            <li><Link to="/ingredient-search">食材搜索</Link></li>
            <li><Link to="/tools">厨房工具</Link></li>
          </ul>
        </div>

        {/* Account */}
        <div className="footer__section">
          <h4 className="footer__heading">我的</h4>
          <ul className="footer__links">
            <li><Link to="/favorites">我的收藏</Link></li>
            <li><Link to="/collections">收藏夹</Link></li>
            <li><Link to="/shopping-list">购物清单</Link></li>
            <li><Link to="/settings">设置</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <span>&copy; {year} 美食食谱. All rights reserved.</span>
        <span className="footer__separator">·</span>
        <span>用心烹饪，用爱分享 ❤️</span>
      </div>
    </footer>
  )
}
