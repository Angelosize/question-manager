import React, { useState } from 'react';
import { Card, Tag, Collapse, Button } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

interface Prerequisite {
  name: string;
  reason: string;
  explanation: string;
  test_question?: {
    content: string;
    answer: string;
  };
}

interface Props {
  prerequisites: Prerequisite[];
}

// ⭐ 单条小测：独立的展开状态，互不干扰
const TestQuestionBlock: React.FC<{ tq: Prerequisite['test_question'] }> = ({ tq }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  if (!tq || !tq.content) return null;

  return (
    <div className="mt-3 p-3 rounded bg-[var(--border-soft)]">
      <div className="text-sm text-[var(--text-primary)] mb-2">
        🧪 <strong>小测：</strong>
        {tq.content}
      </div>
      <Button
        size="small"
        icon={showAnswer ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        onClick={() => setShowAnswer(!showAnswer)}
      >
        {showAnswer ? '隐藏答案' : '看答案'}
      </Button>
      {showAnswer && tq.answer && (
        <div className="mt-2 text-sm text-[var(--text-primary)]">
          <strong>答案：</strong>
          {tq.answer}
        </div>
      )}
    </div>
  );
};

const PrerequisitesCard: React.FC<Props> = ({ prerequisites }) => {
  if (!prerequisites || prerequisites.length === 0) return null;

  return (
    <Card title="学这道题之前，你需要知道" style={{ marginBottom: 24 }}>
      <Collapse
        ghost
        items={prerequisites.map((p, i) => ({
          key: String(i),
          label: (
            <div className="flex items-center gap-2">
              <Tag color="orange">前置</Tag>
              <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
              <span className="text-xs text-[var(--text-muted)]">（{p.reason}）</span>
            </div>
          ),
          children: (
            <div>
              <div className="p-2 text-sm text-[var(--text-secondary)] bg-[var(--border-soft)] rounded">
                {p.explanation}
              </div>
              <TestQuestionBlock tq={p.test_question} />
            </div>
          ),
        }))}
      />
    </Card>
  );
};

export default PrerequisitesCard;