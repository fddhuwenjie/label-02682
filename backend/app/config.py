"""系统配置"""
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

class Settings(BaseSettings):
    # 数据库
    DATABASE_URL: str = "sqlite+aiosqlite:///./study_room.db"
    
    # JWT
    SECRET_KEY: str = "d-nsga-ii-study-room-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    
    # 模拟参数
    TOTAL_SEATS: int = 100
    SIMULATION_DURATION: int = 720  # 12小时(分钟)
    ROLLING_HORIZON: int = 60  # 滚动时域(分钟)
    
    # D-NSGA-II参数
    POPULATION_SIZE: int = 52  # 必须是4的倍数
    N_GENERATIONS: int = 30
    CROSSOVER_PROB: float = 0.8
    MUTATION_PROB: float = 0.2
    ELITE_RATIO: float = 0.3  # 精英解继承比例
    
    # 事件触发阈值
    HIGH_PRIORITY_THRESHOLD: int = 3
    QUEUE_LENGTH_THRESHOLD: int = 20

settings = Settings()
