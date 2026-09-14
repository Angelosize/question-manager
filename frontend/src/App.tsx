import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Questions from './pages/Questions';
import Quiz from './pages/Quiz';
import WrongQuestions from './pages/WrongBook';
import Statistics from './pages/Statistics';
import { useQuestionStore } from './store/questionStore';

import Login from './pages/Login';
import Register from './pages/Register';
import ImportExport from './components/Questions/ImportExport';
import Papers from './pages/Papers';
import PaperEdit from './pages/PaperEdit';  // ⭐ 新增
import PaperCompare from './pages/PaperCompare';
import Utils from './pages/Utils';


function App() {
  const { loadQuestions, checkAIStatus } = useQuestionStore();

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
    <ConfigProvider locale={zhCN}>
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
              <Route path="papers/:id/edit" element={<PaperEdit />} />  {/* ⭐ 新增路由 */}
              <Route path="paper-compare" element={<PaperCompare />} />
              <Route path="utils" element={<Utils />} />
            </Route>
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;