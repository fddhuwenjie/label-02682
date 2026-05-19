# D-NSGA-II 校园自习室动态资源分配系统 — 算法分析报告

---

## 一、从"启动模拟"到第一次 D-NSGA-II 优化的完整调用链路

### 1.1 调用链路时序图

```mermaid
sequenceDiagram
    participant Admin as 管理员(浏览器)
    participant CP as ControlPanel组件
    participant API as api/index.ts
    participant Router as simulation.py路由
    participant Sim as simulator.py
    participant Opt as optimizer.py
    participant WS as WebSocket(ConnectionManager)

    Admin->>CP: 点击"启动模拟"按钮
    CP->>CP: handleStart() 检查localRunning/Loading状态
    CP->>API: simulationApi.start(duration)
    Note over API: POST /api/simulation/start?duration=120
    API->>Router: HTTP POST /api/simulation/start
    Router->>Router: get_current_user() 验证JWT + 管理员角色
    Router->>Sim: simulator.is_running 检查运行状态
    Router->>Sim: asyncio.create_task(simulator.run(duration))
    Router-->>API: {"message": "模拟已启动", "duration": 120}
    API-->>CP: 响应返回
    CP->>CP: message.success('模拟已启动')
    CP->>API: onRefresh() → simulationApi.getStatus()

    loop 模拟循环 (每0.1秒一步)
        Sim->>Sim: step() → current_time += 1
        Sim->>Sim: generate_request() 按时段概率生成请求
        Sim->>WS: notify_callbacks("new_request", request)
        Sim->>Sim: 清理过期请求
        Sim->>Sim: check_trigger_conditions()
        Note over Sim: 检查三个触发条件:<br/>1. 高优先级请求数 ≥ 阈值<br/>2. 队列长度 ≥ 阈值<br/>3. 滚动时域到期
    end

    Note over Sim: 触发条件满足(例如: 滚动时域60分钟到期)
    Sim->>Sim: run_optimization("time:rolling_horizon(60min)")
    Sim->>WS: notify_callbacks("optimization_start", {reason})
    WS-->>Admin: WebSocket推送 optimization_start事件

    Sim->>Sim: 转换pending_requests为Reservation对象列表
    Sim->>Opt: optimizer.optimize(requests)

    Opt->>Opt: setup_toolbox(n_requests)
    Opt->>Opt: _create_elite_population(POPULATION_SIZE)
    Note over Opt: 首次运行last_pareto_front为空<br/>→ 全部随机初始化(等同标准NSGA-II)
    Opt->>Opt: 评估初始种群 → evaluate(individual)
    Note over Opt: 三目标适应值:<br/>f₁=未满足数+冲突惩罚<br/>f₂=-利用率<br/>f₃=-公平性

    loop 进化循环 (N_GENERATIONS=30代)
        Opt->>Opt: NSGA2选择 → selTournamentDCD
        Opt->>Opt: 交叉 cxTwoPoint (概率0.8)
        Opt->>Opt: 变异 mutFlipBit (概率0.2)
        Opt->>Opt: 评估无效个体
        Opt->>Opt: 环境选择 (pop+offspring → POPULATION_SIZE)
    end

    Opt->>Opt: sortNondominated提取Pareto前沿
    Opt->>Opt: 保存last_pareto_front和pareto_history
    Opt-->>Sim: 返回 {pareto_front, execution_time, generation_count}

    Sim->>Opt: optimizer.optimize_standard_nsga2(requests)
    Note over Sim,Opt: 对比运行标准NSGA-II(无精英继承)
    Opt-->>Sim: 返回标准NSGA-II结果

    Sim->>Sim: 计算对比指标comparison_data
    Sim->>Sim: 记录optimization_logs
    Sim->>WS: notify_callbacks("optimization_complete", {result, comparison})
    WS-->>Admin: WebSocket推送 optimization_complete事件
    Note over Admin: Dashboard.onmessage处理:<br/>更新paretoSolutions和logs

    Sim->>Sim: apply_solution(pareto_front[0])
    Note over Sim: 自动应用第一个Pareto解:<br/>1. 为满足的请求分配座位<br/>2. 更新请求状态<br/>3. 确保无座位冲突
```

### 1.2 关键调用路径文字梳理

