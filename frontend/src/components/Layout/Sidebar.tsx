import React from 'react';
import { Menu } from 'antd';
import {
  HomeOutlined,
  QuestionCircleOutlined,
  FormOutlined,
  BookOutlined,
  BarChartOutlined,
  ImportOutlined,
  ToolOutlined // 添加工具图标
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/questions',
      icon: <QuestionCircleOutlined />,
      label: '题目管理'
    },
    {
      key: '/quiz',
      icon: <FormOutlined />,
      label: '智能组卷'
    },
    {
      key: '/wrong-book',
      icon: <BookOutlined />,
      label: '错题本'
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '统计分析'
    },
    // 添加导入导出菜单项
    {
      key: '/import-export',
      icon: <ImportOutlined />,
      label: '导入导出'
    },
    { key: '/utils', icon: <ToolOutlined />, label: '小工具' },
  ];

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
      style={{ height: '100%', borderRight: 0 }}
    />
  );
};

export default Sidebar;