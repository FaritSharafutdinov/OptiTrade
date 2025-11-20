from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Any, Dict

app = FastAPI(title="RL Model Service (Demo)")

class Obs(BaseModel):
    features: List[float]
    symbol: str
    timestamp: str

@app.post("/predict")
async def predict(obs: Obs) -> Dict[str, Any]:
    """
    Very small deterministic policy for demo.
    Replace with real RL model inference: load weights at startup and call model.predict(...)
    """
    s = sum(obs.features) if obs.features else 0.0
    # tiny deterministic rule: threshold-based
    if s > 0.3:
        action = "BUY"
    elif s < -0.3:
        action = "SELL"
    else:
        action = "HOLD"
    return {"action": action, "score": float(s)}
