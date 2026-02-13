import React, { useEffect, useState, useCallback } from 'react'
import { Layout, Row, Col, Button, message, Table, Space, Empty } from 'antd'
import { FileTextOutlined, LogoutOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { simulationApi } from '../api'
import { SystemStatus, ParetoSolution, SimulationReport } from '../types'
import StatusCard from '../components/StatusCard'
import ParetoChart from '../components/ParetoChart'
import OptimizationLog from '../components/OptimizationLog'
import ControlPanel from '../components/ControlPanel'
import ReportModal from '../components/ReportModal'

const { Header, Content } = Layout

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [paretoSolutions, setParetoSolutions] = useState<ParetoSolution[]>([])
  const [selectedSolution, setSelectedSolution] = useState<ParetoSolution | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [report, setReport] = useState<SimulationReport | null>(null)
  const [reportVisible, setReportVisible] = useState(false)
  const wsRef = React.useRef<WebSocket | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [statusData, reportData, historyData]: any = await Promise.all([
        simulationApi.getStatus(),
        simulationApi.getReport(),
        simulationApi.getParetoHistory()
      ])
      setStatus(statusData)
      setLogs(reportData.logs || [])
      
      if (historyData.length > 0) {
        const latest = historyData[historyData.length - 1]
        setParetoSolutions(latest.solutions || [])
      } else {
        setParetoSolutions([])
      }
    } catch (err) {
      console.error('获取数据失败', err)
    }
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/simulation/ws`
    const websocket = new WebSocket(wsUrl)
    
    websocket.onopen = () => console.log('WebSocket已连接')
    
    websocket.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'status_update') {
        setStatus(msg.data)
      } else if (msg.type === 'optimization_complete') {
        const result = msg.data.result
        if (result?.pareto_front) {
          setParetoSolutions(result.pareto_front)
        }
        if (msg.data.log) {
          setLogs((prev: any[]) => [...prev, msg.data.log])
        }
        message.info('优化完成')
      }
    }
    
    websocket.onerror = () => console.error('WebSocket错误')
    websocket.onclose = () => console.log('WebSocket已断开')
    
    wsRef.current = websocket
    return () => websocket.close()
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleSelectSolution = async (solution: ParetoSolution) => {
    setSelectedSolution(solution)
    try {
      await simulationApi.applySolution(solution.id)
      message.success(`已应用解 #${solution.id}`)
      fetchData()
    } catch (err: any) {
      message.error(err.detail || '应用失败')
    }
  }

  const handleShowReport = async () => {
    try {
      const data: any = await simulationApi.getReport()
      setReport(data)
      setReportVisible(true)
    } catch (err) {
      message.error('获取报告失败')
    }
  }

  const solutionColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { 
      title: '未满足数', 
      dataIndex: 'unmet_requests', 
      key: 'unmet_requests',
      sorter: (a: ParetoSolution, b: ParetoSolution) => a.unmet_requests - b.unmet_requests
    },
    { 
      title: '利用率', 
      dataIndex: 'utilization_rate', 
      key: 'utilization_rate',
      render: (v: number) => (
        <span style={{ color: '#3b82f6', fontWeight: 500 }}>
          {(v * 100).toFixed(1)}%
        </span>
      ),
      sorter: (a: ParetoSolution, b: ParetoSolution) => a.utilization_rate - b.utilization_rate
    },
    { 
      title: '公平性', 
      dataIndex: 'fairness_score', 
      key: 'fairness_score',
      render: (v: number) => v.toFixed(4),
      sorter: (a: ParetoSolution, b: ParetoSolution) => (a.fairness_score || 0) - (b.fairness_score || 0)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ParetoSolution) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => handleSelectSolution(record)}
          style={{ 
            color: '#8b5cf6',
            padding: 0
          }}
        >
          应用此解
        </Button>
      )
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0a0b' }}>
      <Header style={{ 
        background: 'rgba(10, 10, 11, 0.8)',
        backdropFilter: 'blur(20px)',
        padding: '0 32px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 64
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            color: '#fff'
          }}>
            D
          </div>
          <h1 style={{ 
            margin: 0, 
            fontSize: 18, 
            fontWeight: 600,
            background: 'linear-gradient(135deg, #fafafa, #a1a1aa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            D-NSGA-II 智能资源分配
          </h1>
        </div>
        <Space size={12} align="center">
          <Button 
            icon={<FileTextOutlined />} 
            onClick={handleShowReport}
          >
            查看报告
          </Button>
          <span style={{ fontSize: 13, color: '#fafafa' }}>
            {user?.username}
          </span>
          <span style={{ 
            fontSize: 11, 
            color: user?.role === 'admin' ? '#fbbf24' : '#3b82f6',
            background: user?.role === 'admin' 
              ? 'rgba(251, 191, 36, 0.15)' 
              : 'rgba(59, 130, 246, 0.15)',
            padding: '2px 8px',
            borderRadius: 4
          }}>
            {user?.role === 'admin' ? '管理员' : '学生'}
          </span>
          <Button 
            icon={<LogoutOutlined />} 
            onClick={logout}
          >
            退出
          </Button>
        </Space>
      </Header>
      
      <Content style={{ padding: '32px 32px 32px 32px' }}>
        <div style={{ marginBottom: 24 }}>
          <StatusCard status={status} />
        </div>
        
        {user?.role === 'admin' && (
          <div style={{ marginBottom: 24 }}>
            <ControlPanel 
              isRunning={status?.is_running || false} 
              onRefresh={fetchData}
            />
          </div>
        )}
        
        <Row gutter={[24, 24]}>
          <Col span={12}>
            <div style={{
              background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.8), rgba(17, 17, 19, 0.9))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              padding: 24,
              height: 450
            }}>
              <ParetoChart 
                solutions={paretoSolutions}
                onSelect={handleSelectSolution}
                selectedId={selectedSolution?.id}
              />
            </div>
          </Col>
          
          <Col span={12}>
            <div style={{
              background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.8), rgba(17, 17, 19, 0.9))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              padding: 24,
              height: 450,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h3 style={{ 
                margin: 0, 
                marginBottom: 16,
                fontSize: 16, 
                fontWeight: 600,
                color: '#fafafa'
              }}>
                Pareto 解集详情
              </h3>
              {paretoSolutions.length > 0 ? (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <Table 
                    dataSource={paretoSolutions.map((s: ParetoSolution) => ({ ...s, key: s.id }))}
                    columns={solutionColumns}
                    size="small"
                    pagination={false}
                    scroll={{ y: 340 }}
                  />
                </div>
              ) : (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <Empty 
                    description={<span style={{ color: '#71717a' }}>暂无数据</span>}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )}
            </div>
          </Col>
          
          <Col span={24}>
            <OptimizationLog logs={logs} />
          </Col>
        </Row>
      </Content>
      
      <ReportModal 
        visible={reportVisible}
        report={report}
        onClose={() => setReportVisible(false)}
      />
    </Layout>
  )
}

export default Dashboard
