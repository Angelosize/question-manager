import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Select, InputNumber, Button, Space, Table, message,
  Modal, Row, Col, Tag, Popconfirm, Spin, Empty, Divider
} from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined, PlusOutlined,
  SaveOutlined, SearchOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Question } from '../types';

const { Option } = Select;

interface EditableQuestion {
  question_id: string;
  number: number | string;
  score: number;
  content?: string;
  type?: string;
  subject?: string;
  difficulty?: string;
  answer?: string;
}

const PaperEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paperQuestions, setPaperQuestions] = useState<EditableQuestion[]>([]);
  const [form] = Form.useForm();

  // 添加题目弹窗
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Question[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingIds, setAddingIds] = useState<string[]>([]);

  useEffect(() => {
    if (id) loadPaper(id);
  }, [id]);

  const loadPaper = async (paperId: string) => {
    setLoading(true);
    try {
      const paperData = await apiClient.getPaper(paperId);
      form.setFieldsValue({
        name: paperData.name,
        subject: paperData.subject,
        year: paperData.year,
        duration: paperData.duration || 0,    // ⭐ 回填时长
      });

      const paperQList: any[] = paperData.questions || [];

      // 并行加载每个题目的详情
      const details = await Promise.all(
        paperQList.map(async (pq: any) => {
          try {
            const q = await apiClient.getQuestion(pq.question_id);
            return {
              question_id: pq.question_id,
              number: pq.number,
              score: pq.score,
              content: q?.content || '（题目已被删除）',
              type: q?.type || '',
              subject: q?.subject || '',
              difficulty: q?.difficulty || '',
              answer: q?.answer || '',
            } as EditableQuestion;
          } catch {
            return {
              question_id: pq.question_id,
              number: pq.number,
              score: pq.score,
              content: '（题目已被删除）',
              type: '',
              subject: '',
              difficulty: '',
              answer: '',
            } as EditableQuestion;
          }
        })
      );

      setPaperQuestions(details);
    } catch (err: any) {
      message.error('加载卷子失败：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 规范化题目数据：题号转数字，仅保留必要字段
      const questions = paperQuestions.map((q, idx) => {
        let num: number | string = idx + 1;
        if (typeof q.number === 'number') {
          num = q.number;
        } else if (typeof q.number === 'string') {
          const m = q.number.match(/\d+/);
          num = m ? parseInt(m[0], 10) : idx + 1;
        }
        return {
          question_id: q.question_id,
          number: num,
          score: Number(q.score) || 0,
        };
      });

      await apiClient.updatePaper(id!, {
        name: values.name,
        subject: values.subject,
        year: values.year,
        duration: values.duration || 0,       // ⭐ 提交时长
        questions,
      });

      message.success('保存成功');
      navigate('/papers');
    } catch (err: any) {
      if (err.errorFields) return;
      message.error('保存失败：' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const list = [...paperQuestions];
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    list.forEach((q, i) => { q.number = i + 1; });
    setPaperQuestions(list);
  };

  const handleMoveDown = (index: number) => {
    if (index >= paperQuestions.length - 1) return;
    const list = [...paperQuestions];
    [list[index + 1], list[index]] = [list[index], list[index + 1]];
    list.forEach((q, i) => { q.number = i + 1; });
    setPaperQuestions(list);
  };

  const handleRemove = (index: number) => {
    const list = paperQuestions.filter((_, i) => i !== index);
    list.forEach((q, i) => { q.number = i + 1; });
    setPaperQuestions(list);
    message.success('已移除');
  };

  const handleScoreChange = (index: number, value: number | null) => {
    const list = [...paperQuestions];
    list[index].score = value || 0;
    setPaperQuestions(list);
  };

  const openAddModal = async () => {
    setAddModalVisible(true);
    setSearchKeyword('');
    setAddingIds([]);
    await doSearch('');
  };

  const doSearch = async (kw: string) => {
    setSearching(true);
    try {
      const res = await apiClient.getQuestions({
        page: 1,
        limit: 100,
        keyword: kw || undefined,
      } as any);
      setSearchResults(res.items || []);
    } catch (err: any) {
      message.error('搜索失败：' + (err.message || ''));
    } finally {
      setSearching(false);
    }
  };

  const handleAddSelected = () => {
    if (addingIds.length === 0) {
      message.warning('请先选择要添加的题目');
      return;
    }
    const list = [...paperQuestions];
    let added = 0;
    addingIds.forEach((qid) => {
      if (list.some(x => x.question_id === qid)) return;
      const q = searchResults.find(x => x.id === qid);
      if (!q) return;
      list.push({
        question_id: qid,
        number: list.length + 1,
        score: 5,
        content: q.content,
        type: q.type,
        subject: q.subject,
        difficulty: q.difficulty,
        answer: q.answer,
      });
      added++;
    });
    setPaperQuestions(list);
    setAddModalVisible(false);
    setAddingIds([]);
    message.success(`已添加 ${added} 道题目`);
  };

  const totalScore = paperQuestions.reduce((s, q) => s + (Number(q.score) || 0), 0);
  const questionCount = paperQuestions.length;

  const columns = [
    {
      title: '题号',
      dataIndex: 'number',
      key: 'number',
      width: 70,
      render: (_: any, __: any, idx: number) => <strong>{idx + 1}</strong>,
    },
    {
      title: '题干',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (v: string) => <span title={v}>{v}</span>,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : '-',
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (v: string) => {
        const c = v === '基础' ? 'green' : v === '中等' ? 'orange' : v === '拔高' ? 'red' : 'default';
        return v ? <Tag color={c}>{v}</Tag> : '-';
      },
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 110,
      render: (v: number, _: any, idx: number) => (
        <InputNumber
          value={v}
          min={0}
          step={0.5}
          onChange={(val) => handleScoreChange(idx, val)}
          style={{ width: 90 }}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 170,
      render: (_: any, __: any, idx: number) => (
        <Space size="small">
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={() => handleMoveUp(idx)}
            disabled={idx === 0}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={() => handleMoveDown(idx)}
            disabled={idx === paperQuestions.length - 1}
          />
          <Popconfirm
            title="确定移除该题？"
            onConfirm={() => handleRemove(idx)}
            okText="确认"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const addColumns = [
    { title: '题干', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '学科', dataIndex: 'subject', key: 'subject', width: 80 },
    { title: '题型', dataIndex: 'type', key: 'type', width: 100 },
    { title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 80 },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/papers')}>返回</Button>
            <span>✏️ 编辑卷子</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
          >
            保存
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="卷子名称"
                rules={[{ required: true, message: '请输入卷子名称' }]}
              >
                <Input placeholder="例如：高考化学模拟卷" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="subject"
                label="学科"
                rules={[{ required: true, message: '请选择学科' }]}
              >
                <Select placeholder="选择学科">
                  {['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'].map(s => (
                    <Option key={s} value={s}>{s}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="year"
                label="年份"
                rules={[{ required: true, message: '请输入年份' }]}
              >
                <InputNumber min={2000} max={2100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              {/* ⭐ 新增：考试时长 */}
              <Form.Item
                name="duration"
                label="考试时长（分钟）"
                tooltip="0 表示不限时，倒计时结束会自动提交"
              >
                <InputNumber
                  min={0}
                  max={600}
                  step={5}
                  placeholder="0=不限时"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider />

        <div className="flex justify-between items-center mb-4">
          <Space>
            <span>📝 题目列表</span>
            <Tag color="blue">共 {questionCount} 题</Tag>
            <Tag color="green">总分 {totalScore} 分</Tag>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            从题库添加题目
          </Button>
        </div>

        {paperQuestions.length === 0 ? (
          <Empty description="暂无题目，请从题库添加" />
        ) : (
          <Table
            dataSource={paperQuestions}
            columns={columns}
            rowKey="question_id"
            pagination={false}
            size="small"
          />
        )}
      </Card>

      <Modal
        title="从题库添加题目"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={handleAddSelected}
        okText={`添加选中的 ${addingIds.length} 道题`}
        okButtonProps={{ disabled: addingIds.length === 0 }}
        width={900}
        destroyOnClose
      >
        <Space className="mb-3">
          <Input
            placeholder="搜索题干、答案、知识点..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={() => doSearch(searchKeyword)}
            style={{ width: 400 }}
            allowClear
          />
          <Button type="primary" onClick={() => doSearch(searchKeyword)} loading={searching}>
            搜索
          </Button>
        </Space>

        <Table
          dataSource={searchResults.filter(q => !paperQuestions.some(p => p.question_id === q.id))}
          columns={addColumns}
          rowKey="id"
          loading={searching}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowSelection={{
            selectedRowKeys: addingIds,
            onChange: (keys) => setAddingIds(keys as string[]),
          }}
          scroll={{ y: 300 }}
        />
        <div className="text-gray-500 text-sm mt-2">
          提示：已经添加到卷子的题目不会显示在此列表中。
        </div>
      </Modal>
    </div>
  );
};

export default PaperEdit;