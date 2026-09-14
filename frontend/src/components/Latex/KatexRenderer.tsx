import React, { useEffect, useRef } from 'react';

interface KatexRendererProps {
  content: string;
  displayMode?: boolean;
  className?: string;
}

const KatexRenderer: React.FC<KatexRendererProps> = ({
  content,
  displayMode = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current && typeof window !== 'undefined') {
      containerRef.current.innerHTML = '';
      try {
        const katex = (window as any).katex;
        if (katex) {
          // 清洗 LaTeX 内容
          let cleanedContent = content;
          // 将真正的换行符、制表符、回车符替换为 LaTeX 字面量
          cleanedContent = cleanedContent.replace(/\n/g, '\\n');
          cleanedContent = cleanedContent.replace(/\r/g, '\\r');
          cleanedContent = cleanedContent.replace(/\t/g, '\\t');
          // 将双反斜杠替换为单反斜杠（LaTeX 命令）
          cleanedContent = cleanedContent.replace(/\\\\/g, '\\');
          katex.render(cleanedContent, containerRef.current, {
            displayMode,
            throwOnError: false,
            errorColor: '#cc0000',
          });
        } else {
          // KaTeX 未加载，显示原始内容（带 $ 包裹）
          containerRef.current.textContent = displayMode ? `$${content}$` : `$${content}$`;
        }
      } catch (error) {
        console.error('KaTeX渲染错误:', error);
        // 显示原始内容（不包裹 $，直接显示文本）
        containerRef.current.textContent = content;
        containerRef.current.style.color = 'red';
      }
    }
  }, [content, displayMode]);

  return <span ref={containerRef} className={className} />;
};

export default KatexRenderer;