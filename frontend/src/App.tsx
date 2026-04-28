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
              
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
            </Route>
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;