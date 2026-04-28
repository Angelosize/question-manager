import React from 'react'

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">全能题目管理器</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">v1.0.0</span>
        </div>
      </div>
    </header>
  )
}

export default Header