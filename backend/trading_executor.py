"""
Trading Executor

Executes trades based on model predictions, handling both Paper and Live modes.
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import httpx

from backend.exchange_client import ExchangeClient, ExchangeType, get_exchange_client
from backend.risk_manager import RiskManager, RiskLimits, get_risk_manager
from backend.market_data_service import get_market_data_service

logger = logging.getLogger(__name__)


class TradingExecutor:
    """Executes trades in Paper or Live mode"""
    
    def __init__(
        self,
        mode: str = "paper",  # "paper" or "live"
        model_service_url: str = "http://127.0.0.1:8001",
        exchange_type: ExchangeType = ExchangeType.BINANCE,
        risk_limits: Optional[RiskLimits] = None
    ):
        """
        Initialize trading executor
        
        Args:
            mode: Trading mode ("paper" or "live")
            model_service_url: URL of model service
            exchange_type: Exchange type for live trading
            risk_limits: Risk management limits
        """
        self.mode = mode.lower()
        self.model_service_url = model_service_url
        
        # Initialize exchange client (only for live mode)
        self.exchange_client = None
        if self.mode == "live":
            try:
                self.exchange_client = get_exchange_client(
                    exchange_type=exchange_type,
                    sandbox=True  # Use sandbox by default for safety
                )
                logger.info(f"Exchange client initialized for {exchange_type.value}")
            except Exception as e:
                logger.error(f"Failed to initialize exchange client: {e}")
                logger.error("Falling back to paper mode")
                self.mode = "paper"
        
        # Initialize risk manager
        self.risk_manager = get_risk_manager(risk_limits)
        
        logger.info(f"Trading Executor initialized in {self.mode.upper()} mode")
    
    async def execute_trade(
        self,
        symbol: str,
        action: str,  # "BUY", "SELL", "HOLD"
        predicted_price: Optional[float] = None,
        amount: Optional[float] = None,
        current_balance: float = 10000.0,
        existing_positions: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a trade based on model prediction
        
        Args:
            symbol: Trading symbol (e.g., "BTC/USDT")
            action: Action to take ("BUY", "SELL", "HOLD")
            predicted_price: Predicted price
            amount: Trade amount
            current_balance: Current account balance
            existing_positions: Dictionary of existing positions
            
        Returns:
            Trade execution result
        """
        if action.upper() == "HOLD":
            return {
                "status": "skipped",
                "action": "HOLD",
                "symbol": symbol,
                "message": "Model predicted HOLD"
            }
        
        # Get current price
        current_price = predicted_price
        if current_price is None:
            # Try to get from market data service or exchange
            if self.exchange_client:
                current_price = self.exchange_client.get_current_price(symbol)
            else:
                # Fallback: use a mock price (for paper trading)
                current_price = 50000.0 if "BTC" in symbol else 3000.0
        
        # Determine trade side
        side = "buy" if action.upper() == "BUY" else "sell"
        
        # Calculate position size if not provided
        if amount is None:
            if side == "buy":
                # Calculate based on risk limits
                amount = self.risk_manager.calculate_position_size(
                    price=current_price,
                    balance=current_balance
                )
            else:
                # For sell, use existing position
                existing_positions = existing_positions or {}
                if symbol in existing_positions:
                    amount = existing_positions[symbol].get("quantity", 0.0)
                else:
                    return {
                        "status": "error",
                        "message": f"No position to sell for {symbol}"
                    }
        
        # Check risk limits
        is_allowed, violation_reason = self.risk_manager.check_trade_allowed(
            symbol=symbol,
            side=side,
            amount=amount,
            price=current_price,
            current_balance=current_balance,
            existing_positions=existing_positions
        )
        
        if not is_allowed:
            return {
                "status": "rejected",
                "reason": violation_reason,
                "symbol": symbol,
                "action": action
            }
        
        # Execute trade based on mode
        if self.mode == "live":
            return await self._execute_live_trade(symbol, side, amount, current_price)
        else:
            return await self._execute_paper_trade(symbol, side, amount, current_price)
    
    async def _execute_live_trade(
        self,
        symbol: str,
        side: str,
        amount: float,
        price: float
    ) -> Dict[str, Any]:
        """Execute trade on live exchange"""
        if not self.exchange_client:
            return {
                "status": "error",
                "message": "Exchange client not initialized"
            }
        
        if not self.exchange_client.is_authenticated():
            return {
                "status": "error",
                "message": "Exchange not authenticated. Please check API keys."
            }
        
        try:
            logger.info(f"[LIVE] Executing {side} order: {amount} {symbol} @ {price}")
            
            # Place market order on exchange
            order_result = self.exchange_client.place_market_order(
                symbol=symbol,
                side=side,
                amount=amount
            )
            
            if order_result and "error" in order_result:
                return {
                    "status": "error",
                    "message": order_result.get("message", "Order failed"),
                    "symbol": symbol,
                    "action": side.upper()
                }
            
            # Record trade in database
            return {
                "status": "executed",
                "mode": "live",
                "symbol": symbol,
                "action": side.upper(),
                "amount": amount,
                "price": order_result.get("price", price) if order_result else price,
                "order_id": order_result.get("id") if order_result else None,
                "fee": amount * price * 0.001,  # Estimate fee
                "exchange_order": order_result
            }
            
        except Exception as e:
            logger.error(f"Error executing live trade: {e}")
            return {
                "status": "error",
                "message": str(e),
                "symbol": symbol,
                "action": side.upper()
            }
    
    async def _execute_paper_trade(
        self,
        symbol: str,
        side: str,
        amount: float,
        price: float
    ) -> Dict[str, Any]:
        """Execute paper trade (virtual)"""
        logger.info(f"[PAPER] Simulating {side} order: {amount} {symbol} @ {price}")
        
        # Calculate fee
        fee = amount * price * 0.001  # 0.1% fee
        
        return {
            "status": "executed",
            "mode": "paper",
            "symbol": symbol,
            "action": side.upper(),
            "amount": amount,
            "price": price,
            "fee": fee,
            "order_id": f"paper_{datetime.now().timestamp()}",
            "message": "Trade executed in paper mode (virtual)"
        }
    
    def get_mode(self) -> str:
        """Get current trading mode"""
        return self.mode
    
    def switch_mode(self, new_mode: str, exchange_type: Optional[ExchangeType] = None):
        """Switch trading mode"""
        old_mode = self.mode
        self.mode = new_mode.lower()
        
        if self.mode == "live" and old_mode == "paper":
            # Initialize exchange client when switching to live
            if exchange_type:
                try:
                    self.exchange_client = get_exchange_client(exchange_type=exchange_type, sandbox=True)
                    logger.info(f"Switched to LIVE mode with {exchange_type.value}")
                except Exception as e:
                    logger.error(f"Failed to switch to live mode: {e}")
                    self.mode = "paper"
                    logger.warning("Staying in PAPER mode")
        elif self.mode == "paper":
            self.exchange_client = None
            logger.info("Switched to PAPER mode")
    
    async def check_and_close_positions(self, positions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Check positions for stop-loss/take-profit triggers"""
        actions_to_take = []
        
        for pos in positions:
            symbol = pos.get("symbol")
            entry_price = pos.get("avg_price", 0)
            current_price = pos.get("current_price", 0)
            quantity = pos.get("quantity", 0)
            
            if not symbol or entry_price == 0 or current_price == 0:
                continue
            
            # Update position risk
            self.risk_manager.update_position(symbol, current_price, quantity, entry_price)
            
            # Get position risk info
            position_risk = self.risk_manager.open_positions.get(symbol)
            if position_risk:
                # Check stop loss
                if self.risk_manager.check_stop_loss(position_risk):
                    actions_to_take.append({
                        "symbol": symbol,
                        "action": "SELL",
                        "reason": "stop_loss",
                        "amount": quantity,
                        "price": current_price
                    })
                    logger.warning(f"Stop loss triggered for {symbol}")
                
                # Check take profit
                elif self.risk_manager.check_take_profit(position_risk):
                    actions_to_take.append({
                        "symbol": symbol,
                        "action": "SELL",
                        "reason": "take_profit",
                        "amount": quantity,
                        "price": current_price
                    })
                    logger.info(f"Take profit triggered for {symbol}")
        
        return actions_to_take

