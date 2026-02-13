"""FastAPI主应用"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select
import logging

from .database import init_db, AsyncSessionLocal
from .models import User, Seat, UserRole
from .auth import get_password_hash
from .routers import auth, reservation, simulation
from .config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_default_data():
    """初始化默认数据"""
    async with AsyncSessionLocal() as db:
        # 创建管理员账户
        result = await db.execute(select(User).where(User.username == "admin"))
        if not result.scalar_one_or_none():
            admin = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN
            )
            db.add(admin)
            logger.info("创建管理员账户: admin/admin123")
        
        # 创建测试学生账户
        result = await db.execute(select(User).where(User.username == "student"))
        if not result.scalar_one_or_none():
            student = User(
                username="student",
                hashed_password=get_password_hash("student123"),
                role=UserRole.STUDENT
            )
            db.add(student)
            logger.info("创建学生账户: student/student123")
        
        # 创建座位
        result = await db.execute(select(Seat))
        if not result.scalars().first():
            for i in range(1, settings.TOTAL_SEATS + 1):
                seat = Seat(
                    seat_number=f"A{i:03d}",
                    has_power=(i % 3 != 0)
                )
                db.add(seat)
            logger.info(f"创建{settings.TOTAL_SEATS}个座位")
        
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    logger.info("初始化数据库...")
    await init_db()
    await init_default_data()
    logger.info("系统启动完成")
    yield
    logger.info("系统关闭")


app = FastAPI(
    title="D-NSGA-II自习室资源分配系统",
    description="基于事件驱动动态NSGA-II的校园自习室智能资源分配系统",
    version="1.0.0",
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(reservation.router)
app.include_router(simulation.router)


@app.get("/")
async def root():
    return {
        "name": "D-NSGA-II自习室资源分配系统",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
