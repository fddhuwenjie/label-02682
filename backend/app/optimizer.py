"""D-NSGA-II优化器"""
import random
import numpy as np
from typing import List, Tuple, Dict, Any
from deap import base, creator, tools, algorithms
from .config import settings
from .models import Reservation, RequestPriority
import time
import logging

logger = logging.getLogger(__name__)

# DEAP类型定义
if not hasattr(creator, "FitnessMulti"):
    creator.create("FitnessMulti", base.Fitness, weights=(-1.0, -1.0, -1.0))
if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMulti)


class DNSGAIIOptimizer:
    """动态NSGA-II优化器"""
    
    def __init__(self):
        self.toolbox = base.Toolbox()
        self.pareto_history: List[List[Any]] = []
        self.last_pareto_front: List[Any] = []
        self.current_requests: List[Reservation] = []
        self.total_seats = settings.TOTAL_SEATS
        
    def setup_toolbox(self, n_requests: int):
        """配置DEAP工具箱"""
        # 清理旧注册
        for attr in ['attr_bool', 'individual', 'population', 'evaluate', 
                     'mate', 'mutate', 'select']:
            if hasattr(self.toolbox, attr):
                delattr(self.toolbox, attr)
        
        self.toolbox.register("attr_bool", random.randint, 0, 1)
        self.toolbox.register("individual", tools.initRepeat, creator.Individual,
                              self.toolbox.attr_bool, n_requests)
        self.toolbox.register("population", tools.initRepeat, list, self.toolbox.individual)
        self.toolbox.register("evaluate", self.evaluate)
        self.toolbox.register("mate", tools.cxTwoPoint)
        self.toolbox.register("mutate", tools.mutFlipBit, indpb=0.1)
        self.toolbox.register("select", tools.selNSGA2)
    
    def evaluate(self, individual: List[int]) -> Tuple[float, float, float]:
        """适应值函数 - 返回(未满足数, -利用率, -公平性)"""
        if not self.current_requests:
            return (0.0, 0.0, 0.0)
        
        # 检查时间冲突
        penalty = self._check_conflicts(individual)
        
        # 目标1: 未满足请求数
        unmet = len(individual) - sum(individual)
        
        # 目标2: 座位利用率
        total_occupied = 0
        for i, status in enumerate(individual):
            if status == 1:
                req = self.current_requests[i]
                total_occupied += req.end_time - req.start_time
        
        max_capacity = self.total_seats * settings.ROLLING_HORIZON
        utilization = total_occupied / max_capacity if max_capacity > 0 else 0
        
        # 目标3: 公平性
        met_indices = [i for i, s in enumerate(individual) if s == 1]
        if met_indices:
            durations = [self.current_requests[i].end_time - self.current_requests[i].start_time 
                        for i in met_indices]
            avg_duration = sum(durations) / len(durations)
            fairness = 1 / (avg_duration + 1e-6)
        else:
            fairness = 0
        
        return (unmet + penalty, -utilization, -fairness)
    
    def _check_conflicts(self, individual: List[int]) -> float:
        """检查时间冲突 - 同一座位同一时间不能分配给多人"""
        met_requests = [(i, self.current_requests[i]) for i, s in enumerate(individual) if s == 1]
        
        # 按座位分组检查
        seat_schedules: Dict[int, List[Tuple[int, int]]] = {}
        for idx, req in met_requests:
            seat_id = req.seat_id if req.seat_id else 0
            if seat_id not in seat_schedules:
                seat_schedules[seat_id] = []
            seat_schedules[seat_id].append((req.start_time, req.end_time))
        
        conflicts = 0
        for seat_id, times in seat_schedules.items():
            if seat_id == 0:
                # 未分配座位的请求，检查是否超过总座位数
                continue
            times.sort()
            for i in range(len(times) - 1):
                # 检查时间重叠
                if times[i][1] > times[i + 1][0]:
                    conflicts += 1
        
        return conflicts * 10000  # 大惩罚
    
    def _create_elite_population(self, pop_size: int) -> List[Any]:
        """动态初始化: 混合精英解与新解"""
        population = []
        
        # 继承上一轮Pareto精英解
        elite_count = int(pop_size * settings.ELITE_RATIO)
        if self.last_pareto_front:
            for i in range(min(elite_count, len(self.last_pareto_front))):
                old_ind = self.last_pareto_front[i]
                # 适配新请求数量
                new_ind = creator.Individual(self._adapt_individual(old_ind))
                population.append(new_ind)
        
        # 补充随机新解
        remaining = pop_size - len(population)
        population.extend(self.toolbox.population(n=remaining))
        
        return population
    
    def _adapt_individual(self, old_individual: List[int]) -> List[int]:
        """适配旧个体到新请求数量"""
        n_new = len(self.current_requests)
        n_old = len(old_individual)
        
        if n_new <= n_old:
            return old_individual[:n_new]
        else:
            return list(old_individual) + [random.randint(0, 1) for _ in range(n_new - n_old)]
    
    def optimize(self, requests: List[Reservation]) -> Dict[str, Any]:
        """执行D-NSGA-II优化"""
        start_time = time.time()
        self.current_requests = requests
        n_requests = len(requests)
        
        if n_requests == 0:
            return {
                "pareto_front": [],
                "execution_time": 0,
                "generation_count": 0
            }
        
        self.setup_toolbox(n_requests)
        
        # 动态初始化种群
        population = self._create_elite_population(settings.POPULATION_SIZE)
        
        # 评估初始种群
        fitnesses = map(self.toolbox.evaluate, population)
        for ind, fit in zip(population, fitnesses):
            ind.fitness.values = fit
        
        # 进化循环
        for gen in range(settings.N_GENERATIONS):
            # 先用NSGA2选择计算拥挤距离
            population = self.toolbox.select(population, len(population))
            
            # 选择 + 变异 (确保数量是4的倍数)
            k = len(population) - (len(population) % 4)
            if k < 4:
                k = 4
            offspring = tools.selTournamentDCD(population, k)
            offspring = [self.toolbox.clone(ind) for ind in offspring]
            
            # 交叉
            for i in range(0, len(offspring) - 1, 2):
                if random.random() < settings.CROSSOVER_PROB:
                    self.toolbox.mate(offspring[i], offspring[i + 1])
                    del offspring[i].fitness.values
                    del offspring[i + 1].fitness.values
            
            # 变异
            for mutant in offspring:
                if random.random() < settings.MUTATION_PROB:
                    self.toolbox.mutate(mutant)
                    del mutant.fitness.values
            
            # 评估
            invalid_ind = [ind for ind in offspring if not ind.fitness.valid]
            fitnesses = map(self.toolbox.evaluate, invalid_ind)
            for ind, fit in zip(invalid_ind, fitnesses):
                ind.fitness.values = fit
            
            # 环境选择
            population = self.toolbox.select(population + offspring, settings.POPULATION_SIZE)
        
        # 提取Pareto前沿
        pareto_front = tools.sortNondominated(population, len(population), first_front_only=True)[0]
        self.last_pareto_front = pareto_front
        self.pareto_history.append(pareto_front)
        
        execution_time = time.time() - start_time
        
        # 构建结果
        pareto_solutions = []
        for i, ind in enumerate(pareto_front):
            assignments = [self.current_requests[j].id for j, s in enumerate(ind) if s == 1]
            pareto_solutions.append({
                "id": i,
                "unmet_requests": int(ind.fitness.values[0]),
                "utilization_rate": float(-ind.fitness.values[1]),
                "fairness_score": float(-ind.fitness.values[2]),
                "assignments": assignments
            })
        
        logger.info(f"优化完成: {len(pareto_solutions)}个Pareto解, 耗时{execution_time:.2f}s")
        
        return {
            "pareto_front": pareto_solutions,
            "execution_time": execution_time,
            "generation_count": settings.N_GENERATIONS
        }


# 全局优化器实例
optimizer = DNSGAIIOptimizer()
