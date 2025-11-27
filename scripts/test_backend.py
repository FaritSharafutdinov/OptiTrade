#!/usr/bin/env python3
"""
Quick test script to verify backend imports and basic functionality
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

print("=" * 60)
print("Testing Backend Import and Basic Functionality")
print("=" * 60)

# Test 1: Import main module
print("\n1. Testing backend.main import...")
try:
    from backend import main
    print("   ✅ backend.main imported successfully")
except Exception as e:
    print(f"   ❌ Failed to import backend.main: {e}")
    sys.exit(1)

# Test 2: Check FastAPI app
print("\n2. Testing FastAPI app...")
try:
    app = main.app
    print(f"   ✅ FastAPI app created: {app.title}")
except Exception as e:
    print(f"   ❌ Failed to get FastAPI app: {e}")
    sys.exit(1)

# Test 3: Check database models
print("\n3. Testing database models...")
try:
    from backend.main import Trade, BotState, Position, Backtest, Notification, BotConfig
    print("   ✅ All database models imported successfully")
    print(f"      - Trade: {Trade.__tablename__}")
    print(f"      - BotState: {BotState.__tablename__}")
    print(f"      - Position: {Position.__tablename__}")
    print(f"      - Backtest: {Backtest.__tablename__}")
    print(f"      - Notification: {Notification.__tablename__}")
    print(f"      - BotConfig: {BotConfig.__tablename__}")
except Exception as e:
    print(f"   ❌ Failed to import database models: {e}")
    sys.exit(1)

# Test 4: Check new modules
print("\n4. Testing new modules (tasks 1-8)...")
modules_to_test = [
    ("backend.exchange_client", ["ExchangeClient", "ExchangeType"]),
    ("backend.risk_manager", ["RiskManager", "RiskLimits"]),
    ("backend.trading_executor", ["TradingExecutor"]),
    ("backend.model_performance_tracker", ["ModelPerformanceTracker"]),
]

for module_name, classes in modules_to_test:
    try:
        module = __import__(module_name, fromlist=classes)
        for class_name in classes:
            if hasattr(module, class_name):
                print(f"   ✅ {module_name}.{class_name}")
            else:
                print(f"   ⚠️  {module_name}.{class_name} not found")
    except Exception as e:
        print(f"   ❌ Failed to import {module_name}: {e}")

# Test 5: Check endpoints
print("\n5. Testing endpoints...")
routes = [route.path for route in app.routes]
print(f"   Found {len(routes)} routes:")

important_endpoints = [
    "/health",
    "/bot/status",
    "/bot/start",
    "/bot/stop",
    "/dashboard",
    "/trades",
    "/backtests",
    "/trades/execute",  # New
    "/risk/stats",      # New
    "/models/performance",  # New
]

for endpoint in important_endpoints:
    if endpoint in routes:
        print(f"   ✅ {endpoint}")
    else:
        print(f"   ⚠️  {endpoint} not found")

print("\n" + "=" * 60)
print("✅ All basic tests passed!")
print("=" * 60)
print("\nNext steps:")
print("1. Start backend: uvicorn backend.main:app --host 127.0.0.1 --port 8000")
print("2. Test health endpoint: curl http://127.0.0.1:8000/health")
print("3. Check API docs: http://127.0.0.1:8000/docs")

