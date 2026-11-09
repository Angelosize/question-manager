import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Button, message, FloatButton, Modal, Input } from 'antd';
import { RedoOutlined, QuestionCircleOutlined, SendOutlined } from '@ant-design/icons';
import LearnHeader from '../components/Learn/LearnHeader';
import QuestionCard from '../components/Learn/QuestionCard';
import ExamPointCard from '../components/Learn/ExamPointCard';
import StepCard from '../components/Learn/StepCard';
import FeynmanInput from '../components/Learn/FeynmanInput';
import PrerequisitesCard from '../components/Learn/PrerequisitesCard';
import SimilarQuestionsCard from '../components/Learn/SimilarQuestionsCard';
import { apiClient } from '../api/client';

interface LearningData {
  exam_point: any;
  prerequisites?: any[];
  steps: any[];
  feynman_prep?: any;
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

// ⭐ 学习相关请求集中封装：将来上 Vercel+Render 改 baseURL 只改这里
const learnApi = {
  getSimilar: async (qid: string) => {
    const res = await fetch(`/api/learn/similar/${qid}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  stuck: async (payload: {
    question_id: string;
    step_content: string;
    confusion: string;
  }) => {
    const res = await fetch('/api/learn/stuck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};

const Learn: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [data, setData] = useState<LearningData | null>(null);
  const [question, setQuestion] = useState<QuestionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wrongCount, setWrongCount] = useState<number | undefined>(undefined);

  const [understoodSteps, setUnderstoodSteps] = useState<Set<number>>(new Set());
  const [mastery, setMastery] = useState<'learning' | 'mastered'>('learning');

  // 同类题
  const [similarQuestions, setSimilarQuestions] = useState<any[]>([]);

  // 卡住了 Modal
  const [stuckVisible, setStuckVisible] = useState(false);
  const [stuckText, setStuckText] = useState('');
  const [stuckAnswer, setStuckAnswer] = useState('');
  const [stuckLoading, setStuckLoading] = useState(false);

  const pollRef = useRef<number | null>(null);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!questionId) return;

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    setData(null);
    setQuestion(null);
    setPreparing(false);
    setError(null);
    setUnderstoodSteps(new Set());
    setMastery('learning');
    setSimilarQuestions([]);

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

    apiClient
      .getQuestion(qid)
      .then((q) => setQuestion(q as QuestionInfo))
      .catch((e) => console.warn('拉取题目失败', e));

    apiClient
      .getWrongQuestions()
      .then((list) => {
        const wq = (list || []).find((w: any) => w.question_id === qid);
        if (wq?.wrong_count) setWrongCount(wq.wrong_count);
      })
      .catch(() => {});

    // 拉取同类题（失败不影响主流程）
    learnApi
      .getSimilar(qid)
      .then((res) => setSimilarQuestions(res.data || []))
      .catch((e) => console.warn('拉取同类题失败', e));

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
      } catch {}

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

    if (data && next.size === data.steps.length) {
      setMastery('mastered');
      apiClient.updateLearningRecord(questionId!, { status: 'mastered' }).catch(() => {});
      message.success('太棒了！你已经学完了所有步骤');
    }
  };

  // ⭐ 当前正在学的步骤（第一个没打勾的；如果全打勾了取最后一步）
  const getCurrentStep = () => {
    if (!data?.steps || data.steps.length === 0) return null;
    const firstUnlearned = data.steps.find((s: any) => !understoodSteps.has(s.index));
    return firstUnlearned || data.steps[data.steps.length - 1];
  };

  const handleStuckSubmit = async () => {
    if (!stuckText.trim()) return;
    const step = getCurrentStep();
    if (!step) {
      message.warning('还没有可参考的步骤，请稍后重试');
      return;
    }

    // ⭐ 传完整上下文：第X步、标题、正文、提示
    const stepContent = [
      `第 ${step.index} 步「${step.title}」`,
      step.content,
      step.hint ? `（提示：${step.hint}）` : '',
    ]
      .filter(Boolean)
      .join('\n');

    setStuckLoading(true);
    try {
      const res = await learnApi.stuck({
        question_id: questionId!,
        step_content: stepContent,
        confusion: stuckText.trim(),
      });
      setStuckAnswer(res.explanation || '');
    } catch (e: any) {
      message.error(e?.message || '请求失败，请重试');
    } finally {
      setStuckLoading(false);
    }
  };

  const currentStepForModal = getCurrentStep();

  if (loading || preparing) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        {question && (
          <div style={{ marginTop: 16 }}>
            <QuestionCard question={question} wrongCount={wrongCount} />
          </div>
        )}
        <div className="flex justify-center items-center h-64 flex-col gap-4">
          <Spin size="large" />
          <div style={{ color: '#1890ff', fontSize: 14 }}>
            {preparing ? '正在为你准备学习内容……（首次约需 30-60 秒）' : '加载中……'}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
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
    <div className="max-w-3xl mx-auto p-4 pb-24 relative">
      <LearnHeader
        understoodCount={understoodSteps.size}
        totalSteps={totalSteps}
        mastery={mastery}
        onBack={() => navigate(-1)}
      />

      {question && (
        <div style={{ marginTop: 24 }}>
          <QuestionCard question={question} wrongCount={wrongCount} />
        </div>
      )}

      <ExamPointCard examPoint={data.exam_point} wrongCount={wrongCount} />

      <PrerequisitesCard prerequisites={data.prerequisites || []} />

      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>一步步来</h3>
        {steps.map((s) => (
          <div key={s.index} id={`step-${s.index}`}>
            <StepCard
              step={s}
              understood={understoodSteps.has(s.index)}
              onUnderstood={() => handleUnderstood(s.index)}
              active={!understoodSteps.has(s.index)}
            />
          </div>
        ))}
      </div>

      <SimilarQuestionsCard
        questions={similarQuestions}
        onGoTo={(id) => navigate(`/learn/${id}`)}
      />

      <FeynmanInput
        questionId={questionId!}
        onVerdict={(verdict) => {
          if (verdict.includes('讲清楚')) {
            setMastery('mastered');
            apiClient.updateLearningRecord(questionId!, { status: 'mastered' }).catch(() => {});
          }
        }}
      />

      <FloatButton
        icon={<QuestionCircleOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24, width: 56, height: 56 }}
        tooltip="我卡住了"
        onClick={() => {
          setStuckVisible(true);
          setStuckAnswer('');
          setStuckText('');
        }}
      />

      <Modal
        title={
          currentStepForModal
            ? `我卡在第 ${currentStepForModal.index} 步了`
            : '我卡住了，能帮帮我吗？'
        }
        open={stuckVisible}
        onCancel={() => setStuckVisible(false)}
        footer={null}
      >
        <div className="space-y-4 mt-4">
          {!stuckAnswer ? (
            <>
              <div className="text-sm text-[var(--text-secondary)]">
                告诉 AI 你具体哪里没想通，它会针对
                {currentStepForModal ? `第 ${currentStepForModal.index} 步` : '当前步骤'}
                用最通俗的话再讲一遍。
              </div>
              <Input.TextArea
                rows={4}
                value={stuckText}
                onChange={(e) => setStuckText(e.target.value)}
                placeholder="例如：我不懂为什么速度比算出来是 3:2，怎么列的式子？"
              />
              <Button
                type="primary"
                block
                loading={stuckLoading}
                onClick={handleStuckSubmit}
                icon={<SendOutlined />}
                disabled={!stuckText.trim()}
              >
                向 AI 求助
              </Button>
            </>
          ) : (
            <div>
              <div className="p-4 bg-[var(--border-soft)] rounded-lg text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap">
                {stuckAnswer}
              </div>
              <Button
                type="primary"
                block
                className="mt-4"
                onClick={() => setStuckAnswer('')}
              >
                我还是没懂，重新描述
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Learn;