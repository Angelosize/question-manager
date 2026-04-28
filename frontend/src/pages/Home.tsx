import React from 'react';
import { Card, Row, Col, Statistic, Button, Space } from 'antd';
import { 
  BookOutlined, 
  FileTextOutlined, 
  BarChartOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuestionStore } from '../store/questionStore';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { questions, categories, aiStatus } = useQuestionStore();

  const stats = {
    totalQuestions: questions.length,
    subjects: categories.subjects.length,
    types: categories.types.length,
    aiAvailable: aiStatus.available
  };

  const quickActions = [
    {
      title: '题目管理',
      description: '添加、编辑、删除题目',
      icon: <BookOutlined />,
      path: '/questions',
      color: '#1890ff'
    },
    {
      title: '智能组卷',
      description: '根据条件生成试卷',
      icon: <FileTextOutlined />,
      path: '/quiz',
      color: '#52c41a'
    },
    {
      title: '错题本',
      description: '查看和管理错题',
      icon: <BarChartOutlined />,
      path: '/wrong',
      color: '#faad14'
    },
    {
      title: 'AI批改',
      description: '使用AI智能批改',
      icon: <RocketOutlined />,
      path: '/quiz',
      color: '#722ed1',
      disabled: !aiStatus.available
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* 统计信息 */}
      <Row gutter={16} className="mb-8">
        <Col span={6}>
          <Card>
            <Statistic
              title="总题目数"
              value={stats.totalQuestions}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="学科分类"
              value={stats.subjects}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="题型种类"
              value={stats.types}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="AI服务状态"
              value={stats.aiAvailable ? '可用' : '不可用'}
              valueStyle={{ color: stats.aiAvailable ? '#52c41a' : '#ff4d4f' }}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Card title="快速开始" className="mb-8">
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col key={index} xs={24} sm={12} lg={6}>
              <Card
                style={{ 
                  border: `2px solid ${action.color}20`,
                  background: `${action.color}08`
                }}
                hoverable
                onClick={() => !action.disabled && navigate(action.path)}
                className={action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              >
                <div className="text-center">
                  <div 
                    className="text-3xl mb-3" 
                    style={{ color: action.color }}
                  >
                    {action.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{action.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{action.description}</p>
                  <Button 
                    type="primary" 
                    size="small"
                    style={{ background: action.color, borderColor: action.color }}
                    disabled={action.disabled}
                  >
                    立即使用
                  </Button>
                  {action.disabled && (
                    <p className="text-xs text-red-500 mt-2">AI服务暂不可用</p>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 功能介绍 */}
      <Card title="系统功能">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div className="p-4">
              <h3 className="font-semibold mb-3">📚 题目管理</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>支持多种题型：选择题、填空题、解答题等</li>
                <li>完整的题目元数据管理</li>
                <li>批量导入导出功能</li>
                <li>智能搜索和筛选</li>
              </ul>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="p-4">
              <h3 className="font-semibold mb-3">🎯 智能组卷</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>按学科、题型、难度组卷</li>
                <li>自定义题目数量和分布</li>
                <li>智能题目推荐算法</li>
                <li>试卷模板管理</li>
              </ul>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="p-4">
              <h3 className="font-semibold mb-3">🤖 AI智能批改</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>集成 Ollama 本地AI模型</li>
                <li>实时答案验证和评分</li>
                <li>详细的分析和建议</li>
                <li>支持多种题型批改</li>
              </ul>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="p-4">
              <h3 className="font-semibold mb-3">📊 学习分析</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>学习进度跟踪</li>
                <li>错题统计和分析</li>
                <li>成绩趋势图表</li>
                <li>个性化学习建议</li>
              </ul>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Home;