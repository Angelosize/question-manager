import React from 'react';
import { Button, Progress, Tag, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface Props {
  currentStep: number;   // 1-based
  totalSteps: number;
  mastery: 'learning' | 'mastered';
  onBack: () => void;
}

const LearnHeader: React.FC<Props> = ({ currentStep, totalSteps, mastery, onBack }) => {
  const percent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div className="flex justify-between items-center mb-3">
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack}>
          返回
        </Button>
        <span style={{ color: '#666', fontSize: 14 }}>
          第 {currentStep} / {totalSteps} 步
        </span>
        <Tag color={mastery === 'mastered' ? 'green' : 'orange'}>
          {mastery === 'mastered' ? '已掌握' : '学习中'}
        </Tag>
      </div>
      <Progress
        percent={percent}
        showInfo={false}
        strokeColor={mastery === 'mastered' ? '#52c41a' : '#1890ff'}
        size="small"
      />
    </div>
  );
};

export default LearnHeader;