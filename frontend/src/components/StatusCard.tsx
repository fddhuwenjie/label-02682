import React from 'react'
import { Row, Col, Progress } from 'antd'
import { 
  ClockCircleOutlined, 
  TeamOutlined, 
  ThunderboltOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { SystemStatus } from '../types'

interface Props {
  status: SystemStatus | null
}

const StatusCard: React.FC<Props> = ({ status }) => {
  if (!status) return null

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) + 8
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const stats = [
    {
      icon: <ClockCircleOutlined />,
      label: '当前时间',
      value: formatTime(status.current_time),
      sub: status.current_period,
      color: '#3b82f6'
    },
    {
      icon: <TeamOutlined />,
      label: '座位占用',
      value: `${status.occupied_seats}`,
      sub: `/ ${status.total_seats}`,
      color: '#8b5cf6'
    },
    {
      icon: <ThunderboltOutlined />,
      label: '待处理请求',
      value: status.pending_requests.toString(),
      sub: '个请求',
      color: '#06b6d4'
    },
    {
      icon: <CheckCircleOutlined />,
      label: '今日批准',
      value: status.approved_today.toString(),
      sub: '个预约',
      color: '#10b981'
    }
  ]

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.8), rgba(17, 17, 19, 0.9))',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 20,
      padding: 32
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 32
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: 20, 
          fontWeight: 600,
          color: '#fafafa'
        }}>
          系统状态
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          background: status.is_running 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))'
            : 'rgba(255, 255, 255, 0.05)',
          borderRadius: 20,
          border: `1px solid ${status.is_running ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: status.is_running ? '#10b981' : '#71717a',
            boxShadow: status.is_running ? '0 0 10px #10b981' : 'none'
          }} />
          <span style={{ 
            fontSize: 13, 
            color: status.is_running ? '#10b981' : '#71717a',
            fontWeight: 500
          }}>
            {status.is_running ? '运行中' : '已停止'}
          </span>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {stats.map((stat, index) => (
          <Col span={6} key={index}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}10)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                fontSize: 20,
                color: stat.color
              }}>
                {stat.icon}
              </div>
              <div style={{ 
                fontSize: 11, 
                color: '#71717a', 
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8
              }}>
                {stat.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{
                  fontSize: 32,
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${stat.color}, ${stat.color}cc)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 14, color: '#71717a' }}>
                  {stat.sub}
                </span>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 24 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: 8 
        }}>
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>座位利用率</span>
          <span style={{ 
            fontSize: 13, 
            fontWeight: 600,
            color: '#3b82f6'
          }}>
            {(status.utilization_rate * 100).toFixed(1)}%
          </span>
        </div>
        <Progress 
          percent={status.utilization_rate * 100} 
          showInfo={false}
          strokeColor={{
            '0%': '#3b82f6',
            '100%': '#8b5cf6'
          }}
          trailColor="rgba(255, 255, 255, 0.05)"
          style={{ marginBottom: 0 }}
        />
      </div>
    </div>
  )
}

export default StatusCard
