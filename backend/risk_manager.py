"""
Risk Management System

Manages risk limits, stop-loss, position sizing, and trading constraints.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class RiskViolationType(str, Enum):
    """Types of risk violations"""
    MAX_POSITION_SIZE = "max_position_size"
    MAX_DAILY_LOSS = "max_daily_loss"
    MAX_RISK_PER_TRADE = "max_risk_per_trade"
    STOP_LOSS = "stop_loss"
    MAX_LEVERAGE = "max_leverage"
    MIN_BALANCE = "min_balance"


@dataclass
class RiskLimits:
    """Risk management limits configuration"""
    max_position_size: float = 1000.0  # Maximum position size in base currency
    max_daily_loss: float = 500.0  # Maximum daily loss in base currency
    max_risk_per_trade: float = 2.0  # Maximum risk per trade (%)
    stop_loss_percent: float = 5.0  # Stop loss (%)
    take_profit_percent: float = 10.0  # Take profit (%)
    max_leverage: float = 1.0  # Maximum leverage (1.0 = no leverage)
    min_balance: float = 1000.0  # Minimum account balance
    max_open_positions: int = 5  # Maximum number of open positions


@dataclass
class PositionRisk:
    """Risk metrics for a position"""
    symbol: str
    entry_price: float
    current_price: float
    quantity: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    stop_loss_price: Optional[float] = None
    take_profit_price: Optional[float] = None


class RiskManager:
    """Manages trading risk and enforces limits"""
    
    def __init__(self, limits: Optional[RiskLimits] = None):
        """
        Initialize risk manager
        
        Args:
            limits: Risk limits configuration
        """
        self.limits = limits or RiskLimits()
        self.daily_loss: float = 0.0
        self.daily_trades: int = 0
        self.last_reset_date: datetime = datetime.now().date()
        self.open_positions: Dict[str, PositionRisk] = {}
        
        logger.info("Risk Manager initialized")
        logger.info(f"  Max position size: {self.limits.max_position_size}")
        logger.info(f"  Max daily loss: {self.limits.max_daily_loss}")
        logger.info(f"  Max risk per trade: {self.limits.max_risk_per_trade}%")
        logger.info(f"  Stop loss: {self.limits.stop_loss_percent}%")
    
    def reset_daily_stats(self):
        """Reset daily statistics if it's a new day"""
        today = datetime.now().date()
        if today > self.last_reset_date:
            logger.info("Resetting daily risk statistics")
            self.daily_loss = 0.0
            self.daily_trades = 0
            self.last_reset_date = today
    
    def check_trade_allowed(
        self,
        symbol: str,
        side: str,  # 'buy' or 'sell'
        amount: float,
        price: float,
        current_balance: float,
        existing_positions: Optional[Dict[str, Any]] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Check if a trade is allowed based on risk limits
        
        Args:
            symbol: Trading symbol
            side: 'buy' or 'sell'
            amount: Trade amount
            price: Trade price
            current_balance: Current account balance
            existing_positions: Dictionary of existing positions
            
        Returns:
            Tuple of (is_allowed, violation_reason)
        """
        self.reset_daily_stats()
        
        # Check minimum balance
        if current_balance < self.limits.min_balance:
            return False, f"Balance {current_balance:.2f} below minimum {self.limits.min_balance:.2f}"
        
        # Check position size
        position_value = amount * price
        if position_value > self.limits.max_position_size:
            return False, f"Position size {position_value:.2f} exceeds max {self.limits.max_position_size:.2f}"
        
        # Check number of open positions
        existing_positions = existing_positions or {}
        if len(existing_positions) >= self.limits.max_open_positions:
            return False, f"Maximum open positions ({self.limits.max_open_positions}) reached"
        
        # Check risk per trade
        risk_amount = position_value * (self.limits.max_risk_per_trade / 100.0)
        if risk_amount > current_balance * (self.limits.max_risk_per_trade / 100.0):
            return False, f"Trade risk {risk_amount:.2f} exceeds {self.limits.max_risk_per_trade}% of balance"
        
        return True, None
    
    def calculate_position_size(
        self,
        price: float,
        balance: float,
        risk_percent: Optional[float] = None
    ) -> float:
        """
        Calculate safe position size based on risk limits
        
        Args:
            price: Asset price
            balance: Account balance
            risk_percent: Risk percentage (uses max_risk_per_trade if not provided)
            
        Returns:
            Safe position size
        """
        risk_pct = risk_percent or self.limits.max_risk_per_trade
        max_risk_amount = balance * (risk_pct / 100.0)
        
        # Position size based on risk
        position_by_risk = max_risk_amount / price
        
        # Position size based on max position size limit
        position_by_limit = self.limits.max_position_size / price
        
        # Use the smaller of the two
        safe_size = min(position_by_risk, position_by_limit)
        
        logger.debug(f"Calculated position size: {safe_size:.6f} (risk: {max_risk_amount:.2f}, limit: {self.limits.max_position_size:.2f})")
        return safe_size
    
    def check_daily_loss(self, pnl: float) -> tuple[bool, Optional[str]]:
        """
        Check if adding this PnL would exceed daily loss limit
        
        Args:
            pnl: Profit/Loss to add (negative for loss)
            
        Returns:
            Tuple of (is_allowed, violation_reason)
        """
        self.reset_daily_stats()
        
        if pnl < 0:  # Only check losses
            new_daily_loss = self.daily_loss + abs(pnl)
            if new_daily_loss > self.limits.max_daily_loss:
                return False, f"Daily loss {new_daily_loss:.2f} would exceed limit {self.limits.max_daily_loss:.2f}"
        
        return True, None
    
    def record_trade(self, pnl: float):
        """Record a completed trade"""
        self.reset_daily_stats()
        
        if pnl < 0:
            self.daily_loss += abs(pnl)
            logger.info(f"Daily loss updated: {self.daily_loss:.2f} / {self.limits.max_daily_loss:.2f}")
        
        self.daily_trades += 1
    
    def calculate_stop_loss_price(self, entry_price: float, side: str) -> float:
        """
        Calculate stop loss price
        
        Args:
            entry_price: Entry price
            side: 'buy' (long) or 'sell' (short)
            
        Returns:
            Stop loss price
        """
        if side.lower() == 'buy':
            # For long positions, stop loss is below entry
            return entry_price * (1 - self.limits.stop_loss_percent / 100.0)
        else:
            # For short positions, stop loss is above entry
            return entry_price * (1 + self.limits.stop_loss_percent / 100.0)
    
    def calculate_take_profit_price(self, entry_price: float, side: str) -> float:
        """
        Calculate take profit price
        
        Args:
            entry_price: Entry price
            side: 'buy' (long) or 'sell' (short)
            
        Returns:
            Take profit price
        """
        if side.lower() == 'buy':
            # For long positions, take profit is above entry
            return entry_price * (1 + self.limits.take_profit_percent / 100.0)
        else:
            # For short positions, take profit is below entry
            return entry_price * (1 - self.limits.take_profit_percent / 100.0)
    
    def check_stop_loss(self, position: PositionRisk) -> bool:
        """
        Check if stop loss should be triggered
        
        Args:
            position: Position risk information
            
        Returns:
            True if stop loss should be triggered
        """
        if not position.stop_loss_price:
            return False
        
        # For long positions, check if price dropped below stop loss
        if position.current_price <= position.stop_loss_price:
            logger.warning(f"Stop loss triggered for {position.symbol}: {position.current_price:.2f} <= {position.stop_loss_price:.2f}")
            return True
        
        return False
    
    def check_take_profit(self, position: PositionRisk) -> bool:
        """
        Check if take profit should be triggered
        
        Args:
            position: Position risk information
            
        Returns:
            True if take profit should be triggered
        """
        if not position.take_profit_price:
            return False
        
        # For long positions, check if price rose above take profit
        if position.current_price >= position.take_profit_price:
            logger.info(f"Take profit triggered for {position.symbol}: {position.current_price:.2f} >= {position.take_profit_price:.2f}")
            return True
        
        return False
    
    def update_position(self, symbol: str, current_price: float, quantity: float, entry_price: float):
        """Update position risk metrics"""
        unrealized_pnl = (current_price - entry_price) * quantity
        unrealized_pnl_percent = ((current_price - entry_price) / entry_price) * 100.0
        
        position = PositionRisk(
            symbol=symbol,
            entry_price=entry_price,
            current_price=current_price,
            quantity=quantity,
            unrealized_pnl=unrealized_pnl,
            unrealized_pnl_percent=unrealized_pnl_percent,
            stop_loss_price=self.calculate_stop_loss_price(entry_price, 'buy'),
            take_profit_price=self.calculate_take_profit_price(entry_price, 'buy')
        )
        
        self.open_positions[symbol] = position
    
    def get_daily_stats(self) -> Dict[str, Any]:
        """Get daily risk statistics"""
        self.reset_daily_stats()
        return {
            'daily_loss': self.daily_loss,
            'daily_loss_limit': self.limits.max_daily_loss,
            'daily_trades': self.daily_trades,
            'remaining_loss_capacity': max(0, self.limits.max_daily_loss - self.daily_loss),
            'loss_percent_used': (self.daily_loss / self.limits.max_daily_loss * 100.0) if self.limits.max_daily_loss > 0 else 0.0
        }
    
    def should_stop_trading(self) -> bool:
        """Check if trading should be stopped due to risk limits"""
        self.reset_daily_stats()
        return self.daily_loss >= self.limits.max_daily_loss


# Singleton instance
_risk_manager: Optional[RiskManager] = None


def get_risk_manager(limits: Optional[RiskLimits] = None) -> RiskManager:
    """Get or create risk manager singleton"""
    global _risk_manager
    
    if _risk_manager is None:
        _risk_manager = RiskManager(limits)
    
    return _risk_manager

