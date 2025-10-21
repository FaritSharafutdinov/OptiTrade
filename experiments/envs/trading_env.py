import gymnasium as gym
import numpy as np
import pandas as pd

class TradingEnv(gym.Env):
    metadata = {"render_modes": ["human"]}
    def __init__(self, df: pd.DataFrame, window_size=50, fee=0.001):
        super().__init__()
        self.df = df.reset_index(drop=True)
        self.window_size = window_size
        self.fee = fee
        self.max_step = len(df) - 1
    
        self.action_space = gym.spaces.Box(low=-1, high=1, shape=(1,), dtype=np.float32)
        self.observation_space = gym.spaces.Box(
            low=-np.inf, high=np.inf, shape=(window_size, 5), dtype=np.float32
        )
        self.reset()

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.step_idx = self.window_size
        self.position = 0.0
        self.equity = 1.0
        return self._get_obs(), {}

    def _get_obs(self):
        frame = self.df.iloc[self.step_idx - self.window_size:self.step_idx][["open", "high", "low", "close", "volume"]]
        return frame.to_numpy(dtype=np.float32)

    def step(self, action):
        action = float(np.clip(action, -1, 1))
        prev_price = self.df.iloc[self.step_idx - 1]["close"]
        self.step_idx += 1
        done = self.step_idx >= self.max_step
        price = self.df.iloc[self.step_idx]["close"]
        ret = (price - prev_price) / prev_price

        trade_change = abs(action - self.position)
        cost = trade_change * self.fee
        pnl = self.position * ret
        self.equity *= (1 + pnl - cost)
        reward = np.log(self.equity) 
        self.position = action

        return self._get_obs(), reward, done, False, {}

    def render(self):
        print(f"Step {self.step_idx}, Equity {self.equity:.4f}, Position {self.position:.2f}")
