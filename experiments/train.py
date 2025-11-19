import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Normal
import pandas as pd
from envs.trading_env import EnhancedTradingEnv
import matplotlib.pyplot as plt

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using:", device)

# ----------------- Actor-Critic -----------------
class ActorCritic(nn.Module):
    def __init__(self, input_dim, hidden_dim=256, action_dim=2):
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        self.actor_mean = nn.Linear(hidden_dim, action_dim)
        self.actor_logstd = nn.Parameter(torch.zeros(action_dim))
        self.critic = nn.Linear(hidden_dim, 1)

    def forward(self, x):
        x = self.shared(x)
        mean = self.actor_mean(x)
        std = self.actor_logstd.exp().expand_as(mean)
        value = self.critic(x)
        return mean, std, value

# ----------------- Utilities -----------------
def flatten_state(state):
    return torch.FloatTensor(state.flatten()).unsqueeze(0).to(device)

# ----------------- Training -----------------
def a2c_train(env, model, n_episodes=2000, gamma=0.99, lr=3e-4):
    optimizer = optim.Adam(model.parameters(), lr=lr)

    episode_rewards, actor_losses, critic_losses = [], [], []

    for ep in range(n_episodes):
        state, _ = env.reset()
        state = flatten_state(state)
        done = False
        ep_reward = 0

        log_probs, values, rewards = [], [], []

        while not done:
            mean, std, value = model(state)
            dist = Normal(mean, std)
            action = dist.sample()
            log_prob = dist.log_prob(action).sum(dim=-1)

            # action to numpy on CPU
            next_state, reward, done, _, _ = env.step(action.detach().cpu().numpy()[0])
            next_state = flatten_state(next_state)

            log_probs.append(log_prob)
            values.append(value)
            rewards.append(torch.tensor([reward], dtype=torch.float32, device=device))

            state = next_state
            ep_reward += reward

        # Compute returns and advantages
        returns = []
        R = torch.zeros(1, device=device)
        for r in reversed(rewards):
            R = r + gamma * R
            returns.insert(0, R)

        returns = torch.stack(returns).squeeze()
        values = torch.stack(values).squeeze()
        log_probs = torch.stack(log_probs)
        advantages = returns - values

        actor_loss = -(log_probs * advantages.detach()).mean()
        critic_loss = advantages.pow(2).mean()
        loss = actor_loss + 0.5 * critic_loss

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        episode_rewards.append(ep_reward)
        actor_losses.append(actor_loss.item())
        critic_losses.append(critic_loss.item())

        if ep % 10 == 0:
            print(f"Episode {ep}, Total Reward: {ep_reward:.2f}")

    return episode_rewards, actor_losses, critic_losses

# ----------------- Data -----------------
df = pd.read_csv("BTC_USDT_OI_SP500_FEATURES_1h_2Y.csv", parse_dates=['timestamp'], index_col='timestamp')
df = df.sort_index()
df.fillna(method='ffill', inplace=True)
df.fillna(0, inplace=True)

# Фичи для обучения, исключая 'Close'
features = [c for c in df.columns if c != 'Close' and c != 'timestamp']


# Нормализация
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
df[features] = scaler.fit_transform(df[features])

# ----------------- Environment -----------------

env = EnhancedTradingEnv(
    df,
    window_size=50,
    fee=0.001,
    initial_balance=10000.0,
    state_features=features,
    normalize=False
)


state_dim = env.observation_space.shape[0] * env.observation_space.shape[1]
model = ActorCritic(input_dim=state_dim, hidden_dim=256, action_dim=2).to(device)

# ----------------- Train -----------------
rewards, actor_losses, critic_losses = a2c_train(env, model, n_episodes=500)

# ----------------- Save -----------------
torch.save(model.state_dict(), 'experiments/trained_model.pth')
print("Model saved to experiments/trained_model.pth")

# ----------------- Plot -----------------
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