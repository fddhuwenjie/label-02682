import React, { useState } from 'react'
import { Form, InputNumber, Select, Button, message, Card, Row, Col, Alert } from 'antd'
import { PlusOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { reservationApi } from '../api'

interface Props {
  onSuccess?: () => void
}

const ReservationForm: React.FC<Props> = ({ onSuccess }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateTimes = (startTime: number, endTime: number): string | null => {
    if (startTime === undefined || startTime === null) {
      return '请输入开始时间'
    }
    if (endTime === undefined || endTime === null) {
      return '请输入结束时间'
    }
    if (startTime < 0 || startTime > 1440) {
      return '开始时间必须在0-1440分钟之间'
    }
    if (endTime < 0 || endTime > 1440) {
      return '结束时间必须在0-1440分钟之间'
    }
    if (endTime <= startTime) {
      return '结束时间必须大于开始时间'
    }
    if (endTime - startTime > 240) {
      return '单次预约不能超过4小时(240分钟)'
    }
    if (endTime - startTime < 30) {
      return '预约时长至少30分钟'
    }
    return null
  }

  const handleSubmit = async (values: any) => {
    setError(null)
    
    const validationError = validateTimes(values.start_time, values.end_time)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      await reservationApi.create({
        start_time: values.start_time,
        end_time: values.end_time,
        priority: values.priority || 'normal'
      })
      message.success('预约提交成功')
      form.resetFields()
      onSuccess?.()
    } catch (err: any) {
      const errorMsg = err.detail || err.message || '提交失败，请重试'
      setError(errorMsg)
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (minutes: number): string => {
    if (minutes === undefined || minutes === null) return '--:--'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

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
        alignItems: 'center', 
        gap: 8, 
        marginBottom: 20 
      }}>
        <ClockCircleOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fafafa' }}>
          提交预约
        </span>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ priority: 'normal' }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="start_time"
              label={<span style={{ color: '#a1a1aa' }}>开始时间(分钟)</span>}
              rules={[{ required: true, message: '请输入开始时间' }]}
              tooltip="0表示00:00，480表示08:00"
            >
              <InputNumber
                min={0}
                max={1440}
                placeholder="如: 480"
                style={{ width: '100%' }}
                formatter={(value) => value !== undefined ? `${value} (${formatTime(value as number)})` : ''}
                parser={(value) => parseInt(value?.split(' ')[0] || '0') as 0 | 1440}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="end_time"
              label={<span style={{ color: '#a1a1aa' }}>结束时间(分钟)</span>}
              rules={[{ required: true, message: '请输入结束时间' }]}
              tooltip="如600表示10:00"
            >
              <InputNumber
                min={0}
                max={1440}
                placeholder="如: 600"
                style={{ width: '100%' }}
                formatter={(value) => value !== undefined ? `${value} (${formatTime(value as number)})` : ''}
                parser={(value) => parseInt(value?.split(' ')[0] || '0') as 0 | 1440}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="priority"
              label={<span style={{ color: '#a1a1aa' }}>优先级</span>}
            >
              <Select>
                <Select.Option value="low">低</Select.Option>
                <Select.Option value="normal">普通</Select.Option>
                <Select.Option value="high">高</Select.Option>
                <Select.Option value="urgent">紧急</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<PlusOutlined />}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none'
            }}
          >
            提交预约
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default ReservationForm
