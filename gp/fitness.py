import numpy as np
from deap import gp
from . import utils
from .primitives import pset


def evaluate(individual, data):
    """
    Evaluates the fitness of a genetic programming individual as a trading strategy.
    
    The function simulates trading over the provided financial data using the individual's logic, calculates the resulting return, and applies penalties for insufficient trades, excessive drawdown, or low returns.
    
    Args:
        individual: A genetic programming individual representing a trading strategy.
        data: A pandas DataFrame containing columns 'EMA50', 'EMA200', 'RSI14', 'ATR14', and 'close'.
    
    Returns:
        A tuple containing the penalized return percentage as a single float.
    """
    func = gp.compile(expr=individual, pset=pset)

    balance = 10000.0
    equity = balance
    max_dd = 0.0
    trades = 0

    for i, row in data.iterrows():
        result = func(row['EMA50'], row['EMA200'], row['RSI14'], row['ATR14'])
        if result > 0:
            signal = 1
        elif result < 0:
            signal = -1
        else:
            signal = 0

        if signal != 0:
            sl = row['ATR14'] * 1.5
            tp = row['ATR14'] * 3.5
            entry = row['close']
            if signal == 1:
                exit_price = entry + tp
                profit = tp
            else:
                exit_price = entry - tp
                profit = tp
            equity += profit
            trades += 1
            dd = (balance - equity) / balance * 100
            max_dd = max(max_dd, dd)

    ret = (equity - balance) / balance * 100

    if trades < 10:
        ret -= 50
    if max_dd > 5:
        ret -= 50
    if ret < 8:
        ret -= 25

    return ret,
