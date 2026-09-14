import React from 'react';
import { Button, Space } from 'antd';
import {
  FontSizeOutlined,
  CalculatorOutlined
} from '@ant-design/icons';

const latexTemplates = [
  { symbol: '\\frac{a}{b}', name: '分数' },
  { symbol: '\\sqrt{x}', name: '根号' },
  { symbol: 'x^{2}', name: '上标' },
  { symbol: 'x_{n}', name: '下标' },
  { symbol: '\\sum_{i=1}^{n}', name: '求和' },
  { symbol: '\\int_{a}^{b}', name: '积分' },
  { symbol: '\\alpha \\beta \\gamma', name: '希腊字母' },
  { symbol: '\\pm \\times \\div', name: '运算符' },
  { symbol: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', name: '矩阵' },
  { symbol: '\\lim_{x \\to 0}', name: '极限' }
];

interface SimpleLatexToolbarProps {
  onInsert: (latexCode: string) => void;
}

const SimpleLatexToolbar: React.FC<SimpleLatexToolbarProps> = ({ onInsert }) => {
  return (
    <div style={{ 
      padding: '8px', 
      border: '1px solid #d9d9d9', 
      borderRadius: '6px', 
      marginBottom: '8px',
      background: '#fafafa'
    }}>
      <Space size="small" wrap>
        <span style={{ fontWeight: 'bold', color: '#666', fontSize: '12px' }}>LaTeX工具: </span>
        
        {latexTemplates.map((template, index) => (
          <Button
            key={index}
            size="small"
            type="default"
            onClick={() => onInsert(template.symbol)}
            style={{ 
              fontSize: '11px', 
              padding: '0 6px',
              height: '24px'
            }}
          >
            {template.name}
          </Button>
        ))}
        
        <Button
          size="small"
          type="primary"
          icon={<FontSizeOutlined />}
          onClick={() => {
            const custom = prompt('输入LaTeX公式（不要带$符号）:', '\\frac{1}{2}');
            if (custom) onInsert(custom);
          }}
          style={{ height: '24px' }}
        >
          自定义
        </Button>
      </Space>
    </div>
  );
};

export default SimpleLatexToolbar;