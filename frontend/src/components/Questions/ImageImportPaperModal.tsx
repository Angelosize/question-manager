import React, { useState, useRef, useCallback } from 'react';
import { Modal, Button, Alert, Spin, message, Tooltip } from 'antd';
import {
  UploadOutlined,
  CameraOutlined,
  RedoOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../api/client';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * 图片压缩：最长边 1024，jpeg 质量 0.85
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
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

interface PageItem {
  base64: string;
  previewUrl: string;
  name?: string;
}

const MAX_PAGES = 20;

const ImageImportPaperModal: React.FC<Props> = ({ open, onCancel, onSuccess }) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [progress, setProgress] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ⭐ 统一处理文件（数组），只处理新增的
  const processFiles = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;

    // 每次处理都基于当前 pages 快照
    let currentCount = pages.length;

    // 数量限制
    const availableSlots = MAX_PAGES - currentCount;
    if (availableSlots <= 0) {
      message.warning(`最多支持 ${MAX_PAGES} 页`);
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      message.warning(`最多支持 ${MAX_PAGES} 页，已自动截断`);
    }

    const newPages: PageItem[] = [];
    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        message.warning(`跳过非图片文件: ${file.name}`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        message.warning(`跳过过大文件: ${file.name}`);
        continue;
      }
      try {
        const b64 = await compressImage(file);
        newPages.push({
          base64: b64,
          previewUrl: `data:image/jpeg;base64,${b64}`,
          name: file.name,
        });
      } catch (e) {
        message.error(`图片处理失败: ${file.name}`);
      }
    }

    if (newPages.length > 0) {
      // 用函数式更新，避免闭包旧值
      setPages((prev) => [...prev, ...newPages]);
      setErrorMsg('');
      setSuccessMsg('');
      setProgress('');
      message.success(`已添加 ${newPages.length} 页`);
    }
  }, [pages.length]);

  // 剪贴板粘贴
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!open || loading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) files.push(blob);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        processFiles(files);
      }
    },
    [open, loading, processFiles]
  );

  React.useEffect(() => {
    window.addEventListener('paste', handlePaste as any);
    return () => window.removeEventListener('paste', handlePaste as any);
  }, [handlePaste]);

  // ⭐ 原生 input 选择文件
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
    // 清空，允许连续选同一个文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openFilePicker = () => {
    if (loading) return;
    fileInputRef.current?.click();
  };

  // ⭐ 拖拽：使用 enter/leave 计数，避免子元素触发抖动
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (loading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setPages([]);
    setErrorMsg('');
    setSuccessMsg('');
    setProgress('');
  };

  // ⭐ 提交任务
  const handleRecognize = async () => {
    if (pages.length === 0) {
      message.warning('请先选择或粘贴至少一页试卷图片');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setProgress(`🚀 正在启动任务（${pages.length} 页）...`);

    try {
      const { task_id } = await apiClient.importPaperByImageAsync(
        pages.map((p) => p.base64),
        'image/jpeg'
      );
      console.log('🎯 任务ID:', task_id, '页数:', pages.length);

      const pollInterval = 800;
      const maxWait = 15 * 60 * 1000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        await new Promise((r) => setTimeout(r, pollInterval));

        let status: any;
        try {
          status = await apiClient.getImportStatus(task_id);
        } catch (err) {
          continue;
        }

        const stage = status.stage || '';
        const cur = status.current || 0;
        const total = status.total || pages.length;

        if (stage === 'vision') {
          setProgress(`🔍 AI 正在识别图片文字（${cur}/${total} 页）...`);
        } else if (stage === 'splitting') {
          setProgress('✂️ AI 正在分割题目（约 10-30 秒）...');
        } else if (stage === 'recognizing') {
          setProgress(`⚡ AI 正在识别题目 ${cur}/${total}...`);
        } else if (stage === 'saving') {
          setProgress('💾 正在保存到数据库...');
        }

        if (status.status === 'done') {
          const msg = status.result?.message || '导入成功';
          const pageInfo = status.result?.pages_recognized
            ? `（成功识别 ${status.result.pages_recognized}/${status.result.page_count} 页）`
            : '';
          setProgress('');
          setSuccessMsg(msg + pageInfo);
          setTimeout(() => {
            setPages([]);
            setSuccessMsg('');
            setProgress('');
            setLoading(false);
            onSuccess();
          }, 1500);
          return;
        }

        if (status.status === 'error') {
          setErrorMsg(status.error || '识别失败');
          setLoading(false);
          setProgress('');
          return;
        }
      }

      setErrorMsg('任务超时（超过 15 分钟），请稍后重试');
      setLoading(false);
      setProgress('');
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('超时') || msg.includes('504')) {
        setErrorMsg('识别超时，请减少页数或换更清晰的图片');
      } else if (msg.includes('401') || msg.includes('API Key')) {
        setErrorMsg('请先配置智谱 API Key');
      } else if (msg.includes('网络') || msg.includes('Network')) {
        setErrorMsg('网络异常，请检查网络连接');
      } else if (msg.includes('未能识别') || msg.includes('清晰度')) {
        setErrorMsg('未能识别出题目，请换更清晰的图片');
      } else {
        setErrorMsg(msg || '识别失败，请重试或使用文本导入');
      }
      setLoading(false);
      setProgress('');
    }
  };

  const handleReset = () => {
    setPages([]);
    setErrorMsg('');
    setSuccessMsg('');
    setProgress('');
    setLoading(false);
  };

  const handleCancelInternal = () => {
    if (loading) {
      Modal.confirm({
        title: '任务正在进行中',
        content: '确定要关闭吗？任务会在后台继续执行，但无法查看进度。',
        onOk: () => {
          handleReset();
          onCancel();
        },
      });
    } else {
      handleReset();
      onCancel();
    }
  };

  const pageCount = pages.length;

  return (
    <Modal
      title={
        <div>
          📷 图片导入卷子（智能识别）
          {pageCount > 0 && (
            <span style={{ marginLeft: 12, fontSize: 13, color: '#888', fontWeight: 'normal' }}>
              共 {pageCount} 页
            </span>
          )}
        </div>
      }
      open={open}
      onCancel={handleCancelInternal}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleCancelInternal} disabled={loading}>
          取消
        </Button>,
        <Button
          key="reset"
          icon={<RedoOutlined />}
          onClick={handleReset}
          disabled={loading || pageCount === 0}
        >
          清空
        </Button>,
        <Button
          key="recognize"
          type="primary"
          icon={<CameraOutlined />}
          loading={loading}
          onClick={handleRecognize}
          disabled={pageCount === 0 || !!successMsg}
        >
          {loading ? '处理中…' : `开始识别（${pageCount} 页）`}
        </Button>,
      ]}
      destroyOnClose
    >
      {/* ⭐ 隐藏的原生 file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {/* 上传/拖拽/粘贴区域 */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={pageCount === 0 ? openFilePicker : undefined}
        style={{
          border: isDragging ? '2px dashed #1890ff' : '2px dashed #d9d9d9',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          textAlign: 'center',
          background: isDragging ? '#e6f7ff' : pageCount > 0 ? '#fafafa' : '#fff',
          cursor: pageCount === 0 && !loading ? 'pointer' : 'default',
          transition: 'all 0.2s',
        }}
      >
        <Button
          icon={<UploadOutlined />}
          size="large"
          onClick={(e) => {
            e.stopPropagation();
            openFilePicker();
          }}
          disabled={loading || pageCount >= MAX_PAGES}
        >
          {pageCount > 0 ? '继续添加页面' : '点击选择图片（可多选）'}
        </Button>
        <div style={{ marginTop: 8, color: '#999', fontSize: 13 }}>
          可拖拽多张图片到此处 · 或直接 <strong>Ctrl+V 粘贴截图</strong> · 支持一次 {MAX_PAGES} 页
        </div>
        <div style={{ marginTop: 8, color: '#bbb', fontSize: 12 }}>
          💡 建议：按顺序上传（第 1 页、第 2 页……）；光线充足、文字清晰、无遮挡
        </div>
      </div>

      {/* 缩略图网格 */}
      {pageCount > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 16,
            maxHeight: 380,
            overflowY: 'auto',
            padding: 4,
          }}
        >
          {pages.map((page, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                border: '1px solid #e0e0e0',
                borderRadius: 6,
                overflow: 'hidden',
                background: '#fff',
                aspectRatio: '3/4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={page.previewUrl}
                alt={`第${idx + 1}页`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  background: 'rgba(24, 144, 255, 0.9)',
                  color: '#fff',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}
              >
                P{idx + 1}
              </div>
              {!loading && (
                <Tooltip title="移除该页">
                  <Button
                    size="small"
                    danger
                    shape="circle"
                    icon={<DeleteOutlined />}
                    onClick={() => removePage(idx)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      zIndex: 10,
                    }}
                  />
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      )}

      {pageCount > 0 && !loading && (
        <div style={{ textAlign: 'center', marginBottom: 12, color: '#666', fontSize: 13 }}>
          按上传顺序合并识别（P1 → P2 → ...）。如需调整顺序，可移除后重新上传。
        </div>
      )}

      {errorMsg && (
        <Alert message={errorMsg} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {successMsg && (
        <Alert message={successMsg} type="success" showIcon style={{ marginBottom: 16 }} />
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="large" tip={progress || '正在处理中...'}>
            <div style={{ height: 80 }} />
          </Spin>
          {progress && (
            <div style={{ marginTop: 12, color: '#1890ff', fontSize: 13 }}>{progress}</div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ImageImportPaperModal;