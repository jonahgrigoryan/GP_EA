import numpy as np
import pandas as pd # Required for shift operations
from deap import gp
# from . import utils # utils is not directly used by the new evaluate function, but by evolve.py
from .primitives import pset

# Define constants for simulation
INITIAL_BALANCE = 10000.0
RISK_PERCENT_PER_TRADE = 0.01 # 1%
SL_ATR_MULTIPLIER = 1.5
TP_ATR_MULTIPLIER = 3.5
PIP_SIZE = 0.0001 # Assuming EURUSD-like pip size for calculations involving pips
SLIPPAGE_PIPS = 3.0 # Ensure float for calculations

def evaluate(individual, data_df_full): # Renamed data to data_df_full to avoid conflict
    if not isinstance(individual, gp.PrimitiveTree):
        return -float('inf'), # Very bad fitness

    try:
        func = gp.compile(expr=individual, pset=pset)
    except Exception as e:
        # print(f"Fitness Error: GP Compilation failed: {e}")
        return -float('inf'),

    # Make a copy to avoid SettingWithCopyWarning
    data = data_df_full.copy()

    # Prepare data for simulation: shift data to get next bar's OHLC for trade execution
    data['entry_price_sim'] = data['open'].shift(-1)
    data['bar_high_sim'] = data['high'].shift(-1)
    data['bar_low_sim'] = data['low'].shift(-1)

    # We can only simulate trades for bars where we have 'next bar' data
    # Also, signals are generated on bar 'i', ATR for SL/TP is from bar 'i', trade executed on 'i+1'
    # So, the last row of original data cannot generate a trade that can be fully simulated with its own 'next bar'
    sim_data_end_index = len(data) - 1 # Stop one bar before the end to allow for next bar data access

    current_equity = INITIAL_BALANCE
    peak_equity = INITIAL_BALANCE
    max_drawdown_pct = 0.0
    trades_count = 0

    active_trade = None

    for i in range(sim_data_end_index):
        current_bar = data.iloc[i] # Bar 'i' - signal generation bar
        trade_exec_bar = data.iloc[i+1] # Bar 'i+1' - potential trade execution and monitoring bar

        # --- 1. Potentially Close Active Trade ---
        if active_trade:
            trade_closed_this_bar = False
            pnl = 0.0

            # Active trade was opened at trade_exec_bar['entry_price_sim'] (which was open of bar i+1)
            # Now we are on bar i+1 (current_bar for loop is i, trade_exec_bar is i+1)
            # We need to check H/L of the bar the trade is currently in.
            # If trade opened at open of bar k, we check H/L of bar k.
            # active_trade['entry_bar_index'] is the index of the *signal* bar.
            # Trade opened on open of signal_bar_index + 1. We check H/L of bar signal_bar_index + 1.

            # The loop is on `i` for signal generation. Trade is on `i+1`.
            # So, `trade_exec_bar` is the bar where SL/TP is checked.
            bar_high_for_sl_tp_check = trade_exec_bar['high'] # High of bar i+1
            bar_low_for_sl_tp_check = trade_exec_bar['low']   # Low of bar i+1

            if pd.isna(bar_high_for_sl_tp_check) or pd.isna(bar_low_for_sl_tp_check):
                # Cannot evaluate SL/TP if H/L data is missing for the execution bar
                # This might happen if trade_exec_bar is the very last row after shifting, which sim_data_end_index should prevent
                active_trade = None # Close trade due to bad data
                continue

            if active_trade['type'] == 'buy':
                # Check SL first (more conservative)
                if bar_low_for_sl_tp_check <= active_trade['sl']:
                    pnl = -active_trade['r_amount']
                    trade_closed_this_bar = True
                elif bar_high_for_sl_tp_check >= active_trade['tp']:
                    pnl = active_trade['r_amount'] * (TP_ATR_MULTIPLIER / SL_ATR_MULTIPLIER)
                    trade_closed_this_bar = True
            elif active_trade['type'] == 'sell':
                # Check SL first
                if bar_high_for_sl_tp_check >= active_trade['sl']:
                    pnl = -active_trade['r_amount']
                    trade_closed_this_bar = True
                elif bar_low_for_sl_tp_check <= active_trade['tp']:
                    pnl = active_trade['r_amount'] * (TP_ATR_MULTIPLIER / SL_ATR_MULTIPLIER)
                    trade_closed_this_bar = True

            if trade_closed_this_bar:
                current_equity += pnl
                peak_equity = max(peak_equity, current_equity)
                if peak_equity > 0:
                     drawdown = (peak_equity - current_equity) / peak_equity
                     max_drawdown_pct = max(max_drawdown_pct, drawdown)
                active_trade = None

        # --- 2. Generate New Signal & Potentially Open New Trade ---
        if not active_trade:
            if pd.isna(current_bar['EMA50']) or pd.isna(current_bar['EMA200']) or \
               pd.isna(current_bar['RSI14']) or pd.isna(current_bar['ATR14']) or \
               current_bar['ATR14'] <= 1e-7: # ATR must be positive and non-zero
                signal = 0
            else:
                try:
                    # Arguments for func come from the current_bar (signal generation bar)
                    result = func(current_bar['EMA50'], current_bar['EMA200'], current_bar['RSI14'], current_bar['ATR14'])
                    if result > 0.5:
                        signal = 1
                    elif result < -0.5:
                        signal = -1
                    else:
                        signal = 0
                except (OverflowError, ValueError, FloatingPointError, ZeroDivisionError) as e:
                    # print(f"Fitness Error: Runtime error in GP func: {e}")
                    signal = 0

            # Check if we have data for trade execution bar (bar i+1)
            if signal != 0 and not pd.isna(trade_exec_bar['open']):
                atr_val_for_sl_tp = current_bar['ATR14']
                if atr_val_for_sl_tp <= 1e-7: # Double check ATR
                    continue

                # SL/TP distances in price units
                sl_distance = atr_val_for_sl_tp * SL_ATR_MULTIPLIER
                tp_distance = atr_val_for_sl_tp * TP_ATR_MULTIPLIER

                r_amount_at_trade = current_equity * RISK_PERCENT_PER_TRADE
                if current_equity <= 0:
                    continue # Bankrupt, stop trading

                entry_price_base = trade_exec_bar['open'] # Entry at open of next bar (bar i+1)

                if signal == 1: # BUY
                    entry_price = entry_price_base + (SLIPPAGE_PIPS * PIP_SIZE)
                    sl_price = entry_price - sl_distance
                    tp_price = entry_price + tp_distance
                    active_trade = {'type': 'buy', 'entry': entry_price, 'sl': sl_price, 'tp': tp_price, 'r_amount': r_amount_at_trade}
                elif signal == -1: # SELL
                    entry_price = entry_price_base - (SLIPPAGE_PIPS * PIP_SIZE)
                    sl_price = entry_price + sl_distance
                    tp_price = entry_price - tp_distance
                    active_trade = {'type': 'sell', 'entry': entry_price, 'sl': sl_price, 'tp': tp_price, 'r_amount': r_amount_at_trade}

                if active_trade:
                    trades_count += 1

    final_return_pct = (current_equity - INITIAL_BALANCE) / INITIAL_BALANCE * 100.0

    fitness_score = final_return_pct

    if trades_count < 10:
        fitness_score -= 50
    # max_drawdown_pct is a fraction (e.g., 0.05 for 5%)
    if (max_drawdown_pct * 100.0) > 5.0:
        fitness_score -= 50
    if final_return_pct < 8.0:
        fitness_score -= 25

    if np.isnan(fitness_score) or np.isinf(fitness_score):
        fitness_score = -float('inf') # Default to very bad fitness if calculation error

    return fitness_score,
