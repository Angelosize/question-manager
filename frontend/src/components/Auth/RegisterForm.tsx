import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface RegisterData {
  username: string;
  email: string;
  full_name?: string;
  password: string;
  confirm_password: string;
}

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: RegisterData) => {
    if (values.password !== values.confirm_password) {
      message.error('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          full_name: values.full_name,
          password: values.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('注册成功:', data);
        message.success('注册成功！');
        
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/login');
        }
      } else {
        const error = await response.json();
        message.error(error.detail || '注册失败');
      }
    } catch (error) {
      message.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="用户注册" style={{ maxWidth: 400, margin: '0 auto' }}>
      <Form
        name="register"
        onFinish={onFinish}
        layout="vertical"
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
        </Form.Item>

        <Form.Item
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' }
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
        </Form.Item>

        <Form.Item
          name="full_name"
        >
          <Input prefix={<UserOutlined />} placeholder="姓名（可选）" size="large" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
        </Form.Item>

        <Form.Item
          name="confirm_password"
          rules={[{ required: true, message: '请确认密码' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="确认密码" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            注册
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default RegisterForm;