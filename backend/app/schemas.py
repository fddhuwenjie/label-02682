"""Pydantic模式"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .models import UserRole, RequestStatus, RequestPriority

# 用户
class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.STUDENT

class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# 预约
class ReservationCreate(BaseModel):
    start_time: int
    end_time: int
    priority: RequestPriority = RequestPriority.NORMAL

class ReservationResponse(BaseModel):
    id: int
    user_id: int
    seat_id: Optional[int]
    start_time: int
    end_time: int
    priority: RequestPriority
    status: RequestStatus
    created_at: datetime
    class Config:
        from_attributes = True

# 座位
class SeatResponse(BaseModel):
    id: int
    seat_number: str
    has_power: bool
    is_active: bool
    class Config:
        from_attributes = True

# 优化结果
class ParetoSolution(BaseModel):
    id: int
    unmet_requests: int
    utilization_rate: float
    fairness_score: float
    assignments: List[int]  # 被满足的请求ID列表

class OptimizationResult(BaseModel):
    trigger_type: str
    trigger_reason: str
    pareto_front: List[ParetoSolution]
    selected_solution: Optional[ParetoSolution]
    execution_time: float
    generation_count: int

# 系统状态
class SystemStatus(BaseModel):
    current_time: int
    total_seats: int
    occupied_seats: int
    pending_requests: int
    approved_today: int
    utilization_rate: float
    is_optimizing: bool

# 时段配置
class TimePeriodConfig(BaseModel):
    name: str
    start_minute: int
    end_minute: int
    request_rate: float  # 每分钟请求数
    avg_duration: int  # 平均预约时长

class SimulationConfig(BaseModel):
    time_periods: List[TimePeriodConfig]
    total_seats: int
    rolling_horizon: int
    population_size: int
    n_generations: int
