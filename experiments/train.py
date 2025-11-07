import pandas as pd
from envs.trading_env import EnhancedTradingEnv
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.monitor import Monitor
import matplotlib.pyplot as plt
import numpy as np

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


def train_model():
    """Обучение модели"""
    df = pd.read_csv("BTC_USDT_OI_FEATURES_1h_2Y.csv", parse_dates=['timestamp'], index_col='timestamp')
    
    df = df.sort_index()
    
    split_date = df.index[int(len(df) * 0.80)]
    train_df = df[df.index < split_date]
    val_df = df[df.index >= split_date]

    print(f"Данные: Train={len(train_df)}, Validation={len(val_df)}")
    

    train_env = Monitor(EnhancedTradingEnv(
        train_df, 
        window_size=50,
        use_technical_features=True,
        normalize=True
    ))
    
    val_env = Monitor(EnhancedTradingEnv(
        val_df,
        window_size=50, 
        use_technical_features=True,
        normalize=True
    ))
    
    model = PPO(
        "MlpPolicy",
        train_env,
        learning_rate=1e-5,
        n_steps=2048,
        batch_size=128,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.02,
        vf_coef=0.5,
        max_grad_norm=0.5,
        policy_kwargs=dict(
            net_arch=dict(pi=[256, 256], vf=[256, 256])
        ),
        verbose=1,
        # tensorboard_log="./trading_tb/", 
        device='auto'
    )
    
 
    metrics_callback = MetricsCallback()
    
    model.learn(
        total_timesteps=200000,
        callback=metrics_callback, 
        progress_bar=True,
        # tb_log_name="PPO_enhanced"  
    )
    
    model.save("enhanced_trading_model")
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
    model, train_env, val_env = train_model()
    returns, equities = backtest_model_varied(model, val_env, num_episodes=1)