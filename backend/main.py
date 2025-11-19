import os
import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
import httpx

from sqlalchemy import (
    Column, Integer, String, Numeric, TIMESTAMP, JSON, create_engine, select, desc
)
from sqlalchemy.orm import declarative_base, sessionmaker

from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware


# ---- Load config ------------------------------------------------------------
load_dotenv()

API_KEY = os.getenv("ADMIN_API_KEY", "devkey")
MODEL_SERVICE_URL = os.getenv("MODEL_SERVICE_URL", "http://127.0.0.1:8001")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agent.db")


# ---- SQLAlchemy -------------------------------------------------------------
Base = declarative_base()
engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, future=True)


# ---- Database models --------------------------------------------------------
class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False)
    symbol = Column(String, nullable=False)
    action = Column(String, nullable=False)  # BUY/SELL/HOLD
    price = Column(Numeric(18, 8), nullable=False)
    size = Column(Numeric(18, 8), nullable=False)
    fee = Column(Numeric(18, 8), default=0)
    pnl = Column(Numeric(18, 8), default=0)
    extra = Column(JSON, default={})  # <---- FIXED (instead of metadata)


class BotConfig(Base):
    __tablename__ = "bot_configs"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    config = Column(JSON, nullable=False)


class Backtest(Base):
    __tablename__ = "backtests"
    id = Column(Integer, primary_key=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False)
    params = Column(JSON, default={})
    metrics = Column(JSON, default={})


Base.metadata.create_all(bind=engine)


# ---- FastAPI ---------------------------------------------------------------
app = FastAPI(title="Agent-Trader Backend API")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- In-memory bot state (demo) -------------------------------------------
bot_state = {
    "running": False,
    "balance": 10000.0,
    "unrealized_pnl": 0.0,
    "realized_pnl": 0.0,
    "open_positions": [],
    "last_action": None,
}


# ---- Pydantic schemas ------------------------------------------------------
class TradeOut(BaseModel):
    id: int
    timestamp: datetime.datetime
    symbol: str
    action: str
    price: float
    size: float
    pnl: Optional[float]

    class Config:
        orm_mode = True


class StartRequest(BaseModel):
    mode: str = "paper"


class UpdateConfigRequest(BaseModel):
    max_position_size: Optional[float] = None
    risk_per_trade: Optional[float] = None
    symbols: Optional[List[str]] = None
    mode: Optional[str] = None


# ---- Dependency -------------------------------------------------------------
def require_api_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ---- API endpoints ---------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/bot/status")
async def bot_status():
    return bot_state


@app.post("/bot/start")
async def bot_start(req: StartRequest, x_api_key: str = Depends(require_api_key)):
    bot_state["running"] = True
    bot_state["mode"] = req.mode
    return {"status": "started", "mode": req.mode}


@app.post("/bot/stop")
async def bot_stop(x_api_key: str = Depends(require_api_key)):
    bot_state["running"] = False
    return {"status": "stopped"}


@app.post("/bot/update-config")
async def bot_update_config(cfg: UpdateConfigRequest, x_api_key: str = Depends(require_api_key)):
    db = SessionLocal()
    try:
        conf = BotConfig(name="default", config=cfg.dict())
        db.add(conf)
        db.commit()
        db.refresh(conf)
        return {"status": "ok", "config_id": conf.id}
    finally:
        db.close()


@app.get("/trades", response_model=List[TradeOut])
async def get_trades(limit: int = 100, offset: int = 0, symbol: Optional[str] = None):
    db = SessionLocal()
    try:
        qry = select(Trade).order_by(desc(Trade.timestamp)).offset(offset).limit(limit)
        if symbol:
            qry = select(Trade).where(Trade.symbol == symbol).order_by(desc(Trade.timestamp)).offset(offset).limit(limit)

        rows = db.execute(qry).scalars().all()
        return rows
    finally:
        db.close()


@app.post("/model/predict")
async def model_predict(payload: Dict[str, Any]):
    async with httpx.AsyncClient(timeout=5) as client:
        r = await client.post(f"{MODEL_SERVICE_URL}/predict", json=payload)
        r.raise_for_status()
        return r.json()


