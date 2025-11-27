"""
Real Backtesting Engine for RL Trading Models

This module provides real backtesting functionality using trained RL models
on historical market data.
"""

import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
import logging

# Add RL_algorithms to path
rl_algorithms_path = Path(__file__).parent.parent / "RL_algorithms"
sys.path.insert(0, str(rl_algorithms_path))
sys.path.insert(0, str(rl_algorithms_path / "algorithms_training"))

logger = logging.getLogger(__name__)


class BacktestEngine:
    """Engine for running backtests with RL models"""
    
    def __init__(self, model_type: str = "ppo", initial_balance: float = 10000.0):
        self.model_type = model_type.lower()
        self.initial_balance = initial_balance
        self.rl_model = None
        self.model_path = None
        
    def load_model(self):
        """Load RL model for backtesting"""
        try:
            from stable_baselines3 import PPO, A2C, SAC
            
            model_classes = {
                "ppo": PPO,
                "a2c": A2C,
                "sac": SAC
            }
            
            ModelClass = model_classes.get(self.model_type)
            if not ModelClass:
                raise ValueError(f"Unknown model type: {self.model_type}")
            
            # Find model file
            model_dir = rl_algorithms_path / "models" / self.model_type.upper()
            model_files = list(model_dir.glob(f"{self.model_type}_baseline.zip"))
            
            if not model_files:
                raise FileNotFoundError(f"Model not found: {model_dir}")
            
            self.model_path = model_files[0]
            logger.info(f"Loading {self.model_type.upper()} model from {self.model_path}")
            self.rl_model = ModelClass.load(str(self.model_path))
            
            # Log model info for verification
            if hasattr(self.rl_model, 'policy'):
                logger.info(f"Model policy type: {type(self.rl_model.policy).__name__}")
            logger.info(f"✅ {self.model_type.upper()} model loaded successfully from {self.model_path.name}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def load_historical_data(self, symbols: list, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Load historical data for backtesting.
        Currently uses pre-processed dataset, can be extended to fetch from APIs.
        """
        try:
            # Try to load pre-processed dataset (use same as training)
            # Models were trained on BTC_USDT_OI_FEATURES_1h_2Y.csv
            dataset_path = rl_algorithms_path / "datasets" / "BTC_USDT_OI_FEATURES_1h_2Y.csv"
            
            if not dataset_path.exists():
                # Fallback: try alternative dataset
                dataset_path = rl_algorithms_path / "datasets" / "BTC_USDT_OI_SP500_FEATURES_1h_2Y.csv"
            
            if not dataset_path.exists():
                raise FileNotFoundError(f"Dataset not found. Checked: {rl_algorithms_path / 'datasets'}")
            
            logger.info(f"Loading data from {dataset_path}")
            df = pd.read_csv(dataset_path)
            
            # Log all columns for debugging
            logger.info(f"Raw dataset columns ({len(df.columns)}): {list(df.columns)[:30]}")
            
            # Parse timestamp
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df.set_index('timestamp', inplace=True)
            elif df.index.dtype == 'object' or isinstance(df.index, pd.RangeIndex):
                # Try to parse if index looks like timestamp
                if 'timestamp' in str(df.index.name) or len(df) > 0:
                    try:
                        if isinstance(df.index, pd.RangeIndex) and 'timestamp' in df.columns:
                            df['timestamp'] = pd.to_datetime(df['timestamp'])
                            df.set_index('timestamp', inplace=True)
                    except:
                        pass
                elif df.index.dtype == 'object':
                    df.index = pd.to_datetime(df.index)
            
            # Filter by date range
            start_dt = pd.to_datetime(start_date)
            end_dt = pd.to_datetime(end_date)
            
            # If data doesn't have the requested range, use available data
            available_start = df.index.min()
            available_end = df.index.max()
            
            if start_dt < available_start:
                logger.warning(f"Requested start_date {start_date} is before available data {available_start}. Using {available_start}")
                start_dt = available_start
            if end_dt > available_end:
                logger.warning(f"Requested end_date {end_date} is after available data {available_end}. Using {available_end}")
                end_dt = available_end
            
            # Filter data
            df_filtered = df[(df.index >= start_dt) & (df.index <= end_dt)].copy()
            
            if df_filtered.empty:
                raise ValueError(f"No data available for period {start_date} to {end_date}")
            
            logger.info(f"Loaded {len(df_filtered)} rows for period {start_dt} to {end_dt}")
            
            # Fill missing values (fix deprecated method)
            df_filtered = df_filtered.ffill()
            df_filtered = df_filtered.fillna(0)
            
            # Log available columns for debugging
            logger.info(f"Dataset has {len(df_filtered.columns)} columns: {list(df_filtered.columns)[:30]}")
            
            # IMPORTANT: The feature-engineered dataset may not have base OHLCV columns
            # They might be removed during feature engineering. We need to check what's available.
            
            # Try to find and map base OHLCV columns
            available_cols_lower = {c.lower(): c for c in df_filtered.columns}
            column_mapping = {}
            
            # Map base OHLCV columns - try multiple patterns
            ohlcv_patterns = {
                'Close': ['btc_close', 'close', 'price', 'last'],
                'Open': ['btc_open', 'open'],
                'High': ['btc_high', 'high'],
                'Low': ['btc_low', 'low'],
                'Volume': ['btc_volume', 'volume', 'vol']
            }
            
            for standard_name, patterns in ohlcv_patterns.items():
                for pattern in patterns:
                    if pattern in available_cols_lower:
                        original_col = available_cols_lower[pattern]
                        if standard_name not in [v for v in column_mapping.values()]:
                            column_mapping[original_col] = standard_name
                            logger.info(f"Mapped '{original_col}' -> '{standard_name}'")
                            break
            
            # Apply mappings
            if column_mapping:
                df_filtered = df_filtered.rename(columns=column_mapping)
            
            # Check if we have Close column - if not, try to reconstruct from features
            # or use a price-like column
            if 'Close' not in df_filtered.columns:
                # Try common price feature columns
                price_feature_cols = [c for c in df_filtered.columns 
                                     if 'close' in c.lower() or 'price' in c.lower() 
                                     or 'return' in c.lower()]
                
                if price_feature_cols:
                    # For backtesting, we can approximate Close from log_return or use a proxy
                    logger.warning(f"No Close column found. Using '{price_feature_cols[0]}' as proxy")
                    # We'll need to reconstruct Close prices or use an approximation
                    # For now, create a dummy Close (environment may need actual prices)
                    df_filtered['Close'] = df_filtered[price_feature_cols[0]]
                else:
                    # Last resort: use first numeric column
                    numeric_cols = df_filtered.select_dtypes(include=[np.number]).columns.tolist()
                    if numeric_cols:
                        df_filtered['Close'] = df_filtered[numeric_cols[0]]
                        logger.warning(f"Created 'Close' from first numeric column '{numeric_cols[0]}'")
                    else:
                        raise ValueError(f"'Close' column required but not found. Available: {list(df_filtered.columns)}")
            
            # Create missing OHLCV columns if needed (use Close as proxy)
            # This is a limitation - we may not have actual OHLCV in feature-engineered dataset
            for col in ['Open', 'High', 'Low']:
                if col not in df_filtered.columns:
                    df_filtered[col] = df_filtered['Close']  # Approximation
            if 'Volume' not in df_filtered.columns:
                df_filtered['Volume'] = 1.0  # Default volume
            
            # Map technical indicators to expected names
            tech_features_map = {
                'MACD_12_26_9': ['macd_safe', 'macd_12_26_9', 'macd', 'macd_12'],
                'MACDh_12_26_9': ['macdh_safe', 'macdh_12_26_9', 'macdh', 'macd_histogram'],
                'MACDs_12_26_9': ['macds_safe', 'macds_12_26_9', 'macds', 'macd_signal'],
                'RSI_14': ['rsi_safe', 'rsi_14', 'rsi', 'rsi14'],
                'ATRr_14': ['atr_safe_norm', 'atrr_14', 'atr_14', 'atrr', 'atr'],
                'VWAP_14': ['vwap_14', 'vwap', 'vwap14'],
                'Hour_of_Day': ['hour_sin', 'hour_cos', 'hour_of_day', 'hour', 'hour_ofday'],
                'Day_of_Week': ['day_sin', 'day_cos', 'day_of_week', 'weekday']
            }
            
            tech_mapping = {}
            for standard_name, patterns in tech_features_map.items():
                for pattern in patterns:
                    if pattern in available_cols_lower:
                        original_col = available_cols_lower[pattern]
                        tech_mapping[original_col] = standard_name
                        logger.info(f"Mapped '{original_col}' -> '{standard_name}'")
                        break
            
            if tech_mapping:
                df_filtered = df_filtered.rename(columns=tech_mapping)
            
            # For time features - environment expects Hour_of_Day and Day_of_Week
            # but dataset may have hour_sin/hour_cos and day_sin/day_cos
            # Create synthetic time features if needed
            if 'Hour_of_Day' not in df_filtered.columns:
                # Try to extract from index if it's datetime
                if isinstance(df_filtered.index, pd.DatetimeIndex):
                    df_filtered['Hour_of_Day'] = df_filtered.index.hour
                    logger.info("Created 'Hour_of_Day' from index")
            if 'Day_of_Week' not in df_filtered.columns:
                if isinstance(df_filtered.index, pd.DatetimeIndex):
                    df_filtered['Day_of_Week'] = df_filtered.index.dayofweek
                    logger.info("Created 'Day_of_Week' from index")
            
            logger.info(f"Final dataset columns (first 20): {list(df_filtered.columns)[:20]}")
            
            return df_filtered
            
        except Exception as e:
            logger.error(f"Failed to load historical data: {e}")
            raise
    
    def run_backtest(
        self,
        df: pd.DataFrame,
        model_type: Optional[str] = None,
        window_size: int = 30,
        fee: float = 0.001
    ) -> Dict[str, Any]:
        """
        Run backtest on historical data using RL model
        
        Returns:
            Dictionary with backtest metrics and results
        """
        try:
            # Always use model_type from self (set during initialization)
            # If different model_type passed, update and reload
            if model_type and model_type.lower() != self.model_type:
                logger.info(f"Switching model from {self.model_type} to {model_type.lower()}")
                self.model_type = model_type.lower()
                self.rl_model = None  # Force reload
            
            # Load model if not loaded
            if self.rl_model is None:
                logger.info(f"Loading model: {self.model_type.upper()}")
                self.load_model()
            else:
                logger.info(f"Using already loaded model: {self.model_type.upper()}")
            
            # Import environment
            from algorithms_training.environment.stable_env import EnhancedTradingEnv
            
            # Check if required columns exist, if not use auto-detection
            required_cols = ['Open', 'High', 'Low', 'Close', 'Volume']
            has_required = all(col in df.columns for col in required_cols)
            
            # If dataset doesn't have standard column names, we need to map or use alternative approach
            if not has_required:
                logger.warning(f"Standard columns not found. Available columns: {list(df.columns)[:15]}")
                logger.warning("Attempting to use environment with available columns...")
                # Try to use the same approach as training - let environment detect columns
                # We'll pass use_technical_features=False and let it use base columns
                use_tech_features = False
                # Check if we have technical features columns
                tech_cols = ['MACD_12_26_9', 'RSI_14']
                if any(col in df.columns for col in tech_cols):
                    use_tech_features = True
            else:
                use_tech_features = True
            
            # Create environment - it will auto-detect or fail gracefully
            try:
                env = EnhancedTradingEnv(
                    df=df,
                    window_size=window_size,
                    fee=fee,
                    initial_balance=self.initial_balance,
                    use_technical_features=use_tech_features,
                    normalize=True
                )
            except KeyError as e:
                # If columns don't match, log error and suggest solution
                logger.error(f"Column mismatch: {e}")
                logger.error(f"Dataset has columns: {list(df.columns)}")
                raise ValueError(
                    f"Dataset columns don't match environment expectations. "
                    f"Expected columns like: Open, High, Low, Close, Volume, MACD_12_26_9, RSI_14, etc. "
                    f"Found: {list(df.columns)[:10]}..."
                )
            
            # Reset environment (use model_type as seed to ensure reproducibility but different across models)
            # This ensures each model gets same starting conditions but different random states
            env_seed = hash(self.model_type) % (2**31)  # Convert to valid seed range
            obs, _ = env.reset(seed=env_seed)
            
            # Run backtest
            done = False
            step_count = 0
            max_steps = len(df) - window_size - 1
            
            equities = [env.equity]  # Start with initial equity
            positions = []
            trades_executed = []
            
            logger.info(f"Starting backtest simulation with {self.model_type.upper()} model (seed: {env_seed})")
            
            # Log first action for debugging (to verify different models give different actions)
            first_action = None
            
            while not done and step_count < max_steps:
                # Get action from model
                action, _ = self.rl_model.predict(obs, deterministic=True)
                
                # Log first action for debugging (to verify different models give different actions)
                if step_count == 0:
                    first_action = action.copy() if isinstance(action, np.ndarray) else list(action)
                    logger.info(f"First action from {self.model_type.upper()} model: {first_action} (obs shape: {obs.shape})")
                
                # Step environment
                obs, reward, done, truncated, info = env.step(action)
                
                # Track metrics
                equities.append(info.get('equity', env.equity))
                positions.append(info.get('position', env.position))
                
                # Track trades (copy when new trades appear)
                current_trades_count = len(env.trades)
                if current_trades_count > len(trades_executed):
                    trades_executed = env.trades.copy()
                
                step_count += 1
                
                if truncated or done:
                    break
            
            # Get final trades from environment
            if len(env.trades) > len(trades_executed):
                trades_executed = env.trades.copy()
            
            # Get final info from environment
            final_info = env._get_info()
            
            # Calculate metrics using both equities and environment info
            metrics = self._calculate_metrics(
                equities=equities,
                trades=trades_executed,
                initial_balance=self.initial_balance,
                env_info=final_info
            )
            
            logger.info(f"Backtest completed: {step_count} steps, {metrics['total_trades']} trades")
            
            return {
                "success": True,
                "metrics": metrics,
                "equities": equities[-100:] if len(equities) > 100 else equities,  # Last 100 points
                "trades_count": len(trades_executed)
            }
            
        except Exception as e:
            logger.error(f"Backtest failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "metrics": self._get_default_metrics()
            }
    
    def _calculate_metrics(
        self,
        equities: list,
        trades: list,
        initial_balance: float,
        env_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """Calculate backtest metrics"""
        if not equities:
            return self._get_default_metrics()
        
        final_balance = equities[-1]
        total_return = final_balance - initial_balance
        total_return_pct = (total_return / initial_balance) * 100
        
        # Calculate returns
        returns = np.diff(equities) / equities[:-1] * 100 if len(equities) > 1 else [0]
        
        # Sharpe ratio (assuming 252 trading days per year, hourly data = 252*24 hours)
        if len(returns) > 1 and np.std(returns) > 0:
            sharpe_ratio = (np.mean(returns) / np.std(returns)) * np.sqrt(252 * 24)
        else:
            sharpe_ratio = 0.0
        
        # Max drawdown
        peak = np.maximum.accumulate(equities)
        drawdown = (equities - peak) / peak * 100
        calculated_max_drawdown = np.min(drawdown) if len(drawdown) > 0 else 0.0
        
        # Use max_drawdown from environment if available (it's already normalized)
        if env_info and 'max_drawdown' in env_info:
            env_max_drawdown = env_info['max_drawdown'] * 100  # Convert to percentage
            # Use the more conservative (larger absolute value) drawdown
            max_drawdown = min(calculated_max_drawdown, env_max_drawdown)
        else:
            max_drawdown = calculated_max_drawdown
        
        # Trade metrics
        total_trades = len(trades) if trades else 0
        
        if total_trades > 0:
            # Calculate win rate based on equity changes between trades
            # A trade is "winning" if equity increases after it
            winning_count = 0
            total_profit = 0.0
            total_loss = 0.0
            
            prev_equity = initial_balance
            for i, trade in enumerate(trades):
                if isinstance(trade, dict):
                    trade_equity = trade.get('equity', prev_equity)
                    trade_pnl = trade_equity - prev_equity
                    
                    if trade_pnl > 0:
                        winning_count += 1
                        total_profit += trade_pnl
                    else:
                        total_loss += abs(trade_pnl)
                    
                    prev_equity = trade_equity
            
            # If we couldn't calculate from trades, estimate from equity curve
            if winning_count == 0 and total_profit == 0:
                # Estimate: count equity increases as wins
                equity_changes = np.diff(equities)
                positive_changes = equity_changes[equity_changes > 0]
                negative_changes = equity_changes[equity_changes <= 0]
                
                if len(equity_changes) > 0:
                    winning_count = len(positive_changes)
                    total_profit = float(np.sum(positive_changes))
                    total_loss = float(abs(np.sum(negative_changes)))
            
            win_rate = (winning_count / total_trades) * 100 if total_trades > 0 else 0.0
            profit_factor = total_profit / total_loss if total_loss > 0 else (total_profit if total_profit > 0 else 0.0)
        else:
            win_rate = 0.0
            profit_factor = 0.0
        
        return {
            "total_return": round(total_return, 2),
            "total_return_pct": round(total_return_pct, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "max_drawdown": round(max_drawdown, 2),
            "win_rate": round(win_rate, 1),
            "total_trades": total_trades,
            "profit_factor": round(profit_factor, 2) if profit_factor > 0 else 0.0,
            "final_balance": round(final_balance, 2)
        }
    
    def _get_default_metrics(self) -> Dict[str, float]:
        """Return default metrics when backtest fails"""
        return {
            "total_return": 0.0,
            "total_return_pct": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "win_rate": 0.0,
            "total_trades": 0,
            "profit_factor": 0.0,
            "final_balance": self.initial_balance
        }


def run_backtest_async(
    symbols: list,
    start_date: str,
    end_date: str,
    initial_balance: float,
    model_type: str = "ppo",
    strategy_params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Async wrapper for running backtests
    
    Args:
        symbols: List of symbols to backtest
        start_date: Start date in ISO format
        end_date: End date in ISO format
        initial_balance: Initial balance
        model_type: Model type (ppo, a2c, sac)
        strategy_params: Additional strategy parameters
    
    Returns:
        Dictionary with backtest results
    """
    try:
        engine = BacktestEngine(model_type=model_type, initial_balance=initial_balance)
        
        # Load historical data
        df = engine.load_historical_data(symbols, start_date, end_date)
        
        # Extract parameters
        window_size = strategy_params.get('window_size', 30) if strategy_params else 30
        fee = strategy_params.get('fee', 0.001) if strategy_params else 0.001
        
        # Run backtest (model_type is already set in engine.__init__, but pass it explicitly for clarity)
        result = engine.run_backtest(df, model_type=model_type, window_size=window_size, fee=fee)
        
        # Add model_type to result for debugging
        if result.get("success"):
            result["model_type_used"] = model_type
        
        return result
        
    except Exception as e:
        logger.error(f"Backtest execution failed: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "metrics": {
                "total_return": 0.0,
                "total_return_pct": 0.0,
                "sharpe_ratio": 0.0,
                "max_drawdown": 0.0,
                "win_rate": 0.0,
                "total_trades": 0,
                "profit_factor": 0.0,
                "final_balance": initial_balance
            }
        }

