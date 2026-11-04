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
  Switch,
  Space,
  Tag,
} from 'antd'
import {
  PlayCircleOutlined,
  SettingOutlined,
  ReloadOutlined,
  RocketOutlined,
  ExperimentOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
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
  
  // ⭐ 用 useWatch 监听难度分布，解决滑动条拖不动、数字不刷新的问题
  const diffDist = Form.useWatch('difficulty_distribution', form) || { '基础': 30, '中等': 50, '拔高': 20 }
  const currentCount = Form.useWatch('count', form) || 10

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
    { name: '基础巩固', icon: <ExperimentOutlined />, distribution: { '基础': 70, '中等': 30, '拔高': 0 } },
    { name: '均衡组卷', icon: <ThunderboltOutlined />, distribution: { '基础': 30, '中等': 50, '拔高': 20 } },
    { name: '挑战模式', icon: <TrophyOutlined />, distribution: { '基础': 10, '中等': 40, '拔高': 50 } },
    { name: '全真模拟', icon: <RocketOutlined />, distribution: { '基础': 20, '中等': 60, '拔高': 20 } },
  ]

  const calcCount = (pct: number) => Math.round((pct / 100) * currentCount)

  return (
    <Card
      bordered={false}
      className="shadow-sm"
      title={
        <div className="flex items-center gap-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <SettingOutlined />
          </div>
          <span className="text-lg font-bold">组卷配置台</span>
        </div>
      }
      style={{ borderRadius: 16 }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialSettings}
        onFinish={handleGenerate}
      >
        <Row gutter={40}>
          {/* 左侧：基础设置 */}
          <Col xs={24} lg={12}>
            <div className="space-y-6">
              <Form.Item
                name="subjects"
                label={<span className="font-semibold text-gray-700">选择学科</span>}
                rules={[{ required: true, message: '请至少选择一个学科' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="请选择学科"
                  size="large"
                  optionFilterProp="children"
                  className="w-full"
                >
                  {categories.subjects.map((subject) => (
                    <Option key={subject} value={subject}>
                      {subject}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="types"
                label={<span className="font-semibold text-gray-700">包含题型</span>}
                rules={[{ required: true, message: '请至少选择一种题型' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="请选择题型"
                  size="large"
                >
                  {categories.types.map((type) => (
                    <Option key={type} value={type}>
                      {type}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="count"
                label={
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold text-gray-700">题目总数</span>
                    <Tag color="blue" className="text-base px-3 py-0.5 rounded-full font-bold">
                      {currentCount} 题
                    </Tag>
                  </div>
                }
                rules={[{ required: true, message: '请输入题目数量' }]}
              >
                <Slider
                  min={5}
                  max={50}
                  marks={{ 5: '5', 20: '20', 35: '35', 50: '50' }}
                  tooltip={{ open: true }}
                />
              </Form.Item>
            </div>
          </Col>

          {/* 右侧：难度分布 */}
          <Col xs={24} lg={12}>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <Form.Item
                name="difficulty_distribution"
                label={<span className="font-semibold text-gray-700">难度分布</span>}
                className="mb-2"
              >
                <div className="space-y-4 mt-2">
                  {['基础', '中等', '拔高'].map((difficulty) => {
                    const pct = diffDist[difficulty] || 0
                    return (
                      <div key={difficulty}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{difficulty}</span>
                          <span className="text-xs text-gray-500">
                            约 {calcCount(pct)} 题 ({pct}%)
                          </span>
                        </div>
                        <Slider
                          value={pct}
                          onChange={(val) => {
                            form.setFieldsValue({
                              difficulty_distribution: { ...diffDist, [difficulty]: val }
                            })
                          }}
                          min={0}
                          max={100}
                          trackStyle={{ backgroundColor: difficulty === '基础' ? '#10b981' : difficulty === '中等' ? '#f59e0b' : '#ef4444' }}
                          handleStyle={{ borderColor: difficulty === '基础' ? '#10b981' : difficulty === '中等' ? '#f59e0b' : '#ef4444' }}
                        />
                      </div>
                    )
                  })}
                </div>
              </Form.Item>

              <Divider style={{ margin: '16px 0' }} />
              
              <div className="grid grid-cols-2 gap-3">
                {difficultyPresets.map((preset) => (
                  <Button
                    key={preset.name}
                    icon={preset.icon}
                    onClick={() => form.setFieldsValue({ difficulty_distribution: preset.distribution })}
                    className="h-10 rounded-lg flex items-center justify-center border-gray-200 hover:border-blue-400 hover:text-blue-500 transition-all"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: '24px 0' }} />

        {/* 底部：高级选项 + 按钮 */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Space size="large">
            <Form.Item name="include_reviewed" valuePropName="checked" noStyle>
              <Switch checkedChildren="包含已复习" unCheckedChildren="排除已复习" />
            </Form.Item>
            <Form.Item name="include_wrong" valuePropName="checked" noStyle>
              <Switch checkedChildren="包含错题" unCheckedChildren="排除错题" />
            </Form.Item>
          </Space>

          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => form.resetFields()}
              size="large"
              className="rounded-lg"
            >
              重置配置
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlayCircleOutlined />}
              loading={isLoading}
              size="large"
              className="rounded-lg bg-blue-600 hover:bg-blue-500 shadow-md px-8"
            >
              开始智能组卷
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  )
}

export default QuizGenerator