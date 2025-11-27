"""
Market Data Service

Provides real-time market data via WebSocket connections to exchanges.
"""

import asyncio
import logging
import json
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime
import ccxt
import websockets
from collections import defaultdict

logger = logging.getLogger(__name__)


class MarketDataService:
    """Service for real-time market data via WebSocket"""
    
    def __init__(self, exchange_id: str = 'binance'):
        """
        Initialize market data service
        
        Args:
            exchange_id: Exchange identifier (binance, bybit, etc.)
        """
        self.exchange_id = exchange_id
        self.exchange = getattr(ccxt, exchange_id)({'enableRateLimit': True})
        self.websocket_connections: Dict[str, Any] = {}
        self.price_subscribers: Dict[str, List[Callable]] = defaultdict(list)
        self.current_prices: Dict[str, float] = {}
        self.running = False
        
        logger.info(f"Market Data Service initialized for {exchange_id}")
    
    async def start_price_stream(self, symbols: List[str]):
        """
        Start WebSocket stream for price updates
        
        Args:
            symbols: List of trading symbols (e.g., ['BTC/USDT', 'ETH/USDT'])
        """
        self.running = True
        
        # For Binance, use their WebSocket API
        if self.exchange_id == 'binance':
            await self._start_binance_stream(symbols)
        elif self.exchange_id == 'bybit':
            await self._start_bybit_stream(symbols)
        else:
            logger.warning(f"WebSocket streaming not implemented for {self.exchange_id}, falling back to polling")
            await self._start_polling(symbols)
    
    async def _start_binance_stream(self, symbols: List[str]):
        """Start Binance WebSocket stream"""
        # Convert symbols to Binance format (BTC/USDT -> btcusdt)
        binance_symbols = [s.lower().replace('/', '') for s in symbols]
        stream_names = [f"{s}@ticker" for s in binance_symbols]
        
        uri = f"wss://stream.binance.com:9443/stream?streams={'/'.join(stream_names)}"
        
        logger.info(f"Connecting to Binance WebSocket: {uri}")
        
        try:
            async with websockets.connect(uri) as websocket:
                logger.info("✅ Connected to Binance WebSocket")
                
                async for message in websocket:
                    if not self.running:
                        break
                    
                    try:
                        data = json.loads(message)
                        stream = data.get('stream', '')
                        ticker_data = data.get('data', {})
                        
                        # Extract symbol and price
                        symbol_match = stream.replace('@ticker', '')
                        symbol = f"{symbol_match[:-4]}/{symbol_match[-4:]}".upper()  # btcusdt -> BTC/USDT
                        price = float(ticker_data.get('c', 0))  # 'c' is last price
                        
                        if price > 0:
                            self.current_prices[symbol] = price
                            await self._notify_subscribers(symbol, price)
                            
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse WebSocket message: {message}")
                    except Exception as e:
                        logger.error(f"Error processing WebSocket message: {e}")
                        
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            logger.info("Falling back to polling mode")
            await self._start_polling(symbols)
    
    async def _start_bybit_stream(self, symbols: List[str]):
        """Start Bybit WebSocket stream"""
        # Bybit uses different WebSocket format
        logger.info("Bybit WebSocket not yet implemented, using polling")
        await self._start_polling(symbols)
    
    async def _start_polling(self, symbols: List[str]):
        """Fallback: poll prices periodically"""
        logger.info(f"Starting price polling for {symbols}")
        
        while self.running:
            try:
                for symbol in symbols:
                    try:
                        ticker = self.exchange.fetch_ticker(symbol)
                        price = float(ticker.get('last', 0))
                        
                        if price > 0:
                            self.current_prices[symbol] = price
                            await self._notify_subscribers(symbol, price)
                    except Exception as e:
                        logger.error(f"Error fetching price for {symbol}: {e}")
                
                await asyncio.sleep(1)  # Poll every second
                
            except Exception as e:
                logger.error(f"Error in polling loop: {e}")
                await asyncio.sleep(5)
    
    async def _notify_subscribers(self, symbol: str, price: float):
        """Notify all subscribers of price update"""
        if symbol in self.price_subscribers:
            for callback in self.price_subscribers[symbol]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(symbol, price)
                    else:
                        callback(symbol, price)
                except Exception as e:
                    logger.error(f"Error in price subscriber callback: {e}")
    
    def subscribe_price(self, symbol: str, callback: Callable):
        """
        Subscribe to price updates for a symbol
        
        Args:
            symbol: Trading symbol
            callback: Callback function(symbol, price) -> None
        """
        self.price_subscribers[symbol].append(callback)
        logger.info(f"Subscribed to {symbol} price updates")
    
    def unsubscribe_price(self, symbol: str, callback: Callable):
        """Unsubscribe from price updates"""
        if symbol in self.price_subscribers:
            self.price_subscribers[symbol].remove(callback)
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current price for a symbol"""
        return self.current_prices.get(symbol)
    
    def stop(self):
        """Stop the market data service"""
        self.running = False
        logger.info("Market Data Service stopped")


# Singleton instance
_market_data_service: Optional[MarketDataService] = None


def get_market_data_service(exchange_id: str = 'binance') -> MarketDataService:
    """Get or create market data service singleton"""
    global _market_data_service
    
    if _market_data_service is None:
        _market_data_service = MarketDataService(exchange_id)
    
    return _market_data_service

