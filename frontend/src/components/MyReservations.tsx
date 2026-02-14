import React, { useState, useEffect } from 'react'
import { Table, Tag, Button, message, Empty, Popconfirm, Card } from 'antd'
import { ReloadOutlined, DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { reservationApi } from '../api'
import { Reservation } from '../types'

interface Props {
  refreshTrigger?: number
}

const MyReservations: React.FC<Props> = ({ refreshTrigger }) => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const mountedRef = React.useRef(true)

  const fetchReservations = async () => {
    setLoading(true)
    try {
      const data: any = await reservationApi.getMyReservations()
      if (mountedRef.current) {
        setReservations(data)
      }
    } catch (err: any) {
      if (mountedRef.current) {
        message.error(err.detail || '获取预约列表失败')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true
    fetchReservations()
    return () => {
      mountedRef.current = false
    }
  }, [refreshTrigger])

  const handleCancel = async (id: number) => {
    try {
      await reservationApi.cancel(id)
      message.success('预约已取消')
      fetchReservations()
    } catch (err: any) {
      message.error(err.detail || '取消失败')
    }
  }

  const formatTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const statusColors: Record<string, string> = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    cancelled: 'default'
  }

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    approved: '已批准',
    rejected: '已拒绝',
    cancelled: '已取消'
  }

  const priorityColors: Record<string, string> = {
    low: 'default',
    normal: 'blue',
    high: 'orange',
    urgent: 'red'
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '时间段',
      key: 'time',
      render: (_: any, record: Reservation) => (
        <span style={{ color: '#fafafa' }}>
          {formatTime(record.start_time)} - {formatTime(record.end_time)}
        </span>
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priorityColors[priority]}>{priority}</Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      )
    },
    {
      title: '座位',
      dataIndex: 'seat_id',
      key: 'seat_id',
      render: (seatId: number | null) => seatId ? `#${seatId}` : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Reservation) => (
        record.status === 'pending' ? (
          <Popconfirm
            title="确定取消此预约？"
            onConfirm={() => handleCancel(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              danger 
              size="small"
              icon={<DeleteOutlined />}
            >
              取消
            </Button>
          </Popconfirm>
        ) : null
      )
    }
  ]

  return (
    <Card
      style={{
        background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.8), rgba(17, 17, 19, 0.9))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UnorderedListOutlined style={{ color: '#8b5cf6', fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fafafa' }}>
            我的预约
          </span>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchReservations}
          loading={loading}
          size="small"
        >
          刷新
        </Button>
      </div>

      {reservations.length > 0 ? (
        <Table
          dataSource={reservations.map(r => ({ ...r, key: r.id }))}
          columns={columns}
          size="small"
          pagination={{ pageSize: 5 }}
          loading={loading}
        />
      ) : (
        <Empty
          description={<span style={{ color: '#71717a' }}>暂无预约记录</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  )
}

export default MyReservations
