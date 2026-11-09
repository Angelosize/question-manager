import { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Questions from './pages/Questions';
import Quiz from './pages/Quiz';
import WrongQuestions from './pages/WrongBook';
import Statistics from './pages/Statistics';
import Login from './pages/Login';
import Register from './pages/Register';
import ImportExport from './components/Questions/ImportExport';
import Papers from './pages/Papers';
import PaperEdit from './pages/PaperEdit';
import PaperCompare from './pages/PaperCompare';
import Utils from './pages/Utils';
import Learn from './pages/Learn';

import { useQuestionStore } from './store/questionStore';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { apiClient } from './api/client';

// ⭐ 路由守卫
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

function App() {
  const { loadQuestions, checkAIStatus } = useQuestionStore();
  const isDark = useThemeStore((s) => s.isDark);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

  // ⭐ 登录状态下启动时校验 token 有效性
  useEffect(() => {
    if (isLoggedIn) {
      apiClient.getMe().catch(() => {
        logout();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⭐ 原有：加载题目 + AI 状态（仅在已登录时执行）
  useEffect(() => {
    if (!isLoggedIn) return;

    loadQuestions();
    checkAIStatus();

    const interval = setInterval(() => {
      checkAIStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, [isLoggedIn, loadQuestions, checkAIStatus]);

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
          borderRadius: 10,
          borderRadiusLG: 14,
          borderRadiusSM: 8,
          borderRadiusXS: 6,
          controlHeight: 38,
          controlHeightLG: 44,
          controlHeightSM: 30,
          fontSize: 14,
          lineHeight: 1.65,
          boxShadow:
            '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)',
          boxShadowSecondary:
            '0 4px 16px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
          boxShadowTertiary: '0 1px 2px rgba(15, 23, 42, 0.04)',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
          colorBorderSecondary: isDark ? '#1e293b' : '#f1f5f9',
        },
        components: {
          Card: {
            borderRadiusLG: 14,
            paddingLG: 24,
            headerFontSize: 15,
            headerHeight: 52,
            boxShadowTertiary: 'none',
          },
          Button: {
            borderRadius: 10,
            borderRadiusLG: 12,
            controlHeight: 38,
            fontWeight: 500,
            primaryShadow: '0 2px 6px rgba(59, 130, 246, 0.25)',
          },
          Input: {
            borderRadius: 10,
            borderRadiusLG: 12,
            controlHeight: 38,
            activeShadow: '0 0 0 3px rgba(59, 130, 246, 0.12)',
          },
          InputNumber: { borderRadius: 10, controlHeight: 38 },
          Table: {
            borderRadius: 12,
            headerBg: isDark ? '#0f172a' : '#f8fafc',
            headerColor: isDark ? '#94a3b8' : '#64748b',
            headerSplitColor: 'transparent',
            rowHoverBg: isDark ? '#1e293b' : '#f8fafc',
            cellPaddingBlock: 14,
            cellPaddingInline: 16,
          },
          Modal: {
            borderRadiusLG: 16,
            headerBg: 'transparent',
            contentBg: isDark ? '#1e293b' : '#ffffff',
          },
          Menu: { itemBorderRadius: 10 },
          Tag: { borderRadiusSM: 6 },
          Select: { borderRadius: 10, controlHeight: 38 },
          Tooltip: { borderRadius: 8 },
        },
      }}
    >
      <AntdApp>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="questions" element={<Questions />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="wrong" element={<WrongQuestions />} />
              <Route path="stats" element={<Statistics />} />
              <Route path="import-export" element={<ImportExport />} />
              <Route path="papers" element={<Papers />} />
              <Route path="papers/:id/edit" element={<PaperEdit />} />
              <Route path="paper-compare" element={<PaperCompare />} />
              <Route path="utils" element={<Utils />} />
              <Route path="learn/:questionId" element={<Learn />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;