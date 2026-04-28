import React, { useState, useEffect } from 'react'  // 添加 useState 和 useEffect 导入
import { Table, Button, Space, Tag, Card, Input } from 'antd'  // 添加 Input 导入
import { EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'  // 添加 SearchOutlined 导入
import { Question } from '../../types'
import { useQuestionStore } from '../../store/questionStore'
import CategorySelectors from '../Common/CategorySelectors'  // 确保路径正确

interface QuestionListProps {
  onEdit: (question: Question) => void
}

const QuestionList: React.FC<QuestionListProps> = ({ onEdit }) => {
  const { questions, isLoading, deleteQuestion, setFilters } = useQuestionStore()
  const [searchText, setSearchText] = useState('')
  const [localFilters, setLocalFilters] = useState({})

  useEffect(() => {
    // 防抖处理搜索
    const timer = setTimeout(() => {
      setFilters({
        ...localFilters,
        keyword: searchText || undefined,
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [searchText, localFilters, setFilters])

  const handleFilterChange = (filters: any) => {
    setLocalFilters(filters)
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => <span className="text-sm text-gray-600">{id}</span>,
    },
    {
      title: '学科',
      dataIndex: 'subject',
      key: 'subject',
      width: 100,
      render: (subject: string) => (
        <Tag color="blue" className="text-xs">
          {subject}
        </Tag>
      ),
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color="green" className="text-xs">
          {type}
        </Tag>
      ),
    },
    {
      title: '题干',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <div className="max-w-md truncate" title={content}>
          {content}
        </div>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: string) => (
        <Tag
          color={
            difficulty === '基础' ? 'green' : 
            difficulty === '中等' ? 'orange' : 'red'
          }
        >
          {difficulty}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: Question) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => console.log('查看', record)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => deleteQuestion(record.id)}
          />
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <Card size="small">
        <Input
          placeholder="搜索题目内容、答案、解析..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </Card>

      {/* 分类筛选器 */}
      <CategorySelectors onFilterChange={handleFilterChange} />

      {/* 题目表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={questions}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  )
}

export default QuestionList