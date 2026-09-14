import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Radio,
  Checkbox,
  Space,
  Progress,
  Divider,
  Typography,
  Input,
  Spin,
  Alert,
  Tag,
  Modal,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CheckOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { QuizQuestion, QuizAnswer } from '../../types';
import KatexRenderer from '../Latex/KatexRenderer';
import SimpleLatexToolbar from '../Latex/SimpleLatexToolbar';
import GeometryRenderer from '../Geometry/GeometryRenderer';

const { TextArea } = Input;
const { Title } = Typography;

interface QuizTakerProps {
  questions: QuizQuestion[];
  onSubmit: (answers: QuizAnswer[]) => void;
  isSubmitting?: boolean;
  submittingText?: string;        // ⭐ 新增：批改进度文字
  duration?: number;
  showTimer?: boolean;
}

const QuizTaker: React.FC<QuizTakerProps> = ({
  questions,
  onSubmit,
  isSubmitting = false,
  submittingText = '',          // ⭐ 新增
  duration = 0,
  showTimer = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [hasError, setHasError] = useState(false);
  const [showAnswerToolbar, setShowAnswerToolbar] = useState(false);

  const totalSeconds = (duration || 0) * 60;
  const [remaining, setRemaining] = useState<number>(totalSeconds);
  const [timeUp, setTimeUp] = useState(false);
  const submittedRef = useRef(false);
  const userAnswersRef = useRef(userAnswers);

  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (!showTimer || !duration || duration <= 0) return;
    if (timeUp || submittedRef.current) return;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duration, showTimer, timeUp]);

  useEffect(() => {
    if (!timeUp || submittedRef.current) return;
    submittedRef.current = true;

    Modal.warning({
      title: '考试时间到！',
      content: '系统已自动提交试卷。',
      okText: '查看结果',
      onOk: () => {
        handleSubmit(true);
      },
    });
    setTimeout(() => {
      handleSubmit(true);
    }, 1500);
  }, [timeUp]);

  useEffect(() => {
    console.log('📋 当前题目ID列表:', questions.map((q) => q.id));
  }, [questions]);

  useEffect(() => {
    if (!currentQuestion || !currentQuestion.id) {
      console.error('当前题目数据无效:', currentQuestion);
      setHasError(true);
    } else {
      setHasError(false);
    }
  }, [currentQuestion]);

  const handleAnswer = (answer: string) => {
    if (!currentQuestion) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const handleMultiSelect = (checkedValues: any[]) => {
    if (!currentQuestion) return;
    const answer = checkedValues.sort().join('');
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const handleLatexInsert = (latexCode: string) => {
    if (!currentQuestion) return;
    const currentAnswer = userAnswers[currentQuestion.id] || '';
    const newAnswer = currentAnswer + `$${latexCode}$`;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: newAnswer,
    }));
  };

  const renderWithLatex = (text: string) => {
    if (!text) return null;

    const parts: (string | { latex: string; displayMode: boolean })[] = [];
    let lastIndex = 0;
    const regex = /(\\\[([\s\S]*?)\\\])|(\\\(([\s\S]*?)\\\))|(\$([^$]+)\$)/g;
    let match;
    let hasLatexDelimiter = false;
    while ((match = regex.exec(text)) !== null) {
      hasLatexDelimiter = true;
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      if (match[1]) {
        parts.push({ latex: match[2], displayMode: true });
      } else if (match[3]) {
        parts.push({ latex: match[4], displayMode: false });
      } else if (match[5]) {
        parts.push({ latex: match[6], displayMode: false });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    if (!hasLatexDelimiter && text.includes('\\')) {
      return <KatexRenderer content={text} displayMode={false} />;
    }

    if (parts.length === 0) {
      const lines = text.split('\n');
      if (lines.length > 1) {
        return (
          <span>
            {lines.map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      }
      return <span>{text}</span>;
    }

    return parts.map((part, index) => {
      if (typeof part === 'string') {
        const lines = part.split('\n');
        if (lines.length > 1) {
          return (
            <span key={index}>
              {lines.map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      } else {
        return (
          <KatexRenderer
            key={index}
            content={part.latex}
            displayMode={part.displayMode}
          />
        );
      }
    });
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswerToolbar(false);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswerToolbar(false);
    }
  };

  const handleSubmit = (autoSubmit: boolean = false) => {
    const answers: QuizAnswer[] = questions
      .filter((q) => q && q.id)
      .map((q) => {
        const answer = userAnswersRef.current[q.id] || '';
        const fullScore = (q as any).score || 0;
        return {
          question_id: q.id,
          user_answer: answer,
          full_score: fullScore,
        } as QuizAnswer;
      });
    console.log('📝 最终提交的答案:', answers, autoSubmit ? '(自动提交)' : '');
    onSubmit(answers);
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    if (h > 0) return `${h}:${mm}:${ss}`;
    return `${mm}:${ss}`;
  };

  // ⭐ 提交中：显示进度文字
  if (isSubmitting) {
    return (
      <Card>
        <div className="text-center py-12">
          <Spin size="large" />
          <p className="mt-6 text-lg font-medium">
            {submittingText || '正在提交试卷，请稍候...'}
          </p>
          <p className="mt-2 text-gray-500 text-sm">
            批改需要 10-30 秒，请勿关闭页面
          </p>
        </div>
      </Card>
    );
  }

  if (hasError || !currentQuestion) {
    return (
      <Card>
        <Alert
          message="题目数据错误"
          description="无法加载题目数据，请重新生成试卷"
          type="error"
          showIcon
        />
        <div className="text-center mt-6">
          <Button type="primary" onClick={() => window.location.reload()}>
            重新加载页面
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <div className="flex justify-between mb-2 items-center">
          <span>进度</span>
          <Space>
            {showTimer && duration > 0 && (
              <Tag
                icon={<ClockCircleOutlined />}
                color={remaining <= 60 ? 'red' : remaining <= 300 ? 'orange' : 'blue'}
                style={{ fontSize: 16, padding: '4px 12px', fontWeight: 'bold' }}
              >
                {formatTime(remaining)}
              </Tag>
            )}
            <span>
              {currentIndex + 1} / {questions.length}
            </span>
          </Space>
        </div>
        <Progress percent={Math.round(progress)} showInfo={false} />
      </div>

      <Card className="mb-6">
        <Title level={4}>
          第 {currentIndex + 1} 题
          {(currentQuestion as any).score ? (
            <span style={{ fontSize: 14, color: '#888', marginLeft: 8 }}>
              （{(currentQuestion as any).score} 分）
            </span>
          ) : null}
        </Title>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          {renderWithLatex(currentQuestion.content || '题目内容加载中...')}
        </div>

        {(currentQuestion as any).drawing && (currentQuestion as any).drawing.elements?.length > 0 && (
          <div className="mb-4">
            <GeometryRenderer data={(currentQuestion as any).drawing} height={300} />
          </div>
        )}

        {currentQuestion.options && Object.keys(currentQuestion.options).length > 0 && (
          <>
            {currentQuestion.type === '多选题' ? (
              <Checkbox.Group
                onChange={handleMultiSelect}
                value={
                  userAnswers[currentQuestion.id]
                    ? userAnswers[currentQuestion.id].split('')
                    : []
                }
              >
                <Space direction="vertical">
                  {Object.entries(currentQuestion.options).map(([letter, text]) => (
                    <Checkbox key={letter} value={letter}>
                      <strong>{letter}.</strong> {renderWithLatex(text as string)}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            ) : (
              <Radio.Group
                onChange={(e) => handleAnswer(e.target.value)}
                value={userAnswers[currentQuestion.id]}
              >
                <Space direction="vertical">
                  {Object.entries(currentQuestion.options).map(([letter, text]) => (
                    <Radio key={letter} value={letter}>
                      <strong>{letter}.</strong> {renderWithLatex(text as string)}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            )}
          </>
        )}

        {(!currentQuestion.options || Object.keys(currentQuestion.options).length === 0) && (
          <div>
            <div className="mb-2">
              <Button
                size="small"
                type="dashed"
                onClick={() => setShowAnswerToolbar(!showAnswerToolbar)}
              >
                {showAnswerToolbar ? '隐藏' : '显示'} LaTeX工具栏
              </Button>
              {showAnswerToolbar && (
                <div className="mt-2">
                  <SimpleLatexToolbar onInsert={handleLatexInsert} />
                </div>
              )}
            </div>

            <TextArea
              placeholder="请输入您的答案（可使用LaTeX输入数学公式）..."
              value={userAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              rows={4}
              className="mt-2"
            />

            {userAnswers[currentQuestion.id] && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">预览:</div>
                {renderWithLatex(userAnswers[currentQuestion.id])}
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button
          icon={<LeftOutlined />}
          onClick={prevQuestion}
          disabled={currentIndex === 0}
        >
          上一题
        </Button>

        {currentIndex === questions.length - 1 ? (
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleSubmit(false)}
            size="large"
            loading={isSubmitting}
          >
            提交试卷
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<RightOutlined />}
            onClick={nextQuestion}
          >
            下一题
          </Button>
        )}
      </div>

      <Divider />
      <div className="flex flex-wrap gap-2">
        {questions.map((_, index) => (
          <Button
            key={index}
            type={index === currentIndex ? 'primary' : 'default'}
            shape="circle"
            size="small"
            onClick={() => {
              setCurrentIndex(index);
              setShowAnswerToolbar(false);
            }}
          >
            {index + 1}
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default QuizTaker;