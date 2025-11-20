#!/usr/bin/env python3
"""
Seed database with mock data for OptiTrade
Generates a large amount of realistic trading data
"""

import os
import sys
import random
import datetime
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from backend.main import (
    SessionLocal,
    Trade,
    BotConfig,
    BotState,
    Position,
    Notification,
    Backtest,
)

SYMBOLS = ["BTC", "ETH", "SOL", "AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN", "META"]
TRADE_ACTIONS = ["BUY", "SELL", "HOLD"]

def generate_trades(db, count=1000):
    """Generate mock trades"""
    print(f"Generating {count} trades...")
    
    trades = []
    base_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
    
    for i in range(count):
        symbol = random.choice(SYMBOLS)
        action = random.choice(["BUY", "SELL"])
        
        price_ranges = {
            "BTC": (40000, 70000),
            "ETH": (2000, 4000),
            "SOL": (80, 200),
            "AAPL": (150, 200),
            "TSLA": (200, 300),
            "NVDA": (400, 600),
            "MSFT": (300, 450),
            "GOOGL": (120, 180),
            "AMZN": (120, 180),
            "META": (300, 500),
        }
        
        min_price, max_price = price_ranges.get(symbol, (100, 500))
        price = Decimal(str(round(random.uniform(min_price, max_price), 2)))
        size = Decimal(str(round(random.uniform(0.1, 10.0), 4)))
        
        days_ago = random.uniform(0, 30)
        timestamp = base_time + datetime.timedelta(days=days_ago, hours=random.randint(0, 23))
        
        base_price = price * Decimal(str(random.uniform(0.85, 1.15)))  # 15% variation
        if action == "BUY":
            pnl = (price - base_price) * size
        else:
            pnl = (base_price - price) * size
        
        pnl = pnl * Decimal(str(random.uniform(0.5, 1.5)))
        
        fee = price * size * Decimal("0.001")
        
        trade = Trade(
            timestamp=timestamp,
            symbol=symbol,
            action=action,
            price=price,
            size=size,
            fee=fee,
            pnl=pnl,
        )
        trades.append(trade)
    
    db.bulk_save_objects(trades)
    db.commit()
    print(f"✅ Created {count} trades")

def generate_positions(db, count=50):
    """Generate mock positions"""
    print(f"Generating {count} positions...")
    
    positions = []
    used_symbols = set()
    
    for i in range(count):
        symbol = random.choice(SYMBOLS)
        if len(used_symbols) < len(SYMBOLS):
            symbol = random.choice([s for s in SYMBOLS if s not in used_symbols])
            used_symbols.add(symbol)
        else:
            symbol = random.choice(SYMBOLS)
        
        price_ranges = {
            "BTC": (40000, 70000),
            "ETH": (2000, 4000),
            "SOL": (80, 200),
            "AAPL": (150, 200),
            "TSLA": (200, 300),
            "NVDA": (400, 600),
            "MSFT": (300, 450),
            "GOOGL": (120, 180),
            "AMZN": (120, 180),
            "META": (300, 500),
        }
        
        min_price, max_price = price_ranges.get(symbol, (100, 500))
        avg_price = Decimal(str(round(random.uniform(min_price, max_price), 2)))
        current_price = Decimal(str(round(random.uniform(min_price, max_price), 2)))
        quantity = Decimal(str(round(random.uniform(0.1, 100.0), 4)))
        
        position = Position(
            symbol=symbol,
            quantity=quantity,
            avg_price=avg_price,
            current_price=current_price,
            updated_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
                hours=random.randint(0, 24)
            ),
        )
        positions.append(position)
    
    db.bulk_save_objects(positions)
    db.commit()
    print(f"✅ Created {count} positions")

def generate_notifications(db, count=200):
    """Generate mock notifications"""
    print(f"Generating {count} notifications...")
    
    notification_types = ["success", "warning", "info"]
    messages = [
        "Bot started successfully",
        "Trade executed: BUY {symbol} @ ${price}",
        "Trade executed: SELL {symbol} @ ${price}",
        "Position updated: {symbol}",
        "High volatility detected for {symbol}",
        "Stop loss triggered for {symbol}",
        "Take profit reached for {symbol}",
        "Balance updated: ${amount}",
        "Risk limit reached",
        "Market analysis completed",
        "Backtest finished successfully",
        "Configuration updated",
    ]
    
    notifications = []
    base_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
    
    for i in range(count):
        notif_type = random.choice(notification_types)
        message_template = random.choice(messages)
        
        message = message_template.format(
            symbol=random.choice(SYMBOLS),
            price=round(random.uniform(100, 1000), 2),
            amount=round(random.uniform(10000, 50000), 2),
        )
        
        days_ago = random.uniform(0, 7)
        created_at = base_time + datetime.timedelta(days=days_ago, hours=random.randint(0, 23))
        
        notification = Notification(
            type=notif_type,
            text=message,
            created_at=created_at,
            read=random.choice([0, 1]) if random.random() > 0.3 else 0,
        )
        notifications.append(notification)
    
    db.bulk_save_objects(notifications)
    db.commit()
    print(f"✅ Created {count} notifications")