| 阶段 | 调用路径 | 关键代码位置 |
|------|---------|------------|
| 前端按钮点击 | `ControlPanel.tsx:28` `handleStart()` | `frontend/src/components/ControlPanel.tsx:28` |
| HTTP请求发送 | `api/index.ts:55` `simulationApi.start()` | `frontend/src/api/index.ts:55` |
| 后端路由处理 | `simulation.py:58` `start_simulation()` | `backend/app/routers/simulation.py:58` |
| 异步启动模拟 | `asyncio.create_task(simulator.run())` | `backend/app/routers/simulation.py:70` |
| 模拟循环步进 | `simulator.step()` | `backend/app/simulator.py:339` |
| 触发条件检查 | `check_trigger_conditions()` | `backend/app/simulator.py:176` |
| 执行优化 | `run_optimization(reason)` | `backend/app/simulator.py:196` |
| D-NSGA-II核心 | `optimizer.optimize(requests)` | `backend/app/optimizer.py:161` |
| 结果广播 | `notify_callbacks("optimization_complete")` | `backend/app/simulator.py:259` |
| WebSocket推送 | `manager.broadcast(message)` | `backend/app/routers/simulation.py:30` |
| 前端接收更新 | `Dashboard.tsx:63` `websocket.onmessage` | `frontend/src/pages/Dashboard.tsx:63` |

---

## 二、D-NSGA-II 相比标准 NSGA-II 的三个关键改进点

### 2.1 改进一：精英解继承策略（Elite Inheritance）

**代码位置：** `backend/app/optimizer.py:132-149`（`_create_elite_population` 方法）

**代码核心逻辑：**

```python
def _create_elite_population(self, pop_size: int) -> List[Any]:
    population = []
    elite_count = int(pop_size * settings.ELITE_RATIO)  # 默认30%
    if self.last_pareto_front:
        for i in range(min(elite_count, len(self.last_pareto_front))):
            old_ind = self.last_pareto_front[i]
            new_ind = creator.Individual(self._adapt_individual(old_ind))
            population.append(new_ind)
    remaining = pop_size - len(population)
    population.extend(self.toolbox.population(n=remaining))
    return population
```

**对比标准NSGA-II：** 标准NSGA-II在 `optimize_standard_nsga2`（`optimizer.py:245-319`）中使用 `self.toolbox.population(n=POPULATION_SIZE)` 完全随机初始化，不继承任何历史解。

**数学原理：**

设第 $t$ 轮优化获得的Pareto前沿为 $PF^{(t)}$，第 $t+1$ 轮的初始种群 $P_0^{(t+1)}$ 构造如下：

$$P_0^{(t+1)} = \underbrace{\text{Adapt}(PF^{(t)}_{1:k})}_{\text{精英继承部分}} \cup \underbrace{R_{\text{random}}}_{\text{随机补充部分}}$$

其中 $k = \lfloor \rho \cdot N_{\text{pop}} \rfloor$，$\rho = 0.3$ 为精英比例（`ELITE_RATIO`），`Adapt()` 为个体维度适配函数（`_adapt_individual`，`optimizer.py:151-159`）：

$$\text{Adapt}(I_{\text{old}}) = \begin{cases} I_{\text{old}}[0:n_{\text{new}}] & \text{if } n_{\text{new}} \leq n_{\text{old}} \\ I_{\text{old}} \cup \text{Random}(n_{\text{new}} - n_{\text{old}}) & \text{if } n_{\text{new}} > n_{\text{old}} \end{cases}$$

**解决的场景问题：** 在滚动时域模拟中，相邻优化轮次的请求集合高度重叠（大部分旧请求仍在队列中，仅新增少量请求）。标准NSGA-II每轮从零开始搜索，浪费了前一轮已积累的进化信息。精英继承策略使新轮次的初始种群从靠近Pareto前沿的区域开始搜索，加速收敛。这对于实时资源分配至关重要——缩短优化耗时意味着更快响应动态变化的请求队列。

---

### 2.2 改进二：动态种群初始化（Dynamic Population Initialization with Adaptation）

**代码位置：** `backend/app/optimizer.py:151-159`（`_adapt_individual` 方法），以及 `optimizer.py:30-45`（`setup_toolbox` 方法）

**代码核心逻辑：**

```python
def _adapt_individual(self, old_individual: List[int]) -> List[int]:
    n_new = len(self.current_requests)
    n_old = len(old_individual)
    if n_new <= n_old:
        return old_individual[:n_new]
    else:
        return list(old_individual) + [random.randint(0, 1) for _ in range(n_new - n_old)]
```

**对比标准NSGA-II：** 标准NSGA-II的个体维度 $n$ 固定不变，因为每轮的请求集合完全独立，不存在跨轮次个体复用问题，因此无需维度适配。

