import React, { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const Login: React.FC = () => {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      await login(values.username, values.password)
      message.success('登录成功')
    } catch (err: any) {
      message.error(err.detail || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)'
      }} />

      <div style={{
        width: 420,
        padding: 48,
        background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.9), rgba(17, 17, 19, 0.95))',
        borderRadius: 24,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto 20px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.4)'
          }}>
            D
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #fafafa, #a1a1aa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            D-NSGA-II
          </h1>
          <p style={{
            margin: '8px 0 0',
            fontSize: 14,
            color: '#71717a'
          }}>
            智能自习室资源分配系统
          </p>
        </div>

        <Form onFinish={onFinish} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#71717a' }} />}
              placeholder="用户名"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                height: 48,
                color: '#fafafa'
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#71717a' }} />}
              placeholder="密码"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                height: 48,
                color: '#fafafa'
              }}
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              style={{
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)'
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{
          marginTop: 32,
          padding: 16,
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ 
            fontSize: 12, 
            color: '#71717a', 
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 1
          }}>
            测试账号
          </div>
          <div style={{ fontSize: 13, color: '#a1a1aa' }}>
            管理员: <span style={{ color: '#fafafa' }}>admin / admin123</span>
          </div>
          <div style={{ fontSize: 13, color: '#a1a1aa' }}>
            学生: <span style={{ color: '#fafafa' }}>student / student123</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
