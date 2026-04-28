import React from 'react'
import { Card, Form, Select, Space, Button } from 'antd'
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuestionStore } from '../../store/questionStore'  // 改为使用 questionStore

const { Option } = Select

interface CategorySelectorsProps {
  onFilterChange: (filters: any) => void
  selectedFilters?: any
}

const CategorySelectors: React.FC<CategorySelectorsProps> = ({
  onFilterChange,
  selectedFilters = {},
}) => {
  const { categories } = useQuestionStore()  // 从 questionStore 获取分类
  const [form] = Form.useForm()

  const handleValuesChange = (_: any, allValues: any) => {
    onFilterChange(allValues)
  }

  const handleReset = () => {
    form.resetFields()
    onFilterChange({})
  }

  return (
    <Card 
      title={
        <Space>
          <FilterOutlined />
          <span>筛选条件</span>
        </Space>
      }
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          size="small" 
          onClick={handleReset}
        >
          重置
        </Button>
      }
      className="mb-6"
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={selectedFilters}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Form.Item name="subject" label="学科">
            <Select placeholder="全部学科" allowClear>
              {categories.subjects.map((subject: string) => (
                <Option key={subject} value={subject}>
                  {subject}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="type" label="题型">
            <Select placeholder="全部题型" allowClear>
              {categories.types.map((type: string) => (
                <Option key={type} value={type}>
                  {type}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="difficulty" label="难度">
            <Select placeholder="全部难度" allowClear>
              {categories.difficulties.map((difficulty: string) => (
                <Option key={difficulty} value={difficulty}>
                  {difficulty}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="source" label="来源">
            <Select placeholder="全部来源" allowClear>
              {categories.sources.map((source: string) => (
                <Option key={source} value={source}>
                  {source}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="tag" label="标签">
            <Select placeholder="全部标签" allowClear>
              {categories.tags.map((tag: string) => (
                <Option key={tag} value={tag}>
                  {tag}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      </Form>
    </Card>
  )
}

export default CategorySelectors