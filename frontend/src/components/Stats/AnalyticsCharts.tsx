import React from 'react';
import { Card, Empty } from 'antd';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line
} from 'recharts';

interface SubjectDistribution {
  subject: string;
  count: number;
  percentage: number;
}

interface QuestionTypeDistribution {
  question_type: string;
  count: number;
  error_rate: number;
}

interface TrendDataPoint {
  date: string;
  count: number;
  subjects: Record<string, number>;
}

interface AnalyticsData {
  by_subject?: SubjectDistribution[];
  by_question_type?: QuestionTypeDistribution[];
  trend_last_30_days?: TrendDataPoint[];
}

// 修改接口定义，允许 undefined
interface AnalyticsChartsProps {
  data: AnalyticsData | null | undefined;  // 添加 undefined
}

const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9c74f', '#90be6d', '#fd7e14', '#6f42c1'];

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data }) => {
  if (!data) {
    return (
      <Card title="📈 数据图表" className="shadow-sm">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  // 准备饼图数据
  const pieData = data.by_subject?.map((subject: SubjectDistribution) => ({
    name: subject.subject,
    value: subject.count
  })) || [];

  // 准备柱状图数据
  const barData = data.by_question_type?.map((type: QuestionTypeDistribution) => ({
    name: type.question_type,
    错误数量: type.count,
    错误率: type.error_rate
  })) || [];

  // 准备趋势图数据
  const lineData = data.trend_last_30_days || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 学科分布饼图 */}
      <Card title="学科分布" className="shadow-sm">
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }: { name: string; percent: number }) => 
                  `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {pieData.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="暂无学科数据" />
        )}
      </Card>

      {/* 题型错误率柱状图 */}
      <Card title="题型错误统计" className="shadow-sm">
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="错误数量" fill="#ff6b6b" />
              <Bar dataKey="错误率" fill="#4ecdc4" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="暂无题型数据" />
        )}
      </Card>

      {/* 错误趋势折线图 */}
      <Card title="错误趋势 (近30天)" className="shadow-sm lg:col-span-2">
        {lineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#45b7d1"
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="暂无趋势数据" />
        )}
      </Card>
    </div>
  );
};

export default AnalyticsCharts;