"""数据库模型"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STUDENT = "student"

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class RequestPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    reservations = relationship("Reservation", back_populates="user")

class Seat(Base):
    __tablename__ = "seats"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, default=1)
    seat_number = Column(String(10), nullable=False)
    has_power = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    
    reservations = relationship("Reservation", back_populates="seat")

class Reservation(Base):
    __tablename__ = "reservations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seat_id = Column(Integer, ForeignKey("seats.id"), nullable=True)
    start_time = Column(Integer, nullable=False)  # 分钟数
    end_time = Column(Integer, nullable=False)
    priority = Column(SQLEnum(RequestPriority), default=RequestPriority.NORMAL)
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="reservations")
    seat = relationship("Seat", back_populates="reservations")

class OptimizationLog(Base):
    __tablename__ = "optimization_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    trigger_type = Column(String(20))  # time/event
    trigger_reason = Column(String(100))
    requests_count = Column(Integer)
    approved_count = Column(Integer)
    utilization_rate = Column(Float)
    fairness_score = Column(Float)
    generation_count = Column(Integer)
    execution_time = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
