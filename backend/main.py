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
