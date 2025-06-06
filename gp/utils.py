import pandas as pd
import numpy as np
from pathlib import Path


def protected_div(a, b):
    return a / b if abs(b) > 1e-8 else 0.0


def if_func(cond, out1, out0):
    return out1 if cond else out0


def load_data(path):
    df = pd.read_csv(path)
    df['EMA50'] = df['close'].ewm(span=50, adjust=False).mean()
    df['EMA200'] = df['close'].ewm(span=200, adjust=False).mean()
    df['RSI14'] = rsi(df['close'], 14)
    df['ATR14'] = atr(df['high'], df['low'], df['close'], 14)
    df.dropna(inplace=True)
    return df


def rsi(series, period):
    delta = series.diff()
    gain = np.where(delta > 0, delta, 0)
    loss = np.where(delta < 0, -delta, 0)
    gain = pd.Series(gain).ewm(alpha=1/period, adjust=False).mean()
    loss = pd.Series(loss).ewm(alpha=1/period, adjust=False).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def atr(high, low, close, period):
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs(),
    ], axis=1).max(axis=1)
    return tr.rolling(period).mean()
