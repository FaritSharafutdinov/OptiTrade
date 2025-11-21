import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Normal
import pandas as pd
from environment.A2C_trading_env import EnhancedTradingEnv
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using:", device)

# ---------------- Actor Network ----------------
class Actor(nn.Module):
    """ Policy Network """
    def __init__(self, num_inputs, num_actions):
        super(Actor, self).__init__()
        self.fc1 = nn.Linear(num_inputs, 128)
        self.fc2 = nn.Linear(128, num_actions)
        self.log_std = nn.Parameter(torch.zeros(num_actions))  # для непрерывных действий

    def forward(self, state):
        x = torch.relu(self.fc1(state))
        mean = self.fc2(x)
        std = self.log_std.exp().expand_as(mean)
        return mean, std

# ---------------- Critic Network ----------------
class Critic(nn.Module):
    """ Value Network """
    def __init__(self, num_inputs):
        super(Critic, self).__init__()
        self.fc1 = nn.Linear(num_inputs, 128)
        self.fc2 = nn.Linear(128, 1)

    def forward(self, state):
        x = torch.relu(self.fc1(state))
        value = self.fc2(x)
        return value

# ---------------- Utility ----------------
def flatten_state(state):
    return torch.FloatTensor(state.flatten()).unsqueeze(0).to(device)

# ---------------- Training ----------------
def a2c_train(env, actor, critic, actor_optimizer, critic_optimizer,
              n_episodes=500, gamma=0.99):
    
    episode_rewards = []
    actor_losses = []
    critic_losses = []

    for ep in range(n_episodes):
        state, _ = env.reset()
        state = flatten_state(state)
        done = False
        ep_reward = 0

        log_probs = []
        values = []
        rewards = []

        while not done:
            # Forward pass через актёра и критика
            mean, std = actor(state)
            dist = Normal(mean, std)
            action = dist.sample()
            log_prob = dist.log_prob(action).sum(dim=-1)

            value = critic(state)

            # Шаг среды
            next_state, reward, done, _, _ = env.step(action.detach().cpu().numpy()[0])
            next_state = flatten_state(next_state)

            # Сохраняем для обучения
            log_probs.append(log_prob)
            values.append(value)
            rewards.append(torch.tensor([reward], dtype=torch.float32, device=device))

            state = next_state
            ep_reward += reward

        # --- Compute returns and advantages ---
        returns = []
        R = torch.zeros(1, device=device)
        for r in reversed(rewards):
            R = r + gamma * R
            returns.insert(0, R)
        returns = torch.stack(returns).squeeze()
        values = torch.stack(values).squeeze()
        log_probs = torch.stack(log_probs)
        advantages = returns - values

        # --- Actor loss ---
        actor_loss = -(log_probs * advantages.detach()).mean()
        # --- Critic loss ---
        critic_loss = advantages.pow(2).mean()

        # --- Backprop ---
        actor_optimizer.zero_grad()
        actor_loss.backward()
        actor_optimizer.step()

        critic_optimizer.zero_grad()
        critic_loss.backward()
        critic_optimizer.step()

        episode_rewards.append(ep_reward)
        actor_losses.append(actor_loss.item())
        critic_losses.append(critic_loss.item())

        if ep % 10 == 0:
            print(f"Episode {ep}, Total Reward: {ep_reward:.2f}")

    return episode_rewards, actor_losses, critic_losses

# ---------------- Data ----------------
df = pd.read_csv(".\datasets\BTC_USDT_OI_SP500_FEATURES_1h_2Y.csv", parse_dates=['timestamp'], index_col='timestamp')
df = df.sort_index()
df.fillna(method='ffill', inplace=True)
df.fillna(0, inplace=True)

# Фичи для обучения (исключаем 'Close')
features = [c for c in df.columns if c != 'Close' and c != 'timestamp']

# Нормализация
scaler = StandardScaler()
df[features] = scaler.fit_transform(df[features])

# ---------------- Environment ----------------
env = EnhancedTradingEnv(
    df,
    window_size=50,
    fee=0.001,
    initial_balance=10000.0,
    state_features=features,
    normalize=False
)

state_dim = env.observation_space.shape[0] * env.observation_space.shape[1]
action_dim = 2  # [позиция, размер]

actor = Actor(state_dim, action_dim).to(device)
critic = Critic(state_dim).to(device)

actor_optimizer = optim.Adam(actor.parameters(), lr=3e-4)
critic_optimizer = optim.Adam(critic.parameters(), lr=3e-4)

# ---------------- Train ----------------
rewards, actor_losses, critic_losses = a2c_train(env, actor, critic,
                                                 actor_optimizer, critic_optimizer,
                                                 n_episodes=500, gamma=0.99)

# ---------------- Save ----------------
torch.save(actor.state_dict(), 'RL_algoritms/models/A2C/actor.pth')
torch.save(critic.state_dict(), 'RL_algoritms/models/A2C/critic.pth')
print("Models saved to 'RL_algoritms/models/A2C")

# ---------------- Plot ----------------
plt.figure(figsize=(15, 5))
plt.subplot(1, 3, 1)
plt.plot(rewards)
plt.title('Episode Rewards')
plt.xlabel('Episode')
plt.ylabel('Reward')
plt.subplot(1, 3, 2)
plt.plot(actor_losses)
plt.title('Actor Losses')
plt.xlabel('Episode')
plt.ylabel('Loss')
plt.subplot(1, 3, 3)
plt.plot(critic_losses)
plt.title('Critic Losses')
plt.xlabel('Episode')
plt.ylabel('Loss')
plt.tight_layout()
plt.savefig('experiments/learning_curves.png')
print("Learning curves saved to experiments/learning_curves.png")
