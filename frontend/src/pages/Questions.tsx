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
  Spin,
  Tabs,
  Descriptions
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ImportOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QuestionForm from '../components/Questions/QuestionForm';
import ImportExport from '../components/Questions/ImportExport';
import QuestionList from '../components/Questions/QuestionList';
import { useQuestionStore } from '../store/questionStore';
import { Question, QuestionCreate, QuestionUpdate } from '../types';
import GeometryRenderer from '../components/Geometry/GeometryRenderer';

const { Option } = Select;
const { TabPane } = Tabs;

const Questions: React.FC = () => {
  const [searchParams] = useSearchParams();
  const subjectFromUrl = searchParams.get('subject') || '';

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [importExportVisible, setImportExportVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const navigate = useNavigate();

  const {
    questions,
    isLoading,
    loadQuestions,
    deleteQuestion,
    batchDeleteQuestions,
    createQuestion,
    updateQuestion,
    categories,
    filters,
    setFilters,
    totalCount
  } = useQuestionStore();

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // ⭐ 从 URL 读取 subject 参数并自动筛选
  useEffect(() => {
    if (subjectFromUrl) {
      setFilters({ subject: subjectFromUrl, page: 1 });
      message.info(`已自动筛选「${subjectFromUrl}」学科的题目`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFromUrl]);

  const [searchText, setSearchText] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ keyword: searchText || undefined, page: 1 });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText, setFilters]);

  const showModal = (question?: Question) => {
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
    const question = questions.find(q => q.id === id);
    const title = question ? `确认删除「${question.content?.substring(0, 30) || '题目'}」` : '确认删除';

    Modal.confirm({
      title: title,
      content: '确定要删除这道题目吗？删除后不可恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
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

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要删除的题目');
      return;
    }

    Modal.confirm({
      title: `确认批量删除 ${selectedIds.length} 道题目？`,
      content: '系统将自动跳过被试卷引用或存在于错题本中的题目，只删除无依赖的题目。',
      okText: '确认批量删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await batchDeleteQuestions(selectedIds);
          const { deleted_count, conflicts } = result;

          let successMsg = `成功删除 ${deleted_count} 道题目`;
          if (conflicts && Object.keys(conflicts).length > 0) {
            const conflictCount = Object.keys(conflicts).length;
            const conflictDetails = Object.entries(conflicts)
              .map(([id, reason]) => `题目 ${id}: ${reason}`)
              .join('；');
            message.warning({
              content: `${successMsg}，但 ${conflictCount} 道题目因依赖冲突未删除：${conflictDetails}`,
              duration: 10,
            });
          } else {
            message.success(successMsg);
          }

          setSelectedIds([]);
        } catch (error: any) {
          message.error(error.message || '批量删除失败');
        }
      }
    });
  };

  const handleViewDetail = (question: Question) => {
    setSelectedQuestion(question);
    setDetailVisible(true);
  };

  const handleSubjectChange = (value: string) => {
    setFilters({ subject: value || undefined, page: 1 });
  };

  const handleTypeChange = (value: string) => {
    setFilters({ type: value || undefined, page: 1 });
  };

  if (isLoading && questions.length === 0) {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            📚 题目管理
            {subjectFromUrl && (
              <Tag color="blue" style={{ marginLeft: 12 }}>
                筛选：{subjectFromUrl}
              </Tag>
            )}
          </h1>
          <Space>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportExportVisible(true)}
            >
              导入导出
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              新增题目
            </Button>
          </Space>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="题目列表" key="list">
            {totalCount === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">📚</div>
                <h2 className="text-2xl font-bold mb-2">欢迎使用题目管理系统</h2>
                <p className="text-gray-600 mb-6">还没有题目数据，请添加第一道题目开始使用</p>
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
                  message={`共 ${totalCount} 道题目，${categories.subjects.length} 个学科`}
                  type="info"
                  className="mb-4"
                />

                <div className="flex flex-wrap gap-4 mb-6 items-center">
                  <Input
                    placeholder="搜索题目或答案..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 200 }}
                    prefix={<SearchOutlined />}
                  />

                  <Select
                    placeholder="筛选学科"
                    value={filters.subject}
                    onChange={handleSubjectChange}
                    style={{ width: 120 }}
                    allowClear
                  >
                    {categories.subjects.map((subject: string) => (
                      <Option key={subject} value={subject}>{subject}</Option>
                    ))}
                  </Select>

                  <Select
                    placeholder="筛选题型"
                    value={filters.type}
                    onChange={handleTypeChange}
                    style={{ width: 120 }}
                    allowClear
                  >
                    {categories.types.map((type: string) => (
                      <Option key={type} value={type}>{type}</Option>
                    ))}
                  </Select>

                  {selectedIds.length > 0 && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={handleBatchDelete}
                    >
                      批量删除（已选 {selectedIds.length} 项）
                    </Button>
                  )}
                </div>

                <QuestionList
                  onEdit={showModal}
                  onViewDetail={handleViewDetail}
                  onDelete={handleDelete}
                  onSelectionChange={(ids) => setSelectedIds(ids)}
                />
              </>
            )}
          </TabPane>

          <TabPane tab="导入导出" key="import-export">
            <ImportExport />
          </TabPane>
        </Tabs>

        {/* 题目表单模态框 */}
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

        {/* 导入导出模态框 */}
        <Modal
          title="导入导出管理"
          open={importExportVisible}
          onCancel={() => setImportExportVisible(false)}
          footer={null}
          width={800}
        >
          <ImportExport />
        </Modal>

        {/* 详情弹窗 */}
        <Modal
          title="题目详情"
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          footer={null}
          width={800}
        >
          {selectedQuestion && (
            <div className="space-y-2">
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="ID">{selectedQuestion.id}</Descriptions.Item>
                <Descriptions.Item label="学科">{selectedQuestion.subject}</Descriptions.Item>
                <Descriptions.Item label="题型">{selectedQuestion.type}</Descriptions.Item>
                <Descriptions.Item label="难度">{selectedQuestion.difficulty || '未设置'}</Descriptions.Item>
                <Descriptions.Item label="知识点">{selectedQuestion.knowledge_points || '无'}</Descriptions.Item>
                <Descriptions.Item label="章节">{selectedQuestion.chapter || '无'}</Descriptions.Item>
                <Descriptions.Item label="标签">{selectedQuestion.tags?.join(', ') || '无'}</Descriptions.Item>
                <Descriptions.Item label="来源（录入）">{selectedQuestion.source || '无'}</Descriptions.Item>
                <Descriptions.Item label="备注">{selectedQuestion.note || '无'}</Descriptions.Item>
                <Descriptions.Item label="状态">{selectedQuestion.status || 'active'}</Descriptions.Item>
              </Descriptions>

              <div className="mt-4">
                <div className="font-semibold">题干：</div>
                <div className="bg-gray-50 p-2 rounded">{selectedQuestion.content}</div>
              </div>
              {selectedQuestion.drawing && (
                <div className="mt-3">
                  <div className="font-semibold mb-1">图形：</div>
                  <GeometryRenderer data={selectedQuestion.drawing} height={300} />
                </div>
              )}
              {selectedQuestion.options && Object.keys(selectedQuestion.options).length > 0 && (
                <div>
                  <div className="font-semibold">选项：</div>
                  <div className="bg-gray-50 p-2 rounded">
                    {Object.entries(selectedQuestion.options).map(([k, v]) => (
                      <div key={k}>
                        {k}: {v}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="font-semibold">答案：</div>
                <div className="bg-gray-50 p-2 rounded">{selectedQuestion.answer}</div>
              </div>

              <div>
                <div className="font-semibold">解析：</div>
                <div className="bg-gray-50 p-2 rounded">{selectedQuestion.explanation || '无'}</div>
              </div>

              {selectedQuestion.exam ? (
                <div className="border-t pt-2 mt-2">
                  <div className="font-semibold text-blue-600">考试归属信息</div>
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="考试名称">
                      {selectedQuestion.exam.exam_name || '无'}
                    </Descriptions.Item>
                    <Descriptions.Item label="年份">
                      {selectedQuestion.exam.year || '无'}
                    </Descriptions.Item>
                    <Descriptions.Item label="题号">
                      {selectedQuestion.exam.number || '无'}
                    </Descriptions.Item>
                    <Descriptions.Item label="分值">
                      {selectedQuestion.exam.score || '无'}
                    </Descriptions.Item>
                    <Descriptions.Item label="试卷来源" span={2}>
                      {selectedQuestion.exam.source || '无'}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ) : (
                <div className="text-gray-400 italic">无考试归属信息</div>
              )}
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default Questions;