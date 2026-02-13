"""预约路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..database import get_db
from ..models import User, Reservation, Seat, RequestStatus
from ..schemas import ReservationCreate, ReservationResponse, SeatResponse
from ..auth import get_current_user
from ..simulator import simulator

router = APIRouter(prefix="/api/reservations", tags=["预约"])

@router.post("/", response_model=ReservationResponse)
async def create_reservation(
    data: ReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建预约请求"""
    if data.end_time <= data.start_time:
        raise HTTPException(status_code=400, detail="结束时间必须大于开始时间")
    
    if data.end_time - data.start_time > 240:
        raise HTTPException(status_code=400, detail="单次预约不能超过4小时")
    
    reservation = Reservation(
        user_id=current_user.id,
        start_time=data.start_time,
        end_time=data.end_time,
        priority=data.priority
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    
    # 同步到模拟器
    simulator.pending_requests.append({
        "id": reservation.id,
        "user_id": reservation.user_id,
        "start_time": reservation.start_time,
        "end_time": reservation.end_time,
        "priority": reservation.priority,
        "status": reservation.status,
        "created_at": reservation.created_at
    })
    
    return reservation

@router.get("/", response_model=List[ReservationResponse])
async def get_my_reservations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取我的预约"""
    result = await db.execute(
        select(Reservation).where(Reservation.user_id == current_user.id)
    )
    return result.scalars().all()

@router.get("/pending", response_model=List[ReservationResponse])
async def get_pending_reservations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取待处理预约(管理员)"""
    result = await db.execute(
        select(Reservation).where(Reservation.status == RequestStatus.PENDING)
    )
    return result.scalars().all()

@router.delete("/{reservation_id}")
async def cancel_reservation(
    reservation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取消预约"""
    result = await db.execute(
        select(Reservation).where(
            Reservation.id == reservation_id,
            Reservation.user_id == current_user.id
        )
    )
    reservation = result.scalar_one_or_none()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="预约不存在")
    
    if reservation.status == RequestStatus.APPROVED:
        raise HTTPException(status_code=400, detail="已确认的预约无法取消")
    
    reservation.status = RequestStatus.CANCELLED
    await db.commit()
    
    # 从模拟器移除
    simulator.pending_requests = [
        r for r in simulator.pending_requests if r["id"] != reservation_id
    ]
    
    return {"message": "预约已取消"}

@router.get("/seats", response_model=List[SeatResponse])
async def get_seats(db: AsyncSession = Depends(get_db)):
    """获取座位列表"""
    result = await db.execute(select(Seat).where(Seat.is_active == True))
    return result.scalars().all()
