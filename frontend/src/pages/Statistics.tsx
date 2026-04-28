import React from 'react';
import { Card, Row, Col, Statistic, Progress, Alert, Spin } from 'antd';
import { useApi } from '../hooks/useApi';
import AnalyticsCharts from '../components/Stats/AnalyticsCharts';
import ImprovementSuggestions from '../components/Stats/ImprovementSuggestions';

interface SubjectDistribution {
  subject: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  total_wrong_questions: number;
  unique_wrong_questions: number;
  average_wrong_per_question: number;
  by_subject: SubjectDistribution[];
  by_question_type: any[];
  trend_last_30_days: any[];
  generated_at: string;
}

interface ApiResponse {
  success: boolean;
  data: AnalyticsData;
  error?: string;
  processing_time: number;
}

const Statistics: React.FC = () => {
  const { data: analytics, loading, error } = useApi<ApiResponse>('/api/stats/wrong-analytics/overview');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="加载统计分析中..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载错误"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  const data = analytics?.data;

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 学习统计分析</h1>
        <p className="text-gray-600">全面了解您的学习情况和进步趋势</p>
      </div>

      {/* 关键指标卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总错题数量"
              value={data?.total_wrong_questions || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix="📝"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="涉及学科"
              value={data?.by_subject?.length || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix="📚"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均错误率"
              value={data?.average_wrong_per_question || 0}
              precision={2}
              valueStyle={{ color: '#faad14' }}
              prefix="📈"
              suffix="次/题"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="唯一错题"
              value={data?.unique_wrong_questions || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix="🔍"
            />
          </Card>
        </Col>
      </Row>

      {/* 学科分布进度条 */}
      {data?.by_subject && data.by_subject.length > 0 && (
        <Card title="📚 学科错题分布" className="shadow-sm">
          <div className="space-y-3">
            {data.by_subject
              .sort((a: SubjectDistribution, b: SubjectDistribution) => b.percentage - a.percentage)
              .map((subject: SubjectDistribution, index: number) => (
                <div key={subject.subject} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{subject.subject}</span>
                    <span className="text-gray-600">
                      {subject.count}题 ({subject.percentage}%)
                    </span>
                  </div>
                  <Progress
                    percent={subject.percentage}
                    strokeColor={[
                      '#ff4d4f',
                      '#faad14',
                      '#52c41a',
                      '#1890ff',
                      '#722ed1'
                    ][index % 5]}
                    size="small"
                    showInfo={false}
                  />
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* 图表区域 */}
      <AnalyticsCharts data={data} />

      {/* 改进建议 */}
      <ImprovementSuggestions data={data} />

      {/* 数据更新时间 */}
      {data?.generated_at && (
        <div className="text-right text-sm text-gray-500">
          数据更新于: {new Date(data.generated_at).toLocaleString('zh-CN')}
        </div>
      )}
    </div>
  );
};

export default Statistics;