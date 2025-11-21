import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import sys
import argparse
from environment.stable_env import EnhancedTradingEnv
from stable_baselines3 import PPO, SAC, A2C
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.monitor import Monitor




MODELS = {
    "ppo": {
        "class": PPO,
        "params": {
            "policy": "MlpPolicy",
            "learning_rate": 3e-4,
            "n_steps": 2048,
            "batch_size": 256,
            "n_epochs": 10,
            "gamma": 0.99,
            "gae_lambda": 0.95,
            "clip_range": 0.2,
            "ent_coef": 0.01,
            "policy_kwargs": dict(net_arch=[512, 512, 256]),
        }
    },
    "a2c": {
        "class": A2C,
        "params": {
            "policy": "MlpPolicy",
            "learning_rate": 7e-4,
            "n_steps": 5,
            "gamma": 0.99,
            "gae_lambda": 1.0,
            "ent_coef": 0.0,
            "policy_kwargs": dict(net_arch=[400, 300]),
        }
    },
    "sac": {
        "class": SAC,
        "params": {
            "policy": "MlpPolicy",
            "learning_rate": 1e-4,
            "buffer_size": 100000,
            "learning_starts": 5000,
            "batch_size": 256,
            "tau": 0.005,
            "gamma": 0.99,
            "train_freq": 1,
            "gradient_steps": 1,
            "ent_coef": "auto",
            "policy_kwargs": dict(net_arch=[400, 300]),
        }
    }
}


class MetricsCallback(BaseCallback):
    def __init__(self, verbose=0):
        super().__init__(verbose)
        self.episode_returns = []
        
    def _on_step(self) -> bool:
        return True
    
    def _on_rollout_end(self) -> None:
        if len(self.model.ep_info_buffer) > 0:
            for episode in self.model.ep_info_buffer:
                if 'total_return_pct' in episode:
                    self.logger.record('metrics/total_return_pct', episode['total_return_pct'])
                if 'max_drawdown' in episode:
                    self.logger.record('metrics/max_drawdown', episode['max_drawdown'])
                if 'total_trades' in episode:
                    self.logger.record('metrics/total_trades', episode['total_trades'])


def train_model(model_name: str):
    """Обучение модели"""
    config = MODELS[model_name]
    ModelClass = config["class"]
    params = config["params"]
    df = pd.read_csv(r".\datasets\BTC_USDT_OI_FEATURES_1h_2Y.csv", parse_dates=['timestamp'], index_col='timestamp')
    
    df = df.sort_index()
    
    split_date = df.index[int(len(df) * 0.8)]
    train_df = df[df.index < split_date]
    val_df = df[df.index >= split_date]

    print(f"Данные: Train={len(train_df)}, Validation={len(val_df)}")
    

    train_env = Monitor(EnhancedTradingEnv(
        train_df, 
        window_size=20,
        use_technical_features=True,
        normalize=True
    ))
    
    val_env = Monitor(EnhancedTradingEnv(
        val_df,
        window_size=20, 
        use_technical_features=True,
        normalize=True
    ))
    
    print("Обучение модели", model_name)
    model = ModelClass(
        env=train_env,
        verbose=0,
        device="auto",
        tensorboard_log=None,
        **params
    )

    model.learn(
    total_timesteps=200,
    callback=None,             
    progress_bar=True,     
)

    save_name = fr".\models\{model_name}_baseline"
    model.save(save_name)
    print(f"\nМодель сохранена: {save_name}.zip")
    
    return model, train_env, val_env

def backtest_model_varied(model, env, num_episodes=5):
    """Тестирование модели"""
    print(f"Тестирование на {num_episodes} эпизодах с разными условиями...")
    
    all_equities = []
    all_returns = []
    all_positions = []
    
    for episode in range(num_episodes):
      
        start_offset = np.random.randint(0, 1000)  
        env.unwrapped.step_idx = env.unwrapped.window_size + start_offset
        
        obs, _ = env.reset()
        equities = []
        positions = []
        actions_log = []
        
        done = False
        step_count = 0
        max_steps = 2000  
        
        while not done and step_count < max_steps:

        
            action, _ = model.predict(obs, deterministic=True)  
          
            obs, reward, done, _, info = env.step(action)
            
            equities.append(info['equity'])
            positions.append(info['position'])
            actions_log.append(action)
            step_count += 1
        

        final_return = (equities[-1] - equities[0]) / equities[0] * 100
        all_returns.append(final_return)
        all_equities.append(equities)
        all_positions.append(positions)
        
    
        unique_actions = len(set([tuple(a) for a in actions_log]))
        avg_position = np.mean(positions)
        
        print(f"Эпизод {episode+1}:")
        print(f"  Return: {final_return:.2f}%")
        print(f"  Max Drawdown: {info['max_drawdown']:.2%}")
        print(f"  Trades: {info['total_trades']}")
        print(f"  Шагов: {len(equities)}")
        print(f"  Уникальных действий: {unique_actions}")
        print(f"  Средняя позиция: {avg_position:.3f}")
        print(f"  Начальное смещение: +{start_offset} шагов")
        print()
        
    avg_return = np.mean(all_returns)
    win_rate = np.mean([1 if ret > 0 else 0 for ret in all_returns]) * 100
    std_return = np.std(all_returns)
    
    print(f"\nИтоги теста:")
    print(f"Средняя доходность: {avg_return:.2f}%")
    print(f"Стандартное отклонение: {std_return:.2f}%")
    print(f"Win Rate: {win_rate:.1f}%")
    print(f"Диапазон доходностей: {min(all_returns):.2f}% - {max(all_returns):.2f}%")
    print(f"Количество эпизодов: {num_episodes}")
    
    # Визуализация
    plot_result(all_equities, all_returns)
    
    return all_returns, all_equities

def plot_result(all_equities, all_returns):
    """Один график с кривыми эквити"""
    plt.figure(figsize=(15, 8))
    
    for i, equities in enumerate(all_equities):
        plt.plot(equities, label=f'Эпизод {i+1} ({all_returns[i]:.1f}%)', alpha=0.7, linewidth=2)
    
    plt.title('Кривые капитала', fontsize=16, fontweight='bold')
    plt.ylabel('Капитал ($)', fontsize=12)
    plt.xlabel('Шаг', fontsize=12)
    plt.legend(fontsize=10)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Обучение RL-агента для трейдинга")
    parser.add_argument("--model", type=str, default="ppo", choices=["ppo", "a2c", "sac"],
                        help="Модель для обучения: ppo, a2c или sac (по умолчанию: ppo)")
    args = parser.parse_args()

    model, train, val_env = train_model(args.model.lower())
    backtest_model_varied(model, val_env, num_episodes=1)
    