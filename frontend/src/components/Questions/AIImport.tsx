import React, { useState } from 'react';
import { Modal, Button, Input, Spin, Alert, Form, Select, Tag, Space, message, Divider } from 'antd';
import { RobotOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import KatexRenderer from '../Latex/KatexRenderer';

const { TextArea } = Input;
const { Option } = Select;

interface AIImportProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AIImport: React.FC<AIImportProps> = ({ visible, onClose, onSuccess }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recognizedData, setRecognizedData] = useState<any[]>([]);
  const [isBatch, setIsBatch] = useState(false);

  const handleRecognize = async () => {
    if (!text.trim()) {
      message.warning('请输入题目文本');
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.recognizeBatch(text);
      if (response.success) {
        setRecognizedData(response.data);
        setIsBatch(response.data.length > 1);
        message.success(`识别成功，共 ${response.data.length} 道题`);
      } else {
        message.error(response.error || '识别失败');
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAll = async () => {
    const validItems = recognizedData.filter(item => item.subject && item.answer && !item.error);
    if (validItems.length === 0) {
        message.warning('没有可添加的有效题目（缺少学科或答案）');
        return;
    }
    let successCount = 0;
    for (const item of validItems) {
        try {
            const questionData = {
                subject: item.subject,
                type: item.type || '综合题',
                content: item.content || text,
                answer: item.answer,
                difficulty: item.difficulty || '中等',
                options: item.options || {},
                explanation: item.explanation || '',
                knowledge_points: (item.knowledge_points || []).join('、'),
                tags: item.knowledge_points || [],
                source: 'AI导入',
                // ===== 新增考试归属字段 =====
                exam_name: item.exam_name || '',
                year: item.year || 0,
                number: item.number || 0,   // 从分割或识别中获取
                score: item.score || 0,
                exam_source: item.source || ''
            };
            console.log('📦 最终提交的题目数据:', questionData);  // 添加这行

            await apiClient.createQuestion(questionData);
            successCount++;
        } catch (e) {
            console.error('添加失败:', e);
        }
    }
    message.success(`成功添加 ${successCount} 道题目`);
    onSuccess();
    onClose();
};

  const renderLatex = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\$[^$]+\$)/);
    return parts.map((part, idx) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        return <KatexRenderer key={idx} content={part.slice(1, -1)} />;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <Modal
      title={<span><RobotOutlined /> AI 智能导入</span>}
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>取消</Button>,
        <Button key="recognize" type="primary" onClick={handleRecognize} loading={loading} icon={<RobotOutlined />}>
          识别
        </Button>,
        recognizedData.length > 0 && (
          <Button key="add" type="primary" onClick={handleAddAll} icon={<PlusOutlined />}>
            添加所有题目
          </Button>
        )
      ]}
    >
      <div className="mb-4">
        <TextArea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请粘贴题目文本（支持多道题，AI将自动分割识别）"
        />
        <div className="mt-2 text-gray-400 text-sm">
          示例：<br />
          [数学] 选择题<br />
          1+1=？<br />
          A. 1  B. 2  C. 3  D. 4<br />
          答案：B
        </div>
      </div>

      {loading && <Spin tip="AI 识别中..." />}

      {recognizedData.length > 0 && (
        <div className="mt-4">
          <Divider>识别结果（共 {recognizedData.length} 题）</Divider>
          {recognizedData.map((item, idx) => (
            <div key={idx} className="border border-gray-200 p-3 rounded mb-2">
              <div className="flex justify-between">
                <span className="font-semibold">题号 {item.number || idx+1}</span>
                {item.error ? (
                  <Tag color="red">识别失败: {item.error}</Tag>
                ) : (
                  <Space>
                    <Tag color="blue">{item.subject}</Tag>
                    <Tag color="green">{item.type}</Tag>
                    <Tag color="orange">{item.difficulty}</Tag>
                  </Space>
                )}
              </div>
              {item.error ? (
                <div className="text-red-500">原始内容：{item.content}</div>
              ) : (
                <div>
                  <div><strong>题干：</strong>{renderLatex(item.content)}</div>
                  {item.options && Object.keys(item.options).length > 0 && (
                    <div><strong>选项：</strong>{Object.entries(item.options).map(([k, v]) => `${k}. ${v}`).join('  ')}</div>
                  )}
                  <div><strong>答案：</strong>{item.answer}</div>
                  {item.explanation && <div><strong>解析：</strong>{item.explanation}</div>}
                  {item.knowledge_points && item.knowledge_points.length > 0 && (
                    <div><strong>知识点：</strong>{item.knowledge_points.join('、')}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default AIImport;