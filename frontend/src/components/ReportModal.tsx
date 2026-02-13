import React from 'react'
import { Modal, Descriptions, Statistic, Row, Col, Divider } from 'antd'
import ReactECharts from 'echarts-for-react'
import { SimulationReport } from '../types'

interface Props {
  visible: boolean
  report: SimulationReport | null
  onClose: () => void
}

const ReportModal: React.FC<Props> = ({ visible, report, onClose }) => {
  if (!report) return null

  const { summary, optimization_stats } = report

  const pieOption = {
    title: { text: '请求处理分布', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: summary.approved, name: '已批准', itemStyle: { color: '#52c41a' } },
        { value: summary.rejected, name: '已拒绝', itemStyle: { color: '#ff4d4f' } },
        { value: summary.pending, name: '待处理', itemStyle: { color: '#faad14' } }
      ]
    }]
  }

  const triggerOption = {
    title: { text: '触发类型分布', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '60%',
      data: [
        { value: optimization_stats.event_triggered, name: '事件触发', itemStyle: { color: '#fa8c16' } },
        { value: optimization_stats.time_triggered, name: '时间触发', itemStyle: { color: '#1890ff' } }
      ]
    }]
  }

  return (
    <Modal
      title="模拟报告"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Descriptions title="汇总统计" bordered column={2}>
        <Descriptions.Item label="总请求数">{summary.total_requests}</Descriptions.Item>
        <Descriptions.Item label="批准率">{(summary.approval_rate * 100).toFixed(1)}%</Descriptions.Item>
        <Descriptions.Item label="优化次数">{optimization_stats.total_optimizations}</Descriptions.Item>
        <Descriptions.Item label="平均优化耗时">{optimization_stats.avg_execution_time.toFixed(3)}s</Descriptions.Item>
      </Descriptions>

      <Divider />

      <Row gutter={16}>
        <Col span={12}>
          <ReactECharts option={pieOption} style={{ height: 250 }} />
        </Col>
        <Col span={12}>
          <ReactECharts option={triggerOption} style={{ height: 250 }} />
        </Col>
      </Row>

      <Divider />

      <Row gutter={16}>
        <Col span={8}>
          <Statistic title="事件触发次数" value={optimization_stats.event_triggered} valueStyle={{ color: '#fa8c16' }} />
        </Col>
        <Col span={8}>
          <Statistic title="时间触发次数" value={optimization_stats.time_triggered} valueStyle={{ color: '#1890ff' }} />
        </Col>
        <Col span={8}>
          <Statistic title="D-NSGA-II优势" value="动态继承" />
        </Col>
      </Row>
    </Modal>
  )
}

export default ReportModal
