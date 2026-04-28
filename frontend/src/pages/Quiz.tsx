import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  message, 
  Result, 
  Descriptions, 
  Space,
  Divider
} from 'antd';
import { RedoOutlined, FileTextOutlined, BarChartOutlined } from '@ant-design/icons';
import QuizGenerator from '../components/Quiz/QuizGenerator';
import QuizTaker from '../components/Quiz/QuizTaker';
import { QuizSettings, QuizQuestion, QuizAnswer, QuizResponse } from '../types';
import { useQuestionStore } from '../store/questionStore';
import { apiClient } from '../api/client';

const Quiz: React.FC = () => {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { generateQuiz } = useQuestionStore();

  const handleGenerateQuiz = async (settings: QuizSettings) => {
    try {
      const questions = await generateQuiz(settings);
      
      if (questions.length === 0) {
        message.warning('没有生成任何题目，请调整筛选条件');
        return;
      }
      
      setQuizQuestions(questions);
      setQuizStarted(true);
      setQuizFinished(false);
      message.success(`已生成 ${questions.length} 道题目`);
    } catch (error: any) {
      message.error(error.message || '组卷失败');
    }
  };

  const handleSubmitQuiz = async (answers: QuizAnswer[]) => {
  setIsSubmitting(true);
  try {
    console.log('提交的答案:', answers);
    
    // 先快速显示结果，然后异步提交
    const mockResults = {
      results: answers.map(answer => ({
        question_id: answer.question_id,
        user_answer: answer.user_answer,
        is_correct: answer.ai_result?.is_correct || false,
        correct_answer: '', // 稍后填充
        explanation: answer.ai_result?.detailed_analysis || '',
        score: answer.ai_result?.score || 0
      })),
      total_score: answers.reduce((sum, answer) => sum + (answer.ai_result?.score || 0), 0),
      max_score: answers.length * 100
    };
    
    // 立即显示结果
    setQuizResults(mockResults);
    setQuizFinished(true);
    
    // 异步提交到后端（不阻塞UI）
    setTimeout(async () => {
      try {
        const realResults = await apiClient.submitQuiz(answers);
        console.log('后端提交成功:', realResults);
        // 更新为真实结果
        setQuizResults(realResults);
      } catch (error) {
        console.error('异步提交失败:', error);
        // 保持使用mock结果
      }
    }, 0);
    
    message.success('试卷提交成功！');
    
  } catch (error: any) {
    console.error('提交失败:', error);
    message.error(error.message || '提交失败');
  } finally {
    setIsSubmitting(false);
  }
};

  const restartQuiz = () => {
    setQuizStarted(false);
    setQuizFinished(false);
    setQuizQuestions([]);
    setQuizResults(null);
  };

  if (quizFinished && quizResults) {
    const correctCount = quizResults.results.filter((result: any) => result.is_correct).length;
    const totalCount = quizResults.results.length;
    const scorePercentage = ((quizResults.total_score / quizResults.max_score) * 100).toFixed(1);

    return (
      <div className="max-w-4xl mx-auto">
        <Result
          status="success"
          title="测试完成！"
          subTitle={
            <Space direction="vertical" size="large">
              <div>您的得分: {quizResults.total_score}/{quizResults.max_score}</div>
              <div>正确率: {correctCount}/{totalCount} 题 ({scorePercentage}%)</div>
            </Space>
          }
          extra={[
            <Button key="restart" type="primary" onClick={restartQuiz} icon={<RedoOutlined />}>
              再次组卷
            </Button>,
            <Button key="details" onClick={() => setQuizFinished(false)} icon={<BarChartOutlined />}>
              查看答题详情
            </Button>
          ]}
        />
        
        {quizResults.results && (
          <Card title="答题详情" className="mt-6">
            <Descriptions column={1} bordered>
              {quizResults.results.map((result, index) => {
                const question = quizQuestions.find(q => q.id === result.question_id);
                return (
                  <Descriptions.Item 
                    key={index} 
                    label={`第 ${index + 1} 题 ${result.is_correct ? '✅' : '❌'}`}
                    labelStyle={{ 
                      fontWeight: 'bold',
                      color: result.is_correct ? 'green' : 'red'
                    }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div>
                        <strong>题目:</strong> {question?.content}
                      </div>
                      
                      <div>
                        <strong>您的答案:</strong> 
                        <span style={{ color: result.is_correct ? 'green' : 'red', marginLeft: 8 }}>
                          {result.user_answer || '未作答'}
                        </span>
                      </div>
                      
                      <div>
                        <strong>正确答案:</strong> 
                        <span style={{ color: 'green', marginLeft: 8 }}>
                          {question?.answer}
                        </span>
                      </div>
                      
                      {(result as any).ai_result ? (
                        <>
                          <Divider />
                          <div style={{ background: '#f6ffed', padding: 12, borderRadius: 6 }}>
                            <h4>🤖 AI批改报告</h4>
                            <div>
                              <strong>评分:</strong> {(result as any).ai_result.score}/10
                            </div>
                            <div>
                              <strong>置信度:</strong> {((result as any).ai_result.confidence * 100).toFixed(1)}%
                            </div>
                            <div>
                              <strong>反馈:</strong> {(result as any).ai_result.ai_feedback}
                            </div>
                            {(result as any).ai_result.detailed_analysis && (
                              <div>
                                <strong>详细分析:</strong> {(result as any).ai_result.detailed_analysis}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <Divider />
                          <div>
                            <strong>得分:</strong> {result.score} 分
                          </div>
                          {result.explanation && (
                            <div>
                              <strong>解析:</strong> {result.explanation}
                            </div>
                          )}
                        </>
                      )}
                    </Space>
                  </Descriptions.Item>
                )
              })}
            </Descriptions>
          </Card>
        )}
      </div>
    )
  }

  if (quizStarted) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">正在答题</h2>
          <Button onClick={restartQuiz} icon={<RedoOutlined />}>
            重新组卷
          </Button>
        </div>
        
        <QuizTaker
          questions={quizQuestions}
          onSubmit={handleSubmitQuiz}
          isSubmitting={isSubmitting}
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">智能组卷</h2>
        <p className="text-gray-600">根据您的需求智能生成个性化试卷</p>
      </div>

      <QuizGenerator onGenerate={handleGenerateQuiz} />
      
      {quizQuestions.length > 0 && !quizStarted && (
        <Card className="mt-6">
          <div className="text-center">
            <FileTextOutlined className="text-4xl text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">试卷准备就绪</h3>
            <p>已生成 {quizQuestions.length} 道题目，随时可以开始答题</p>
            <Button
              type="primary"
              size="large"
              className="mt-4"
              onClick={() => setQuizStarted(true)}
            >
              开始答题
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

export default Quiz;