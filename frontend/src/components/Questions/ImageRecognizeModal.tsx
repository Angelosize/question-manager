import React, { useState, useRef, useCallback } from 'react';
import {
  Modal, Button, Upload, Alert, Form, Input, Select, InputNumber,
  Space, Spin, message, Row, Col
} from 'antd';
import {
  UploadOutlined, CameraOutlined, RedoOutlined, CheckOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { aiClient } from '../../api/aiClient';

const { TextArea } = Input;
const { Option } = Select;

interface RecognizeResult {
  content?: string;
  options?: Record<string, string> | null;
  answer?: string | null;
  subject?: string;
  type?: string;
  difficulty?: string;
  knowledge_points?: string[];
  score?: number;
  original_image?: string;
}

interface Props {
  open: boolean;
  onCancel: () => void;
  onApply: (data: RecognizeResult) => void;
}

/**
 * 浏览器端图片压缩：最大宽度 1024，jpeg 质量 0.85
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result as string; };
    reader.onerror = reject;
    reader.readAsDataURL(file);

    img.onload = () => {
      const maxW = 1024;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
  });
}

const ImageRecognizeModal: React.FC<Props> = ({ open, onCancel, onApply }) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<RecognizeResult | null>(null);
  const [form] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pastedImage, setPastedImage] = useState<string>('');

  // 处理粘贴（Ctrl+V）
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!open) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          processFile(blob);
          e.preventDefault();
        }
        break;
      }
    }
  }, [open]);

  React.useEffect(() => {
    window.addEventListener('paste', handlePaste as any);
    return () => window.removeEventListener('paste', handlePaste as any);
  }, [handlePaste]);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      message.error('图片不能超过 20MB');
      return;
    }
    try {
      const base64 = await compressImage(file);
      setPastedImage(base64);
      setPreviewUrl(`data:image/jpeg;base64,${base64}`);
      setErrorMsg('');
      setResult(null);
      form.resetFields();
    } catch (e) {
      message.error('图片处理失败');
    }
  };

  const handleUploadChange = (info: any) => {
    const file = info.file?.originFileObj || info.file;
    if (file instanceof File || file instanceof Blob) {
      processFile(file as File);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRecognize = async () => {
    if (!pastedImage) {
      message.warning('请先选择或粘贴一张图片');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const data = await aiClient.recognizeImage(pastedImage, 'image/jpeg');
      console.log('🎉 识别结果:', data);

      if (data.error) {
        setErrorMsg(data.detail || data.error);
        return;
      }

      setResult(data);

      // 填充到表单供用户修改
      form.setFieldsValue({
        content: data.content || '',
        optionA: data.options?.A || '',
        optionB: data.options?.B || '',
        optionC: data.options?.C || '',
        optionD: data.options?.D || '',
        answer: data.answer || '',
        subject: data.subject || '数学',
        type: data.type || '解答题',
        difficulty: data.difficulty || '中档',
        knowledge_points: (data.knowledge_points || []).join('、'),
        score: data.score ?? 3,
      });
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('超时') || msg.includes('504')) {
        setErrorMsg('识别超时，请换一张更清晰的图片');
      } else if (msg.includes('401') || msg.includes('API Key')) {
        setErrorMsg('请先配置智谱 API Key');
      } else if (msg.includes('Network') || msg.includes('network')) {
        setErrorMsg('网络异常，请检查网络连接');
      } else {
        setErrorMsg(msg || '识别失败，请重试或手动录入');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    try {
      const values = await form.validateFields();
      const options: Record<string, string> = {};
      if (values.optionA) options.A = values.optionA;
      if (values.optionB) options.B = values.optionB;
      if (values.optionC) options.C = values.optionC;
      if (values.optionD) options.D = values.optionD;

      const data: RecognizeResult = {
        content: values.content,
        options: Object.keys(options).length > 0 ? options : null,
        answer: values.answer || null,
        subject: values.subject,
        type: values.type,
        difficulty: values.difficulty,
        knowledge_points: values.knowledge_points
          ? values.knowledge_points.split(/[、,，]/).map((s: string) => s.trim()).filter(Boolean)
          : [],
        score: values.score,
        original_image: result?.original_image,
      };

      onApply(data);
    } catch (e: any) {
      message.error('请检查表单内容');
    }
  };

  const handleReset = () => {
    setPreviewUrl('');
    setPastedImage('');
    setResult(null);
    setErrorMsg('');
    form.resetFields();
  };

  const handleCancelInternal = () => {
    handleReset();
    onCancel();
  };

  return (
    <Modal
      title="📷 拍照/上传图片识别题目"
      open={open}
      onCancel={handleCancelInternal}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleCancelInternal}>取消</Button>,
        <Button
          key="reset"
          icon={<RedoOutlined />}
          onClick={handleReset}
          disabled={loading}
        >
          重新选择
        </Button>,
        result ? (
          <Button
            key="apply"
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleApply}
          >
            应用到表单
          </Button>
        ) : (
          <Button
            key="recognize"
            type="primary"
            icon={<CameraOutlined />}
            loading={loading}
            onClick={handleRecognize}
            disabled={!pastedImage}
          >
            {loading ? '识别中…' : '开始识别'}
          </Button>
        ),
      ]}
      destroyOnClose
    >
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: '2px dashed #d9d9d9',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          textAlign: 'center',
          background: previewUrl ? '#fafafa' : '#fff',
        }}
      >
        {previewUrl ? (
          <div>
            <img
              src={previewUrl}
              alt="预览"
              style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 4 }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              预览（已压缩至最长边 1024px）
            </div>
          </div>
        ) : (
          <div>
            <Upload
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handleUploadChange}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />} size="large">点击选择图片</Button>
            </Upload>
            <div style={{ marginTop: 8, color: '#999', fontSize: 13 }}>
              或拖拽图片到此处 · 或直接 Ctrl+V 粘贴截图
            </div>
            <div style={{ marginTop: 8, color: '#bbb', fontSize: 12 }}>
              建议：光线充足、文字清晰、无遮挡、拍摄时保持水平
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <Alert
          message={errorMsg}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="large" tip="AI 正在识别中，请稍候（约 5-15 秒）…">
            <div style={{ height: 80 }} />
          </Spin>
        </div>
      )}

      {result && (
        <Form form={form} layout="vertical">
          <Alert
            type="success"
            message="识别成功！请检查并修改下方内容后，点击「应用到表单」"
            showIcon
            style={{ marginBottom: 12 }}
          />

          <Form.Item name="content" label="题干" rules={[{ required: true }]}>
            <TextArea rows={4} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="optionA" label="选项 A">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="optionB" label="选项 B">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="optionC" label="选项 C">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="optionD" label="选项 D">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="answer" label="答案">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="subject" label="学科">
                <Select>
                  <Option value="数学">数学</Option>
                  <Option value="物理">物理</Option>
                  <Option value="化学">化学</Option>
                  <Option value="英语">英语</Option>
                  <Option value="语文">语文</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="type" label="题型">
                <Select>
                  <Option value="选择题">选择题</Option>
                  <Option value="填空题">填空题</Option>
                  <Option value="解答题">解答题</Option>
                  <Option value="实验题">实验题</Option>
                  <Option value="计算题">计算题</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="difficulty" label="难度">
                <Select>
                  <Option value="基础">基础</Option>
                  <Option value="中档">中档</Option>
                  <Option value="较难">较难</Option>
                  <Option value="压轴">压轴</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={18}>
              <Form.Item name="knowledge_points" label="知识点（用「、」分隔）">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="score" label="分值">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )}
    </Modal>
  );
};

export default ImageRecognizeModal;