def generate_backtests(db, count=50):
    """Generate mock backtest results"""
    print(f"Generating {count} backtests...")
    
    backtests = []
    base_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=60)
    
    for i in range(count):
        start_date = base_time - datetime.timedelta(days=random.randint(30, 365))
        end_date = start_date + datetime.timedelta(days=random.randint(7, 90))
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "initial_balance": random.choice([10000, 25000, 50000, 100000]),
            "symbols": random.sample(SYMBOLS, random.randint(1, 5)),
            "strategy": random.choice(["momentum", "mean_reversion", "breakout", "trend_following"]),
            "risk_per_trade": round(random.uniform(0.01, 0.05), 3),
        }
        
        total_return_pct = random.uniform(-30.0, 80.0)
        total_return = params["initial_balance"] * (total_return_pct / 100.0)
        sharpe_ratio = random.uniform(0.5, 2.5)
        max_drawdown = random.uniform(-40.0, -5.0)
        win_rate = random.uniform(40.0, 70.0)
        total_trades = random.randint(50, 500)
        profit_factor = random.uniform(0.8, 2.5)
        
        metrics = {
            "total_return": round(total_return, 2),
            "total_return_pct": round(total_return_pct, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "max_drawdown": round(max_drawdown, 2),
            "win_rate": round(win_rate, 1),
            "total_trades": total_trades,
            "winning_trades": int(total_trades * (win_rate / 100.0)),
            "losing_trades": int(total_trades * ((100 - win_rate) / 100.0)),
            "final_balance": round(params["initial_balance"] + total_return, 2),
            "profit_factor": round(profit_factor, 2),
        }
        
        days_ago = random.uniform(0, 60)
        created_at = base_time + datetime.timedelta(days=days_ago)
        
        backtest = Backtest(
            created_at=created_at,
            params=params,
            metrics=metrics,
        )
        backtests.append(backtest)
    
    db.bulk_save_objects(backtests)
    db.commit()
    print(f"✅ Created {count} backtests")

def generate_bot_configs(db, count=10):
    """Generate mock bot configurations"""
    print(f"Generating {count} bot configurations...")
    
    configs = []
    config_names = [
        "Conservative Strategy",
        "Aggressive Trading",
        "Balanced Portfolio",
        "High Frequency",
        "Swing Trading",
        "Day Trading",
        "Scalping Bot",
        "Trend Following",
        "Mean Reversion",
        "Momentum Strategy",
    ]
    
    for i in range(count):
        name = config_names[i % len(config_names)] + f" #{i+1}"
        config_data = {
            "max_position_size": float(round(random.uniform(1000, 10000), 2)),
            "risk_per_trade": float(round(random.uniform(0.01, 0.05), 3)),
            "symbols": random.sample(SYMBOLS, random.randint(3, 8)),
            "mode": random.choice(["paper", "live"]),
        }
        
        config = BotConfig(
            name=name,
            config=config_data,
        )
        configs.append(config)
    
    db.bulk_save_objects(configs)
    db.commit()
    print(f"✅ Created {count} bot configurations")

def update_bot_state(db):
    """Update bot state with realistic data"""
    print("Updating bot state...")
    
    state = db.query(BotState).filter(BotState.id == 1).first()
    if not state:
        state = BotState(
            id=1,
            running=1,
            mode="paper",
            balance=Decimal("50000.00"),
            unrealized_pnl=Decimal(str(round(random.uniform(-5000, 10000), 2))),
            realized_pnl=Decimal(str(round(random.uniform(-2000, 5000), 2))),
            last_action={"action": random.choice(["BUY", "SELL", "HOLD"]), "symbol": random.choice(SYMBOLS)},
        )
        db.add(state)
    else:
        state.running = 1
        state.balance = Decimal("50000.00")
        state.unrealized_pnl = Decimal(str(round(random.uniform(-5000, 10000), 2)))
        state.realized_pnl = Decimal(str(round(random.uniform(-2000, 5000), 2)))
        state.last_action = {"action": random.choice(["BUY", "SELL", "HOLD"]), "symbol": random.choice(SYMBOLS)}
        state.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    db.commit()
    print("Bot state updated")

def main():
    """Main seeding function"""
    print("Starting database seeding...")
    print("=" * 50)
    
    db = SessionLocal()
    
    try:
        print("\n⚠️  Clearing existing data...")
        db.query(Trade).delete()
        db.query(Position).delete()
        db.query(Notification).delete()
        db.query(Backtest).delete()
        db.query(BotConfig).delete()
        db.commit()
        print("✅ Existing data cleared")
        
        print("\n📊 Generating mock data...")
        generate_trades(db, count=2000)
        generate_positions(db, count=100)
        generate_notifications(db, count=500)
        generate_backtests(db, count=100)
        generate_bot_configs(db, count=20)
        update_bot_state(db)
        
        print("\n" + "=" * 50)
        print("✅ Database seeding completed successfully!")
        print("\nSummary:")
        print(f"  - Trades: {db.query(Trade).count()}")
        print(f"  - Positions: {db.query(Position).count()}")
        print(f"  - Notifications: {db.query(Notification).count()}")
        print(f"  - Backtests: {db.query(Backtest).count()}")
        print(f"  - Bot Configs: {db.query(BotConfig).count()}")
        print(f"  - Bot State: {'✅' if db.query(BotState).filter(BotState.id == 1).first() else '❌'}")
        
    except Exception as e:
        print(f"\n❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()

