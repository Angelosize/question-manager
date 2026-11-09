import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, message, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  BookOutlined,
  FileTextOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  AreaChartOutlined,
  ImportOutlined,
  ToolOutlined,
  RocketOutlined,
  TrophyOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // ===== 分组菜单 =====
  const menuItems = [
    {
      type: 'group' as const,
      label: '核心',
      children: [
        { key: '/', icon: <HomeOutlined />, label: '首页' },
        { key: '/questions', icon: <BookOutlined />, label: '题目管理' },
        { key: '/papers', icon: <FileTextOutlined />, label: '卷子管理' },
        { key: '/quiz', icon: <RocketOutlined />, label: '智能组卷' },
      ],
    },
    {
      type: 'group' as const,
      label: '学习',
      children: [
        { key: '/wrong', icon: <TrophyOutlined />, label: '错题本' },
        { key: '/stats', icon: <FundOutlined />, label: '统计分析' },
        { key: '/paper-compare', icon: <AreaChartOutlined />, label: '卷子对比' },
      ],
    },
    {
      type: 'group' as const,
      label: '工具',
      children: [
        { key: '/import-export', icon: <ImportOutlined />, label: '导入导出' },
        { key: '/utils', icon: <ToolOutlined />, label: '小工具' },
      ],
    },
  ];

  // ===== 计算选中项（兼容子路径） =====
  const allKeys = menuItems.flatMap((g) => g.children?.map((c) => c.key) || []);
  const selectedKey = (() => {
    const path = location.pathname;
    if (path === '/') return '/';
    const matched = allKeys
      .filter((k) => k !== '/' && path.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];
    return matched || path;
  })();

  // ===== 当前页面标题 =====
  const currentTitle =
    menuItems.flatMap((g) => g.children || []).find((c) => c.key === selectedKey)
      ?.label || '全能题目管理器';

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user ? `欢迎, ${user.username}` : '未登录',
      disabled: true,
    },
    { key: 'settings', icon: <SettingOutlined />, label: '设置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ];

  const handleMenuClick = ({ key }: { key: string }) => navigate(key);

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'logout':
        logout();
        message.success('已退出登录');
        navigate('/login', { replace: true });
        break;
      case 'settings':
        message.info('设置功能开发中');
        break;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        collapsedWidth={80}
        className="qtg-sider"
      >
        {/* ===== Logo 区 ===== */}
        <div className="qtg-logo">
          <div className="qtg-logo-badge">QTG</div>
          {!collapsed && (
            <div className="qtg-logo-text">
              <div className="qtg-logo-title">全能题目管理器</div>
              <div className="qtg-logo-sub">AI EDUCATION</div>
            </div>
          )}
        </div>

        {/* ===== 菜单 ===== */}
        <div className="qtg-menu-wrapper">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={handleMenuClick}
            className="qtg-menu"
          />
        </div>

        {/* ===== 底部：用户 + 折叠 ===== */}
        <div className="qtg-sider-footer">
          {!collapsed && user && (
            <div className="qtg-user-info">
              <Avatar size={26} icon={<UserOutlined />} />
              <span className="qtg-username">{user.username}</span>
            </div>
          )}
          <Tooltip title={collapsed ? '展开' : '收起'} placement="right">
            <button
              className="qtg-collapse-btn"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>
      </Sider>

      <Layout>
        <Header className="qtg-header">
          <div className="qtg-header-left">
            <h2 className="qtg-header-title">{currentTitle}</h2>
          </div>
          <div className="qtg-header-right">
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
            >
              <Avatar
                size="default"
                icon={<UserOutlined />}
                style={{ cursor: 'pointer' }}
              />
            </Dropdown>
          </div>
        </Header>

        <Content className="qtg-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;