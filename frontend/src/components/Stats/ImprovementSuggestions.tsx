import React from 'react';
import { Card, List, Tag, Alert } from 'antd';

interface SubjectDistribution {
  subject: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  by_subject?: SubjectDistribution[];
}

interface ImprovementSuggestionsProps {
  data: AnalyticsData | null | undefined;
}

interface SuggestionItem {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  content: string;
  actions: string[];
}

const ImprovementSuggestions: React.FC<ImprovementSuggestionsProps> = ({ data }) => {
  if (!data?.by_subject || data.by_subject.length === 0) {
    return null;
  }

  // 生成改进建议
  const generateSuggestions = (): SuggestionItem[] => {
    const suggestions: SuggestionItem[] = [];
    
    // 找出错误率最高的学科
    const weakestSubject = data.by_subject!.reduce((prev: SubjectDistribution, current: SubjectDistribution) => 
      (prev.percentage > current.percentage) ? prev : current
    );
    
    if (weakestSubject.percentage > 30) {
      suggestions.push({
        type: 'warning',
        title: `重点加强: ${weakestSubject.subject}`,
        content: `该学科错误率较高(${weakestSubject.percentage}%)，建议优先复习相关知识点`,
        actions: ['专项练习', '知识点梳理', '错题重做']
      });
    }
    
    // 总体建议
    suggestions.push({
      type: 'info',
      title: '学习策略建议',
      content: '基于您的错题分布，建议采用间隔重复法进行复习',
      actions: ['制定复习计划', '定期检测', '错题归类']
    });
    
    return suggestions;
  };

  const suggestions = generateSuggestions();

  return (
    <Card title="💡 学习改进建议" className="shadow-sm">
      <List
        itemLayout="vertical"
        dataSource={suggestions}
        renderItem={(item: SuggestionItem) => (
          <List.Item>
            <Alert
              message={item.title}
              description={
                <div>
                  <p>{item.content}</p>
                  <div className="mt-2">
                    {item.actions.map((action: string) => (
                      <Tag key={action} color="blue" className="mb-1">
                        {action}
                      </Tag>
                    ))}
                  </div>
                </div>
              }
              type={item.type}
              showIcon
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default ImprovementSuggestions;