**数学原理：**

每个个体 $I$ 是长度为 $n$ 的二进制向量，$I = (s_1, s_2, \ldots, s_n)$，其中 $s_i \in \{0,1\}$ 表示第 $i$ 个请求是否被满足。由于每轮待优化的请求数量 $n$ 是动态变化的，旧个体 $I^{(t)}$ 的维度 $n^{(t)}$ 与新问题维度 $n^{(t+1)}$ 可能不同。适配策略：

- **维度缩减**（$n^{(t+1)} < n^{(t)}$）：截断保留前 $n^{(t+1)}$ 位，语义为保留对仍在队列中的旧请求的分配决策。这利用了 `pending_requests` 列表顺序在清理过期请求后保持稳定的特点——前 $n^{(t+1)}$ 个请求与旧个体前 $n^{(t+1)}$ 位一一对应。
- **维度扩展**（$n^{(t+1)} > n^{(t)}$）：保留旧决策，对新增请求位随机初始化。新增位对应新到达的请求，尚无历史信息，随机初始化是合理的无偏选择。

**解决的场景问题：** 自习室预约请求队列是动态变化的——新请求持续到达，过期请求被清理。每一轮优化面对的请求集合大小都不同。标准NSGA-II无法处理维度变化的优化问题；而D-NSGA-II通过 `_adapt_individual` 使上一轮的精英解能无缝迁移到新的决策空间，维持了进化连续性。如果没有维度适配，精英继承策略将无法执行，因为维度不匹配的个体无法参与进化操作。

---

### 2.3 改进三：适应值函数设计（Domain-Specific Fitness with Conflict Penalty）

**代码位置：** `backend/app/optimizer.py:47-82`（`evaluate` 方法）和 `optimizer.py:84-130`（`_check_conflicts` 方法）

**代码核心逻辑：**

```python
def evaluate(self, individual: List[int]) -> Tuple[float, float, float]:
    penalty = self._check_conflicts(individual)
    unmet = len(individual) - sum(individual)                    # f₁
    utilization = total_occupied / max_capacity                   # f₂
    fairness = 1 / (avg_duration + 1e-6)                         # f₃
    return (unmet + penalty, -utilization, -fairness)
```

**对比标准NSGA-II：** 标准NSGA-II是一个通用的多目标进化算法框架，本身不定义适应值函数。系统在DEAP框架的 `creator.create("FitnessMulti", base.Fitness, weights=(-1.0, -1.0, -1.0))`（`optimizer.py:15`）中声明三目标全部最小化，具体目标函数由 `evaluate` 实现。D-NSGA-II的关键改进不在于NSGA-II算法本身，而在于针对动态资源分配场景设计了专门的三目标适应值函数加冲突惩罚机制。

**数学原理：**

三个优化目标定义为：

| 目标 | 公式 | 含义 |
|------|------|------|
| $f_1(I)$ | $n - \sum_{i=1}^{n} s_i + P(I)$ | 未满足请求数 + 冲突惩罚 |
| $f_2(I)$ | $-\frac{\sum_{i=1}^{n}(T_{\text{end}}^{(i)} - T_{\text{start}}^{(i)}) \cdot s_i}{S_{\text{total}} \cdot D_{\text{sim}}}$ | 负利用率（最小化 = 最大化利用率） |
| $f_3(I)$ | $-\frac{1}{\bar{d} + \varepsilon}$ | 负公平性（最小化 = 最大化公平性） |

其中冲突惩罚 $P(I)$ 的计算逻辑（`_check_conflicts`，`optimizer.py:84-130`）：

$$P(I) = \begin{cases} 10000 & \text{若同一座位在重叠时段被分配给多个请求} \\ 10000 & \text{若某时刻并发请求数超过总座位数} \\ 0 & \text{无冲突} \end{cases}$$

公平性度量 $f_3$ 的设计采用了反比例函数：$\text{fairness} = \frac{1}{\bar{d} + \varepsilon}$，其中 $\bar{d}$ 是被满足请求的平均时长。这意味着：当被满足请求的平均时长越短，公平性得分越高（倾向于满足更多短时长请求，而非少数长时长请求霸占座位）。

**解决的场景问题：**

