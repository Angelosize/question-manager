import React from 'react';
import { Card, Space, Typography, Divider } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/'); // 登录成功后跳转到首页
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <Space direction="vertical" size="large" style={{ textAlign: 'center', width: '100%' }}>
        <div>
          <Title level={2} style={{ color: 'white', margin: 0 }}>
            📚 全能题目管理器
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
            登录您的账号
          </Text>
        </div>
        
        <LoginForm onSuccess={handleLoginSuccess} />
        
        <Divider style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
        
        <Text style={{ color: 'white' }}>
          还没有账号？{' '}
          <Link 
            to="/register" 
            style={{ 
              color: '#1890ff', 
              fontWeight: 'bold',
              textDecoration: 'underline'
            }}
          >
            立即注册
          </Link>
        </Text>
      </Space>
    </div>
  );
};

export default Login;