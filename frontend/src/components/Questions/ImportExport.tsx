import React, { useState } from 'react'
import {
  Card,
  Button,
  Space,
  Upload,
  message,
  Modal,
  Form,
  Select,
  Divider,
  Steps,
  Alert,
} from 'antd'
import {
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../../store/appStore'

const { Option } = Select
const { Step } = Steps

interface ImportSettings {
  format: 'excel' | 'text'
  subject: string
  defaultType: string
  defaultDifficulty: string
  defaultSource: string
}

const ImportExport: React.FC = () => {
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    format: 'excel',
    subject: '',
    defaultType: '选择题',
    defaultDifficulty: '中等',
    defaultSource: '导入',
  })
  const { categories } = useAppStore()

  const handleExport = (format: 'excel' | 'json' | 'text') => {
    message.success(`正在导出${format.toUpperCase()}格式...`)
    // 这里会调用导出API
  }

  const handleImport = async (file: File, settings: ImportSettings) => {
    try {
      message.info('开始导入题目...')
      
      // 模拟导入过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      message.success(`成功导入题目！使用设置: ${JSON.stringify(settings)}`)
      setImportModalVisible(false)
      setCurrentStep(0)
    } catch (error) {
      message.error('导入失败')
    }
  }

  const steps = [
    {
      title: '选择文件',
      content: (
        <div className="text-center py-8">
          <Upload.Dragger
            accept={importSettings.format === 'excel' ? '.xlsx,.xls' : '.txt,.text'}
            multiple={false}
            beforeUpload={(file) => {
              handleImport(file, importSettings)
              return false
            }}
            className="import-uploader"
          >
            <p className="text-4xl mb-4">
              {importSettings.format === 'excel' ? (
                <FileExcelOutlined style={{ color: '#1890ff' }} />
              ) : (
                <FileTextOutlined />
              )}
            </p>
            <p className="text-lg font-medium">点击或拖拽文件到此处</p>
            <p className="text-gray-500">
              支持 {importSettings.format === 'excel' ? 'Excel (.xlsx, .xls)' : '文本 (.txt)'} 格式
            </p>
          </Upload.Dragger>
        </div>
      ),
    },
    {
      title: '配置选项',
      content: (
        <Form layout="vertical" className="mt-6">
          <Form.Item label="默认学科" required>
            <Select
              value={importSettings.subject}
              onChange={(value) => setImportSettings(prev => ({ ...prev, subject: value }))}
              placeholder="请选择默认学科"
            >
              {categories.subjects.map((subject) => (
                <Option key={subject} value={subject}>
                  {subject}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="默认题型">
              <Select
                value={importSettings.defaultType}
                onChange={(value) => setImportSettings(prev => ({ ...prev, defaultType: value }))}
              >
                {categories.types.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="默认难度">
              <Select
                value={importSettings.defaultDifficulty}
                onChange={(value) => setImportSettings(prev => ({ ...prev, defaultDifficulty: value }))}
              >
                {categories.difficulties.map((difficulty) => (
                  <Option key={difficulty} value={difficulty}>
                    {difficulty}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item label="默认来源">
            <Select
              value={importSettings.defaultSource}
              onChange={(value) => setImportSettings(prev => ({ ...prev, defaultSource: value }))}
            >
              {categories.sources.map((source) => (
                <Option key={source} value={source}>
                  {source}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Alert
            message="导入说明"
            description="这些设置将应用于所有导入的题目。如果文件中包含相应的信息，将以文件中的信息为准。"
            type="info"
            className="mb-4"
          />
        </Form>
      ),
    },
  ]

  return (
    <>
      <Card title="导入导出" className="mb-6">
        <Space wrap>
          {/* 导出按钮 */}
          <Button.Group>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => handleExport('excel')}
            >
              导出Excel
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('json')}
            >
              导出JSON
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('text')}
            >
              导出文本
            </Button>
          </Button.Group>

          <Divider type="vertical" />

          {/* 导入按钮 */}
          <Button.Group>
            <Button
              icon={<UploadOutlined />}
              onClick={() => {
                setImportSettings(prev => ({ ...prev, format: 'excel' }))
                setImportModalVisible(true)
              }}
            >
              导入Excel
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => {
                setImportSettings(prev => ({ ...prev, format: 'text' }))
                setImportModalVisible(true)
              }}
            >
              导入文本
            </Button>
          </Button.Group>
        </Space>

        <div className="mt-4 text-sm text-gray-500">
          <p>📊 支持多种格式导入导出，方便数据迁移和备份</p>
          <p>⚡ Excel格式支持完整的题目信息和选项</p>
          <p>📝 文本格式适合批量快速导入</p>
        </div>
      </Card>

      {/* 导入模态框 */}
      <Modal
        title="导入题目"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false)
          setCurrentStep(0)
        }}
        width={600}
        footer={[
          currentStep > 0 && (
            <Button key="back" onClick={() => setCurrentStep(currentStep - 1)}>
              上一步
            </Button>
          ),
          currentStep < steps.length - 1 ? (
            <Button
              key="next"
              type="primary"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 0 && !importSettings.subject}
            >
              下一步
            </Button>
          ) : (
            <Button key="submit" type="primary" disabled={!importSettings.subject}>
              开始导入
            </Button>
          ),
        ]}
      >
        <Steps current={currentStep} className="mb-6">
          <Step title="选择文件" />
          <Step title="配置选项" />
        </Steps>

        {steps[currentStep].content}
      </Modal>
    </>
  )
}

export default ImportExport