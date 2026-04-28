import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  Divider,
  Alert
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { useQuestionStore } from '../../store/questionStore';
import { Question, QuestionCreate, QuestionUpdate } from '../../types';

const { Option } = Select;
const { TextArea } = Input;

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
  isEditing = false
}) => {
  const [form] = Form.useForm();
  const { categories, isLoading } = useQuestionStore();
  const [hasOptions, setHasOptions] = useState(false);

  const availableSubjects = categories.subjects.length > 0 
    ? categories.subjects 
    : ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
  
  const availableTypes = categories.types.length > 0 
    ? categories.types 
    : ['选择题', '填空题', '解答题', '判断题', '简答题'];
  
  const availableDifficulties = categories.difficulties.length > 0 
    ? categories.difficulties 
    : ['基础', '中等', '拔高'];

  useEffect(() => {
    if (question) {
      form.setFieldsValue({
        ...question,
        options: question.options ? Object.entries(question.options).map(([key, value]) => ({
          key,
          value
        })) : []
      });
      
      // 修复这里：确保是 boolean 类型
      const shouldHaveOptions = Boolean(question.options && Object.keys(question.options).length > 0);
      setHasOptions(shouldHaveOptions);
    }
  }, [question, form]);

  const handleSubmit = async (values: any) => {
    try {
      const formData: any = {
        subject: values.subject,
        type: values.type,
        content: values.content,
        answer: values.answer,
        difficulty: values.difficulty,
        explanation: values.explanation,
        knowledge_points: values.knowledge_points,
        chapter: values.chapter,
        tags: values.tags,
        source: values.source,
        note: values.note
      };

      if (hasOptions && values.options) {
        const options: Record<string, string> = {};
        values.options.forEach((opt: OptionItem) => {
          if (opt.key && opt.value) {
            options[opt.key] = opt.value;
          }
        });
        formData.options = options;
      }

      onSave(formData);
    } catch (error) {
      console.error('保存题目失败:', error);
    }
  };

  const handleTypeChange = (type: string) => {
    // 修复这里：明确设置为 boolean
    setHasOptions(type === '选择题');
  };

  return (
    <Card title={isEditing ? '编辑题目' : '添加题目'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          difficulty: '中等',
          tags: [],
          ...question
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
                  <Option key={subject} value={subject}>{subject}</Option>
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
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="difficulty"
              label="难度"
            >
              <Select placeholder="选择难度">
                {availableDifficulties.map((difficulty: string) => (
                  <Option key={difficulty} value={difficulty}>{difficulty}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="chapter"
              label="章节"
            >
              <Input placeholder="输入章节名称" />
            </Form.Item>

            <Form.Item
              name="knowledge_points"
              label="知识点"
            >
              <Input placeholder="输入知识点，多个用逗号分隔" />
            </Form.Item>
          </div>

          <div>
            <Form.Item
              name="tags"
              label="标签"
            >
              <Select mode="tags" placeholder="添加标签">
                {categories.tags.map((tag: string) => (
                  <Option key={tag} value={tag}>{tag}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="source"
              label="来源"
            >
              <Input placeholder="题目来源" />
            </Form.Item>

            <Form.Item
              name="note"
              label="备注"
            >
              <TextArea placeholder="添加备注" rows={3} />
            </Form.Item>
          </div>
        </div>

        <Divider />

        <Form.Item
          name="content"
          label="题目内容"
          rules={[{ required: true, message: '请输入题目内容' }]}
        >
          <TextArea placeholder="请输入题目内容" rows={4} />
        </Form.Item>

        {hasOptions && (
          <Form.Item label="选项">
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
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
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      添加选项
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>
        )}

        <Form.Item
          name="answer"
          label="答案"
          rules={[{ required: true, message: '请输入答案' }]}
        >
          <TextArea placeholder="请输入正确答案" rows={2} />
        </Form.Item>

        <Form.Item
          name="explanation"
          label="解析"
        >
          <TextArea placeholder="输入题目解析" rows={3} />
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
            <Button
              icon={<CloseOutlined />}
              onClick={onCancel}
            >
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>

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