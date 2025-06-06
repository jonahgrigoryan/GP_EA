import pandas as pd
import numpy as np
from pathlib import Path


def protected_div(a, b):
    """
    Safely divides two numbers, returning zero if the divisor is near zero.
    
    Prevents division by values close to zero to avoid numerical instability.
    """
    return a / b if abs(b) > 1e-8 else 0.0


def if_func(cond, out1, out0):
    """
    Returns one of two values based on a boolean condition.
    
    Args:
    	cond: The condition to evaluate.
    	out1: Value returned if cond is True.
    	out0: Value returned if cond is False.
    
    Returns:
    	out1 if cond is True; otherwise, out0.
    """
    return out1 if cond else out0


def load_data(path):
    """
    Loads financial time series data from a CSV file and computes technical indicators.
    
    The function reads a CSV file into a DataFrame, calculates the 50-period and 200-period exponential moving averages (EMA) of the 'close' price, the 14-period Relative Strength Index (RSI), and the 14-period Average True Range (ATR). Rows with missing values are removed before returning the DataFrame.
    
    Args:
        path: Path to the CSV file containing columns 'close', 'high', and 'low'.
    
    Returns:
        A pandas DataFrame with the original data and added columns: 'EMA50', 'EMA200', 'RSI14', and 'ATR14'.
    """
    df = pd.read_csv(path)
    df['EMA50'] = df['close'].ewm(span=50, adjust=False).mean()
    df['EMA200'] = df['close'].ewm(span=200, adjust=False).mean()
    df['RSI14'] = rsi(df['close'], 14)
    df['ATR14'] = atr(df['high'], df['low'], df['close'], 14)
    df.dropna(inplace=True)
    return df


def rsi(series, period):
    """
    Calculates the Relative Strength Index (RSI) for a given time series and period.
    
    The RSI measures the magnitude of recent price changes to evaluate overbought or oversold conditions in the price of a financial asset.
    
    Args:
        series: A pandas Series of values (typically closing prices).
        period: The number of periods to use for the RSI calculation.
    
    Returns:
        A pandas Series containing the RSI values.
    """
    delta = series.diff()
    gain = np.where(delta > 0, delta, 0)
    loss = np.where(delta < 0, -delta, 0)
    gain = pd.Series(gain).ewm(alpha=1/period, adjust=False).mean()
    loss = pd.Series(loss).ewm(alpha=1/period, adjust=False).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def atr(high, low, close, period):
    """
    Calculates the Average True Range (ATR) over a specified period.
    
    ATR measures market volatility by averaging the true range, which is the greatest of the current high-low, the absolute difference between the current high and previous close, and the absolute difference between the current low and previous close.
    
    Args:
        high: Series of high prices.
        low: Series of low prices.
        close: Series of close prices.
        period: Number of periods to use for the rolling mean.
    
    Returns:
        A pandas Series containing the ATR values.
    """
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs(),
    ], axis=1).max(axis=1)
    return tr.rolling(period).mean()
