import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  Divider,
  Alert,
  Tabs,
  message,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { useQuestionStore } from '../../store/questionStore';
import { Question, QuestionCreate, QuestionUpdate } from '../../types';
import KatexRenderer from '../Latex/KatexRenderer';
import SimpleLatexToolbar from '../Latex/SimpleLatexToolbar';
import GeometryBoard from '../Geometry/GeometryBoard';
import GeometryRenderer from '../Geometry/GeometryRenderer';
import { DrawingData } from '../../types/geometry';
import ImageRecognizeModal from './ImageRecognizeModal';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface QuestionFormProps {
  question?: Question;
  onSave: (question: QuestionCreate | QuestionUpdate) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

interface OptionItem {
  key: string;
  value: string;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  question,
  onSave,
  onCancel,
  isEditing = false,
}) => {
  const [form] = Form.useForm();
  const { categories, isLoading } = useQuestionStore();
  const [hasOptions, setHasOptions] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  const [content, setContent] = useState(question?.content || '');
  const [answer, setAnswer] = useState(question?.answer || '');
  const [explanation, setExplanation] = useState(question?.explanation || '');

  // 几何画板
  const [boardOpen, setBoardOpen] = useState(false);
  const [drawing, setDrawing] = useState<DrawingData | null>(question?.drawing || null);

  // ⭐ 图片识别
  const [recognizeOpen, setRecognizeOpen] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(
    question?.original_image || null
  );

  const availableSubjects =
    categories.subjects.length > 0
      ? categories.subjects
      : ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];

  const availableTypes =
    categories.types.length > 0
      ? categories.types
      : ['选择题', '多选题', '填空题', '解答题', '判断题', '简答题'];

  const availableDifficulties =
    categories.difficulties.length > 0 ? categories.difficulties : ['基础', '中等', '拔高'];

  useEffect(() => {
    if (question) {
      const formValues = {
        ...question,
        options: question.options
          ? Object.entries(question.options).map(([key, value]) => ({ key, value }))
          : [],
        exam_name: question.exam?.exam_name,
        year: question.exam?.year,
        number: question.exam?.number,
        score: question.exam?.score,
        exam_source: question.exam?.source,
      };
      form.setFieldsValue(formValues);
      setHasOptions(question.type === '选择题' || question.type === '多选题');
      setContent(question.content || '');
      setAnswer(question.answer || '');
      setExplanation(question.explanation || '');
      setDrawing(question.drawing || null);
      setOriginalImage(question.original_image || null);
    }
  }, [question, form]);

  const handleSubmit = async (values: any) => {
    try {
      console.log('📤 提交数据:', { values, content, answer, explanation, drawing, originalImage });

      const formData: any = {
        subject: values.subject,
        type: values.type,
        content: content,
        answer: answer,
        difficulty: values.difficulty,
        explanation: explanation,
        knowledge_points: values.knowledge_points,
        chapter: values.chapter,
        tags: values.tags,
        source: values.source,
        note: values.note,
        drawing: drawing || null,
        original_image: originalImage || null, // ⭐ 新增
      };

      if (values.exam_name) formData.exam_name = values.exam_name;
      if (values.year) formData.year = Number(values.year);
      if (values.number) formData.number = Number(values.number);
      if (values.score) formData.score = Number(values.score);
      if (values.exam_source) formData.exam_source = values.exam_source;

      if (hasOptions && values.options) {
        const options: Record<string, string> = {};
        values.options.forEach((opt: OptionItem) => {
          if (opt.key && opt.value) options[opt.key] = opt.value;
        });
        formData.options = options;
      }

      console.log('📦 最终提交数据:', formData);
      onSave(formData);
    } catch (error) {
      console.error('❌ 保存题目失败:', error);
      message.error('保存失败，请检查控制台错误信息');
    }
  };

  const handleTypeChange = (type: string) => {
    setHasOptions(type === '选择题' || type === '多选题');
  };

  const handleLatexInsert = (
    latexCode: string,
    field: 'content' | 'answer' | 'explanation'
  ) => {
    const setters = {
      content: setContent,
      answer: setAnswer,
      explanation: setExplanation,
    };
    if (setters[field]) {
      setters[field]((prev) => prev + `$${latexCode}$`);
    }
  };

  const renderWithLatex = (text: string) => {
    if (!text) return <span style={{ color: '#999' }}>暂无内容</span>;
    const parts = text.split(/(\$[^$]+\$)/);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const latex = part.slice(1, -1);
        return <KatexRenderer key={index} content={latex} />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <Card title={isEditing ? '编辑题目' : '添加题目'}>
      {/* ⭐ 拍照识别入口 */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<CameraOutlined />}
          onClick={() => setRecognizeOpen(true)}
          size="large"
        >
          📷 拍照/上传图片识别
        </Button>
        <span style={{ marginLeft: 12, color: '#888', fontSize: 13 }}>
          支持手写题、印刷题、含图形与公式的题目
        </span>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          difficulty: '中等',
          tags: [],
          ...question,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Form.Item
              name="subject"
              label="学科"
              rules={[{ required: true, message: '请选择学科' }]}
            >
              <Select placeholder="选择学科">
                {availableSubjects.map((subject: string) => (
                  <Option key={subject} value={subject}>
                    {subject}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="type"
              label="题型"
              rules={[{ required: true, message: '请选择题型' }]}
            >
              <Select placeholder="选择题型" onChange={handleTypeChange}>
                {availableTypes.map((type: string) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="difficulty" label="难度">
              <Select placeholder="选择难度">
                {availableDifficulties.map((difficulty: string) => (
                  <Option key={difficulty} value={difficulty}>
                    {difficulty}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div>
            <Form.Item name="chapter" label="章节">
              <Input placeholder="输入章节名称" />
            </Form.Item>

            <Form.Item name="knowledge_points" label="知识点">
              <Input placeholder="输入知识点，多个用逗号分隔" />
            </Form.Item>

            <Form.Item name="tags" label="标签">
              <Select mode="tags" placeholder="添加标签">
                {categories.tags.map((tag: string) => (
                  <Option key={tag} value={tag}>
                    {tag}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </div>

        <Divider />

        {/* 题目内容 */}
        <Form.Item
          label="题目内容"
          required
          rules={[{ required: true, message: '请输入题目内容' }]}
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="编辑" key="edit">
              <SimpleLatexToolbar
                onInsert={(code) => handleLatexInsert(code, 'content')}
              />
              <TextArea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入题目内容，使用LaTeX工具栏插入公式..."
                rows={6}
                style={{ marginTop: '8px' }}
              />
            </TabPane>
            <TabPane tab="预览" key="preview">
              <div
                style={{
                  border: '1px solid #d9d9d9',
                  padding: '16px',
                  borderRadius: '6px',
                  minHeight: '100px',
                  background: '#fafafa',
                }}
              >
                {renderWithLatex(content)}
              </div>
            </TabPane>
          </Tabs>
        </Form.Item>

        {/* 几何图形 */}
        <Form.Item label="几何图形">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space>
              <Button icon={<EditOutlined />} onClick={() => setBoardOpen(true)}>
                {drawing ? '编辑图形' : '绘制图形'}
              </Button>
              {drawing && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setDrawing(null)}
                >
                  清除图形
                </Button>
              )}
            </Space>
            {drawing && drawing.elements && drawing.elements.length > 0 ? (
              <GeometryRenderer data={drawing} height={260} />
            ) : (
              <div style={{ color: '#999', fontSize: 13 }}>
                暂无图形，点击「绘制图形」打开几何画板
              </div>
            )}
          </Space>
        </Form.Item>

        {/* ⭐ 原始图片 */}
        {originalImage && (
          <Form.Item label="原始图片">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={`http://localhost:8000/images/${originalImage}`}
                alt="题目原图"
                style={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: 4,
                  border: '1px solid #eee',
                  display: 'block',
                }}
              />
              <Button
                size="small"
                danger
                style={{ position: 'absolute', top: 4, right: 4 }}
                onClick={() => setOriginalImage(null)}
              >
                移除
              </Button>
            </div>
          </Form.Item>
        )}

        {hasOptions && (
          <Form.Item label="选项">
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space
                      key={key}
                      style={{ display: 'flex', marginBottom: 8 }}
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'key']}
                        rules={[{ required: true, message: '请输入选项字母' }]}
                      >
                        <Input placeholder="选项字母 (A/B/C/D)" style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '请输入选项内容' }]}
                      >
                        <Input placeholder="选项内容" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      添加选项
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>
        )}

        {/* 答案 */}
        <Form.Item
          label="答案"
          required
          rules={[{ required: true, message: '请输入答案' }]}
        >
          <div>
            <SimpleLatexToolbar
              onInsert={(code) => handleLatexInsert(code, 'answer')}
            />
            <TextArea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="请输入正确答案（多选题请连续填写字母，如'ABC'）"
              rows={3}
              style={{ marginTop: '8px' }}
            />
          </div>
          {answer && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                border: '1px solid #e8e8e8',
                borderRadius: '4px',
                background: '#f9f9f9',
              }}
            >
              <strong>预览: </strong>
              {renderWithLatex(answer)}
            </div>
          )}
        </Form.Item>

        {/* 解析 */}
        <Form.Item label="解析">
          <div>
            <SimpleLatexToolbar
              onInsert={(code) => handleLatexInsert(code, 'explanation')}
            />
            <TextArea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="输入题目解析，使用LaTeX工具栏插入公式..."
              rows={4}
              style={{ marginTop: '8px' }}
            />
          </div>
          {explanation && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                border: '1px solid #e8e8e8',
                borderRadius: '4px',
                background: '#f9f9f9',
              }}
            >
              <strong>预览: </strong>
              {renderWithLatex(explanation)}
            </div>
          )}
        </Form.Item>

        <Form.Item name="source" label="来源">
          <Input placeholder="题目来源" />
        </Form.Item>

        <Divider orientation="left">考试归属（选填）</Divider>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="exam_name" label="考试名称">
            <Input placeholder="如：鞍山中考" />
          </Form.Item>
          <Form.Item name="year" label="年份">
            <Input type="number" placeholder="如：2023" />
          </Form.Item>
          <Form.Item name="number" label="题号">
            <Input type="number" placeholder="如：10" />
          </Form.Item>
          <Form.Item name="score" label="分值">
            <Input type="number" step="0.5" placeholder="如：10" />
          </Form.Item>
          <Form.Item name="exam_source" label="试卷来源" className="md:col-span-2">
            <Input placeholder="如：鞍山市2023年中考数学卷" />
          </Form.Item>
        </div>

        <Form.Item name="note" label="备注">
          <TextArea placeholder="添加备注" rows={2} />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isLoading}
            >
              {isEditing ? '更新题目' : '添加题目'}
            </Button>
            <Button icon={<CloseOutlined />} onClick={onCancel}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* 几何画板 */}
      <GeometryBoard
        open={boardOpen}
        value={drawing}
        onOk={(data: DrawingData | null) => {
          setDrawing(data);
          setBoardOpen(false);
          message.success('图形已保存到题目');
        }}
        onCancel={() => setBoardOpen(false)}
      />

      {/* ⭐ 图片识别模态框 */}
      <ImageRecognizeModal
        open={recognizeOpen}
        onCancel={() => setRecognizeOpen(false)}
        onApply={(data) => {
          // 填充文本字段
          if (data.content) setContent(data.content);
          if (data.answer) setAnswer(data.answer);

          // 填充表单字段
          form.setFieldsValue({
            subject: data.subject,
            type: data.type,
            difficulty: data.difficulty,
            knowledge_points: (data.knowledge_points || []).join('、'),
            score: data.score,
            options: data.options
              ? Object.entries(data.options).map(([key, value]) => ({ key, value }))
              : [],
          });

          // 更新图片
          if (data.original_image) {
            setOriginalImage(data.original_image);
          }

          // 根据题型切换选项显示
          if (data.type === '选择题' || data.type === '多选题') {
            setHasOptions(true);
          } else {
            setHasOptions(false);
          }

          setRecognizeOpen(false);
          message.success('已应用到表单，请检查后保存');
        }}
      />

      {categories.subjects.length === 0 && (
        <Alert
          message="分类数据加载中"
          description="如果分类选项为空，请检查题目数据或刷新页面"
          type="info"
          showIcon
          className="mt-4"
        />
      )}
    </Card>
  );
};

export default QuestionForm;