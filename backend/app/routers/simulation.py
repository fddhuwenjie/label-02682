"""模拟与优化路由"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio
import json
import logging
from ..models import User, UserRole
from ..auth import get_current_user
from ..simulator import simulator
from ..optimizer import optimizer
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/simulation", tags=["模拟"])

# WebSocket连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.warning(f"WebSocket广播失败: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# 注册WebSocket回调
async def ws_callback(event_type: str, data: Dict):
    await manager.broadcast({"type": event_type, "data": data})

simulator.add_callback(ws_callback)


@router.get("/status")
async def get_status():
    """获取当前系统状态"""
    return simulator.get_status()

@router.post("/start")
async def start_simulation(
    duration: int = None,
    current_user: User = Depends(get_current_user)
):
    """启动模拟(管理员)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    if simulator.is_running:
        raise HTTPException(status_code=400, detail="模拟已在运行中")
    
    # 异步启动模拟
    asyncio.create_task(simulator.run(duration))
    
    return {"message": "模拟已启动", "duration": duration or settings.SIMULATION_DURATION}

@router.post("/stop")
async def stop_simulation(current_user: User = Depends(get_current_user)):
    """停止模拟(管理员)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    simulator.is_running = False
    return {"message": "模拟已停止"}

@router.post("/reset")
async def reset_simulation(current_user: User = Depends(get_current_user)):
    """重置模拟(管理员)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    if simulator.is_running:
        raise HTTPException(status_code=400, detail="请先停止模拟")
    
    simulator.reset()
    return {"message": "模拟已重置"}

@router.post("/step")
async def step_simulation(current_user: User = Depends(get_current_user)):
    """单步执行(管理员)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    result = await simulator.step()
    return result

@router.post("/optimize")
async def trigger_optimization(current_user: User = Depends(get_current_user)):
    """手动触发优化(管理员)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    if simulator.is_optimizing:
        raise HTTPException(status_code=400, detail="优化正在进行中")
    
    result = await simulator.run_optimization("manual:admin_trigger")
    return result

@router.post("/apply-solution/{solution_id}")
async def apply_solution(
    solution_id: int,
    current_user: User = Depends(get_current_user)
):
    """应用指定的Pareto解(管理员)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    # 从最近的优化结果中查找
    if not optimizer.pareto_history:
        raise HTTPException(status_code=404, detail="没有可用的优化结果")
    
    last_front = optimizer.pareto_history[-1]
    if solution_id >= len(last_front):
        raise HTTPException(status_code=404, detail="解不存在")
    
    # 构建solution对象
    ind = last_front[solution_id]
    assignments = [
        simulator.pending_requests[j]["id"] 
        for j, s in enumerate(ind) if s == 1 and j < len(simulator.pending_requests)
    ]
    
    solution = {
        "id": solution_id,
        "assignments": assignments
    }
    
    simulator.apply_solution(solution)
    return {"message": f"已应用解 #{solution_id}", "approved_count": len(assignments)}

@router.get("/report")
async def get_report():
    """获取模拟报告"""
    return simulator.get_final_report()

@router.get("/pareto-history")
async def get_pareto_history():
    """获取Pareto前沿历史"""
    history = []
    for i, front in enumerate(optimizer.pareto_history):
        solutions = []
        for j, ind in enumerate(front):
            solutions.append({
                "id": j,
                "unmet_requests": float(ind.fitness.values[0]),
                "utilization_rate": float(-ind.fitness.values[1]),
                "fairness_score": float(-ind.fitness.values[2])
            })
        history.append({
            "iteration": i,
            "solutions": solutions
        })
    return history

@router.get("/config")
async def get_config():
    """获取当前配置"""
    return {
        "total_seats": settings.TOTAL_SEATS,
        "simulation_duration": settings.SIMULATION_DURATION,
        "rolling_horizon": settings.ROLLING_HORIZON,
        "population_size": settings.POPULATION_SIZE,
        "n_generations": settings.N_GENERATIONS,
        "crossover_prob": settings.CROSSOVER_PROB,
        "mutation_prob": settings.MUTATION_PROB,
        "elite_ratio": settings.ELITE_RATIO,
        "high_priority_threshold": settings.HIGH_PRIORITY_THRESHOLD,
        "queue_length_threshold": settings.QUEUE_LENGTH_THRESHOLD
    }

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket实时推送"""
    await manager.connect(websocket)
    try:
        while True:
            # 保持连接,接收客户端消息
            data = await websocket.receive_text()
            # 可以处理客户端命令
            if data == "status":
                await websocket.send_json({
                    "type": "status_update",
                    "data": simulator.get_status()
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
