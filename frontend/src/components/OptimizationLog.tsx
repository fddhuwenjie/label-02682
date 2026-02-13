import React from 'react'
import { Tag } from 'antd'
import { 
  ThunderboltOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'

interface LogEntry {
  time: number
  trigger_type: string
  trigger_reason: string
  requests_count: number
  pareto_size: number
  execution_time: number
}

interface Props {
  logs: LogEntry[]
}

const OptimizationLog: React.FC<Props> = ({ logs }) => {
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) + 8
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.8), rgba(17, 17, 19, 0.9))',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 20,
      padding: 24
    }}>
      <h3 style={{ 
        margin: 0, 
        marginBottom: 20,
        fontSize: 16, 
        fontWeight: 600,
        color: '#fafafa'
      }}>
        优化日志
      </h3>
      
      <div style={{ 
        maxHeight: 300, 
        overflowY: 'auto',
        paddingRight: 8
      }}>
        {logs.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 40,
            color: '#71717a'
          }}>
            暂无优化记录
          </div>
        ) : (
          logs.slice().reverse().map((log, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                padding: 20,
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 12,
                marginBottom: 16,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: log.trigger_type === 'event' 
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))'
                  : log.trigger_type === 'time'
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))'
                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {log.trigger_type === 'event' ? (
                  <ThunderboltOutlined style={{ color: '#ef4444', fontSize: 18 }} />
                ) : log.trigger_type === 'time' ? (
                  <ClockCircleOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                ) : (
                  <CheckCircleOutlined style={{ color: '#8b5cf6', fontSize: 18 }} />
                )}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12,
                  marginBottom: 10
                }}>
                  <span style={{ 
                    fontSize: 15, 
                    fontWeight: 500,
                    color: '#fafafa'
                  }}>
                    {formatTime(log.time)}
                  </span>
                  <Tag 
                    style={{ 
                      margin: 0,
                      borderRadius: 4,
                      border: 'none',
                      background: log.trigger_type === 'event' 
                        ? 'rgba(239, 68, 68, 0.15)' 
                        : log.trigger_type === 'time' 
                        ? 'rgba(59, 130, 246, 0.15)' 
                        : 'rgba(139, 92, 246, 0.15)',
                      color: log.trigger_type === 'event' 
                        ? '#f87171' 
                        : log.trigger_type === 'time' 
                        ? '#60a5fa' 
                        : '#a78bfa'
                    }}
                  >
                    {log.trigger_type === 'event' ? '事件触发' : 
                     log.trigger_type === 'time' ? '时间触发' : 
                     '手动触发'}
                  </Tag>
                </div>
                
                <div style={{ 
                  fontSize: 13, 
                  color: '#a1a1aa',
                  marginBottom: 12
                }}>
                  {log.trigger_reason}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: 24,
                  fontSize: 13,
                  color: '#71717a'
                }}>
                  <span>
                    请求数: <span style={{ color: '#a1a1aa' }}>{log.requests_count}</span>
                  </span>
                  <span>
                    Pareto解: <span style={{ color: '#3b82f6' }}>{log.pareto_size}</span>
                  </span>
                  <span>
                    耗时: <span style={{ color: '#10b981' }}>{log.execution_time.toFixed(3)}s</span>
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default OptimizationLog
