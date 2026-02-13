import React from 'react'
import { Card, Row, Col, Statistic, Progress, Tag } from 'antd'
import { 
  ClockCircleOutlined, 
  TeamOutlined, 
  CheckCircleOutlined,
  SyncOutlined 
} from '@ant-design/icons'
import { SystemStatus } from '../types'

interface Props {
  status: SystemStatus | null
}

const StatusCard: React.FC<Props> = ({ status }) => {
  if (!status) return null

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) + 8 // 从8点开始
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  return (
    <Card title="系统状态" extra={
      status.is_optimizing ? 
        <Tag icon={<SyncOutlined spin />} color="processing">优化中</Tag> :
        <Tag color="success">就绪</Tag>
    }>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Statistic 
            title="当前时间" 
            value={formatTime(status.current_time)}
            prefix={<ClockCircleOutlined />}
            suffix={<Tag color="blue">{status.current_period}</Tag>}
          />
        </Col>
        <Col span={6}>
          <Statistic 
            title="座位占用" 
            value={status.occupied_seats}
            suffix={`/ ${status.total_seats}`}
            prefix={<TeamOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic 
            title="待处理请求" 
            value={status.pending_requests}
            valueStyle={{ color: status.pending_requests > 15 ? '#ff4d4f' : '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic 
            title="今日已批准" 
            value={status.approved_today}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
      </Row>
      <div style={{ marginTop: 16 }}>
        <span style={{ marginRight: 8 }}>座位利用率:</span>
        <Progress 
          percent={Math.round(status.utilization_rate * 100)} 
          status={status.utilization_rate > 0.8 ? 'exception' : 'active'}
          style={{ width: '80%', display: 'inline-block' }}
        />
      </div>
    </Card>
  )
}

export default StatusCard
