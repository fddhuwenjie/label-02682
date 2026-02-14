export interface User {
  id: number
  username: string
  role: 'admin' | 'student'
}

export interface Reservation {
  id: number
  user_id: number
  seat_id?: number
  start_time: number
  end_time: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
}

export interface SystemStatus {
  current_time: number
  total_seats: number
  occupied_seats: number
  pending_requests: number
  approved_today: number
  rejected_today: number
  utilization_rate: number
  is_running: boolean
  is_optimizing: boolean
  current_period: string
}

export interface ParetoSolution {
  id: number
  unmet_requests: number
  utilization_rate: number
  fairness_score: number
  assignments?: number[]
}

export interface OptimizationResult {
  pareto_front: ParetoSolution[]
  execution_time: number
  generation_count: number
}

export interface SimulationReport {
  summary: {
    total_requests: number
    approved: number
    rejected: number
    pending: number
    approval_rate: number
  }
  optimization_stats: {
    total_optimizations: number
    event_triggered: number
    time_triggered: number
    avg_execution_time: number
  }
  comparison_stats?: {
    dnsga2_avg_time: number
    standard_avg_time: number
    time_improvement: number
    dnsga2_avg_pareto_size: number
    standard_avg_pareto_size: number
    dnsga2_wins: number
    standard_wins: number
    ties: number
  }
  comparison_data?: Array<{
    time: number
    dnsga2: {
      execution_time: number
      pareto_size: number
      best_unmet: number | null
      best_utilization: number | null
      best_fairness: number | null
    }
    standard_nsga2: {
      execution_time: number
      pareto_size: number
      best_unmet: number | null
      best_utilization: number | null
      best_fairness: number | null
    }
  }>
  logs: Array<{
    time: number
    trigger_type: string
    trigger_reason: string
    requests_count: number
    pareto_size: number
    execution_time: number
    standard_pareto_size?: number
    standard_execution_time?: number
  }>
}
