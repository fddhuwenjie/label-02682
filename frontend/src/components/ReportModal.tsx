import React from 'react'
import { Modal, Row, Col, Progress } from 'antd'
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { SimulationReport } from '../types'

interface Props {
  visible: boolean
  report: SimulationReport | null
  onClose: () => void
}

const ReportModal: React.FC<Props> = ({ visible, report, onClose }) => {
  if (!report) return null

  const { summary, optimization_stats } = report

  const stats = [
    {
      icon: <CheckCircleOutlined />,
      label: '已批准',
      value: summary.approved,
      color: '#10b981'
    },
    {
      icon: <CloseCircleOutlined />,
      label: '已拒绝',
      value: summary.rejected,
      color: '#ef4444'
    },
    {
      icon: <ClockCircleOutlined />,
      label: '待处理',
      value: summary.pending,
      color: '#f59e0b'
    }
  ]

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      styles={{
        content: {
          background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.98), rgba(17, 17, 19, 0.99))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          padding: 0
        },
        body: {
          padding: 32
        }
      }}
    >
      <h2 style={{ 
        margin: 0, 
        marginBottom: 32,
        fontSize: 20, 
        fontWeight: 600,
        color: '#fafafa',
        textAlign: 'center'
      }}>
        模拟报告
      </h2>

      {/* 总请求数 */}
      <div style={{
        textAlign: 'center',
        marginBottom: 32,
        padding: 24,
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ 
          fontSize: 48, 
          fontWeight: 700,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {summary.total_requests}
        </div>
        <div style={{ fontSize: 14, color: '#71717a', marginTop: 4 }}>
          总请求数
        </div>
      </div>

      {/* 请求统计 */}
      <Row gutter={16} style={{ marginBottom: 32 }}>
        {stats.map((stat, index) => (
          <Col span={8} key={index}>
            <div style={{
              textAlign: 'center',
              padding: 20,
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{ 
                fontSize: 28, 
                fontWeight: 600,
                color: stat.color,
                marginBottom: 4
              }}>
                {stat.value}
              </div>
              <div style={{ 
                fontSize: 12, 
                color: '#71717a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}>
                <span style={{ color: stat.color }}>{stat.icon}</span>
                {stat.label}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* 批准率 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: 8
        }}>
          <span style={{ fontSize: 14, color: '#a1a1aa' }}>批准率</span>
          <span style={{ 
            fontSize: 14, 
            fontWeight: 600,
            color: '#10b981'
          }}>
            {(summary.approval_rate * 100).toFixed(1)}%
          </span>
        </div>
        <Progress 
          percent={summary.approval_rate * 100}
          showInfo={false}
          strokeColor={{
            '0%': '#10b981',
            '100%': '#059669'
          }}
          trailColor="rgba(255, 255, 255, 0.05)"
        />
      </div>

      {/* 优化统计 */}
      <div style={{
        padding: 20,
        background: 'rgba(139, 92, 246, 0.1)',
        borderRadius: 12,
        border: '1px solid rgba(139, 92, 246, 0.2)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8,
          marginBottom: 16
        }}>
          <ThunderboltOutlined style={{ color: '#8b5cf6' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#fafafa' }}>
            优化统计
          </span>
        </div>
        
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#8b5cf6' }}>
                {optimization_stats.total_optimizations}
              </div>
              <div style={{ fontSize: 11, color: '#71717a' }}>总优化次数</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#ef4444' }}>
                {optimization_stats.event_triggered}
              </div>
              <div style={{ fontSize: 11, color: '#71717a' }}>事件触发</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#3b82f6' }}>
                {optimization_stats.time_triggered}
              </div>
              <div style={{ fontSize: 11, color: '#71717a' }}>时间触发</div>
            </div>
          </Col>
        </Row>
        
        <div style={{ 
          marginTop: 16, 
          paddingTop: 16,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: 12, color: '#71717a' }}>
            平均执行时间: 
            <span style={{ color: '#10b981', marginLeft: 4 }}>
              {optimization_stats.avg_execution_time.toFixed(3)}s
            </span>
          </span>
        </div>
      </div>
    </Modal>
  )
}

export default ReportModal
