"""
Exchange Client for Live Trading

This module provides integration with cryptocurrency exchanges (Binance, Bybit, etc.)
for executing real trades in Live Trading mode.
"""

import os
import logging
from typing import Dict, Any, Optional, List
from enum import Enum
import ccxt
from decimal import Decimal

logger = logging.getLogger(__name__)


class ExchangeType(str, Enum):
    """Supported exchange types"""
    BINANCE = "binance"
    BYBIT = "bybit"
    COINBASE = "coinbase"


class ExchangeClient:
    """Client for interacting with cryptocurrency exchanges"""
    
    def __init__(
        self,
        exchange_type: ExchangeType = ExchangeType.BINANCE,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        sandbox: bool = True  # Default to sandbox/testnet for safety
    ):
        """
        Initialize exchange client
        
        Args:
            exchange_type: Type of exchange (binance, bybit, etc.)
            api_key: Exchange API key
            api_secret: Exchange API secret
            sandbox: Use sandbox/testnet (True) or production (False)
        """
        self.exchange_type = exchange_type
        self.api_key = api_key or os.getenv(f"{exchange_type.value.upper()}_API_KEY")
        self.api_secret = api_secret or os.getenv(f"{exchange_type.value.upper()}_API_SECRET")
        self.sandbox = sandbox
        self.exchange = None
        self._initialize_exchange()
    
    def _initialize_exchange(self):
        """Initialize CCXT exchange instance"""
        try:
            exchange_class = getattr(ccxt, self.exchange_type.value)
            
            config = {
                'apiKey': self.api_key,
                'secret': self.api_secret,
                'enableRateLimit': True,
                'options': {
                    'defaultType': 'spot',  # or 'future' for futures trading
                }
            }
            
            # Enable sandbox/testnet if available
            if self.sandbox:
                if hasattr(exchange_class, 'sandbox'):
                    config['sandbox'] = True
                elif hasattr(exchange_class, 'test'):
                    config['test'] = True
            
            self.exchange = exchange_class(config)
            
            # Test connection
            if self.api_key and self.api_secret:
                try:
                    self.exchange.load_markets()
                    logger.info(f"✅ Connected to {self.exchange_type.value} ({'sandbox' if self.sandbox else 'production'})")
                except Exception as e:
                    logger.warning(f"⚠️  Could not connect to exchange: {e}")
                    logger.warning("   Exchange client initialized but not authenticated")
            else:
                logger.warning(f"⚠️  No API credentials provided for {self.exchange_type.value}")
                logger.warning("   Exchange client initialized but not authenticated")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize exchange client: {e}")
            raise
    
    def is_authenticated(self) -> bool:
        """Check if exchange client is authenticated"""
        if not self.api_key or not self.api_secret:
            return False
        
        try:
            self.exchange.load_markets()
            # Try to fetch account balance as authentication test
            self.exchange.fetch_balance()
            return True
        except Exception as e:
            logger.warning(f"Authentication check failed: {e}")
            return False
    
    def get_balance(self, currency: str = 'USDT') -> float:
        """
        Get account balance for a currency
        
        Args:
            currency: Currency symbol (e.g., 'USDT', 'BTC')
            
        Returns:
            Available balance
        """
        try:
            if not self.is_authenticated():
                logger.warning("Not authenticated - returning 0 balance")
                return 0.0
            
            balance = self.exchange.fetch_balance()
            free = balance.get(currency, {}).get('free', 0.0)
            logger.info(f"Balance {currency}: {free}")
            return float(free)
        except Exception as e:
            logger.error(f"Failed to fetch balance: {e}")
            return 0.0
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """
        Get current price for a trading symbol
        
        Args:
            symbol: Trading symbol (e.g., 'BTC/USDT')
            
        Returns:
            Current price or None if error
        """
        try:
            ticker = self.exchange.fetch_ticker(symbol)
            return float(ticker['last'])
        except Exception as e:
            logger.error(f"Failed to fetch price for {symbol}: {e}")
            return None
    
    def place_market_order(
        self,
        symbol: str,
        side: str,  # 'buy' or 'sell'
        amount: float,
        params: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Place a market order on the exchange
        
        Args:
            symbol: Trading symbol (e.g., 'BTC/USDT')
            side: 'buy' or 'sell'
            amount: Amount to trade
            params: Additional parameters
            
        Returns:
            Order info dict or None if error
        """
        if not self.is_authenticated():
            logger.error("Cannot place order: not authenticated")
            return None
        
        try:
            logger.info(f"Placing {side} order: {amount} {symbol}")
            
            order = self.exchange.create_market_order(
                symbol=symbol,
                side=side,
                amount=amount,
                params=params or {}
            )
            
            logger.info(f"✅ Order placed: {order.get('id', 'unknown')}")
            return {
                'id': order.get('id'),
                'symbol': symbol,
                'side': side,
                'amount': amount,
                'price': order.get('price') or self.get_current_price(symbol),
                'status': order.get('status', 'unknown'),
                'timestamp': order.get('timestamp'),
                'info': order
            }
        except ccxt.InsufficientFunds as e:
            logger.error(f"❌ Insufficient funds: {e}")
            return {'error': 'insufficient_funds', 'message': str(e)}
        except ccxt.InvalidOrder as e:
            logger.error(f"❌ Invalid order: {e}")
            return {'error': 'invalid_order', 'message': str(e)}
        except Exception as e:
            logger.error(f"❌ Failed to place order: {e}")
            return {'error': 'unknown_error', 'message': str(e)}
    
    def place_limit_order(
        self,
        symbol: str,
        side: str,
        amount: float,
        price: float,
        params: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Place a limit order on the exchange
        
        Args:
            symbol: Trading symbol (e.g., 'BTC/USDT')
            side: 'buy' or 'sell'
            amount: Amount to trade
            price: Limit price
            params: Additional parameters
            
        Returns:
            Order info dict or None if error
        """
        if not self.is_authenticated():
            logger.error("Cannot place order: not authenticated")
            return None
        
        try:
            logger.info(f"Placing {side} limit order: {amount} {symbol} @ {price}")
            
            order = self.exchange.create_limit_order(
                symbol=symbol,
                side=side,
                amount=amount,
                price=price,
                params=params or {}
            )
            
            logger.info(f"✅ Limit order placed: {order.get('id', 'unknown')}")
            return {
                'id': order.get('id'),
                'symbol': symbol,
                'side': side,
                'amount': amount,
                'price': price,
                'status': order.get('status', 'open'),
                'timestamp': order.get('timestamp'),
                'info': order
            }
        except Exception as e:
            logger.error(f"❌ Failed to place limit order: {e}")
            return {'error': 'order_failed', 'message': str(e)}
    
    def cancel_order(self, order_id: str, symbol: str) -> bool:
        """Cancel an order"""
        try:
            self.exchange.cancel_order(order_id, symbol)
            logger.info(f"✅ Order {order_id} cancelled")
            return True
        except Exception as e:
            logger.error(f"Failed to cancel order {order_id}: {e}")
            return False
    
    def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get open orders"""
        try:
            if symbol:
                orders = self.exchange.fetch_open_orders(symbol)
            else:
                orders = self.exchange.fetch_open_orders()
            return [order for order in orders]
        except Exception as e:
            logger.error(f"Failed to fetch open orders: {e}")
            return []
    
    def get_order_status(self, order_id: str, symbol: str) -> Optional[Dict[str, Any]]:
        """Get status of an order"""
        try:
            order = self.exchange.fetch_order(order_id, symbol)
            return {
                'id': order.get('id'),
                'status': order.get('status'),
                'filled': order.get('filled'),
                'amount': order.get('amount'),
                'price': order.get('price'),
                'cost': order.get('cost'),
            }
        except Exception as e:
            logger.error(f"Failed to fetch order status: {e}")
            return None


# Singleton instance (will be initialized when needed)
_exchange_client: Optional[ExchangeClient] = None


def get_exchange_client(
    exchange_type: ExchangeType = ExchangeType.BINANCE,
    api_key: Optional[str] = None,
    api_secret: Optional[str] = None,
    sandbox: bool = True
) -> ExchangeClient:
    """
    Get or create exchange client singleton
    
    Args:
        exchange_type: Type of exchange
        api_key: API key
        api_secret: API secret
        sandbox: Use sandbox/testnet
        
    Returns:
        ExchangeClient instance
    """
    global _exchange_client
    
    if _exchange_client is None:
        _exchange_client = ExchangeClient(
            exchange_type=exchange_type,
            api_key=api_key,
            api_secret=api_secret,
            sandbox=sandbox
        )
    
    return _exchange_client

