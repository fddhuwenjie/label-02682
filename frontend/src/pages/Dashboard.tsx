import React, { useEffect, useState, useCallback } from 'react'
import { Layout, Row, Col, Button, message, Card, Table, Tag, Space } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
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
      
      // 获取最新的Pareto前沿
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

  // WebSocket连接
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
      render: (v: number) => `${(v * 100).toFixed(1)}%`,
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
        >
          应用此解
        </Button>
      )
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: 0 }}>D-NSGA-II 自习室资源分配系统</h2>
        <Space>
          <Button icon={<FileTextOutlined />} onClick={handleShowReport}>
            查看报告
          </Button>
          <Tag color={user?.role === 'admin' ? 'gold' : 'blue'}>
            {user?.username} ({user?.role === 'admin' ? '管理员' : '学生'})
          </Tag>
          <Button onClick={logout}>退出</Button>
        </Space>
      </Header>
      
      <Content style={{ padding: 24 }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <StatusCard status={status} />
          </Col>
          
          {user?.role === 'admin' && (
            <Col span={24}>
              <ControlPanel 
                isRunning={status?.is_running || false} 
                onRefresh={fetchData}
              />
            </Col>
          )}
          
          <Col span={12}>
            <ParetoChart 
              solutions={paretoSolutions}
              onSelect={handleSelectSolution}
              selectedId={selectedSolution?.id}
            />
          </Col>
          
          <Col span={12}>
            <Card title="Pareto解集详情">
              <Table 
                dataSource={paretoSolutions.map((s: ParetoSolution) => ({ ...s, key: s.id }))}
                columns={solutionColumns}
                size="small"
                pagination={false}
                scroll={{ y: 280 }}
              />
            </Card>
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
