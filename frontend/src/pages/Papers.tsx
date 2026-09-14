import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Descriptions,
  Card,
  Divider,
  Switch,
  Radio,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  EyeOutlined,
  RobotOutlined,
  ExportOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Paper, PaperCreate } from '../types';
import ImageImportPaperModal from '../components/Questions/ImageImportPaperModal';

const { Option } = Select;
const { TextArea } = Input;

const Papers: React.FC = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [aiImportVisible, setAiImportVisible] = useState(false);
  const [imageImportVisible, setImageImportVisible] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState('');
  const [aiPercent, setAiPercent] = useState(0);

  // 导出设置相关
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPaperId, setExportPaperId] = useState<string>('');
  const [exportPaperName, setExportPaperName] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportForm] = Form.useForm();

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getPapers();
      setPapers(data);
    } catch (error) {
      message.error('加载卷子列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开导出设置弹窗
  const openExportModal = (paperId: string, paperName: string) => {
    setExportPaperId(paperId);
    setExportPaperName(paperName);
    exportForm.setFieldsValue({
      format: 'html',
      show_answer: true,
      show_explanation: true,
      show_knowledge: true,
      show_score: true,
      answer_position: 'inline',
    });
    setExportModalVisible(true);
  };

  // 执行导出
  const handleExport = async () => {
    try {
      const values = await exportForm.validateFields();
      setExportLoading(true);

      const commonOptions = {
        show_answer: values.show_answer,
        show_explanation: values.show_explanation,
        show_knowledge: values.show_knowledge,
        show_score: values.show_score,
        answer_position: values.answer_position,
      };

      if (values.format === 'html') {
        const html = await apiClient.exportPaperHTML(exportPaperId, commonOptions);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportPaperName || '试卷'}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('HTML 导出成功');
      } else {
        const blob = await apiClient.exportPaperDocx(exportPaperId, commonOptions);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportPaperName || '试卷'}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('Word 导出成功');
      }

      setExportModalVisible(false);
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const paperData: PaperCreate = {
        name: values.name,
        subject: values.subject,
        year: values.year,
        questions: [],
      };
      await apiClient.createPaper(paperData);
      message.success('卷子创建成功');
      setModalVisible(false);
      form.resetFields();
      loadPapers();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deletePaper(id);
      message.success('删除成功');
      loadPapers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleStartQuiz = (paperId: string) => {
    navigate(`/quiz?paperId=${paperId}`);
  };

  const handleViewDetail = async (paperId: string) => {
    try {
      const paper = await apiClient.getPaper(paperId);
      setSelectedPaper(paper);
      setDetailVisible(true);
    } catch (error) {
      message.error('获取卷子详情失败');
    }
  };

  // ⭐ 异步 AI 文本导入 + 轮询进度
  const handleAIImport = async () => {
    if (!aiText.trim()) {
      message.warning('请输入试卷文本');
      return;
    }
    setAiLoading(true);
    setAiProgress('🚀 正在启动任务...');
    setAiPercent(0);

    try {
      // 1. 启动异步任务
      const { task_id } = await apiClient.importPaperByAIAsync(aiText);
      console.log('🎯 任务ID:', task_id);

      // 2. 轮询进度
      const maxWait = 10 * 60 * 1000;
      const startTime = Date.now();
      let lastStage = '';

      while (Date.now() - startTime < maxWait) {
        await new Promise((r) => setTimeout(r, 800));

        let status: any;
        try {
          status = await apiClient.getImportStatus(task_id);
        } catch (err) {
          continue;
        }

        const stage = status.stage || '';
        const cur = status.current || 0;
        const total = status.total || 0;

        if (stage === 'splitting') {
          setAiProgress('✂️ AI 正在分割题目（约 10-30 秒）...');
          setAiPercent(20);
        } else if (stage === 'recognizing') {
          const pct = total > 0 ? 30 + Math.round((cur / total) * 60) : 30;
          setAiProgress(`⚡ AI 正在识别题目 ${cur}/${total}...`);
          setAiPercent(pct);
        } else if (stage === 'saving') {
          setAiProgress('💾 正在保存到数据库...');
          setAiPercent(95);
        }

        if (status.status === 'done') {
          setAiPercent(100);
          setAiProgress('✅ 导入完成！');
          message.success(status.result?.message || '导入成功');
          setTimeout(() => {
            setAiImportVisible(false);
            setAiText('');
            setAiProgress('');
            setAiPercent(0);
            loadPapers();
          }, 800);
          return;
        }

        if (status.status === 'error') {
          throw new Error(status.error || '导入失败');
        }
      }

      throw new Error('任务超时，请稍后重试');
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCancelAIImport = () => {
    if (aiLoading) {
      Modal.confirm({
        title: '任务正在进行中',
        content: '确定要关闭吗？任务会在后台继续执行，但无法查看进度。',
        onOk: () => {
          setAiImportVisible(false);
          setAiText('');
          setAiProgress('');
          setAiPercent(0);
          setAiLoading(false);
        },
      });
    } else {
      setAiImportVisible(false);
      setAiText('');
      setAiProgress('');
      setAiPercent(0);
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '学科', dataIndex: 'subject', key: 'subject' },
    { title: '年份', dataIndex: 'year', key: 'year' },
    { title: '题量', dataIndex: 'question_count', key: 'question_count' },
    {
  title: '时长',
  dataIndex: 'duration',
  key: 'duration',
  width: 90,
  render: (v: number) => (v ? `${v} 分钟` : '不限时'),
},
    { title: '总分', dataIndex: 'total_score', key: 'total_score' },
    {
      title: '操作',
      key: 'action',
      width: 380,
      render: (_: any, record: Paper) => (
        <Space>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() => handleStartQuiz(record.id)}
            size="small"
          >
            考试
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
            size="small"
          >
            详情
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/papers/${record.id}/edit`)}
            size="small"
          >
            编辑
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={() => openExportModal(record.id, record.name)}
            size="small"
          >
            导出
          </Button>
          <Popconfirm
            title="确定删除该卷子吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card>
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h1 className="text-2xl font-bold">📚 卷子管理</h1>
          <Space wrap>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={() => setAiImportVisible(true)}
            >
              智能导入卷子
            </Button>
            <Button
              type="primary"
              icon={<PictureOutlined />}
              onClick={() => setImageImportVisible(true)}
            >
              图片导入卷子
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              新建卷子
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={papers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 新建卷子模态框 */}
      <Modal
        title="新建卷子"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="卷子名称"
            rules={[{ required: true, message: '请输入卷子名称' }]}
          >
            <Input placeholder="例如：2023 鞍山中考数学模拟" />
          </Form.Item>
          <Form.Item
            name="subject"
            label="学科"
            rules={[{ required: true, message: '请选择学科' }]}
          >
            <Select placeholder="选择学科">
              <Option value="数学">数学</Option>
              <Option value="语文">语文</Option>
              <Option value="英语">英语</Option>
              <Option value="物理">物理</Option>
              <Option value="化学">化学</Option>
              <Option value="生物">生物</Option>
              <Option value="历史">历史</Option>
              <Option value="地理">地理</Option>
              <Option value="政治">政治</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="year"
            label="年份"
            rules={[{ required: true, message: '请输入年份' }]}
          >
            <Input type="number" placeholder="例如 2023" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 卷子详情模态框 */}
      <Modal
        title="卷子详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
          selectedPaper && (
            <Button
              key="quiz"
              type="primary"
              onClick={() => {
                setDetailVisible(false);
                handleStartQuiz(selectedPaper.id);
              }}
            >
              开始考试
            </Button>
          ),
        ]}
        width={700}
      >
        {selectedPaper && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="名称">{selectedPaper.name}</Descriptions.Item>
              <Descriptions.Item label="学科">{selectedPaper.subject}</Descriptions.Item>
              <Descriptions.Item label="年份">{selectedPaper.year}</Descriptions.Item>
              <Descriptions.Item label="题量">{selectedPaper.question_count}</Descriptions.Item>
              <Descriptions.Item label="时长">
  {selectedPaper.duration ? `${selectedPaper.duration} 分钟` : '不限时'}
</Descriptions.Item>
              <Descriptions.Item label="总分">{selectedPaper.total_score}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{selectedPaper.created_time}</Descriptions.Item>
            </Descriptions>
            <Divider>题目列表</Divider>
            {selectedPaper.questions && selectedPaper.questions.length > 0 ? (
              <Table
                dataSource={selectedPaper.questions}
                rowKey="question_id"
                columns={[
                  { title: '题号', dataIndex: 'number', key: 'number' },
                  { title: '题目ID', dataIndex: 'question_id', key: 'question_id' },
                  { title: '分值', dataIndex: 'score', key: 'score' },
                ]}
                pagination={false}
                size="small"
              />
            ) : (
              <div className="text-gray-400 text-center py-4">暂无题目</div>
            )}
          </div>
        )}
      </Modal>

      {/* AI智能导入模态框（带进度） */}
      <Modal
        title="🤖 智能导入卷子"
        open={aiImportVisible}
        onCancel={handleCancelAIImport}
        maskClosable={!aiLoading}
        footer={[
          <Button key="cancel" onClick={handleCancelAIImport} disabled={!aiLoading && false}>
            {aiLoading ? '后台运行并关闭' : '取消'}
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={aiLoading}
            onClick={handleAIImport}
            disabled={aiLoading}
          >
            {aiLoading ? '导入中…' : '开始导入'}
          </Button>,
        ]}
        width={700}
      >
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            请粘贴整套试卷的文本内容，系统将自动识别试卷信息、分割题目并创建卷子。
          </p>
          <TextArea
            rows={10}
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="粘贴试卷文本..."
            disabled={aiLoading}
          />
        </div>

        {aiLoading && (
          <div style={{ marginTop: 12 }}>
            <Progress
              percent={aiPercent}
              status="active"
              strokeColor={{ from: '#108ee9', to: '#87d068' }}
            />
            <div
              style={{
                marginTop: 8,
                textAlign: 'center',
                color: '#1890ff',
                fontSize: 13,
              }}
            >
              {aiProgress}
            </div>
          </div>
        )}
      </Modal>

      {/* 图片导入卷子模态框 */}
      <ImageImportPaperModal
        open={imageImportVisible}
        onCancel={() => setImageImportVisible(false)}
        onSuccess={() => {
          setImageImportVisible(false);
          loadPapers();
          message.success('试卷导入成功');
        }}
      />

      {/* 统一的导出设置模态框 */}
      <Modal
        title="📤 导出设置"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        onOk={handleExport}
        confirmLoading={exportLoading}
        okText="导出"
        cancelText="取消"
        width={550}
      >
        <Form
          form={exportForm}
          layout="vertical"
          initialValues={{
            format: 'html',
            show_answer: true,
            show_explanation: true,
            show_knowledge: true,
            show_score: true,
            answer_position: 'inline',
          }}
        >
          <Form.Item name="format" label="导出格式">
            <Radio.Group>
              <Radio value="html">HTML</Radio>
              <Radio value="docx">Word (.docx)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="show_answer" label="显示答案" valuePropName="checked">
            <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
          </Form.Item>
          <Form.Item name="show_explanation" label="显示解析" valuePropName="checked">
            <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
          </Form.Item>
          <Form.Item name="show_knowledge" label="显示知识点" valuePropName="checked">
            <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
          </Form.Item>
          <Form.Item name="show_score" label="显示分值" valuePropName="checked">
            <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
          </Form.Item>

          <Form.Item name="answer_position" label="答案位置">
            <Radio.Group>
              <Radio value="inline">每题下方</Radio>
              <Radio value="end">末尾集中</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Papers;