import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Radio,
  Space,
  Progress,
  Divider,
  Typography,
  Input,
  Spin,
  Alert
} from 'antd'
import {
  LeftOutlined,
  RightOutlined,
  CheckOutlined
} from '@ant-design/icons'
import { QuizQuestion, QuizAnswer, AIGradeResponse } from '../../types'
import { useQuestionStore } from '../../store/questionStore'

const { TextArea } = Input
const { Title, Paragraph } = Typography

interface QuizTakerProps {
  questions: QuizQuestion[]
  onSubmit: (answers: QuizAnswer[]) => void
  isSubmitting?: boolean
}

// 定义包含AI结果的答案类型
interface AnswerWithAI extends QuizAnswer {
  ai_result?: AIGradeResponse;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ questions, onSubmit, isSubmitting = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [hasError, setHasError] = useState(false)
  
  // 从store获取AI相关方法
  const { quickCheck, gradeWithAI, aiStatus } = useQuestionStore()

  // 安全地获取当前题目
  const currentQuestion = questions[currentIndex]

  // 检查题目数据是否有效
  useEffect(() => {
    if (!currentQuestion || !currentQuestion.id) {
      console.error('当前题目数据无效:', currentQuestion)
      setHasError(true)
    } else {
      setHasError(false)
    }
  }, [currentQuestion])

  const handleAnswer = async (answer: string) => {
    if (!currentQuestion) return
    
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }))

    // 如果是选择题，实时AI检查
    if (currentQuestion.options && aiStatus.available) {
      try {
        const isCorrect = await quickCheck(currentQuestion.id, answer)
        console.log('AI实时检查结果:', isCorrect)
      } catch (error) {
        console.warn('AI检查失败，使用普通模式')
      }
    }
  }

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSubmit = async () => {
    const answers: AnswerWithAI[] = questions
      .filter(q => q && q.id) // 过滤掉无效题目
      .map(q => ({
        question_id: q.id,
        user_answer: userAnswers[q.id] || ''
      }));

    console.log('📝 准备提交的答案:', answers)

    // 如果有AI服务，使用AI批改
    if (aiStatus.available) {
      try {
        console.log('🚀 开始AI批改...')
        const gradedAnswers: AnswerWithAI[] = await Promise.all(
          answers.map(async answer => {
            try {
              const aiResult = await gradeWithAI(answer)
              console.log(`✅ 题目 ${answer.question_id} AI批改成功`)
              return { 
                ...answer, 
                ai_result: aiResult
              }
            } catch (error) {
              console.warn(`❌ 题目 ${answer.question_id} AI批改失败:`, error)
              return answer
            }
          })
        )
        
        // 检查有多少题目成功使用AI批改
        const aiGradedCount = gradedAnswers.filter(a => a.ai_result).length
        console.log(`📊 AI批改统计: ${aiGradedCount}/${gradedAnswers.length} 题`)
        
        onSubmit(gradedAnswers)
        return
      } catch (error) {
        console.warn('⚠️ 批量AI批改失败，使用普通提交:', error)
      }
    }
    
    // 降级方案
    console.log('🔧 使用普通批改')
    onSubmit(answers)
  }

  const progress = ((currentIndex + 1) / questions.length) * 100

  if (isSubmitting) {
    return (
      <div className="text-center py-12">
        <Spin size="large" />
        <p className="mt-4">正在提交试卷，请稍候...</p>
      </div>
    )
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
    )
  }

  return (
    <Card>
      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span>进度</span>
          <span>{currentIndex + 1} / {questions.length}</span>
        </div>
        <Progress percent={Math.round(progress)} showInfo={false} />
      </div>

      {/* 题目显示 */}
      <Card className="mb-6">
        <Title level={4}>第 {currentIndex + 1} 题</Title>
        <Paragraph>{currentQuestion.content || '题目内容加载中...'}</Paragraph>

        {/* 选项（选择题） */}
        {currentQuestion.options && Object.keys(currentQuestion.options).length > 0 && (
          <Radio.Group
            onChange={(e) => handleAnswer(e.target.value)}
            value={userAnswers[currentQuestion.id]}
          >
            <Space direction="vertical">
              {Object.entries(currentQuestion.options).map(([letter, text]) => (
                <Radio key={letter} value={letter}>
                  <strong>{letter}.</strong> {text}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}

        {/* 填空题 */}
        {(!currentQuestion.options || Object.keys(currentQuestion.options).length === 0) && (
          <TextArea
            placeholder="请输入您的答案..."
            value={userAnswers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            rows={4}
            className="mt-4"
          />
        )}
      </Card>

      {/* 导航按钮 */}
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
            onClick={handleSubmit}
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

      {/* 题目导航 */}
      <Divider />
      <div className="flex flex-wrap gap-2">
        {questions.map((_, index) => (
          <Button
            key={index}
            type={index === currentIndex ? 'primary' : 'default'}
            shape="circle"
            size="small"
            onClick={() => setCurrentIndex(index)}
          >
            {index + 1}
          </Button>
        ))}
      </div>
    </Card>
  )
}

export default QuizTaker