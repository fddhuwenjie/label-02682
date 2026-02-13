"""事件驱动模拟器"""
import random
import asyncio
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
from .config import settings, get_time_periods_config
from .models import Reservation, RequestPriority, RequestStatus
from .optimizer import optimizer
import logging

logger = logging.getLogger(__name__)


class TimePeriod:
    """时段配置"""
    def __init__(self, name: str, start: int, end: int, rate: float, avg_duration: int):
        self.name = name
        self.start_minute = start
        self.end_minute = end
        self.request_rate = rate
        self.avg_duration = avg_duration


def load_time_periods() -> List[TimePeriod]:
    """从配置文件加载时段配置，若无则使用默认值"""
    config_periods = get_time_periods_config()
    if config_periods:
        return [
            TimePeriod(
                p["name"],
                p["start"],
                p["end"],
                p["request_rate"],
                p["avg_duration"]
            )
            for p in config_periods
        ]
    # 默认时段配置
    return [
        TimePeriod("早间", 0, 180, 0.3, 90),      # 8:00-11:00
        TimePeriod("午间", 180, 300, 0.1, 60),    # 11:00-13:00
        TimePeriod("下午", 300, 480, 0.4, 120),   # 13:00-16:00
        TimePeriod("傍晚", 480, 540, 0.2, 60),    # 16:00-17:00
        TimePeriod("晚间", 540, 720, 0.5, 150),   # 17:00-20:00
    ]


# 从配置文件加载时段
DEFAULT_PERIODS = load_time_periods()


