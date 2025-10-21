import pandas as pd
from envs.trading_env import TradingEnv
from stable_baselines3 import PPO, SAC, TD3
import matplotlib.pyplot as plt

df = pd.read_csv("data/btcusdt_1h.csv")
df = df.dropna().reset_index(drop=True)

env = TradingEnv(df, window_size=50)

model = PPO("MlpPolicy", env, verbose=1, tensorboard_log="./ppo_trading_tb/")
model.learn(total_timesteps=200_000)

model.save("ppo_trading_model")

equities = []
positions = []

obs, _ = env.reset()
for _ in range(200):
    action, _ = model.predict(obs, deterministic=True)
    obs, reward, done, _, _ = env.step(action)
    
    equities.append(env.equity)
    positions.append(env.position)
    
    if done:
        break

fig, ax1 = plt.subplots(figsize=(12,6))

ax1.plot(equities, color='blue', label='Equity')
ax1.set_xlabel('Step')
ax1.set_ylabel('Equity', color='blue')
ax1.tick_params(axis='y', labelcolor='blue')

ax2 = ax1.twinx()
ax2.plot(positions, color='orange', linestyle='--', label='Position')
ax2.set_ylabel('Position (-1=short, 1=long)', color='orange')
ax2.tick_params(axis='y', labelcolor='orange')

fig.tight_layout()
plt.title('Тест RL-бота: Equity и Позиция по шагам')
ax1.legend(loc='upper left')
ax2.legend(loc='upper right')
plt.show()
