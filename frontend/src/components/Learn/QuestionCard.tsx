import React, { useState } from 'react';
import { Card, Button, Tag, Space } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import KatexRenderer from '../Latex/KatexRenderer';

interface Props {
  question: {
    id: string;
    subject?: string;
    type?: string;
    difficulty?: string;
    content: string;
    options?: Record<string, string>;
    answer?: string;
  };
  wrongCount?: number;
}

const QuestionCard: React.FC<Props> = ({ question, wrongCount }) => {
  const [showAnswer, setShowAnswer] = useState(false);

  const renderWithLatex = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\$[^$]+\$)/);
    return parts.map((part, i) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const latex = part.slice(1, -1);
        return <KatexRenderer key={i} content={latex} />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const options = question.options || {};
  const hasOptions = Object.keys(options).length > 0;

  return (
    <Card
      title={
        <Space>
          <span>你要学的题</span>
          {wrongCount !== undefined && wrongCount > 0 && (
            <Tag color="red">错过 {wrongCount} 次</Tag>
          )}
        </Space>
      }
      style={{ marginBottom: 24 }}
      styles={{ header: { fontSize: 16, fontWeight: 600 } }}
    >
      {/* 元信息 */}
      <Space size="small" wrap style={{ marginBottom: 12 }}>
        {question.subject && <Tag color="blue">{question.subject}</Tag>}
        {question.type && <Tag color="green">{question.type}</Tag>}
        {question.difficulty && <Tag color="orange">{question.difficulty}</Tag>}
      </Space>

      {/* 题干 */}
      <div
        style={{
          fontSize: 16,
          lineHeight: 1.9,
          color: '#1a1a1a',
          whiteSpace: 'pre-wrap',
          marginBottom: 16,
        }}
      >
        {renderWithLatex(question.content)}
      </div>

      {/* 选项 */}
      {hasOptions && (
        <div
          style={{
            background: '#fafafa',
            borderRadius: 6,
            padding: '12px 16px',
            marginBottom: 16,
          }}
        >
          {Object.entries(options).map(([k, v]) => (
            <div
              key={k}
              style={{ fontSize: 15, lineHeight: 2, display: 'flex', gap: 8 }}
            >
              <strong style={{ minWidth: 20 }}>{k}.</strong>
              <span>{renderWithLatex(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 答案（可折叠） */}
      {question.answer && (
        <div>
          <Button
            size="small"
            icon={showAnswer ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer ? '隐藏答案' : '看一眼答案'}
          </Button>
          {showAnswer && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 14px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 6,
                fontSize: 15,
                color: '#389e0d',
                lineHeight: 1.7,
              }}
            >
              <strong>正确答案：</strong>
              {renderWithLatex(question.answer)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default QuestionCard;