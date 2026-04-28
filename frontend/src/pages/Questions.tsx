import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Modal,
  message,
  Input,
  Select,
  Space,
  Alert,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined
} from '@ant-design/icons';
import QuestionForm from '../components/Questions/QuestionForm';
import { useQuestionStore } from '../store/questionStore';
import { Question, QuestionCreate, QuestionUpdate } from '../types';

const { Option } = Select;

const Questions: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  const {
    questions,
    isLoading,
    loadQuestions,
    deleteQuestion,
    createQuestion,
    updateQuestion,
    categories
  } = useQuestionStore();

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  console.log('📊 题目管理组件状态:', {
    题目数量: questions.length,
    加载状态: isLoading,
    分类数据: categories
  });

  const showModal = (question?: Question) => {
    console.log('🎯 打开模态框');
    if (question) {
      setEditingQuestion(question);
    } else {
      setEditingQuestion(null);
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingQuestion(null);
  };

  const handleCreate = async (questionData: QuestionCreate | QuestionUpdate) => {
    try {
      const createData: QuestionCreate = {
        subject: questionData.subject || '未分类',
        type: questionData.type || '选择题',
        content: questionData.content || '',
        answer: questionData.answer || '',
        difficulty: questionData.difficulty,
        options: questionData.options,
        explanation: questionData.explanation,
        knowledge_points: questionData.knowledge_points,
        chapter: questionData.chapter,
        tags: questionData.tags,
        source: questionData.source,
        note: questionData.note
      };
      await createQuestion(createData);
      message.success('题目添加成功');
      setIsModalVisible(false);
    } catch (error: any) {
      message.error(error.message || '添加题目失败');
    }
  };

  const handleUpdate = async (questionData: QuestionCreate | QuestionUpdate) => {
    if (!editingQuestion) return;
    try {
      await updateQuestion(editingQuestion.id, questionData as QuestionUpdate);
      message.success('题目更新成功');
      setIsModalVisible(false);
      setEditingQuestion(null);
    } catch (error: any) {
      message.error(error.message || '更新题目失败');
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这道题目吗？',
      onOk: async () => {
        try {
          await deleteQuestion(id);
          message.success('题目删除成功');
        } catch (error: any) {
          message.error(error.message || '删除题目失败');
        }
      }
    });
  };

  const columns = [
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      render: (text: string) => (
        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text}
        </div>
      )
    },
    {
      title: '学科',
      dataIndex: 'subject',
      key: 'subject',
      width: 80,
      render: (subject: string) => <Tag color="blue">{subject}</Tag>
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => <Tag color="green">{type}</Tag>
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 60,
      render: (difficulty: string) => (
        <Tag color={
          difficulty === '拔高' ? 'red' : 
          difficulty === '中等' ? 'orange' : 'green'
        }>
          {difficulty}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Question) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            size="small"
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            size="small"
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.content.toLowerCase().includes(searchText.toLowerCase()) ||
                         q.answer.toLowerCase().includes(searchText.toLowerCase());
    const matchesSubject = selectedSubject ? q.subject === selectedSubject : true;
    const matchesType = selectedType ? q.type === selectedType : true;
    return matchesSearch && matchesSubject && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
        <span className="ml-4">加载题目中...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card>
        {questions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2">欢迎使用题目管理系统</h2>
            <p className="text-gray-600 mb-6">还没有题目数据，请添加第一道题目开始使用</p>
            
            <div className="space-y-4 mb-8">
              <div className="text-left max-w-md mx-auto">
                <h3 className="font-semibold mb-2">当前分类状态:</h3>
                <p>学科: {categories.subjects.join(', ') || '暂无'}</p>
                <p>题型: {categories.types.join(', ') || '暂无'}</p>
                <p>难度: {categories.difficulties.join(', ') || '暂无'}</p>
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
              className="mb-4"
            >
              添加第一道题目
            </Button>
          </div>
        ) : (
          <>
            <Alert
              message={`共 ${questions.length} 道题目，${categories.subjects.length} 个学科`}
              type="info"
              className="mb-4"
            />

            <div className="flex flex-wrap gap-4 mb-6">
              <Input
                placeholder="搜索题目或答案..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
                prefix={<SearchOutlined />}
              />
              
              <Select
                placeholder="筛选学科"
                value={selectedSubject}
                onChange={setSelectedSubject}
                style={{ width: 120 }}
                allowClear
              >
                {categories.subjects.map((subject: string) => (
                  <Option key={subject} value={subject}>{subject}</Option>
                ))}
              </Select>

              <Select
                placeholder="筛选题型"
                value={selectedType}
                onChange={setSelectedType}
                style={{ width: 120 }}
                allowClear
              >
                {categories.types.map((type: string) => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal()}
              >
                添加题目
              </Button>
            </div>

            <Table
              columns={columns}
              dataSource={filteredQuestions}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
              scroll={{ x: 800 }}
            />
          </>
        )}

        <Modal
          title={editingQuestion ? '编辑题目' : '添加题目'}
          open={isModalVisible}
          onCancel={handleCancel}
          footer={null}
          width={800}
          destroyOnClose={true}
        >
          <QuestionForm
            question={editingQuestion || undefined}
            onSave={editingQuestion ? handleUpdate : handleCreate}
            onCancel={handleCancel}
            isEditing={!!editingQuestion}
          />
        </Modal>
      </Card>
    </div>
  );
};

export default Questions;