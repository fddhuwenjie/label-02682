import React, { useState, useEffect, useRef } from 'react'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const Login: React.FC = () => {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 星空背景动画
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 创建星星
    const stars: Array<{
      x: number
      y: number
      radius: number
      opacity: number
      speed: number
      twinkleSpeed: number
    }> = []

    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random(),
        speed: Math.random() * 0.5 + 0.1,
        twinkleSpeed: Math.random() * 0.02 + 0.005
      })
    }

    // 流星
    const shootingStars: Array<{
      x: number
      y: number
      length: number
      speed: number
      opacity: number
      active: boolean
    }> = []

    const createShootingStar = () => {
      if (shootingStars.length < 3 && Math.random() < 0.01) {
        shootingStars.push({
          x: Math.random() * canvas.width,
          y: 0,
          length: Math.random() * 80 + 40,
          speed: Math.random() * 8 + 6,
          opacity: 1,
          active: true
        })
      }
    }

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制星星
      stars.forEach(star => {
        star.opacity += star.twinkleSpeed
        if (star.opacity > 1 || star.opacity < 0.2) {
          star.twinkleSpeed = -star.twinkleSpeed
        }

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()

        // 部分星星有光晕
        if (star.radius > 1) {
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.1})`
          ctx.fill()
        }
      })

      // 创建和绘制流星
      createShootingStar()
      shootingStars.forEach((star, index) => {
        if (!star.active) return

        star.x += star.speed
        star.y += star.speed
        star.opacity -= 0.01

        if (star.opacity <= 0 || star.x > canvas.width || star.y > canvas.height) {
          shootingStars.splice(index, 1)
          return
        }

        const gradient = ctx.createLinearGradient(
          star.x, star.y,
          star.x - star.length * 0.7, star.y - star.length * 0.7
        )
        gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`)
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

        ctx.beginPath()
        ctx.moveTo(star.x, star.y)
        ctx.lineTo(star.x - star.length * 0.7, star.y - star.length * 0.7)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.stroke()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

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
      background: 'linear-gradient(to bottom, #0a0a0b 0%, #0f0f12 50%, #0a0a0b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 星空画布 */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />

      {/* 背景光晕 */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)'
      }} />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)'
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


      </div>
    </div>
  )
}

export default Login