class Simulator:
    """事件驱动滚动时域模拟器"""
    
    def __init__(self):
        self.current_time: int = 0
        self.pending_requests: List[Dict] = []
        self.approved_requests: List[Dict] = []
        self.rejected_requests: List[Dict] = []
        self.optimization_logs: List[Dict] = []
        self.time_periods = DEFAULT_PERIODS
        self.is_running = False
        self.is_optimizing = False
        self.request_id_counter = 1
        self.last_optimization_time = 0
        self.callbacks: List[Callable] = []
        
    def reset(self):
        """重置模拟器"""
        self.current_time = 0
        self.pending_requests = []
        self.approved_requests = []
        self.rejected_requests = []
        self.optimization_logs = []
        self.is_running = False
        self.is_optimizing = False
        self.request_id_counter = 1
        self.last_optimization_time = 0
        optimizer.last_pareto_front = []
        optimizer.pareto_history = []
    
    def add_callback(self, callback: Callable):
        """添加状态更新回调"""
        self.callbacks.append(callback)
    
    async def notify_callbacks(self, event_type: str, data: Dict):
        """通知所有回调"""
        for callback in self.callbacks:
            try:
                await callback(event_type, data)
            except Exception as e:
                logger.error(f"回调执行失败: {e}")
    
    def get_current_period(self) -> Optional[TimePeriod]:
        """获取当前时段"""
        for period in self.time_periods:
            if period.start_minute <= self.current_time < period.end_minute:
                return period
        return None
    
    def _find_available_seat(self, start_time: int, end_time: int) -> Optional[int]:
        """查找指定时段内空闲的座位，无空闲座位时返回None"""
        # 统计每个座位在该时段的占用情况
        seat_occupied = {i: False for i in range(1, settings.TOTAL_SEATS + 1)}
        
        # 检查已批准的预约
        for req in self.approved_requests:
            if req.get("seat_id") and self._time_overlap(
                req["start_time"], req["end_time"], start_time, end_time
            ):
                seat_occupied[req["seat_id"]] = True
        
        # 检查待处理的预约（已分配座位的）
        for req in self.pending_requests:
            if req.get("seat_id") and self._time_overlap(
                req["start_time"], req["end_time"], start_time, end_time
            ):
                seat_occupied[req["seat_id"]] = True
        
        # 返回第一个空闲座位
        for seat_id, occupied in seat_occupied.items():
            if not occupied:
                return seat_id
        
        # 无空闲座位，返回None表示无法分配
        return None
    
    def _time_overlap(self, s1: int, e1: int, s2: int, e2: int) -> bool:
        """检查两个时间段是否重叠"""
        return s1 < e2 and s2 < e1
    
    def generate_request(self) -> Optional[Dict]:
        """根据当前时段生成请求"""
        period = self.get_current_period()
        if not period:
            return None
        
        if random.random() > period.request_rate:
            return None
        
        # 生成预约时长
        duration = max(30, int(random.gauss(period.avg_duration, 30)))
        duration = min(duration, 240)  # 最长4小时
        
        start_time = self.current_time + random.randint(0, 30)
        end_time = start_time + duration
        
        # 随机优先级
        priority_weights = [0.5, 0.3, 0.15, 0.05]
        priority = random.choices(
            [RequestPriority.LOW, RequestPriority.NORMAL, 
             RequestPriority.HIGH, RequestPriority.URGENT],
            weights=priority_weights
        )[0]
        
        # 分配座位：选择该时段空闲的座位
        seat_id = self._find_available_seat(start_time, end_time)
        
        request = {
            "id": self.request_id_counter,
            "user_id": random.randint(1, 100),
            "seat_id": seat_id,  # 可能为None，表示暂无可用座位，等待优化器处理
            "start_time": start_time,
            "end_time": end_time,
            "priority": priority,
            "status": RequestStatus.PENDING,
            "created_at": datetime.utcnow()
        }
        self.request_id_counter += 1
        return request
    
    def check_trigger_conditions(self) -> tuple[bool, str]:
        """检查是否触发优化"""
        # 事件触发: 高优先级请求
        high_priority_count = sum(
            1 for r in self.pending_requests 
            if r["priority"] in [RequestPriority.HIGH, RequestPriority.URGENT]
        )
        if high_priority_count >= settings.HIGH_PRIORITY_THRESHOLD:
            return True, f"event:high_priority({high_priority_count})"
        
        # 事件触发: 队列过长
        if len(self.pending_requests) >= settings.QUEUE_LENGTH_THRESHOLD:
            return True, f"event:queue_overflow({len(self.pending_requests)})"
        
        # 时间触发: 滚动周期
        if self.current_time - self.last_optimization_time >= settings.ROLLING_HORIZON:
            return True, f"time:rolling_horizon({settings.ROLLING_HORIZON}min)"
        
        return False, ""
    
    async def run_optimization(self, trigger_reason: str) -> Dict:
        """执行优化"""
        self.is_optimizing = True
        await self.notify_callbacks("optimization_start", {"reason": trigger_reason})
        
        try:
            # 转换为Reservation对象
            requests = []
            for r in self.pending_requests:
                req = Reservation()
                req.id = r["id"]
                req.user_id = r["user_id"]
                req.seat_id = r.get("seat_id")
                req.start_time = r["start_time"]
                req.end_time = r["end_time"]
                req.priority = r["priority"]
                req.status = r["status"]
                requests.append(req)
            
            # 运行D-NSGA-II
            result = optimizer.optimize(requests)
            
            self.last_optimization_time = self.current_time
            
            # 记录日志
            log_entry = {
                "time": self.current_time,
                "trigger_type": trigger_reason.split(":")[0],
                "trigger_reason": trigger_reason,
                "requests_count": len(self.pending_requests),
                "pareto_size": len(result["pareto_front"]),
                "execution_time": result["execution_time"]
            }
            self.optimization_logs.append(log_entry)
            
            await self.notify_callbacks("optimization_complete", {
                "result": result,
                "log": log_entry
            })
            
            return result
        finally:
            self.is_optimizing = False
    
    def apply_solution(self, solution: Dict):
        """应用选定的Pareto解，确保座位分配不冲突"""
        approved_ids = set(solution["assignments"])
        
        # 按开始时间排序待批准的请求，优先处理早的请求
        pending_to_approve = [req for req in self.pending_requests if req["id"] in approved_ids]
        pending_to_approve.sort(key=lambda r: r["start_time"])
        
        new_pending = []
        for req in self.pending_requests:
            if req["id"] in approved_ids:
                # 重新分配座位，确保不冲突
                seat_id = self._find_available_seat(req["start_time"], req["end_time"])
                if seat_id is not None:
                    req["status"] = RequestStatus.APPROVED
                    req["seat_id"] = seat_id
                    self.approved_requests.append(req)
                else:
                    # 无可用座位，保留在待处理队列
                    new_pending.append(req)
            else:
                new_pending.append(req)
        
        self.pending_requests = new_pending
    
    def get_status(self) -> Dict:
        """获取当前系统状态"""
        # 计算当前占用座位
        occupied = sum(
            1 for r in self.approved_requests
            if r["start_time"] <= self.current_time < r["end_time"]
        )
        
        return {
            "current_time": self.current_time,
            "total_seats": settings.TOTAL_SEATS,
            "occupied_seats": occupied,
            "pending_requests": len(self.pending_requests),
            "approved_today": len(self.approved_requests),
            "rejected_today": len(self.rejected_requests),
            "utilization_rate": occupied / settings.TOTAL_SEATS if settings.TOTAL_SEATS > 0 else 0,
            "is_running": self.is_running,
            "is_optimizing": self.is_optimizing,
            "current_period": self.get_current_period().name if self.get_current_period() else "休息"
        }
    
    async def step(self) -> Dict:
        """模拟器步进一分钟"""
        self.current_time += 1
        
        # 生成新请求
        new_request = self.generate_request()
        if new_request:
            self.pending_requests.append(new_request)
            await self.notify_callbacks("new_request", new_request)
        
        # 清理过期请求
        self.pending_requests = [
            r for r in self.pending_requests 
            if r["end_time"] > self.current_time
        ]
        
        # 检查触发条件
        should_optimize, reason = self.check_trigger_conditions()
        optimization_result = None
        
        if should_optimize and not self.is_optimizing:
            optimization_result = await self.run_optimization(reason)
            
            # 自动选择第一个解(可通过API手动选择)
            if optimization_result["pareto_front"]:
                self.apply_solution(optimization_result["pareto_front"][0])
        
        status = self.get_status()
        await self.notify_callbacks("status_update", status)
        
        return {
            "status": status,
            "new_request": new_request,
            "optimization": optimization_result
        }
    
    async def run(self, duration: int = None):
        """运行模拟"""
        duration = duration or settings.SIMULATION_DURATION
        self.is_running = True
        
        logger.info(f"开始模拟, 总时长: {duration}分钟")
        
        while self.current_time < duration and self.is_running:
            await self.step()
            await asyncio.sleep(0.1)  # 控制模拟速度
        
        self.is_running = False
        logger.info("模拟结束")
        
        return self.get_final_report()
    
    def get_final_report(self) -> Dict:
        """生成最终报告"""
        total_requests = len(self.approved_requests) + len(self.rejected_requests) + len(self.pending_requests)
        
        return {
            "summary": {
                "total_requests": total_requests,
                "approved": len(self.approved_requests),
                "rejected": len(self.rejected_requests),
                "pending": len(self.pending_requests),
                "approval_rate": len(self.approved_requests) / total_requests if total_requests > 0 else 0
            },
            "optimization_stats": {
                "total_optimizations": len(self.optimization_logs),
                "event_triggered": sum(1 for l in self.optimization_logs if l["trigger_type"] == "event"),
                "time_triggered": sum(1 for l in self.optimization_logs if l["trigger_type"] == "time"),
                "avg_execution_time": sum(l["execution_time"] for l in self.optimization_logs) / len(self.optimization_logs) if self.optimization_logs else 0
            },
            "logs": self.optimization_logs
        }


# 全局模拟器实例
simulator = Simulator()
