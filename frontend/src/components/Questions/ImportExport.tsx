import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  Upload, 
  message, 
  Modal, 
  Space,
  Typography,
  Alert,
  Progress
} from 'antd';
import { 
  UploadOutlined, 
  DownloadOutlined, 
  RobotOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useApi } from '../../hooks/useApi';
import AIImport from './AIImport';  // 新增 AI 导入组件

const { Title, Text } = Typography;

const ImportExport: React.FC = () => {
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported_count: number;
    message: string;
  } | null>(null);

  // ===== 新增：AI导入模态框状态 =====
  const [aiImportVisible, setAiImportVisible] = useState(false);

  // ============================================================
  //  导出功能
  // ============================================================
  const handleExcelExport = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/import-export/export/excel', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        const link = document.createElement('a');
        link.href = `data:${result.mime_type};base64,${result.data}`;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('Excel导出成功！');
      } else {
        message.error('导出失败');
      }
    } catch (error) {
      message.error('导出过程中发生错误');
    } finally {
      setExportLoading(false);
    }
  };

  const handleTextExport = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/import-export/export/text', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        const link = document.createElement('a');
        link.href = `data:${result.mime_type};base64,${result.data}`;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('文本导出成功！');
      } else {
        message.error('导出失败');
      }
    } catch (error) {
      message.error('导出过程中发生错误');
    } finally {
      setExportLoading(false);
    }
  };

  // ============================================================
  //  导入功能
  // ============================================================
  const excelUploadProps: UploadProps = {
    name: 'file',
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                     file.type === 'application/vnd.ms-excel';
      if (!isExcel) {
        message.error('请上传Excel文件');
        return false;
      }
      return true;
    },
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      setImportLoading(true);
      setImportProgress(0);
      setImportResult(null);

      try {
        const formData = new FormData();
        formData.append('file', file as File);

        const interval = setInterval(() => {
          setImportProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        const response = await fetch('http://localhost:8000/api/import-export/import/excel', {
          method: 'POST',
          body: formData,
        });

        clearInterval(interval);
        setImportProgress(100);

        if (response.ok) {
          const result = await response.json();
          setImportResult(result);
          setModalVisible(true);
          
          if (result.success) {
            message.success(result.message);
            onSuccess?.(result, file as any);
          } else {
            message.warning(result.message);
            onError?.(new Error(result.message), file as any);
          }
        } else {
          throw new Error('导入失败');
        }
      } catch (error) {
        message.error('导入过程中发生错误');
        onError?.(error as Error, file as any);
      } finally {
        setImportLoading(false);
      }
    },
  };

  const handleTextImport = async (text: string) => {
    setImportLoading(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const interval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('http://localhost:8000/api/import-export/import/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
      });

      clearInterval(interval);
      setImportProgress(100);

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        setModalVisible(true);
        if (result.success) {
          message.success(result.message);
          window.location.reload();
        } else {
          message.warning(result.message);
        }
      } else {
        throw new Error(result.detail || result.error || `导入失败: ${response.status}`);
      }
    } catch (error: any) {
      console.error('导入错误:', error);
      if (error.message.includes('422')) {
        message.error('格式错误: 请检查文本格式是否符合要求');
      } else {
        message.error(`导入失败: ${error.message}`);
      }
    } finally {
      setImportLoading(false);
    }
  };

  const showTextImportModal = () => {
    Modal.confirm({
      title: '文本导入题目',
      content: (
        <div>
          <Text>请输入题目文本内容：</Text>
          <br />
          <Text type="secondary">支持格式：</Text>
          <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px' }}>
            {`[数学]选择题\n题目内容...\nA. 选项1\nB. 选项2\n答案: A\n解析: ...`}
          </pre>
        </div>
      ),
      onOk: async () => {
        const text = await new Promise<string>((resolve) => {
          Modal.confirm({
            title: '请输入题目文本',
            width: 600,
            content: (
              <div>
                <textarea 
                  style={{ 
                    width: '100%', 
                    height: '200px', 
                    marginTop: '10px',
                    padding: '8px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px'
                  }}
                  placeholder={`示例：\n[数学]选择题\n1 + 1 = ?\nA. 1\nB. 2\nC. 3\n答案: B`}
                  onChange={(e) => localStorage.setItem('importText', e.target.value)}
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  提示：使用上方格式，每道题之间用空行分隔
                </div>
              </div>
            ),
            onOk: () => resolve(localStorage.getItem('importText') || ''),
            onCancel: () => resolve(''),
          });
        });
        
        if (text && text.trim().length > 0) {
          await handleTextImport(text.trim());
        } else {
          message.warning('请输入有效的题目文本');
        }
      },
    });
  };

  // ============================================================
  //  渲染
  // ============================================================
  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>📤 导入导出管理</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 导出功能 */}
        <Card title="📤 导出题目" bordered={false}>
          <Space size="middle">
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              loading={exportLoading}
              onClick={handleExcelExport}
              size="large"
            >
              导出Excel
            </Button>
            
            <Button 
              icon={<DownloadOutlined />}
              loading={exportLoading}
              onClick={handleTextExport}
              size="large"
            >
              导出文本
            </Button>
          </Space>
          
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              Excel导出包含完整题目数据，文本导出便于阅读和分享
            </Text>
          </div>
        </Card>

        {/* 导入功能 */}
        <Card title="📥 导入题目" bordered={false}>
          <Space size="middle" wrap>
            <Upload {...excelUploadProps}>
              <Button 
                icon={<UploadOutlined />}
                loading={importLoading}
                size="large"
              >
                导入Excel
              </Button>
            </Upload>
            
            <Button 
              icon={<UploadOutlined />}
              loading={importLoading}
              onClick={showTextImportModal}
              size="large"
            >
              导入文本
            </Button>

            {/* ===== 新增：AI智能导入按钮 ===== */}
            <Button 
              icon={<RobotOutlined />}
              onClick={() => setAiImportVisible(true)}
              size="large"
              type="primary"
              ghost
            >
              AI 智能导入
            </Button>
          </Space>

          {importLoading && (
            <div style={{ marginTop: '16px' }}>
              <Progress percent={importProgress} status="active" />
              <Text type="secondary">正在处理导入...</Text>
            </div>
          )}
          
          <div style={{ marginTop: '16px' }}>
            <Alert
              message="导入说明"
              description={
                <ul>
                  <li>Excel导入支持.xlsx和.xls格式</li>
                  <li>文本导入支持多种自由格式</li>
                  <li>AI智能导入：粘贴题目原文，自动识别并添加</li>
                  <li>导入时会自动生成题目ID</li>
                  <li>重复导入不会创建重复题目</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </div>
        </Card>
      </Space>

      {/* 导入结果模态框 */}
      <Modal
        title="导入结果"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {importResult && (
          <Alert
            message={importResult.message}
            type={importResult.success ? 'success' : 'warning'}
            showIcon
          />
        )}
      </Modal>

      {/* ===== 新增：AI导入模态框 ===== */}
      <AIImport
        visible={aiImportVisible}
        onClose={() => setAiImportVisible(false)}
        onSuccess={() => {
          // 刷新题目列表（可根据项目实际情况调用 store 的 loadQuestions）
          window.location.reload();
        }}
      />
    </div>
  );
};

export default ImportExport;