import React, { useState } from 'react';
import { Card, Input, Button, Alert, Spin, Space } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';

const { TextArea } = Input;

interface Props {
  questionId: string;
  onVerdict?: (verdict: string) => void;
}

interface VerdictResult {
  verdict: string;
  feedback: string;
  missing?: string[];
}

const verdictColor = (v: string): string => {
  if (v.includes('讲清楚')) return 'success';
  if (v.includes('差一点')) return 'warning';
  return 'error';
};

const FeynmanInput: React.FC<Props> = ({ questionId, onVerdict }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerdictResult | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiClient.feynmanCheck(questionId, text.trim());
      setResult(data);
      onVerdict?.(data.verdict);
    } catch (e: any) {
      setResult({
        verdict: '没讲到点上',
        feedback: e.message || '提交失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="用你自己的话讲一遍"
      style={{ marginBottom: 24 }}
      styles={{ header: { fontSize: 16, fontWeight: 600 } }}
    >
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
        假装我是你同桌，你怎么给我讲这道题？
      </div>

      <TextArea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="用你自己的话讲一遍，越通俗越好……"
        disabled={loading}
        style={{ fontSize: 15 }}
      />

      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSubmit}
          loading={loading}
          disabled={!text.trim()}
        >
          提交
        </Button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin tip="AI 正在判断……" />
        </div>
      )}

      {result && (
        <Alert
          style={{ marginTop: 16 }}
          type={verdictColor(result.verdict) as any}
          showIcon
          message={
            <Space>
              <span style={{ fontWeight: 600 }}>{result.verdict}</span>
            </Space>
          }
          description={
            <div style={{ lineHeight: 1.7, color: 'var(--text-primary)' }}>
              <div>{result.feedback}</div>
              {result.missing && result.missing.length > 0 && (
                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                  {result.missing.map((m, i) => (
                    <li key={i} style={{ fontSize: 13 }}>
                      漏了：{m}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          }
        />
      )}
    </Card>
  );
};

export default FeynmanInput;