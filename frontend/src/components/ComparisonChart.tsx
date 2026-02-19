import React, { useMemo } from 'react'
import { Row, Col, Empty, Statistic, Card } from 'antd'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { SimulationReport } from '../types'
import { TrophyOutlined, ThunderboltOutlined, RiseOutlined } from '@ant-design/icons'

interface Props {
  report: SimulationReport | null
}

const ComparisonChart: React.FC<Props> = ({ report }) => {
  if (!report || !report.logs || report.logs.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: 300,
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12
      }}>
        <Empty 
          description={<span style={{ color: '#71717a' }}>暂无优化数据</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )
  }

  const { summary, optimization_stats, logs } = report
  const comparison_stats = report.comparison_stats
  const comparison_data = report.comparison_data

  // 请求状态分布饼图数据
  const statusData = useMemo(() => [
    { name: '已批准', value: summary.approved, fill: '#10b981' },
    { name: '已拒绝', value: summary.rejected, fill: '#ef4444' },
    { name: '待处理', value: summary.pending, fill: '#f59e0b' }
  ].filter(d => d.value > 0), [summary])

  // 触发类型对比数据
  const triggerData = useMemo(() => [
    { name: '事件触发', value: optimization_stats.event_triggered, fill: '#ef4444' },
    { name: '时间触发', value: optimization_stats.time_triggered, fill: '#3b82f6' }
  ], [optimization_stats])

  // 优化历史趋势数据
  const trendData = useMemo(() => {
    return logs.slice(-20).map((log: any, index: number) => ({
      index: index + 1,
      time: log.time,
      requests: log.requests_count,
      paretoSize: log.pareto_size,
      execTime: parseFloat((log.execution_time * 1000).toFixed(1))
    }))
  }, [logs])

  // 执行时间分布
  const execTimeData = useMemo(() => {
    const ranges = [
      { range: '<50ms', min: 0, max: 0.05, count: 0 },
      { range: '50-100ms', min: 0.05, max: 0.1, count: 0 },
      { range: '100-200ms', min: 0.1, max: 0.2, count: 0 },
      { range: '>200ms', min: 0.2, max: Infinity, count: 0 }
    ]
    logs.forEach((log: any) => {
      const r = ranges.find(r => log.execution_time >= r.min && log.execution_time < r.max)
      if (r) r.count++
    })
    return ranges.map(r => ({ name: r.range, count: r.count }))
  }, [logs])

  // D-NSGA-II vs 标准NSGA-II 对比数据
  const algorithmComparisonData = useMemo(() => {
    if (!comparison_data || comparison_data.length === 0) return []
    return comparison_data.slice(-15).map((c: any, index: number) => ({
      index: index + 1,
      dnsga2Time: parseFloat((c.dnsga2.execution_time * 1000).toFixed(1)),
      standardTime: parseFloat((c.standard_nsga2.execution_time * 1000).toFixed(1)),
      dnsga2Pareto: c.dnsga2.pareto_size,
      standardPareto: c.standard_nsga2.pareto_size,
      dnsga2Unmet: c.dnsga2.best_unmet || 0,
      standardUnmet: c.standard_nsga2.best_unmet || 0
    }))
  }, [comparison_data])

  // 雷达图数据
  const radarData = useMemo(() => {
    if (!comparison_stats) return []
    return [
      {
        metric: '执行速度',
        dnsga2: comparison_stats.standard_avg_time > 0 
          ? Math.min(100, (comparison_stats.standard_avg_time / comparison_stats.dnsga2_avg_time) * 50)
          : 50,
        standard: 50
      },
      {
        metric: 'Pareto解数量',
        dnsga2: Math.min(100, comparison_stats.dnsga2_avg_pareto_size * 10),
        standard: Math.min(100, comparison_stats.standard_avg_pareto_size * 10)
      },
      {
        metric: '胜率',
        dnsga2: comparison_stats.dnsga2_wins + comparison_stats.standard_wins > 0
          ? (comparison_stats.dnsga2_wins / (comparison_stats.dnsga2_wins + comparison_stats.standard_wins + comparison_stats.ties)) * 100
          : 50,
        standard: comparison_stats.dnsga2_wins + comparison_stats.standard_wins > 0
          ? (comparison_stats.standard_wins / (comparison_stats.dnsga2_wins + comparison_stats.standard_wins + comparison_stats.ties)) * 100
          : 50
      }
    ]
  }, [comparison_stats])

  const chartStyle = {
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 16,
    border: '1px solid rgba(255, 255, 255, 0.05)'
  }

  return (
    <div>
      <h3 style={{ 
        margin: 0, 
        marginBottom: 20,
        fontSize: 16, 
        fontWeight: 600,
        color: '#fafafa'
      }}>
        对比分析图表
      </h3>

      {/* 算法对比统计卡片 */}
      {comparison_stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small" style={chartStyle}>
              <Statistic
                title={<span style={{ color: '#a1a1aa' }}>D-NSGA-II 胜出</span>}
                value={comparison_stats.dnsga2_wins}
                prefix={<TrophyOutlined style={{ color: '#10b981' }} />}
                valueStyle={{ color: '#10b981' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={chartStyle}>
              <Statistic
                title={<span style={{ color: '#a1a1aa' }}>标准NSGA-II 胜出</span>}
                value={comparison_stats.standard_wins}
                prefix={<TrophyOutlined style={{ color: '#3b82f6' }} />}
                valueStyle={{ color: '#3b82f6' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={chartStyle}>
              <Statistic
                title={<span style={{ color: '#a1a1aa' }}>速度提升</span>}
                value={comparison_stats.time_improvement.toFixed(1)}
                suffix="%"
                prefix={<RiseOutlined style={{ color: '#8b5cf6' }} />}
                valueStyle={{ color: comparison_stats.time_improvement > 0 ? '#10b981' : '#ef4444' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        {/* 请求状态分布 */}
        <Col span={12}>
          <div style={chartStyle}>
            <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 12 }}>
              请求状态分布
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#18181b', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fafafa'
                  }}
                  labelStyle={{ color: '#fafafa' }}
                  itemStyle={{ color: '#a1a1aa' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Col>

        {/* 触发类型对比 */}
        <Col span={12}>
          <div style={chartStyle}>
            <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 12 }}>
              优化触发类型对比
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={triggerData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#71717a" />
                <YAxis type="category" dataKey="name" stroke="#71717a" width={70} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#18181b', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fafafa'
                  }}
                  labelStyle={{ color: '#fafafa' }}
                  itemStyle={{ color: '#a1a1aa' }}
                  formatter={(value) => (value === 0 || value === undefined) ? null : [value, '次数']}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar 
                  dataKey="value" 
                  name="次数"
                  radius={[0, 4, 4, 0]}
                >
                  {triggerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>

        {/* D-NSGA-II vs 标准NSGA-II 执行时间对比 */}
        {algorithmComparisonData.length > 0 && (
          <Col span={12}>
            <div style={chartStyle}>
              <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 12 }}>
                <ThunderboltOutlined style={{ marginRight: 6 }} />
                算法执行时间对比 (ms)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={algorithmComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="index" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fafafa'
                    }}
                    labelStyle={{ color: '#fafafa' }}
                    itemStyle={{ color: '#a1a1aa' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="dnsga2Time" 
                    stroke="#10b981" 
                    name="D-NSGA-II"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="standardTime" 
                    stroke="#3b82f6" 
                    name="标准NSGA-II"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Col>
        )}

        {/* 未满足请求数对比 */}
        {algorithmComparisonData.length > 0 && (
          <Col span={12}>
            <div style={chartStyle}>
              <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 12 }}>
                未满足请求数对比 (越低越好)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={algorithmComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="index" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fafafa'
                    }}
                    labelStyle={{ color: '#fafafa' }}
                    itemStyle={{ color: '#a1a1aa' }}
                    formatter={(value, name) => (value === 0 || value === undefined) ? null : [value, name]}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Legend />
                  <Bar dataKey="dnsga2Unmet" fill="#10b981" name="D-NSGA-II" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="standardUnmet" fill="#3b82f6" name="标准NSGA-II" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Col>
        )}

        {/* 优化趋势 */}
        <Col span={12}>
          <div style={chartStyle}>
            <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 12 }}>
              优化历史趋势 (最近20次)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="index" stroke="#71717a" />
                <YAxis yAxisId="left" stroke="#71717a" />
                <YAxis yAxisId="right" orientation="right" stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#18181b', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fafafa'
                  }}
                  labelStyle={{ color: '#fafafa' }}
                  itemStyle={{ color: '#a1a1aa' }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#3b82f6" 
                  name="请求数"
                  dot={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="paretoSize" 
                  stroke="#8b5cf6" 
                  name="Pareto解数"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Col>

        {/* 执行时间分布 */}
        <Col span={12}>
          <div style={chartStyle}>
            <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 12 }}>
              执行时间分布
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={execTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#18181b', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fafafa'
                  }}
                  labelStyle={{ color: '#fafafa' }}
                  itemStyle={{ color: '#a1a1aa' }}
                  formatter={(value, name) => (value === 0 || value === undefined) ? null : [value, name]}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="count" fill="#10b981" name="次数" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>

        {/* 算法性能雷达图 */}
        {radarData.length > 0 && (
          <Col span={24}>
            <div style={chartStyle}>
              <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 12 }}>
                算法综合性能对比
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="metric" stroke="#71717a" />
                  <PolarRadiusAxis stroke="#71717a" />
                  <Radar 
                    name="D-NSGA-II" 
                    dataKey="dnsga2" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.3} 
                  />
                  <Radar 
                    name="标准NSGA-II" 
                    dataKey="standard" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3} 
                  />
                  <Legend />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fafafa'
                    }}
                    labelStyle={{ color: '#fafafa' }}
                    itemStyle={{ color: '#a1a1aa' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Col>
        )}
      </Row>
    </div>
  )
}

export default ComparisonChart
