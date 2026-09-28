import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Button, message } from 'antd';
import { RedoOutlined } from '@ant-design/icons';
import LearnHeader from '../components/Learn/LearnHeader';
import QuestionCard from '../components/Learn/QuestionCard';
import ExamPointCard from '../components/Learn/ExamPointCard';
import StepCard from '../components/Learn/StepCard';
import FeynmanInput from '../components/Learn/FeynmanInput';
import { apiClient } from '../api/client';

interface LearningData {
  exam_point: {
    title: string;
    chapter?: string;
    difficulty?: string;
    variants?: string[];
  };
  prerequisites?: any[];
  steps: Array<{
    index: number;
    title: string;
    content: string;
    hint?: string;
    variants?: string[];
  }>;
  feynman_prep?: {
    key_points?: string[];
    common_mistakes?: string[];
  };
}

interface QuestionInfo {
  id: string;
  subject?: string;
  type?: string;
  difficulty?: string;
  content: string;
  options?: Record<string, string>;
  answer?: string;
}

const Learn: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [data, setData] = useState<LearningData | null>(null);
  const [question, setQuestion] = useState<QuestionInfo | null>(null);   // ⭐ 新增
  const [error, setError] = useState<string | null>(null);
  const [wrongCount, setWrongCount] = useState<number | undefined>(undefined);

  const [currentStep, setCurrentStep] = useState(1);
  const [understoodSteps, setUnderstoodSteps] = useState<Set<number>>(new Set());
  const [mastery, setMastery] = useState<'learning' | 'mastered'>('learning');

  const pollRef = useRef<number | null>(null);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!questionId) return;

    // 无条件清理旧轮询
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    // 切题时重置状态
    setData(null);
    setQuestion(null);
    setPreparing(false);
    setError(null);
    setCurrentStep(1);
    setUnderstoodSteps(new Set());
    setMastery('learning');

    // 防重复加载
    if (loadedRef.current === questionId) return;
    loadedRef.current = questionId;

    loadAll(questionId);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  const loadAll = async (qid: string) => {
    setLoading(true);
    setError(null);

    // ⭐ 并行：拉题目详情（用于显示原题）
    apiClient
      .getQuestion(qid)
      .then((q) => {
        setQuestion(q as QuestionInfo);
      })
      .catch((e) => {
        console.warn('拉取题目失败', e);
      });

    // ⭐ 拉错题次数（可选）
    apiClient
      .getWrongQuestions()
      .then((list) => {
        const wq = (list || []).find((w: any) => w.question_id === qid);
        if (wq?.wrong_count) setWrongCount(wq.wrong_count);
      })
      .catch(() => {
        // 忽略
      });

    // 读缓存
    try {
      const res = await apiClient.getLearningCache(qid);
      if (res.cached && res.data) {
        setData(res.data);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('读缓存失败', e);
    }

    // 没缓存 → 触发预热 + 轮询
    setPreparing(true);
    try {
      await apiClient.warmupLearning(qid);
      pollUntilReady(qid);
    } catch (e: any) {
      setError(e.message || '预热失败');
      setPreparing(false);
      setLoading(false);
    }
  };

  const pollUntilReady = (qid: string) => {
    let attempts = 0;
    const maxAttempts = 72;
    pollRef.current = window.setInterval(async () => {
      if (loadedRef.current !== qid) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }

      attempts++;
      try {
        const res = await apiClient.getLearningCache(qid);
        if (res.cached && res.data) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setData(res.data);
          setPreparing(false);
          setLoading(false);
          return;
        }
      } catch {
        // ignore
      }
      if (attempts >= maxAttempts) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setError('生成超时，请稍后重试');
        setPreparing(false);
        setLoading(false);
      }
    }, 2500);
  };

  const handleUnderstood = (idx: number) => {
    const next = new Set(understoodSteps);
    next.add(idx);
    setUnderstoodSteps(next);

    if (data && idx < data.steps.length) {
      setCurrentStep(idx + 1);
    } else if (data && idx === data.steps.length) {
      setMastery('mastered');
      apiClient.updateLearningRecord(questionId!, { status: 'mastered' }).catch(() => {});
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleNext = () => {
    if (data && currentStep < data.steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStuck = () => {
    const el = document.getElementById(`step-${currentStep}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    message.info('往下看，AI 已经换了一种讲法');
  };

  if (loading || preparing) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        {/* ⭐ 准备中就先把原题显示出来，用户不用干等 */}
        {question && (
          <div style={{ marginTop: 16 }}>
            <QuestionCard question={question} wrongCount={wrongCount} />
          </div>
        )}

        <div className="flex justify-center items-center h-64 flex-col gap-4">
          <Spin size="large" />
          <div style={{ color: '#1890ff', fontSize: 14 }}>
            {preparing
              ? '正在为你准备学习内容……（首次约需 30-60 秒）'
              : '加载中……'}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {question && (
          <div style={{ marginBottom: 24 }}>
            <QuestionCard question={question} wrongCount={wrongCount} />
          </div>
        )}
        <Result
          status="warning"
          title="学习内容加载失败"
          subTitle={error || '请稍后重试'}
          extra={
            <Button
              type="primary"
              icon={<RedoOutlined />}
              onClick={() => {
                loadedRef.current = null;
                questionId && loadAll(questionId);
              }}
            >
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const steps = data.steps || [];
  const totalSteps = steps.length;

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      <LearnHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        mastery={mastery}
        onBack={() => navigate(-1)}
      />

      {/* ⭐ 原题卡片 */}
      {question && (
        <div style={{ marginTop: 24 }}>
          <QuestionCard question={question} wrongCount={wrongCount} />
        </div>
      )}

      <ExamPointCard examPoint={data.exam_point} wrongCount={wrongCount} />

      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>一步步来</h3>
        {steps.map((s) => (
          <div key={s.index} id={`step-${s.index}`}>
            <StepCard
              step={s}
              understood={understoodSteps.has(s.index)}
              onUnderstood={() => handleUnderstood(s.index)}
              active={currentStep === s.index}
            />
          </div>
        ))}
      </div>

      <FeynmanInput
        questionId={questionId!}
        onVerdict={(verdict) => {
          if (verdict.includes('讲清楚')) {
            setMastery('mastered');
            apiClient
              .updateLearningRecord(questionId!, { status: 'mastered' })
              .catch(() => {});
          }
        }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <Button onClick={handlePrev} disabled={currentStep <= 1}>
          上一步
        </Button>
        <Button type="dashed" onClick={handleStuck}>
          我卡住了
        </Button>
        <Button
          type="primary"
          onClick={handleNext}
          disabled={!data || currentStep >= totalSteps}
        >
          下一步
        </Button>
      </div>
    </div>
  );
};

export default Learn;