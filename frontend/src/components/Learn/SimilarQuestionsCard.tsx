import React from 'react';
import { Card, Tag } from 'antd';

interface SimilarQuestion {
  id: string;
  content: string;
  difficulty?: string;
  type?: string;
}

interface Props {
  questions: SimilarQuestion[];
  onGoTo: (id: string) => void;
}

const SimilarQuestionsCard: React.FC<Props> = ({ questions, onGoTo }) => {
  if (!questions || questions.length === 0) return null;

  return (
    <Card title="举一反三：和它像的题" style={{ marginBottom: 24 }}>
      <div className="flex flex-col gap-3">
        {questions.map((q) => (
          <div
            key={q.id}
            onClick={() => onGoTo(q.id)}
            className="p-3 border border-[var(--border-color)] rounded-lg cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all bg-[var(--bg-card)]"
          >
            {(q.type || q.difficulty) && (
              <div className="flex gap-2 mb-2">
                {q.type && <Tag color="blue">{q.type}</Tag>}
                {q.difficulty && <Tag color="orange">{q.difficulty}</Tag>}
              </div>
            )}
            <div className="text-sm text-[var(--text-primary)] line-clamp-2">
              {q.content}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default SimilarQuestionsCard;