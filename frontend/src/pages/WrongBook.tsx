import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  message,
  Modal,
  Typography,
  Statistic,
  Row,
  Col,
  Descriptions,
  Divider
} from 'antd';
import {
  DeleteOutlined,
  CheckOutlined,
  EyeOutlined,
  ReloadOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import KatexRenderer from '../components/Latex/KatexRenderer';

const { Title, Text } = Typography;
const { Option } = Select;

interface WrongQuestionItem {
  question_id: string;
  question_data: {
    id: string;
    subject: string;
    type: string;
    content: string;
    answer: string;
    options?: Record<string, string>;
    explanation?: string;
    difficulty?: string;
  };
  user_answers: Array<{ answer: string; time: string }>;
  correct_answer: string;
  wrong_count: number;
  first_wrong: string;
  last_wrong: string;
  mastered: boolean;
  review_count: number;
}

const WrongBook: React.FC = () => {
  const [searchParams] = useSearchParams();
  const subjectFromUrl = searchParams.get('subject') || '';

  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMastered, setFilterMastered] = useState<boolean | undefined>(undefined);
  // ⭐ 初始值从 URL 读取
  const [filterSubject, setFilterSubject] = useState<string | undefined>(
    subjectFromUrl || undefined
  );
  const [stats, setStats] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<WrongQuestionItem | null>(null);
  const navigate = useNavigate();

  // 初次加载
  useEffect(() => {
    loadWrongQuestions(subjectFromUrl || undefined, undefined);
    loadStats();
    if (subjectFromUrl) {
      message.info(`已自动筛选「${subjectFromUrl}」学科的错题`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⭐ URL subject 变化时同步
  useEffect(() => {
    if (subjectFromUrl) {
      setFilterSubject(subjectFromUrl);
      loadWrongQuestions(subjectFromUrl, filterMastered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFromUrl]);

  const loadWrongQuestions = async (
    subjectOverride?: string,
    masteredOverride?: boolean
  ) => {
    setLoading(true);
    try {
      const params: any = {};
      const useMastered = masteredOverride !== undefined ? masteredOverride : filterMastered;
      const useSubject = subjectOverride !== undefined ? subjectOverride : filterSubject;
      if (useMastered !== undefined) params.mastered = useMastered;
      if (useSubject) params.subject = useSubject;
      const data = await apiClient.getWrongQuestions(params);
      setWrongQuestions(data);
    } catch (error) {
      message.error('加载错题本失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiClient.getWrongStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计失败');
    }
  };

  const handleMarkMastered = async (questionId: string) => {
    try {
      await apiClient.markWrongMastered(questionId);
      message.success('已标记为掌握');
      loadWrongQuestions();
      loadStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleRemove = async (questionId: string) => {
    Modal.confirm({
      title: '确认移除',
      content: '确定要从错题本中移除这道题吗？',
      onOk: async () => {
        try {
          await apiClient.removeWrongQuestion(questionId);
          message.success('已移除');
          loadWrongQuestions();
          loadStats();
        } catch (error) {
          message.error('移除失败');
        }
      }
    });
  };

  const handleClearMastered = () => {
    Modal.confirm({
      title: '清空已掌握错题',
      content: '确定要清空所有已掌握的错题吗？',
      onOk: async () => {
        try {
          const result = await apiClient.clearMasteredWrongs();
          message.success(`已清空 ${result.cleared_count} 道已掌握的错题`);
          loadWrongQuestions();
          loadStats();
        } catch (error) {
          message.error('清空失败');
        }
      }
    });
  };

  const handleGeneratePaper = async () => {
    try {
      const questions = await apiClient.generateWrongPaper(10);
      if (questions.length === 0) {
        message.warning('没有未掌握的错题');
        return;
      }
      navigate('/quiz', { state: { questions } });
    } catch (error) {
      message.error('生成错题试卷失败');
    }
  };

  const renderWithLatex = (text: string) => {
    if (!text) return <span style={{ color: '#999' }}>无内容</span>;
    const parts = text.split(/(\$[^$]+\$)/);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const latex = part.slice(1, -1);
        return <KatexRenderer key={index} content={latex} />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const columns = [
    {
      title: '题目内容',
      dataIndex: ['question_data', 'content'],
      key: 'content',
      render: (text: string) => (
        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {renderWithLatex(text)}
        </div>
      )
    },
    {
      title: '学科',
      dataIndex: ['question_data', 'subject'],
      key: 'subject',
      width: 80,
      render: (subject: string) => <Tag color="blue">{subject}</Tag>
    },
    {
      title: '题型',
      dataIndex: ['question_data', 'type'],
      key: 'type',
      width: 80,
      render: (type: string) => <Tag color="green">{type}</Tag>
    },
    {
      title: '错题次数',
      dataIndex: 'wrong_count',
      key: 'wrong_count',
      width: 80,
      render: (count: number) => <Tag color="red">{count} 次</Tag>
    },
    {
      title: '状态',
      dataIndex: 'mastered',
      key: 'mastered',
      width: 100,
      render: (mastered: boolean) => (
        <Tag color={mastered ? 'green' : 'orange'}>
          {mastered ? '已掌握' : '未掌握'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: WrongQuestionItem) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedQuestion(record);
              setDetailVisible(true);
            }}
          />
          {!record.mastered && (
            <Button
              type="text"
              icon={<CheckOutlined />}
              onClick={() => handleMarkMastered(record.question_id)}
            >
              掌握
            </Button>
          )}
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(record.question_id)}
          />
        </Space>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <Title level={2}>
            📚 错题本
            {subjectFromUrl && (
              <Tag color="blue" style={{ marginLeft: 12 }}>
                筛选：{subjectFromUrl}
              </Tag>
            )}
          </Title>
          <Space>
            <Button
              icon={<FileTextOutlined />}
              onClick={handleGeneratePaper}
            >
              生成错题试卷
            </Button>
            <Button
              danger
              onClick={handleClearMastered}
            >
              清空已掌握
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadWrongQuestions();
                loadStats();
              }}
            >
              刷新
            </Button>
          </Space>
        </div>

        {stats && (
          <Row gutter={16} className="mb-6">
            <Col span={6}>
              <Statistic title="总错题" value={stats.total} />
            </Col>
            <Col span={6}>
              <Statistic title="未掌握" value={stats.not_mastered} style={{ color: '#faad14' }} />
            </Col>
            <Col span={6}>
              <Statistic title="已掌握" value={stats.mastered} style={{ color: '#52c41a' }} />
            </Col>
            <Col span={6}>
              <Statistic
                title="掌握率"
                value={stats.mastery_rate}
                suffix="%"
                precision={1}
                valueStyle={{ color: stats.mastery_rate > 50 ? '#52c41a' : '#faad14' }}
              />
            </Col>
          </Row>
        )}

        <div className="flex flex-wrap gap-4 mb-4">
          <Select
            placeholder="筛选状态"
            value={filterMastered}
            onChange={(val) => {
              setFilterMastered(val);
              loadWrongQuestions(undefined, val);
            }}
            style={{ width: 120 }}
            allowClear
          >
            <Option value={false}>未掌握</Option>
            <Option value={true}>已掌握</Option>
          </Select>
          <Select
            placeholder="筛选学科"
            value={filterSubject}
            onChange={(val) => {
              setFilterSubject(val);
              loadWrongQuestions(val, undefined);
            }}
            style={{ width: 120 }}
            allowClear
          >
            {stats?.by_subject && Object.keys(stats.by_subject).map(sub => (
              <Option key={sub} value={sub}>{sub}</Option>
            ))}
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={wrongQuestions}
          rowKey="question_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title="错题详情"
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          footer={null}
          width={700}
        >
          {selectedQuestion && (
            <div>
              <Descriptions column={2} bordered>
                <Descriptions.Item label="学科">{selectedQuestion.question_data.subject}</Descriptions.Item>
                <Descriptions.Item label="题型">{selectedQuestion.question_data.type}</Descriptions.Item>
                <Descriptions.Item label="难度">{selectedQuestion.question_data.difficulty || '未知'}</Descriptions.Item>
                <Descriptions.Item label="错题次数">{selectedQuestion.wrong_count} 次</Descriptions.Item>
                <Descriptions.Item label="首次错误">{selectedQuestion.first_wrong}</Descriptions.Item>
                <Descriptions.Item label="最近错误">{selectedQuestion.last_wrong}</Descriptions.Item>
                <Descriptions.Item label="状态" span={2}>
                  <Tag color={selectedQuestion.mastered ? 'green' : 'orange'}>
                    {selectedQuestion.mastered ? '已掌握' : '未掌握'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <div>
                <strong>题目内容：</strong>
                <div className="p-2 bg-gray-50 rounded mt-1">
                  {renderWithLatex(selectedQuestion.question_data.content)}
                </div>
              </div>

              {selectedQuestion.question_data.options && Object.keys(selectedQuestion.question_data.options).length > 0 && (
                <div className="mt-2">
                  <strong>选项：</strong>
                  {Object.entries(selectedQuestion.question_data.options).map(([key, value]) => (
                    <div key={key} className="p-1">
                      {key}: {renderWithLatex(value as string)}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2">
                <strong>正确答案：</strong>
                <div className="p-2 bg-green-50 rounded mt-1" style={{ color: 'green' }}>
                  {renderWithLatex(selectedQuestion.correct_answer)}
                </div>
              </div>

              <div className="mt-2">
                <strong>您的错误答案历史：</strong>
                {selectedQuestion.user_answers.map((ua, idx) => (
                  <div key={idx} className="p-2 bg-red-50 rounded mt-1" style={{ color: 'red' }}>
                    {ua.time}: {renderWithLatex(ua.answer)}
                  </div>
                ))}
              </div>

              {selectedQuestion.question_data.explanation && (
                <div className="mt-2">
                  <strong>解析：</strong>
                  <div className="p-2 bg-blue-50 rounded mt-1">
                    {renderWithLatex(selectedQuestion.question_data.explanation)}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default WrongBook;