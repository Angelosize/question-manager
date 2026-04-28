import React from 'react'
import {
  Card,
  Form,
  Select,
  Slider,
  Button,
  Divider,
  Row,
  Col,
  Alert,
  Switch
} from 'antd'
import {
  PlayCircleOutlined,
  SettingOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useQuestionStore } from '../../store/questionStore'
import { QuizSettings } from '../../types'

const { Option } = Select

interface QuizGeneratorProps {
  onGenerate: (settings: QuizSettings) => void
  isLoading?: boolean
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onGenerate, isLoading = false }) => {
const [form] = Form.useForm()
  const { categories } = useQuestionStore()
  
  // 添加调试信息
  console.log('可用学科:', categories.subjects)
  console.log('可用题型:', categories.types)
  console.log('分类数据:', categories)

  const initialSettings: QuizSettings = {
    subjects: [],
    count: 10,
    difficulty_distribution: { '基础': 30, '中等': 50, '拔高': 20 },
    include_reviewed: false,
    include_wrong: false,
    types: ['选择题', '填空题', '解答题']
  }
  
  const handleGenerate = (values: any) => {
    const settings: QuizSettings = {
      subjects: values.subjects || [],
      count: values.count || 10,
      difficulty_distribution: values.difficulty_distribution || { '基础': 30, '中等': 50, '拔高': 20 },
      include_reviewed: values.include_reviewed || false,
      include_wrong: values.include_wrong || false,
      types: values.types || ['选择题', '填空题', '解答题']
    }
    onGenerate(settings)
  }

  const difficultyPresets = [
    { name: '基础练习', distribution: { '基础': 70, '中等': 30, '拔高': 0 } },
    { name: '均衡组卷', distribution: { '基础': 0, '中等': 50, '拔高': 20 } },
    { name: '挑战模式', distribution: { '基础': 10, '中等': 40, '拔高': 50 } },
    { name: '考试模拟', distribution: { '基础': 20, '中等': 50, '拔高': 30 } }
  ]

  return (
    <Card
      title={
        <span>
          <SettingOutlined />
          智能组卷设置
        </span>
      }
      className="mb-6"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialSettings}
        onFinish={handleGenerate}
      >
        <Row gutter={24}>
          <Col span={12}>
            {/* 基本设置 */}
            <Form.Item
              name="subjects"
              label="选择学科"
              rules={[{ required: true, message: '请至少选择一个学科' }]}
            >
              <Select
                mode="multiple"
                placeholder="选择学科"
                optionFilterProp="children"
              >
                {categories.subjects.map((subject) => (
                  <Option key={subject} value={subject}>
                    {subject}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="count"
              label="题目数量"
              rules={[{ required: true, message: '请输入题目数量' }]}
            >
              <Slider
                min={5}
                max={50}
                marks={{ 5: '5', 20: '20', 50: '50' }}
              />
            </Form.Item>

            <Form.Item
              name="types"
              label="包含题型"
              rules={[{ required: true, message: '请至少选择一种题型' }]}
            >
              <Select
                mode="multiple"
                placeholder="选择题型"
              >
                {categories.types.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            {/* 难度分布 */}
            <Form.Item
              name="difficulty_distribution"
              label="难度分布 (%)"
            >
              <Card size="small">
                {Object.entries(form.getFieldValue('difficulty_distribution') || {}).map(([difficulty, percentage]) => (
                  <div key={difficulty} className="mb-2">
                    <div className="flex justify-between items-center">
                      <span>{difficulty}</span>
                      <span>{Number(percentage)}%</span>
                    </div>
                    <Slider
                      value={percentage as number}
                      onChange={(value) => {
                        const current = form.getFieldValue('difficulty_distribution') || {}
                        form.setFieldsValue({
                          difficulty_distribution: { ...current, [difficulty]: value }
                        })
                      }}
                      min={0}
                      max={100}
                    />
                  </div>
                ))}
                
                <Divider />
                <div className="grid grid-cols-2 gap-2">
                  {difficultyPresets.map((preset) => (
                    <Button
                      key={preset.name}
                      size="small"
                      onClick={() => form.setFieldsValue({ difficulty_distribution: preset.distribution })}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </Card>
            </Form.Item>

            {/* 高级选项 */}
            <Form.Item label="高级选项">
              <div className="space-y-2">
                <Form.Item name="include_reviewed" valuePropName="checked" noStyle>
                  <Switch checkedChildren="包含已复习" unCheckedChildren="排除已复习" />
                </Form.Item>
                <Form.Item name="include_wrong" valuePropName="checked" noStyle>
                  <Switch checkedChildren="包含错题" unCheckedChildren="排除错题" />
                </Form.Item>
              </div>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlayCircleOutlined />}
            loading={isLoading}
            size="large"
          >
            生成试卷
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            style={{ marginLeft: 12 }}
            onClick={() => form.resetFields()}
          >
            重置设置
          </Button>
        </Form.Item>
      </Form>

      <Alert
        message="组卷说明"
        description="系统会根据您设置的难度分布和筛选条件，智能生成最适合的试卷"
        type="info"
        showIcon
      />
    </Card>
  )
}

export default QuizGenerator