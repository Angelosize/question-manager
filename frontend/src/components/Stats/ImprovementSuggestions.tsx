import React from 'react';
import { Card, List, Button, Space, Empty } from 'antd';
import {
  ExperimentOutlined,
  BulbOutlined,
  RedoOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface SubjectDistribution {
  subject: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  by_subject?: SubjectDistribution[];
  by_question_type?: any[];
  total_wrong_questions?: number;
}

interface ImprovementSuggestionsProps {
  data: AnalyticsData | null | undefined;
}

interface ActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  tooltip?: string;
}

interface SuggestionItem {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  content: string;
  actions: ActionItem[];
}

const ImprovementSuggestions: React.FC<ImprovementSuggestionsProps> = ({ data }) => {
  const navigate = useNavigate();

  if (!data?.by_subject || data.by_subject.length === 0) {
    return (
      <Card title="💡 学习改进建议" className="shadow-sm">
        <Empty description="暂无足够数据生成建议，请先做几道题吧" />
      </Card>
    );
  }

  // ⭐ 生成建议，每个按钮带路由
  const generateSuggestions = (): SuggestionItem[] => {
    const suggestions: SuggestionItem[] = [];

    // 找出错误率最高的学科
    const weakestSubject = data.by_subject!.reduce(
      (prev: SubjectDistribution, current: SubjectDistribution) =>
        prev.percentage > current.percentage ? prev : current
    );

    const subject = weakestSubject.subject;

    if (weakestSubject.percentage > 30) {
      suggestions.push({
        type: 'warning',
        title: `重点加强：${subject}`,
        content: `该学科错误率较高（${weakestSubject.percentage}%），建议优先复习相关知识点。`,
        actions: [
          {
            key: 'quiz',
            label: '专项练习',
            icon: <ExperimentOutlined />,
            route: `/quiz?subject=${encodeURIComponent(subject)}&mode=subject`,
            tooltip: `进入智能组卷，预选「${subject}」`,
          },
          {
            key: 'questions',
            label: '知识点梳理',
            icon: <BulbOutlined />,
            route: `/questions?subject=${encodeURIComponent(subject)}`,
            tooltip: `查看「${subject}」所有题目`,
          },
          {
            key: 'wrong',
            label: '错题重做',
            icon: <RedoOutlined />,
            route: `/wrong?subject=${encodeURIComponent(subject)}`,
            tooltip: `查看「${subject}」错题，标记掌握或重做`,
          },
        ],
      });
    }

    // 总体建议
    suggestions.push({
      type: 'info',
      title: '学习策略建议',
      content: '基于您的错题分布，建议采用间隔重复法进行复习：当天 → 3 天后 → 1 周后 → 2 周后。',
      actions: [
        {
          key: 'wrong',
          label: '制定复习计划',
          icon: <CalendarOutlined />,
          route: `/wrong`,
          tooltip: '进入错题本，查看所有待复习错题',
        },
        {
          key: 'quiz',
          label: '定期检测',
          icon: <CheckCircleOutlined />,
          route: `/quiz`,
          tooltip: '进入智能组卷，随机抽题检测',
        },
        {
          key: 'wrong-tag',
          label: '错题归类',
          icon: <TagsOutlined />,
          route: `/wrong`,
          tooltip: '进入错题本，按学科/题型查看',
        },
      ],
    });

    return suggestions;
  };

  const suggestions = generateSuggestions();

  const handleActionClick = (action: ActionItem) => {
    navigate(action.route);
  };

  return (
    <Card title="💡 学习改进建议" className="shadow-sm">
      <List
        itemLayout="vertical"
        dataSource={suggestions}
        renderItem={(item: SuggestionItem) => {
          // 根据类型设定背景色
          const bgColor =
            item.type === 'warning' ? '#fffbe6'
            : item.type === 'error' ? '#fff2f0'
            : item.type === 'success' ? '#f6ffed'
            : '#e6f7ff';
          const borderColor =
            item.type === 'warning' ? '#ffe58f'
            : item.type === 'error' ? '#ffccc7'
            : item.type === 'success' ? '#b7eb8f'
            : '#91d5ff';
          const iconMap = {
            warning: '⚠️',
            error: '❌',
            success: '✅',
            info: 'ℹ️',
          };

          return (
            <List.Item>
              <div
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {iconMap[item.type]} {item.title}
                </div>
                <div style={{ color: '#555', marginBottom: 12, fontSize: 13 }}>
                  {item.content}
                </div>
                <Space wrap>
                  {item.actions.map((action) => (
                    <Button
                      key={action.key}
                      size="small"
                      type="primary"
                      ghost
                      icon={action.icon}
                      title={action.tooltip}
                      onClick={() => handleActionClick(action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Space>
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default ImprovementSuggestions;