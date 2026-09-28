import React from 'react';
import { Row, Col, Space, Tag, Tooltip } from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  BarChartOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  ArrowRightOutlined,
  ExperimentOutlined,
  FundOutlined,
  ToolOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../store/questionStore';
import { useDarkMode } from '../hooks/useDarkMode';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { questions, categories, aiStatus } = useQuestionStore();
  const [isDark, toggleDark] = useDarkMode();

  const stats = {
    totalQuestions: questions.length,
    subjects: categories.subjects.length,
    types: categories.types.length,
    aiAvailable: aiStatus.available,
  };

  const quickActions = [
    {
      title: '题目管理',
      description: '浏览、编辑、搜索全部题目',
      icon: <BookOutlined />,
      path: '/questions',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      glow: 'rgba(59, 130, 246, 0.4)',
      disabled: false,
    },
    {
      title: '智能组卷',
      description: '按条件一键生成试卷',
      icon: <FileTextOutlined />,
      path: '/quiz',
      gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
      glow: 'rgba(16, 185, 129, 0.4)',
      disabled: false,
    },
    {
      title: '错题本',
      description: '回顾错题，重点突破',
      icon: <BarChartOutlined />,
      path: '/wrong',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      glow: 'rgba(245, 158, 11, 0.4)',
      disabled: false,
    },
    {
      title: 'AI 批改',
      description: '秒批试卷，逐题分析',
      icon: <RocketOutlined />,
      path: '/quiz',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      glow: 'rgba(139, 92, 246, 0.4)',
      disabled: !aiStatus.available,
    },
  ];

  const features = [
    {
      icon: <BookOutlined />,
      title: '题目管理',
      color: '#3b82f6',
      items: ['多题型支持', '完整元数据', '批量导入导出', '智能搜索'],
    },
    {
      icon: <ExperimentOutlined />,
      title: 'AI 智能导入',
      color: '#8b5cf6',
      items: ['文本一键导入', '图片 OCR 识别', '自动分割题目', '学科智能归类'],
    },
    {
      icon: <ThunderboltOutlined />,
      title: 'AI 批改',
      color: '#10b981',
      items: ['实时逐题批改', '详细分析报告', '得分精准计算', '并发不卡顿'],
    },
    {
      icon: <TrophyOutlined />,
      title: '错题学习',
      color: '#f59e0b',
      items: ['错题自动归档', '考点拆解讲解', '分步引导学习', '费曼复述检测'],
    },
    {
      icon: <FundOutlined />,
      title: '数据分析',
      color: '#ec4899',
      items: ['错题统计', '学科分布', '年份对比', '改进建议'],
    },
    {
      icon: <ToolOutlined />,
      title: '小工具集',
      color: '#06b6d4',
      items: ['科学计算器', '函数绘图', '统计分析', '几何画板'],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* ==================== HERO 区 ==================== */}
      <div className="hero-section">
        {/* 主题切换 */}
        <Tooltip title={isDark ? '切换到浅色' : '切换到深色'}>
          <div className="theme-toggle" onClick={toggleDark}>
            {isDark ? <SunOutlined /> : <MoonOutlined />}
          </div>
        </Tooltip>

        {/* 背景装饰光斑 */}
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            AI 驱动 · 智能教育系统
          </div>

          <h1 className="hero-title">
            全能题目管理器
            <span className="hero-title-accent">QTG</span>
          </h1>

          <p className="hero-subtitle">
            从题目管理到智能批改，从错题分析到个性学习
            <br />
            一站式 AI 教育管理平台
          </p>

          <div className="hero-stats">
            <div className="glass-stat">
              <div className="glass-stat-icon" style={{ color: '#3b82f6' }}>
                <BookOutlined />
              </div>
              <div className="glass-stat-value">{stats.totalQuestions}</div>
              <div className="glass-stat-label">题目总数</div>
            </div>

            <div className="glass-stat">
              <div className="glass-stat-icon" style={{ color: '#8b5cf6' }}>
                <FileTextOutlined />
              </div>
              <div className="glass-stat-value">{stats.subjects}</div>
              <div className="glass-stat-label">学科分类</div>
            </div>

            <div className="glass-stat">
              <div className="glass-stat-icon" style={{ color: '#10b981' }}>
                <BarChartOutlined />
              </div>
              <div className="glass-stat-value">{stats.types}</div>
              <div className="glass-stat-label">题型种类</div>
            </div>

            <div className="glass-stat">
              <div
                className="glass-stat-icon"
                style={{ color: stats.aiAvailable ? '#10b981' : '#ef4444' }}
              >
                <RocketOutlined />
              </div>
              <div
                className="glass-stat-value"
                style={{ color: stats.aiAvailable ? '#10b981' : '#ef4444' }}
              >
                {stats.aiAvailable ? '在线' : '离线'}
              </div>
              <div className="glass-stat-label">AI 服务</div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 快速开始 ==================== */}
      <div>
        <div className="section-header">
          <h2 className="section-title">快速开始</h2>
          <span className="section-subtitle">选择一项，立即体验</span>
        </div>

        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col key={index} xs={24} sm={12} lg={6}>
              <div
                className={`quick-card ${action.disabled ? 'quick-card-disabled' : ''}`}
                style={
                  {
                    '--card-glow': action.glow,
                  } as React.CSSProperties
                }
                onClick={() => !action.disabled && navigate(action.path)}
              >
                <div className="quick-card-inner">
                  <div
                    className="quick-card-icon"
                    style={{ background: action.gradient }}
                  >
                    {action.icon}
                  </div>

                  <h3 className="quick-card-title">{action.title}</h3>
                  <p className="quick-card-desc">{action.description}</p>

                  <div className="quick-card-arrow">
                    {action.disabled ? (
                      <Tag color="error">AI 不可用</Tag>
                    ) : (
                      <ArrowRightOutlined />
                    )}
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* ==================== 系统功能 ==================== */}
      <div>
        <div className="section-header">
          <h2 className="section-title">系统功能</h2>
          <span className="section-subtitle">六大核心能力，覆盖教学全流程</span>
        </div>

        <Row gutter={[16, 16]}>
          {features.map((feature, index) => (
            <Col key={index} xs={24} sm={12} lg={8}>
              <div className="feature-card">
                <div
                  className="feature-icon"
                  style={{
                    color: feature.color,
                    background: `${feature.color}15`,
                  }}
                >
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <div className="feature-items">
                  {feature.items.map((item, i) => (
                    <span key={i} className="feature-tag">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* ==================== 底部 ==================== */}
      <div className="footer-note">
        <Space split="·">
          <span>全能题目管理器 v5.1</span>
          <span>Powered by 智谱 GLM</span>
          <span>© 2026</span>
        </Space>
      </div>
    </div>
  );
};

export default Home;