import React from 'react'
import { Card, Button, Space, InputNumber, message, Popconfirm } from 'antd'
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined,
  StepForwardOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { simulationApi } from '../api'

interface Props {
  isRunning: boolean
  onRefresh: () => void
}

const ControlPanel: React.FC<Props> = ({ isRunning, onRefresh }) => {
  const [duration, setDuration] = React.useState(120)
  const [loading, setLoading] = React.useState<string | null>(null)

  const handleStart = async () => {
    setLoading('start')
    try {
      await simulationApi.start(duration)
      message.success('模拟已启动')
      onRefresh()
    } catch (err: any) {
      message.error(err.detail || '启动失败')
    } finally {
      setLoading(null)
    }
  }

  const handleStop = async () => {
    setLoading('stop')
    try {
      await simulationApi.stop()
      message.success('模拟已停止')
      onRefresh()
    } catch (err: any) {
      message.error(err.detail || '停止失败')
    } finally {
      setLoading(null)
    }
  }

  const handleReset = async () => {
    setLoading('reset')
    try {
      await simulationApi.reset()
      message.success('模拟已重置')
      onRefresh()
    } catch (err: any) {
      message.error(err.detail || '重置失败')
    } finally {
      setLoading(null)
    }
  }

  const handleStep = async () => {
    setLoading('step')
    try {
      await simulationApi.step()
      onRefresh()
    } catch (err: any) {
      message.error(err.detail || '步进失败')
    } finally {
      setLoading(null)
    }
  }

  const handleOptimize = async () => {
    setLoading('optimize')
    try {
      const result: any = await simulationApi.optimize()
      message.success(`优化完成，找到${result.pareto_front?.length || 0}个Pareto解`)
      onRefresh()
    } catch (err: any) {
      message.error(err.detail || '优化失败')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card title="控制面板">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <span>模拟时长(分钟):</span>
          <InputNumber 
            value={duration} 
            onChange={v => setDuration(v || 120)}
            min={60}
            max={720}
            disabled={isRunning}
          />
        </Space>
        
        <Space wrap>
          {!isRunning ? (
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              loading={loading === 'start'}
            >
              启动模拟
            </Button>
          ) : (
            <Button 
              danger
              icon={<PauseCircleOutlined />}
              onClick={handleStop}
              loading={loading === 'stop'}
            >
              停止模拟
            </Button>
          )}
          
          <Popconfirm title="确定重置模拟？" onConfirm={handleReset} disabled={isRunning}>
            <Button 
              icon={<ReloadOutlined />}
              disabled={isRunning}
              loading={loading === 'reset'}
            >
              重置
            </Button>
          </Popconfirm>
          
          <Button 
            icon={<StepForwardOutlined />}
            onClick={handleStep}
            disabled={isRunning}
            loading={loading === 'step'}
          >
            单步执行
          </Button>
          
          <Button 
            type="primary"
            ghost
            icon={<ThunderboltOutlined />}
            onClick={handleOptimize}
            loading={loading === 'optimize'}
          >
            手动优化
          </Button>
        </Space>
      </Space>
    </Card>
  )
}

export default ControlPanel
