"""系统配置"""
import os
import yaml
from pathlib import Path

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings


def load_config_file() -> dict:
    """加载配置文件"""
    config_paths = [
        Path(__file__).parent.parent / "config.yaml",
        Path(__file__).parent.parent / "config.yml",
        Path("/app/config.yaml"),  # Docker容器路径
        Path("/app/config.yml"),
        Path("config.yaml"),
        Path("config.yml"),
    ]
    
    for config_path in config_paths:
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
    return {}


# 加载配置文件
_file_config = load_config_file()
_scenario = _file_config.get("scenario", {})
_optimizer = _file_config.get("optimizer", {})
_triggers = _file_config.get("triggers", {})


class Settings(BaseSettings):
    # 数据库
    DATABASE_URL: str = "sqlite+aiosqlite:///./study_room.db"
    
    # JWT
    SECRET_KEY: str = "d-nsga-ii-study-room-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    
    # 模拟参数 (优先从配置文件加载)
    TOTAL_SEATS: int = _scenario.get("total_seats", 100)
    SIMULATION_DURATION: int = _scenario.get("simulation_duration", 720)  # 12小时(分钟)
    ROLLING_HORIZON: int = _scenario.get("rolling_horizon", 60)  # 滚动时域(分钟)
    
    # D-NSGA-II参数 (优先从配置文件加载)
    POPULATION_SIZE: int = _optimizer.get("population_size", 52)  # 必须是4的倍数
    N_GENERATIONS: int = _optimizer.get("n_generations", 30)
    CROSSOVER_PROB: float = _optimizer.get("crossover_prob", 0.8)
    MUTATION_PROB: float = _optimizer.get("mutation_prob", 0.2)
    ELITE_RATIO: float = _optimizer.get("elite_ratio", 0.3)  # 精英解继承比例
    
    # 事件触发阈值 (优先从配置文件加载)
    HIGH_PRIORITY_THRESHOLD: int = _triggers.get("high_priority_threshold", 3)
    QUEUE_LENGTH_THRESHOLD: int = _triggers.get("queue_length_threshold", 20)


def get_time_periods_config() -> list:
    """获取时段配置"""
    return _file_config.get("time_periods", [])


settings = Settings()
