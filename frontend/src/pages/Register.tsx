import React from 'react';
import { Space, Typography, Divider } from 'antd';  // 移除 Card 导入
import { Link, useNavigate } from 'react-router-dom';
import RegisterForm from '../components/Auth/RegisterForm';  // 确保路径正确

const { Title, Text } = Typography;

const Register: React.FC = () => {
  const navigate = useNavigate();

  const handleRegisterSuccess = () => {
    navigate('/login'); // 注册成功后跳转到登录
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
            创建您的账号
          </Text>
        </div>
        
        <RegisterForm onSuccess={handleRegisterSuccess} />
        
        <Divider style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
        
        <Text style={{ color: 'white' }}>
          已有账号？{' '}
          <Link 
            to="/login" 
            style={{ 
              color: '#1890ff', 
              fontWeight: 'bold',
              textDecoration: 'underline'
            }}
          >
            立即登录
          </Link>
        </Text>
      </Space>
    </div>
  );
};

export default Register;