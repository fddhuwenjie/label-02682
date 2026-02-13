import React from 'react'
import ReactECharts from 'echarts-for-react'
import 'echarts-gl'
import { Empty, Switch, Space } from 'antd'
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
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fafafa' }}>
            Pareto 前沿可视化
          </h3>
        </div>
        <div style={{ 
          height: 370, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <Empty 
            description={<span style={{ color: '#71717a' }}>暂无优化结果</span>}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </div>
    )
  }

  const option3D = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 17, 19, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#fafafa' },
      formatter: (params: any) => {
        const d = params.data
        return `<div style="padding: 4px">
          <div style="font-weight: 600; margin-bottom: 8px">解 #${d[3]}</div>
          <div style="color: #a1a1aa">未满足: <span style="color: #ef4444">${d[0]}</span></div>
          <div style="color: #a1a1aa">利用率: <span style="color: #3b82f6">${(d[1] * 100).toFixed(1)}%</span></div>
          <div style="color: #a1a1aa">公平性: <span style="color: #10b981">${d[2].toFixed(4)}</span></div>
        </div>`
      }
    },
    xAxis3D: {
      name: '未满足数',
      type: 'value',
      nameTextStyle: { color: '#71717a', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#71717a' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    yAxis3D: {
      name: '利用率',
      type: 'value',
      nameTextStyle: { color: '#71717a', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { 
        color: '#71717a',
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    zAxis3D: {
      name: '公平性',
      type: 'value',
      nameTextStyle: { color: '#71717a', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#71717a' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    grid3D: {
      boxWidth: 100,
      boxHeight: 80,
      boxDepth: 80,
      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 6,
        distance: 220
      },
      light: {
        main: { intensity: 1.2, shadow: true },
        ambient: { intensity: 0.3 }
      },
      environment: 'none'
    },
    series: [{
      type: 'scatter3D',
      data: solutions.map(s => [
        s.unmet_requests,
        s.utilization_rate,
        s.fairness_score,
        s.id
      ]),
      symbolSize: (data: number[]) => data[3] === selectedId ? 20 : 12,
      itemStyle: {
        color: (params: any) => {
          if (params.data[3] === selectedId) return '#ef4444'
          const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981']
          return colors[params.dataIndex % colors.length]
        },
        opacity: 0.9
      },
      emphasis: {
        itemStyle: {
          color: '#fbbf24',
          opacity: 1
        }
      }
    }]
  }

  const option2D = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 17, 19, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#fafafa' },
      formatter: (params: any) => {
        const s = solutions[params.dataIndex]
        return `<div style="padding: 4px">
          <div style="font-weight: 600; margin-bottom: 8px">解 #${s.id}</div>
          <div style="color: #a1a1aa">未满足: <span style="color: #ef4444">${s.unmet_requests}</span></div>
          <div style="color: #a1a1aa">利用率: <span style="color: #3b82f6">${(s.utilization_rate * 100).toFixed(1)}%</span></div>
          <div style="color: #a1a1aa">公平性: <span style="color: #10b981">${s.fairness_score.toFixed(4)}</span></div>
        </div>`
      }
    },
    grid: {
      left: 60,
      right: 30,
      top: 30,
      bottom: 50
    },
    xAxis: {
      name: '未满足请求数',
      type: 'value',
      nameTextStyle: { color: '#71717a' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#71717a' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    yAxis: {
      name: '利用率',
      type: 'value',
      nameTextStyle: { color: '#71717a' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { 
        color: '#71717a',
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [{
      type: 'scatter',
      data: solutions.map(s => [s.unmet_requests, s.utilization_rate]),
      symbolSize: (_data: number[], params: any) => 
        solutions[params.dataIndex].id === selectedId ? 18 : 10,
      itemStyle: {
        color: (params: any) => {
          if (solutions[params.dataIndex].id === selectedId) return '#ef4444'
          const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981']
          return colors[params.dataIndex % colors.length]
        }
      }
    }]
  }

  const handleClick = (params: any) => {
    if (onSelect && params.dataIndex !== undefined) {
      onSelect(solutions[params.dataIndex])
    }
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16
      }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fafafa' }}>
          Pareto 前沿可视化
        </h3>
        <Space>
          <span style={{ fontSize: 13, color: '#71717a' }}>3D 视图</span>
          <Switch 
            checked={use3D} 
            onChange={setUse3D}
            size="small"
          />
        </Space>
      </div>
      <ReactECharts 
        option={use3D ? option3D : option2D} 
        style={{ height: 370 }}
        onEvents={{ click: handleClick }}
      />
    </div>
  )
}

export default ParetoChart
