import gymnasium as gym
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.preprocessing import StandardScaler

class EnhancedTradingEnv(gym.Env):
    metadata = {"render_modes": ["human"]}
    
    def __init__(self, df: pd.DataFrame, window_size=50, fee=0.001, initial_balance=10000.0,
                 state_features=None, normalize=True):
        super().__init__()
        
        self.df = df.reset_index(drop=True)
        self.window_size = window_size
        self.fee = fee
        self.initial_balance = initial_balance
        self.max_step = len(df) - 1
        self.normalize = normalize

        # Фичи для состояния (кроме 'Close')
        if state_features is None:
            self.state_features = [c for c in df.columns if c != 'Close' and c != 'timestamp']
        else:
            self.state_features = state_features
        
        if normalize:
            self.scaler = StandardScaler()
            self._fit_scaler()

        # action: [-1..1] позиция, [0.1..1] размер позиции
        self.action_space = gym.spaces.Box(
            low=np.array([-1, 0.1]), 
            high=np.array([1, 1.0]), 
            shape=(2,), 
            dtype=np.float32
        )

        # observation: (window_size, len(state_features) + 4)  
        obs_shape = (window_size, len(self.state_features) + 4)
        self.observation_space = gym.spaces.Box(
            low=-np.inf, high=np.inf, 
            shape=obs_shape, dtype=np.float32
        )
        
        self.reset()

    def _fit_scaler(self):
        feature_data = self.df[self.state_features].values
        self.scaler.fit(feature_data)

    def _get_normalized_features(self, start_idx: int, end_idx: int) -> np.ndarray:
        features = self.df.iloc[start_idx:end_idx][self.state_features].values
        if self.normalize:
            features = self.scaler.transform(features)
        return features.astype(np.float32)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.step_idx = self.window_size
        self.position = 0.0
        self.position_size = 0.1
        self.cash = self.initial_balance
        self.equity = self.initial_balance
        self.entry_price = 0.0
        self.trades = []
        self.max_drawdown = 0.0
        self.peak_equity = self.initial_balance
        self.returns = []
        self.volatility = 0.0
        
        return self._get_obs(), {}

    def _get_obs(self) -> np.ndarray:
        start_idx = max(0, self.step_idx - self.window_size)
        end_idx = self.step_idx

        features = self._get_normalized_features(start_idx, end_idx)

        portfolio_features = np.array([
            self.position, 
            self.position_size,  
            self.equity / self.initial_balance, 
            len(self.trades) / 100.0
        ])
        portfolio_matrix = np.tile(portfolio_features, (len(features), 1))

        observation = np.column_stack([features, portfolio_matrix])
        return observation

    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        target_position = float(np.clip(action[0], -1, 1))
        target_size = float(np.clip(action[1], 0.1, 1.0))
        
        prev_price = self.df.iloc[self.step_idx - 1]["Close"]
        current_price = self.df.iloc[self.step_idx]["Close"]
        price_change_pct = (current_price - prev_price) / prev_price
        position_pnl = self.position * self.position_size * price_change_pct * self.equity

        old_equity = self.equity
        self.equity += position_pnl

        # комиссия при изменении позиции
        commission = 0.0
        if abs(target_position - self.position) > 0.1 or abs(target_size - self.position_size) > 0.1:
            trade_value = abs(target_position * target_size - self.position * self.position_size) * self.equity
            commission = trade_value * self.fee
            self.equity -= commission
            self.position = target_position
            self.position_size = target_size
            self.entry_price = current_price
            self.trades.append({
                'step': self.step_idx,
                'price': current_price,
                'position': self.position,
                'size': self.position_size,
                'commission': commission,
                'equity': self.equity
            })

        self._update_stats(old_equity)
        reward = self._calculate_reward(price_change_pct, commission)

        self.step_idx += 1
        done = self._is_done()
        return self._get_obs(), reward, done, False, self._get_info()

    def _update_stats(self, old_equity: float):
        if self.equity > self.peak_equity:
            self.peak_equity = self.equity
        current_drawdown = (self.peak_equity - self.equity) / self.peak_equity
        self.max_drawdown = max(self.max_drawdown, current_drawdown)
        current_return = (self.equity - old_equity) / old_equity if old_equity > 0 else 0
        self.returns.append(current_return)
        if len(self.returns) >= 20:
            recent_returns = self.returns[-20:]
            self.volatility = np.std(recent_returns)

    def _calculate_reward(self, price_change: float, commission: float) -> float:
        pnl_reward = self.position * self.position_size * price_change
        commission_penalty = -commission / self.initial_balance
        return float((pnl_reward + commission_penalty) * 100)

    def _is_done(self) -> bool:
        if self.equity <= self.initial_balance * 0.7:
            return True
        if self.step_idx >= self.max_step:
            return True
        if self.max_drawdown > 0.5:
            return True
        return False

    def _get_info(self) -> Dict[str, Any]:
        current_price = self.df.iloc[self.step_idx]["Close"]
        total_return = (self.equity - self.initial_balance) / self.initial_balance * 100
        return {
            'equity': self.equity,
            'total_return_pct': total_return,
            'position': self.position,
            'position_size': self.position_size,
            'max_drawdown': self.max_drawdown,
            'total_trades': len(self.trades),
            'current_price': current_price,
            'step': self.step_idx,
            'volatility': self.volatility
        }

    def render(self):
        info = self._get_info()
        print(f"Step {info['step']:4d} | "
              f"Equity: ${info['equity']:8.2f} | "
              f"Return: {info['total_return_pct']:6.2f}% | "
              f"Position: {info['position']:5.2f} | "
              f"Drawdown: {info['max_drawdown']:6.2%} | "
              f"Trades: {info['total_trades']:3d}")
