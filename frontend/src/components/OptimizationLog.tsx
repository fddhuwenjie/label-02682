import React from 'react'
import ReactECharts from 'echarts-for-react'
import { Card, Table, Tag } from 'antd'

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
  const columns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (v: number) => {
        const h = Math.floor(v / 60) + 8
        const m = v % 60
        return `${h}:${m.toString().padStart(2, '0')}`
      }
    },
    {
      title: '触发类型',
      dataIndex: 'trigger_type',
      key: 'trigger_type',
      render: (v: string) => (
        <Tag color={v === 'event' ? 'orange' : 'blue'}>
          {v === 'event' ? '事件触发' : v === 'time' ? '时间触发' : '手动触发'}
        </Tag>
      )
    },
    {
      title: '原因',
      dataIndex: 'trigger_reason',
      key: 'trigger_reason',
      ellipsis: true
    },
    {
      title: '请求数',
      dataIndex: 'requests_count',
      key: 'requests_count'
    },
    {
      title: 'Pareto解数',
      dataIndex: 'pareto_size',
      key: 'pareto_size'
    },
    {
      title: '耗时(s)',
      dataIndex: 'execution_time',
      key: 'execution_time',
      render: (v: number) => v.toFixed(3)
    }
  ]

  const chartOption = {
    title: { text: '优化执行时间趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: logs.map((_, i) => `#${i + 1}`)
    },
    yAxis: {
      type: 'value',
      name: '耗时(s)'
    },
    series: [{
      type: 'line',
      data: logs.map(l => l.execution_time),
      smooth: true,
      areaStyle: { opacity: 0.3 }
    }]
  }

  return (
    <Card title="优化日志">
      {logs.length > 0 && (
        <ReactECharts option={chartOption} style={{ height: 200, marginBottom: 16 }} />
      )}
      <Table 
        dataSource={logs.map((l, i) => ({ ...l, key: i }))}
        columns={columns}
        size="small"
        pagination={{ pageSize: 5 }}
      />
    </Card>
  )
}

export default OptimizationLog
