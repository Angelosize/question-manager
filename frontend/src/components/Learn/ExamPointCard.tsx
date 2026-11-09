import React, { useState } from 'react';
import { Card, Button, Space, Tag, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface ExamPoint {
  title: string;
  chapter?: string;
  difficulty?: string;
  variants?: string[];
}

interface Props {
  examPoint: ExamPoint;
  wrongCount?: number;
}

const ExamPointCard: React.FC<Props> = ({ examPoint, wrongCount }) => {
  const [variantIdx, setVariantIdx] = useState(-1);

  const variants = examPoint.variants || [];
  const currentText = variantIdx < 0 ? examPoint.title : variants[variantIdx];

  const handleSwitch = () => {
    if (variants.length === 0) {
      message.info('暂无其他说法');
      return;
    }
    const next = (variantIdx + 1) % variants.length;
    setVariantIdx(next);
  };

  return (
    <Card
      title="这道题在考什么"
      style={{ marginBottom: 24 }}
      styles={{ header: { fontSize: 16, fontWeight: 600 } }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8,
          lineHeight: 1.5,
        }}
      >
        {currentText}
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2" style={{ marginTop: 12 }}>
        <Space size="small" wrap>
          {examPoint.chapter && <Tag color="blue">{examPoint.chapter}</Tag>}
          {examPoint.difficulty && <Tag color="orange">{examPoint.difficulty}</Tag>}
          {wrongCount !== undefined && wrongCount > 0 && (
            <Tag color="red">错过 {wrongCount} 次</Tag>
          )}
        </Space>

        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={handleSwitch}
          disabled={variants.length === 0}
        >
          换一种说法
        </Button>
      </div>

      {variantIdx >= 0 && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'rgba(82, 196, 26, 0.1)',
            border: '1px solid rgba(82, 196, 26, 0.3)',
            borderRadius: 6,
            fontSize: 14,
            color: 'var(--text-primary)',
          }}
        >
          💡 换个说法：{currentText}
          <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>
            （{variantIdx + 1} / {variants.length}）
          </span>
        </div>
      )}
    </Card>
  );
};

export default ExamPointCard;