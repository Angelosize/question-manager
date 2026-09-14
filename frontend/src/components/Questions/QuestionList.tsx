import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Input } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { Question } from '../../types';
import { useQuestionStore } from '../../store/questionStore';
import CategorySelectors from '../Common/CategorySelectors';

interface QuestionListProps {
  onEdit: (question: Question) => void;
  onViewDetail: (question: Question) => void;
  onDelete: (id: string) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
}

const QuestionList: React.FC<QuestionListProps> = ({
  onEdit,
  onViewDetail,
  onDelete,
  onSelectionChange,
}) => {
  const { questions, isLoading, filters, setFilters } = useQuestionStore();
  const [searchText, setSearchText] = useState('');
  const [localFilters, setLocalFilters] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 搜索框防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({
        ...localFilters,
        keyword: searchText || undefined,
        page: 1, // 搜索时重置到第一页
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText, localFilters, setFilters]);

  // 筛选器变化处理
  const handleFilterChange = (filters: any) => {
    setLocalFilters(filters);
    setFilters({
      ...filters,
      page: 1, // 筛选变化时重置到第一页
    });
  };

  // 分页变更处理
  const handleTableChange = (pagination: any) => {
    setFilters({
      page: pagination.current,
      limit: pagination.pageSize,
    });
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      const ids = selectedKeys as string[];
      setSelectedRowKeys(selectedKeys);
      if (onSelectionChange) {
        onSelectionChange(ids);
      }
    },
    columnWidth: 40,
  };

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
            difficulty === '基础' ? 'green' : difficulty === '中等' ? 'orange' : 'red'
          }
        >
          {difficulty}
        </Tag>
      ),
    },
    {
      title: '考试来源',
      dataIndex: ['exam', 'exam_name'],
      key: 'exam',
      width: 130,
      render: (exam_name: string, record: Question) => (
        <span title={record.exam?.source || ''}>
          {exam_name || '-'}
        </span>
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
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(record);
            }}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(record);
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(record.id);
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card size="small">
        <Input
          placeholder="搜索题目内容、答案、解析..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </Card>

      <CategorySelectors onFilterChange={handleFilterChange} />

      <Card>
        <Table
          columns={columns}
          dataSource={questions}
          loading={isLoading}
          rowKey="id"
          rowSelection={rowSelection}
          onRow={(record) => ({
            onClick: (e) => {
              const target = e.target as HTMLElement;
              if (
                target.closest('.ant-btn') ||
                target.closest('.ant-space-item') ||
                target.closest('.ant-checkbox')
              ) {
                return;
              }
              onViewDetail(record);
            },
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: filters.page || 1,
            pageSize: filters.limit || 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
};

export default QuestionList;