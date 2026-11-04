import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Questions from './pages/Questions';
import Quiz from './pages/Quiz';
import WrongQuestions from './pages/WrongBook';
import Statistics from './pages/Statistics';
import { useQuestionStore } from './store/questionStore';
import { useThemeStore } from './store/themeStore';

import Login from './pages/Login';
import Register from './pages/Register';
import ImportExport from './components/Questions/ImportExport';
import Papers from './pages/Papers';
import PaperEdit from './pages/PaperEdit';
import PaperCompare from './pages/PaperCompare';
import Utils from './pages/Utils';
import Learn from './pages/Learn';

function App() {
  const { loadQuestions, checkAIStatus } = useQuestionStore();
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    loadQuestions();
    checkAIStatus();

    const interval = setInterval(() => {
      checkAIStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadQuestions, checkAIStatus]);

  useEffect(() => {
    const checkKatex = () => {
      if (typeof window !== 'undefined' && (window as any).katex) {
        console.log('🎉 KaTeX已加载，可以渲染数学公式！');
        return true;
      }
      console.warn('⚠️ KaTeX尚未加载，请检查CDN');
      return false;
    };
    const timer = setTimeout(checkKatex, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          colorInfo: '#3b82f6',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',

          // ⭐ 圆角节奏（大 → 中 → 小）
          borderRadius: 10,
          borderRadiusLG: 14,
          borderRadiusSM: 8,
          borderRadiusXS: 6,

          // ⭐ 间距 / 高度（更舒适）
          controlHeight: 38,
          controlHeightLG: 44,
          controlHeightSM: 30,
          fontSize: 14,
          lineHeight: 1.65,

          // ⭐ 阴影三级（柔和）
          boxShadow:
            '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)',
          boxShadowSecondary:
            '0 4px 16px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
          boxShadowTertiary: '0 1px 2px rgba(15, 23, 42, 0.04)',

          // ⭐ 边框（更淡更精致）
          colorBorder: isDark ? '#334155' : '#e2e8f0',
          colorBorderSecondary: isDark ? '#1e293b' : '#f1f5f9',
        },
        components: {
          // 卡片：柔和阴影 + 大圆角
          Card: {
            borderRadiusLG: 14,
            paddingLG: 24,
            headerFontSize: 15,
            headerHeight: 52,
            boxShadowTertiary: 'none',
          },
          // 按钮：加大圆角 + 中字重
          Button: {
            borderRadius: 10,
            borderRadiusLG: 12,
            controlHeight: 38,
            fontWeight: 500,
            primaryShadow: '0 2px 6px rgba(59, 130, 246, 0.25)',
          },
          // 输入框：圆角 + focus 光晕
          Input: {
            borderRadius: 10,
            borderRadiusLG: 12,
            controlHeight: 38,
            activeShadow: '0 0 0 3px rgba(59, 130, 246, 0.12)',
          },
          InputNumber: {
            borderRadius: 10,
            controlHeight: 38,
          },
          // 表格：留白更舒适
          Table: {
            borderRadius: 12,
            headerBg: isDark ? '#0f172a' : '#f8fafc',
            headerColor: isDark ? '#94a3b8' : '#64748b',
            headerSplitColor: 'transparent',
            rowHoverBg: isDark ? '#1e293b' : '#f8fafc',
            cellPaddingBlock: 14,
            cellPaddingInline: 16,
          },
          // 弹窗：更大圆角
          Modal: {
            borderRadiusLG: 16,
            headerBg: 'transparent',
            contentBg: isDark ? '#1e293b' : '#ffffff',
          },
          // 菜单：项圆角
          Menu: {
            itemBorderRadius: 10,
          },
          // 标签 / Tag
          Tag: {
            borderRadiusSM: 6,
          },
          // 下拉框
          Select: {
            borderRadius: 10,
            controlHeight: 38,
          },
          // 工具提示
          Tooltip: {
            borderRadius: 8,
          },
        },
      }}
    >
      <AntdApp>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="questions" element={<Questions />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="wrong" element={<WrongQuestions />} />
              <Route path="stats" element={<Statistics />} />
              <Route path="/import-export" element={<ImportExport />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="papers" element={<Papers />} />
              <Route path="papers/:id/edit" element={<PaperEdit />} />
              <Route path="paper-compare" element={<PaperCompare />} />
              <Route path="utils" element={<Utils />} />
              <Route path="/learn/:questionId" element={<Learn />} />
            </Route>
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;