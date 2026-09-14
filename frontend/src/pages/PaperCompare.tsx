import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Spin,
  Alert,
  Table,
  Tabs,
  Space,
  Tag,
  Typography,
} from 'antd';
import { apiClient } from '../api/client';
import { PaperCompareData } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';

const { Title, Text } = Typography;
const { Option } = Select;

// 颜色盘
const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9c74f', '#90be6d', '#fd7e14', '#6f42c1'];

const PaperCompare: React.FC = () => {
  const [papers, setPapers] = useState<string[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaperCompareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaperList();
  }, []);

  useEffect(() => {
    if (selectedPaper) {
      loadCompareData(selectedPaper);
    }
  }, [selectedPaper]);

  const loadPaperList = async () => {
    try {
      const list = await apiClient.listPaperNames();
      setPapers(list);
      if (list.length > 0) setSelectedPaper(list[0]);
    } catch (e) {
      console.error('加载卷子列表失败', e);
    }
  };

  const loadCompareData = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getPaperCompare(name);
      setData(result);
    } catch (e: any) {
      setError(e.message || '加载对比数据失败');
    } finally {
      setLoading(false);
    }
  };

  const onPaperChange = (value: string) => {
    setSelectedPaper(value);
  };

  // 准备热力图数据（用表格展示，每行一个年份，列为知识点）
  const renderHeatmap = () => {
    if (!data) return null;
    const { heatmap } = data;
    const years = heatmap.years;
    const kps = heatmap.knowledge_points;
    if (kps.length === 0) return <div>暂无知识点数据</div>;

    // 计算最大频次用于颜色映射
    const allValues = heatmap.data.flatMap(row => kps.map(kp => row[kp] || 0));
    const maxVal = Math.max(1, ...allValues);

    const getColor = (value: number) => {
      if (value === 0) return '#f0f0f0';
      const intensity = value / maxVal;
      const r = 255 - Math.round(intensity * 200);
      const g = 255 - Math.round(intensity * 150);
      const b = 255 - Math.round(intensity * 100);
      return `rgb(${r}, ${g}, ${b})`;
    };

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', backgroundColor: '#fafafa', border: '1px solid #e8e8e8' }}>年份</th>
              {kps.map(kp => (
                <th key={kp} style={{ padding: '6px 8px', backgroundColor: '#fafafa', border: '1px solid #e8e8e8', minWidth: '80px' }}>
                  {kp}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.data.map((row, idx) => (
              <tr key={idx}>
                <td style={{ padding: '6px 8px', border: '1px solid #e8e8e8', fontWeight: 'bold' }}>
                  {row.year}
                </td>
                {kps.map(kp => {
                  const val = row[kp] || 0;
                  return (
                    <td
                      key={kp}
                      style={{
                        padding: '6px 8px',
                        border: '1px solid #e8e8e8',
                        backgroundColor: getColor(val),
                        textAlign: 'center',
                        color: val > maxVal * 0.5 ? '#fff' : '#333'
                      }}
                    >
                      {val > 0 ? val : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
          颜色深浅表示该知识点在该年份出现的次数
        </div>
      </div>
    );
  };

  // 准备折线图数据：知识点频次变化
  const renderLineChart = () => {
    if (!data) return null;
    const { kp_stats, years } = data;
    // 获取前8个出现最频繁的知识点
    const allKps = new Set<string>();
    Object.values(kp_stats).forEach(kpMap => Object.keys(kpMap).forEach(k => allKps.add(k)));
    const sortedKps = Array.from(allKps).sort((a, b) => {
      const totalA = Object.values(kp_stats).reduce((sum, m) => sum + (m[a] || 0), 0);
      const totalB = Object.values(kp_stats).reduce((sum, m) => sum + (m[b] || 0), 0);
      return totalB - totalA;
    }).slice(0, 8);

    const chartData = years.map(year => {
      const row: any = { year };
      sortedKps.forEach(kp => {
        row[kp] = kp_stats[year]?.[kp] || 0;
      });
      return row;
    });

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {sortedKps.map((kp, idx) => (
            <Line key={kp} type="monotone" dataKey={kp} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // 题型分布柱状图
  const renderTypeBar = () => {
    if (!data) return null;
    const { type_stats, years } = data;
    const allTypes = new Set<string>();
    Object.values(type_stats).forEach(tMap => Object.keys(tMap).forEach(t => allTypes.add(t)));
    const types = Array.from(allTypes);
    const chartData = years.map(year => {
      const row: any = { year };
      types.forEach(t => {
        row[t] = type_stats[year]?.[t] || 0;
      });
      return row;
    });

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {types.map((t, idx) => (
            <Bar key={t} dataKey={t} stackId="a" fill={COLORS[idx % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // 表格展示各年份详细信息
  const renderTable = () => {
    if (!data) return null;
    const { years, kp_stats, type_stats } = data;
    // 收集所有知识点
    const allKps = new Set<string>();
    Object.values(kp_stats).forEach(m => Object.keys(m).forEach(k => allKps.add(k)));
    
    const columns = [
      { title: '年份', dataIndex: 'year', key: 'year', width: 80 },
      { title: '总题数', dataIndex: 'total', key: 'total', width: 80 },
      { 
        title: '题型分布', 
        dataIndex: 'types', 
        key: 'types', 
        render: (val: Record<string, number>) => (
          <Space size="small">
            {Object.entries(val).map(([t, count]) => (
              <Tag key={t}>{t}: {count}</Tag>
            ))}
          </Space>
        )
      },
      { 
        title: '主要知识点', 
        dataIndex: 'top_kps', 
        key: 'top_kps', 
        render: (val: string[]) => (
          <Space size="small">
            {val.map((kp: string) => <Tag color="blue" key={kp}>{kp}</Tag>)}
          </Space>
        )
      },
    ];

    const dataSource = years.map(year => {
      const kpMap = kp_stats[year] || {};
      const sortedKps = Object.entries(kpMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kp]) => kp);
      return {
        key: year,
        year,
        total: Object.values(kpMap).reduce((a, b) => a + b, 0),
        types: type_stats[year] || {},
        top_kps: sortedKps
      };
    });

    return <Table columns={columns} dataSource={dataSource} pagination={false} />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="加载对比数据..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="加载失败" description={error} type="error" showIcon />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>📊 卷子年份对比分析</Title>
        <Select
          placeholder="选择卷子"
          style={{ width: 300 }}
          value={selectedPaper}
          onChange={onPaperChange}
        >
          {papers.map(name => (
            <Option key={name} value={name}>{name}</Option>
          ))}
        </Select>
        {data && (
          <Text type="secondary" style={{ marginLeft: 16 }}>
            共 {data.total_questions} 道题，{data.years.length} 个年份
          </Text>
        )}
      </div>

      {data && (
        <Tabs defaultActiveKey="heatmap">
          <Tabs.TabPane tab="🔥 热力图" key="heatmap">
            <Card title="知识点出现热力图 (年份 × 知识点)" className="mb-4">
              {renderHeatmap()}
            </Card>
          </Tabs.TabPane>
          <Tabs.TabPane tab="📈 知识点趋势" key="trend">
            <Card title="主要知识点出现频次变化" className="mb-4">
              {renderLineChart()}
            </Card>
          </Tabs.TabPane>
          <Tabs.TabPane tab="📊 题型分布" key="types">
            <Card title="各年份题型分布 (堆叠柱状图)" className="mb-4">
              {renderTypeBar()}
            </Card>
          </Tabs.TabPane>
          <Tabs.TabPane tab="📋 详细数据" key="table">
            <Card title="逐年汇总表" className="mb-4">
              {renderTable()}
            </Card>
          </Tabs.TabPane>
        </Tabs>
      )}
    </div>
  );
};

export default PaperCompare;