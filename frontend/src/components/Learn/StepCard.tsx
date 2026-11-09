import React, { useState } from 'react';
import { Card, Button, Space } from 'antd';
import { CheckOutlined, QuestionCircleOutlined } from '@ant-design/icons';

interface Step {
  index: number;
  title: string;
  content: string;
  hint?: string;
  variants?: string[];
}

interface Props {
  step: Step;
  understood: boolean;
  onUnderstood: () => void;
  active: boolean;
}

const StepCard: React.FC<Props> = ({ step, understood, onUnderstood, active }) => {
  const [shownVariants, setShownVariants] = useState<number[]>([]);
  const variants = step.variants || [];

  const handleNotGet = () => {
    if (shownVariants.length >= variants.length) return;
    setShownVariants([...shownVariants, shownVariants.length]);
  };

  const exhausted = shownVariants.length >= variants.length && variants.length > 0;

  return (
    <Card
      style={{
        marginBottom: 16,
        opacity: understood ? 0.6 : 1,
        borderLeft: active ? '4px solid #1890ff' : '4px solid var(--border-color)',
        transition: 'all 0.3s',
        background: 'var(--bg-card)',
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 12,
          color: understood ? '#52c41a' : 'var(--text-primary)',
        }}
      >
        {understood && <CheckOutlined style={{ marginRight: 8 }} />}
        第 {step.index} 步：{step.title}
      </div>

      <div
        style={{
          fontSize: 15,
          lineHeight: 1.8,
          color: 'var(--text-secondary)',
          whiteSpace: 'pre-wrap',
          marginBottom: 12,
        }}
      >
        {step.content}
      </div>

      {step.hint && (
        <div
          style={{
            background: 'rgba(250, 173, 20, 0.1)',
            border: '1px solid rgba(250, 173, 20, 0.3)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}
        >
          💡 提示：{step.hint}
        </div>
      )}

      {shownVariants.map((vi) => (
        <div
          key={vi}
          style={{
            marginTop: 10,
            padding: '10px 14px',
            background: 'rgba(24, 144, 255, 0.1)',
            border: '1px solid rgba(24, 144, 255, 0.3)',
            borderRadius: 6,
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--text-primary)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            换一种说法 {vi + 1}：
          </div>
          {variants[vi]}
        </div>
      ))}

      {exhausted && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}
        >
          💭 已经换了 {variants.length} 种说法了，要不要先看下一步，或者点击右下角的【?】？
        </div>
      )}

      {!understood && (
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" icon={<CheckOutlined />} onClick={onUnderstood}>
            我懂了
          </Button>
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={handleNotGet}
            disabled={variants.length === 0 || shownVariants.length >= variants.length}
          >
            没懂，换种讲法
          </Button>
        </Space>
      )}
    </Card>
  );
};

export default StepCard;