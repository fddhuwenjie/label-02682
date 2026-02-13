import React from 'react'
import ReactECharts from 'echarts-for-react'
import 'echarts-gl'
import { Card, Empty, Switch, Space } from 'antd'
import { ParetoSolution } from '../types'

interface Props {
  solutions: ParetoSolution[]
  onSelect?: (solution: ParetoSolution) => void
  selectedId?: number
}

const ParetoChart: React.FC<Props> = ({ solutions, onSelect, selectedId }) => {
  const [use3D, setUse3D] = React.useState(true)

  if (!solutions.length) {
    return (
      <Card title="Pareto前沿">
        <Empty description="暂无优化结果" />
      </Card>
    )
  }

  // 3D配置
  const option3D = {
    title: {
      text: 'Pareto最优解集 (3D)',
      subtext: '点击选择偏好解',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const d = params.data
        return `解 #${d[3]}<br/>
          未满足: ${d[0]}<br/>
          利用率: ${(d[1] * 100).toFixed(1)}%<br/>
          公平性: ${d[2].toFixed(4)}`
      }
    },
    xAxis3D: {
      name: '未满足请求数',
      type: 'value',
      nameTextStyle: { fontSize: 12 }
    },
    yAxis3D: {
      name: '利用率',
      type: 'value',
      nameTextStyle: { fontSize: 12 },
      axisLabel: {
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`
      }
    },
    zAxis3D: {
      name: '公平性',
      type: 'value',
      nameTextStyle: { fontSize: 12 }
    },
    grid3D: {
      boxWidth: 100,
      boxHeight: 80,
      boxDepth: 80,
      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 8,
        distance: 200
      },
      light: {
        main: { intensity: 1.2 },
        ambient: { intensity: 0.3 }
      }
    },
    series: [{
      type: 'scatter3D',
      data: solutions.map(s => [
        s.unmet_requests,
        s.utilization_rate,
        s.fairness_score,
        s.id
      ]),
      symbolSize: (data: number[]) => data[3] === selectedId ? 24 : 14,
      itemStyle: {
        color: (params: any) => params.data[3] === selectedId ? '#ff4d4f' : '#1890ff',
        opacity: 0.9
      },
      emphasis: {
        itemStyle: {
          color: '#52c41a',
          opacity: 1
        }
      }
    }]
  }

  // 2D备选方案
  const option2D = {
    title: {
      text: 'Pareto前沿 (利用率 vs 未满足数)',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const s = solutions[params.dataIndex]
        return `解 #${s.id}<br/>
          未满足: ${s.unmet_requests}<br/>
          利用率: ${(s.utilization_rate * 100).toFixed(1)}%<br/>
          公平性: ${s.fairness_score.toFixed(4)}`
      }
    },
    xAxis: {
      name: '未满足请求数',
      type: 'value'
    },
    yAxis: {
      name: '利用率',
      type: 'value',
      axisLabel: {
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`
      }
    },
    series: [{
      type: 'scatter',
      data: solutions.map(s => [s.unmet_requests, s.utilization_rate]),
      symbolSize: (_data: number[], params: any) => 
        solutions[params.dataIndex].id === selectedId ? 20 : 12,
      itemStyle: {
        color: (params: any) => 
          solutions[params.dataIndex].id === selectedId ? '#ff4d4f' : '#1890ff'
      }
    }]
  }

  const handleClick = (params: any) => {
    if (onSelect && params.dataIndex !== undefined) {
      onSelect(solutions[params.dataIndex])
    }
  }

  return (
    <Card 
      title="Pareto前沿可视化" 
      extra={
        <Space>
          <span>3D视图</span>
          <Switch checked={use3D} onChange={setUse3D} />
        </Space>
      }
    >
      <ReactECharts 
        option={use3D ? option3D : option2D} 
        style={{ height: 380 }}
        onEvents={{ click: handleClick }}
      />
    </Card>
  )
}

export default ParetoChart