1. **冲突惩罚（$P=10000$）**：硬约束软化的实用策略。自习室座位排他性是硬约束（同一座位同一时段只能分配给一个学生），但NSGA-II基于Pareto支配关系无法直接处理约束。通过大惩罚值将不可行解的 $f_1$ 推至极高值，使其在非支配排序中被淘汰，等效于约束处理。
2. **三目标权衡**：实际管理中存在天然矛盾——最小化未满足数倾向于批准更多请求，但可能降低利用率（碎片化分配）和公平性（只满足短请求）。多目标Pareto优化使管理员可以看到不同权衡方案，而非单一"最优"解。
3. **公平性设计**：$\frac{1}{\bar{d}+\varepsilon}$ 鼓励满足短时段请求，避免"座位被长时间预约占满、短时需求无处可去"的问题，体现了自习室场景中"让更多人有机会使用"的公平理念。

---

## 三、高并发场景下的三个潜在性能瓶颈

### 3.1 瓶颈一：优化器阻塞事件循环

**根因分析：**

`optimizer.optimize()` 和 `optimizer.optimize_standard_nsga2()` 均为CPU密集型同步函数，包含双重嵌套循环（种群 × 代数 × 适应值评估），且 `_check_conflicts` 中的冲突检测为 $O(m^2)$ 复杂度（$m$ 为满足的请求数）。

在 `simulator.py:216-219` 中：

```python
result = optimizer.optimize(requests)                    # 同步阻塞
standard_result = optimizer.optimize_standard_nsga2(requests)  # 同步阻塞
```

这两个调用在 `run_optimization`（async 方法）中被直接同步调用，而非通过 `asyncio.to_thread` 或进程池执行。这意味着在优化计算期间（默认30代 × 52个体，加上对比运行），整个 asyncio 事件循环被阻塞：

- WebSocket 心跳/推送无法发送
- HTTP 请求无法响应（包括 `/api/simulation/status`）
- 其他协程无法调度

更严重的是，系统同时运行两遍优化（D-NSGA-II + 标准NSGA-II对比），阻塞时间翻倍。

**优化方案：**

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

# 方案A: 使用线程池（简单但受GIL限制）
async def run_optimization(self, trigger_reason: str) -> Dict:
    self.is_optimizing = True
    await self.notify_callbacks("optimization_start", {"reason": trigger_reason})
    try:
        # ... 构造requests ...
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, optimizer.optimize, requests)
        standard_result = await loop.run_in_executor(
            None, optimizer.optimize_standard_nsga2, requests
        )
        # ... 后续处理 ...
    finally:
        self.is_optimizing = False

# 方案B: 使用进程池（彻底释放GIL，适合CPU密集型）
_process_pool = ProcessPoolExecutor(max_workers=2)

async def run_optimization(self, trigger_reason: str) -> Dict:
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(_process_pool, optimizer.optimize, requests)
    # 注意：ProcessPoolExecutor要求optimizer.optimize可pickle
```

同时建议将D-NSGA-II和标准NSGA-II的对比运行并行化：

```python
result_coro = loop.run_in_executor(None, optimizer.optimize, requests)
standard_coro = loop.run_in_executor(None, optimizer.optimize_standard_nsga2, requests)
result, standard_result = await asyncio.gather(result_coro, standard_coro)
```

---

### 3.2 瓶颈二：WebSocket 广播风暴

**根因分析：**

在 `simulation.py:30-41` 的 `ConnectionManager.broadcast` 中，每条消息都是逐连接串行发送：

```python
async def broadcast(self, message: dict):
    disconnected = []
    for connection in self.active_connections:
        try:
            await connection.send_json(message)    # 串行await
        except WebSocketDisconnect:
            disconnected.append(connection)
```

同时，在模拟器 `step()` 方法（`simulator.py:339-373`）中，每一步都会触发至少一次回调：

```python
async def step(self) -> Dict:
    # ...
    if new_request:
        await self.notify_callbacks("new_request", new_request)  # 广播1
    # ...
    await self.notify_callbacks("status_update", status)          # 广播2
    # 优化时还有更多广播...
```

模拟以每0.1秒一步运行（`simulator.py:384: await asyncio.sleep(0.1)`），720分钟模拟 = 7200步。每步至少1次 `status_update` 广播。假设有 $K$ 个WebSocket客户端连接，总广播次数为 $7200 \times K$（未计优化事件广播）。每个 `await connection.send_json()` 都是一次IO等待，串行执行意味着广播耗时与连接数 $K$ 成正比。

**优化方案：**

```python
# 方案A: 并行广播（使用asyncio.gather）
async def broadcast(self, message: dict):
    if not self.active_connections:
        return
    tasks = [self._safe_send(conn, message) for conn in self.active_connections]
    await asyncio.gather(*tasks)

async def _safe_send(self, conn, message):
    try:
        await conn.send_json(message)
    except (WebSocketDisconnect, Exception):
        self.disconnect(conn)

# 方案B: 消息节流 - 合并高频状态更新
class ThrottledConnectionManager(ConnectionManager):
    def __init__(self, throttle_interval: float = 0.5):
        super().__init__()
        self._last_broadcast = {}
        self._pending = {}
        self._throttle_interval = throttle_interval

    async def broadcast(self, message: dict):
        event_type = message.get("type", "")
        now = asyncio.get_event_loop().time()
        last = self._last_broadcast.get(event_type, 0)
        if now - last < self._throttle_interval:
            self._pending[event_type] = message  # 只保留最新消息
            return
        self._last_broadcast[event_type] = now
        await self._do_broadcast(message)

# 方案C: 使用Redis Pub/Sub解耦
# 将broadcast改为publish到Redis channel，由独立的消费者推送
```

---

### 3.3 瓶颈三：SQLite 写锁竞争

**根因分析：**

系统使用 `sqlite+aiosqlite` 作为数据库（`config.py:39`）：

```python
DATABASE_URL: str = "sqlite+aiosqlite:///./study_room.db"
```

SQLite 的核心限制：**整个数据库文件只有一个写锁**。当多个协程/请求并发写入时（如学生提交预约、管理员操作、优化器更新状态），所有写操作必须串行等待。

数据库引擎创建时未配置任何并发优化参数（`database.py:7`）：

```python
engine = create_async_engine(settings.DATABASE_URL, echo=False)
```

缺少关键配置：
- 未设置 `pool_size`（默认为5，但SQLite实际只能串行写）
- 未启用WAL模式（Write-Ahead Logging），WAL模式允许读写并发
- 未设置 `connect_args={"check_same_thread": False}` 的超时参数

具体竞争场景：当模拟器在 `apply_solution`（`simulator.py:278-316`）中批量更新请求状态时，如果有学生同时通过 `/api/reservations/` 提交新预约（需要写数据库），写锁将导致后者阻塞等待。

**优化方案：**

```python
# 方案A: 启用WAL模式（最小改动，最大收益）
from sqlalchemy import event

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
)

@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")       # 启用WAL，允许读写并发
    cursor.execute("PRAGMA busy_timeout=5000")       # 写锁等待超时5秒
    cursor.execute("PRAGMA synchronous=NORMAL")      # 降低同步级别，提升写性能
    cursor.close()

# 方案B: 批量写入替代逐条写入
# 在apply_solution中，将多次单独UPDATE合并为一次事务
async def apply_solution_batch(self, solution: Dict):
    async with AsyncSessionLocal() as session:
        async with session.begin():
            for req_id in solution["assignments"]:
                stmt = update(Reservation).where(
                    Reservation.id == req_id
                ).values(status=RequestStatus.APPROVED, seat_id=...)
                await session.execute(stmt)
        # 一次提交，一个写锁周期

# 方案C: 生产环境切换至PostgreSQL（彻底解决）
# DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/study_room"
# PostgreSQL支持真正的行级锁和MVCC并发控制
```

---

## 附录：系统关键参数配置

| 参数 | 默认值 | 代码位置 | 说明 |
|------|--------|---------|------|
| `TOTAL_SEATS` | 100 | `config.py:47` | 自习室总座位数 |
| `SIMULATION_DURATION` | 720 | `config.py:48` | 模拟总时长（分钟） |
| `ROLLING_HORIZON` | 60 | `config.py:49` | 滚动时域周期（分钟） |
| `POPULATION_SIZE` | 52 | `config.py:52` | 种群大小（4的倍数） |
| `N_GENERATIONS` | 30 | `config.py:53` | 进化代数 |
| `CROSSOVER_PROB` | 0.8 | `config.py:54` | 交叉概率 |
| `MUTATION_PROB` | 0.2 | `config.py:55` | 变异概率 |
| `ELITE_RATIO` | 0.3 | `config.py:56` | 精英继承比例 |
| `HIGH_PRIORITY_THRESHOLD` | 3 | `config.py:59` | 高优先级触发阈值 |
| `QUEUE_LENGTH_THRESHOLD` | 20 | `config.py:60` | 队列长度触发阈值 |
| `FitnessMulti weights` | (-1,-1,-1) | `optimizer.py:15` | 三目标全部最小化 |
| 冲突惩罚值 | 10000 | `optimizer.py:116,128` | 硬约束惩罚 |
