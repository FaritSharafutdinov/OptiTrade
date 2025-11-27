"""
Model Performance Tracker

Tracks performance metrics for each RL model over time.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class ModelMetrics:
    """Metrics for a single model"""
    model_type: str
    total_predictions: int = 0
    correct_predictions: int = 0
    total_trades: int = 0
    profitable_trades: int = 0
    total_return: float = 0.0
    total_return_pct: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    win_rate: float = 0.0
    average_return_per_trade: float = 0.0
    profit_factor: float = 0.0
    trades: List[Dict[str, Any]] = field(default_factory=list)
    equity_curve: List[float] = field(default_factory=list)
    last_updated: Optional[datetime] = None


class ModelPerformanceTracker:
    """Tracks performance of different RL models"""
    
    def __init__(self):
        """Initialize tracker"""
        self.models: Dict[str, ModelMetrics] = {}
        logger.info("Model Performance Tracker initialized")
    
    def record_prediction(
        self,
        model_type: str,
        symbol: str,
        action: str,
        predicted_price: Optional[float] = None,
        actual_price: Optional[float] = None,
        timestamp: Optional[datetime] = None
    ):
        """
        Record a prediction from a model
        
        Args:
            model_type: Model type (ppo, a2c, sac)
            symbol: Trading symbol
            action: Predicted action (BUY, SELL, HOLD)
            predicted_price: Predicted price
            actual_price: Actual price (for accuracy calculation)
            timestamp: Prediction timestamp
        """
        model_type = model_type.lower()
        
        if model_type not in self.models:
            self.models[model_type] = ModelMetrics(model_type=model_type)
        
        metrics = self.models[model_type]
        metrics.total_predictions += 1
        
        # If we have actual price, check if prediction was correct
        if predicted_price and actual_price:
            # Simple accuracy check: if predicted price direction matches actual
            price_change = actual_price - predicted_price
            # This is a simplified accuracy check - you might want more sophisticated logic
            if abs(price_change) / predicted_price < 0.01:  # Within 1%
                metrics.correct_predictions += 1
        
        metrics.last_updated = timestamp or datetime.now()
    
    def record_trade(
        self,
        model_type: str,
        symbol: str,
        action: str,
        entry_price: float,
        exit_price: Optional[float] = None,
        pnl: Optional[float] = None,
        pnl_pct: Optional[float] = None,
        timestamp: Optional[datetime] = None
    ):
        """
        Record a trade executed by a model
        
        Args:
            model_type: Model type
            symbol: Trading symbol
            action: Trade action (BUY, SELL)
            entry_price: Entry price
            exit_price: Exit price
            pnl: Profit/Loss
            pnl_pct: Profit/Loss percentage
            timestamp: Trade timestamp
        """
        model_type = model_type.lower()
        
        if model_type not in self.models:
            self.models[model_type] = ModelMetrics(model_type=model_type)
        
        metrics = self.models[model_type]
        metrics.total_trades += 1
        
        trade_data = {
            "symbol": symbol,
            "action": action,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
            "timestamp": timestamp or datetime.now()
        }
        
        metrics.trades.append(trade_data)
        
        if pnl:
            metrics.total_return += pnl
            
            if pnl > 0:
                metrics.profitable_trades += 1
        
        # Update win rate
        if metrics.total_trades > 0:
            metrics.win_rate = (metrics.profitable_trades / metrics.total_trades) * 100.0
        
        # Update average return per trade
        if metrics.total_trades > 0:
            metrics.average_return_per_trade = metrics.total_return / metrics.total_trades
        
        # Calculate profit factor
        total_profit = sum(t.get("pnl", 0) for t in metrics.trades if t.get("pnl", 0) > 0)
        total_loss = abs(sum(t.get("pnl", 0) for t in metrics.trades if t.get("pnl", 0) < 0))
        if total_loss > 0:
            metrics.profit_factor = total_profit / total_loss
        
        metrics.last_updated = timestamp or datetime.now()
        
        logger.debug(f"Recorded trade for {model_type}: {action} {symbol}, PnL: {pnl}")
    
    def update_equity_curve(self, model_type: str, equity: float):
        """Update equity curve for a model"""
        model_type = model_type.lower()
        
        if model_type not in self.models:
            self.models[model_type] = ModelMetrics(model_type=model_type)
        
        self.models[model_type].equity_curve.append(equity)
        
        # Keep only last 1000 points to avoid memory issues
        if len(self.models[model_type].equity_curve) > 1000:
            self.models[model_type].equity_curve = self.models[model_type].equity_curve[-1000:]
    
    def get_model_metrics(self, model_type: str) -> Optional[ModelMetrics]:
        """Get metrics for a specific model"""
        return self.models.get(model_type.lower())
    
    def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics for all models"""
        return {
            model_type: {
                "model_type": metrics.model_type,
                "total_predictions": metrics.total_predictions,
                "accuracy": (metrics.correct_predictions / metrics.total_predictions * 100) if metrics.total_predictions > 0 else 0.0,
                "total_trades": metrics.total_trades,
                "profitable_trades": metrics.profitable_trades,
                "win_rate": metrics.win_rate,
                "total_return": metrics.total_return,
                "average_return_per_trade": metrics.average_return_per_trade,
                "profit_factor": metrics.profit_factor,
                "last_updated": metrics.last_updated.isoformat() if metrics.last_updated else None
            }
            for model_type, metrics in self.models.items()
        }
    
    def compare_models(self) -> Dict[str, Any]:
        """Compare performance of all models"""
        if not self.models:
            return {"message": "No model data available"}
        
        all_metrics = self.get_all_metrics()
        
        # Find best model by different metrics
        best_win_rate = max(all_metrics.items(), key=lambda x: x[1]["win_rate"], default=None)
        best_return = max(all_metrics.items(), key=lambda x: x[1]["total_return"], default=None)
        best_profit_factor = max(all_metrics.items(), key=lambda x: x[1]["profit_factor"], default=None)
        
        return {
            "models": all_metrics,
            "best_by_win_rate": best_win_rate[0] if best_win_rate else None,
            "best_by_return": best_return[0] if best_return else None,
            "best_by_profit_factor": best_profit_factor[0] if best_profit_factor else None,
            "total_models": len(self.models)
        }
    
    def reset_model(self, model_type: str):
        """Reset metrics for a model"""
        model_type = model_type.lower()
        if model_type in self.models:
            del self.models[model_type]
            logger.info(f"Reset metrics for {model_type}")
    
    def reset_all(self):
        """Reset all metrics"""
        self.models.clear()
        logger.info("Reset all model metrics")


# Singleton instance
_performance_tracker: Optional[ModelPerformanceTracker] = None


def get_performance_tracker() -> ModelPerformanceTracker:
    """Get or create performance tracker singleton"""
    global _performance_tracker
    
    if _performance_tracker is None:
        _performance_tracker = ModelPerformanceTracker()
    
    return _performance_tracker