@app.post("/trades/record")
async def record_trade(entry: Dict[str, Any], x_api_key: Optional[str] = Header(None)):

    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db = SessionLocal()

    try:
        timestamp = entry.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.datetime.fromisoformat(timestamp)
        if timestamp is None:
            timestamp = datetime.datetime.utcnow()

        t = Trade(
            timestamp=timestamp,
            symbol=entry["symbol"],
            action=entry["action"],
            price=entry["price"],
            size=entry["size"],
            fee=entry.get("fee", 0),
            pnl=entry.get("pnl", 0),
            extra=entry.get("extra", {}),  # <--- FIXED
        )

        db.add(t)
        db.commit()
        db.refresh(t)

        bot_state["realized_pnl"] += float(entry.get("pnl", 0))
        bot_state["last_action"] = {"action": entry["action"], "timestamp": timestamp.isoformat()}

        return {"status": "ok", "trade_id": t.id}

    finally:
        db.close()


from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import json

# В памяти храним открытые позиции (в реальном проекте — из БД или биржи)
open_positions = [
    {"symbol": "BTC", "quantity": 0.5, "avg_price": 62300.0, "current_price": 61625.0},
    {"symbol": "ETH", "quantity": 5.0, "avg_price": 3450.0, "current_price": 3400.0},
    {"symbol": "SOL", "quantity": 50.0, "avg_price": 138.0, "current_price": 115.0},
    {"symbol": "AAPL", "quantity": 100.0, "avg_price": 178.5, "current_price": 178.25},
    {"symbol": "TSLA", "quantity": 50.0, "avg_price": 242.0, "current_price": 240.0},
]

# Уведомления как на скрине
notifications = [
    {"type": "warning", "text": "Высокая волатильность BTC показывает +15% за час"},
    {"type": "success", "text": "Прибыльная сделка ETH продан с +$450"},
    {"type": "info", "text": "Открыта длинная позиция SOL"},
]


@app.get("/dashboard")
async def dashboard():
    total_value = sum(p["quantity"] * p["current_price"] for p in open_positions)
    unrealized_pnl = sum(
        (p["current_price"] - p["avg_price"]) * p["quantity"]
        for p in open_positions
    )

    return {
        "balance": 17500.00,
        "total_pnl": 7500.00,
        "win_rate": 68.4,
        "total_trades": 186,
        "active_positions": len(open_positions),
        "positions_list": [p["symbol"] for p in open_positions],
        "chart_balance": {"from": 10000.00, "to": 17500.00},
        "chart_pnl": {"profit": 9200.00, "loss": 1700.00},
        "notifications": notifications,
        "uptime": "47д 23ч",
        "status": "active" if bot_state["running"] else "stopped",
        "model": "PPO v1"
    }


@app.get("/portfolio")
async def portfolio():
    assets = []
    total_value = 0
    unrealized_pnl_total = 0

    for pos in open_positions:
        value = pos["quantity"] * pos["current_price"]
        unrealized = (pos["current_price"] - pos["avg_price"]) * pos["quantity"]
        change_pct = (pos["current_price"] - pos["avg_price"]) / pos["avg_price"] * 100

        total_value += value
        unrealized_pnl_total += unrealized

        assets.append({
            "symbol": pos["symbol"],
            "name": {
                "BTC": "Bitcoin", "ETH": "Ethereum", "SOL": "Solana",
                "AAPL": "Apple Inc.", "TSLA": "Tesla Inc."
            }.get(pos["symbol"], pos["symbol"]),
            "quantity": pos["quantity"],
            "avg_price": pos["avg_price"],
            "current_price": pos["current_price"],
            "value": round(value, 2),
            "change_percent": round(change_pct, 2),
            "unrealized_pnl": round(unrealized, 2)
        })

    return {
        "total_value": round(total_value + 3895, 2),  # + свободные средства
        "assets_count": len(assets),
        "unrealized_pnl": round(unrealized_pnl_total, 2),
        "free_cash": 3895.00,
        "assets": assets
    }


@app.get("/notifications")
async def get_notifications():
    return notifications


@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(await dashboard())  # просто шлём весь дашборд
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        pass