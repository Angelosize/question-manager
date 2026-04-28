import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Sidebar: React.FC = () => {
  const location = useLocation()

  const menuItems = [
    { path: '/', label: '🏠 首页', icon: '🏠' },
    { path: '/questions', label: '📝 题目管理', icon: '📝' },
    { path: '/quiz', label: '🎯 智能组卷', icon: '🎯' },
    { path: '/wrong', label: '❌ 错题本', icon: '❌' },
    { path: '/stats', label: '📊 统计分析', icon: '📊' },
  ]

  return (
    <aside className="w-64 bg-white shadow-md">
      <nav className="p-4">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700">导航菜单</h2>
        </div>
        
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar