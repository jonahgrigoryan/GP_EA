#property copyright "Helper Functions for MT5 EA"
#property link      ""

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

// Forward declarations for global variables expected to be in the main EA
// These are handles and settings the EA itself will initialize/manage.
extern int atrM15Handle;
extern int emaFastH1Handle;
extern int emaSlowH1Handle;
extern int emaFastH4Handle;
extern int emaSlowH4Handle;

extern double RiskPercent; // Input in main EA
extern double SL_ATR_Multiplier; // Input in main EA
extern double TP_ATR_Multiplier; // Input in main EA
extern double MaxDailyDrawdown; // Input in main EA
extern double MinATRPips; // Input in main EA

// Global objects - these are typically instantiated in the main EA
extern CTrade trade;
extern CPositionInfo positionInfo;

// Daily drawdown tracking - these are modified by IsDailyDrawdownLimitHit
extern double dailyStartingBalance;
extern int currentDay;
extern int dailyTradeCount; // Used by CloseOnFriday and OnTick
extern int MaxTradesPerDay; // Input in main EA
extern int lastTradeDay;    // Used by OnTick logic, but CloseOnFriday also references dailyTradeCount

// For GetSLTP, it needs access to atrM15Handle (global in EA) and SL_ATR_Multiplier, TP_ATR_Multiplier (inputs in EA)
// For CalculateLotSize, it needs RiskPercent (input in EA)
// For IsVolatilityAcceptable, it needs atrM15Handle and MinATRPips
// For IsDailyDrawdownLimitHit, it needs MaxDailyDrawdown, dailyStartingBalance, currentDay
// For ManageTrailingStop, it needs positionInfo, trade
// For CloseOnFriday, it needs positionInfo, trade
// For CountOpenPositions, it needs positionInfo
// For GetTrendDirection, GetH4TrendDirection, they need emaFastH1Handle, emaSlowH1Handle etc.
// For IsBullish/BearishEngulfing, they take all params they need.

//+------------------------------------------------------------------+
//| MODULE 3 - ATR-Based SL/TP Calculation with Logs                |
//| Uses ATR(14) on M15: SL = 1.5x ATR, TP = 3.5x ATR               |
//+------------------------------------------------------------------+
void GetSLTP(double entryPrice, bool isBuy, double &sl, double &tp)
{
   double atr[1];

   // Get current ATR(14) value from M15 timeframe
   if(CopyBuffer(atrM15Handle, 0, 0, 1, atr) != 1)
   {
      Print("❌ [SLTP] Failed to retrieve ATR buffer");
      sl = 0;
      tp = 0;
      return;
   }

   double atrValue = atr[0];
   double slDistance = atrValue * SL_ATR_Multiplier;
   double tpDistance = atrValue * TP_ATR_Multiplier;
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);

   // Debug: Raw ATR and distances
   PrintFormat("📦 [SLTP] ATR: %.5f | SL_Dist: %.5f | TP_Dist: %.5f", atrValue, slDistance, tpDistance);

   // Calculate initial SL/TP
   if(isBuy)
   {
      sl = NormalizeDouble(entryPrice - slDistance, digits);
      tp = NormalizeDouble(entryPrice + tpDistance, digits);
   }
   else
   {
      sl = NormalizeDouble(entryPrice + slDistance, digits);
      tp = NormalizeDouble(entryPrice - tpDistance, digits);
   }

   // Debug: Before min distance adjustment
   PrintFormat("📍 [SLTP] Raw SL: %.5f | Raw TP: %.5f | Entry: %.5f", sl, tp, entryPrice);

   // Enforce broker minimum distance
   double minStopLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   bool slAdjusted = false;
   bool tpAdjusted = false;

   if(isBuy)
   {
      if(entryPrice - sl < minStopLevel)
      {
         sl = NormalizeDouble(entryPrice - minStopLevel, digits);
         slAdjusted = true;
      }
      if(tp - entryPrice < minStopLevel)
      {
         tp = NormalizeDouble(entryPrice + minStopLevel, digits);
         tpAdjusted = true;
      }
   }
   else
   {
      if(sl - entryPrice < minStopLevel)
      {
         sl = NormalizeDouble(entryPrice + minStopLevel, digits);
         slAdjusted = true;
      }
      if(entryPrice - tp < minStopLevel)
      {
         tp = NormalizeDouble(entryPrice - minStopLevel, digits);
         tpAdjusted = true;
      }
   }

   // Debug: Final values after adjustment
   PrintFormat("✅ [SLTP] Final SL: %.5f (%s) | TP: %.5f (%s) | MinStop: %.5f",
               sl, slAdjusted ? "adjusted" : "ok",
               tp, tpAdjusted ? "adjusted" : "ok",
               minStopLevel);
}

//+------------------------------------------------------------------+
//| MODULE 4 - Risk-Based Position Sizing (IMPROVED)                |
//| Calculate lot size with better margin management                 |
//+------------------------------------------------------------------+
double CalculateLotSize(double slPips)
{
   // Account information
   double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmount = accountBalance * (RiskPercent / 100.0);
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);

   // Symbol information
   double contractSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);
   double tickSize     = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickValue    = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double point        = SymbolInfoDouble(_Symbol, SYMBOL_POINT);

   // Enhanced margin calculation
   double marginRate = SymbolInfoDouble(_Symbol, SYMBOL_MARGIN_INITIAL);
   double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   // Determine pip value
   double pipValue;
   if(contractSize == 100000.0)  // Standard Forex pair
   {
      pipValue = (tickSize / point) * tickValue;
   }
   else
   {
      pipValue = tickValue * (tickSize / point);
   }

   // Calculate monetary risk per pip
   double riskPerPip = slPips * pipValue;

   // Avoid division by zero or negative pip value
   if(riskPerPip <= 0)
   {
      Print("❌ [LOT] Invalid pip calculation. Using minimum lot size.");
      return SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   }

   // Calculate lot size based on risk
   double riskBasedLotSize = riskAmount / riskPerPip;

   // Calculate maximum lot size based on available margin (use only 50% of free margin)
   double maxMarginLotSize = (freeMargin * 0.5) / (marginRate * currentPrice);

   // Use the smaller of the two
   double lotSize = MathMin(riskBasedLotSize, maxMarginLotSize);

   // Broker lot size constraints
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   // Normalize to broker step
   lotSize = MathFloor(lotSize / lotStep) * lotStep;

   // Ensure within min/max
   if(lotSize < minLot)
   {
      lotSize = minLot;
   }
   else if(lotSize > maxLot)
   {
      lotSize = maxLot;
   }

   // Final margin safety check
   double requiredMargin = lotSize * marginRate * currentPrice;
   if(requiredMargin > freeMargin * 0.8)  // Use max 80% of free margin
   {
      lotSize = (freeMargin * 0.8) / (marginRate * currentPrice);
      lotSize = MathFloor(lotSize / lotStep) * lotStep;

      if(lotSize < minLot)
      {
         Print("❌ [LOT] Insufficient margin for minimum lot size");
         return 0;  // Don't trade if can't meet minimum
      }

      Print("⚠️ [LOT] Lot size reduced due to margin constraints: ", lotSize);
   }

   // Debug output
   PrintFormat("💰 [LOT] Risk: $%.2f | RiskLot: %.2f | MarginLot: %.2f | Final: %.2f",
               riskAmount, riskBasedLotSize, maxMarginLotSize, lotSize);

   return lotSize;
}

//+------------------------------------------------------------------+
//| Check if volatility is acceptable for trading                   |
//+------------------------------------------------------------------+
bool IsVolatilityAcceptable()
{
   double atr[1];

   if(CopyBuffer(atrM15Handle, 0, 0, 1, atr) != 1)
   {
      return false;
   }

   double atrPips = atr[0] / SymbolInfoDouble(_Symbol, SYMBOL_POINT);

   // Skip if ATR is too low (choppy market)
   if(atrPips < MinATRPips)
   {
      static datetime lastVolPrint = 0;
      if(TimeCurrent() - lastVolPrint >= 3600) // Print once per hour
      {
         PrintFormat("⚠️ [VOL] Low volatility detected. ATR: %.1f pips (min: %.1f)", atrPips, MinATRPips);
         lastVolPrint = TimeCurrent();
      }
      return false;
   }

   return true;
}

//+------------------------------------------------------------------+
//| MODULE 5 - Trading Session Filter                                |
//| Allow trading only between 6:00–17:00 server time                |
//+------------------------------------------------------------------+
bool IsWithinTradingHours()
{
   MqlDateTime timeStruct;
   TimeToStruct(TimeCurrent(), timeStruct);

   int currentHour = timeStruct.hour;

   // Trading allowed between 06:00 and 17:00 (5:00 PM) server time
   // This covers major trading sessions: London and New York overlap
   if(currentHour >= 6 && currentHour < 17)
   {
      return true;
   }

   return false;
}

//+------------------------------------------------------------------+
//| MODULE 6 - Daily Drawdown Guard                                 |
//| Block trading if equity drawdown exceeds 4.5% of daily balance  |
//+------------------------------------------------------------------+
bool IsDailyDrawdownLimitHit()
{
   MqlDateTime timeStruct;
   TimeToStruct(TimeCurrent(), timeStruct);
   int today = timeStruct.day;

   // Check if it's a new trading day
   if(today != currentDay)
   {
       // New day - reset daily starting balance
       dailyStartingBalance = AccountInfoDouble(ACCOUNT_EQUITY);
       currentDay = today;

//       Print("New Trading Day: Daily starting balance = $", DoubleToString(dailyStartingBalance, 2));
   }

   // Get current equity
   double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);

   // Calculate drawdown percentage
   double drawdownAmount = dailyStartingBalance - currentEquity;
   double drawdownPercent = (drawdownAmount / dailyStartingBalance) * 100.0;

   // Debug output (only print every 10 minutes to avoid spam)
   static datetime lastDrawdownPrint = 0;
   if(TimeCurrent() - lastDrawdownPrint >= 600) // 10 minutes
   {
//       Print("Daily Drawdown Status: Starting=$", DoubleToString(dailyStartingBalance, 2),
//             " | Current=$", DoubleToString(currentEquity, 2),
//             " | Drawdown=", DoubleToString(drawdownPercent, 2), "%");
       lastDrawdownPrint = TimeCurrent();
   }

   // Check if drawdown limit is exceeded
   if(drawdownPercent > MaxDailyDrawdown)
   {
       return true;  // Drawdown limit hit
   }

   return false;  // Within acceptable drawdown limits
}

//+------------------------------------------------------------------+
//| MODULE 7 - Trailing Stop Logic                                  |
//| Move SL to breakeven at +1R, then trail by 0.5R increments     |
//+------------------------------------------------------------------+
void ManageTrailingStop()
{
   // Loop through all open positions for this symbol
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i))
         continue;

      // Only manage positions for current symbol
      if(positionInfo.Symbol() != _Symbol)
         continue;

      string positionSymbol = positionInfo.Symbol();
      ulong ticket = positionInfo.Ticket();
      ENUM_POSITION_TYPE posType = positionInfo.PositionType();
      double entryPrice = positionInfo.PriceOpen();
      double currentSL = positionInfo.StopLoss();
      double currentTP = positionInfo.TakeProfit();
      double currentPrice = (posType == POSITION_TYPE_BUY) ? SymbolInfoDouble(positionSymbol, SYMBOL_BID) : SymbolInfoDouble(positionSymbol, SYMBOL_ASK);

      // Calculate R (risk) value - distance from entry to original SL
      double riskDistance;
      if(posType == POSITION_TYPE_BUY)
      {
         riskDistance = entryPrice - currentSL;
      }
      else
      {
         riskDistance = currentSL - entryPrice;
      }

      // Skip if risk distance is invalid
      if(riskDistance <= 0)
         continue;

      // Calculate current profit in R multiples
      double currentProfitDistance;
      if(posType == POSITION_TYPE_BUY)
      {
         currentProfitDistance = currentPrice - entryPrice;
      }
      else
      {
         currentProfitDistance = entryPrice - currentPrice;
      }

      double currentRMultiple = currentProfitDistance / riskDistance;

      // Get symbol digits for price normalization
      int digits = (int)SymbolInfoInteger(positionSymbol, SYMBOL_DIGITS);
      double newSL = currentSL;
      bool shouldModify = false;

      if(currentRMultiple >= 1.0)  // At +1R or better
      {
         // Move SL to breakeven if not already there
         if(posType == POSITION_TYPE_BUY)
         {
            double breakEvenSL = NormalizeDouble(entryPrice, digits);
            if(currentSL < breakEvenSL)
            {
               newSL = breakEvenSL;
               shouldModify = true;
               Print("Moving BUY position #", ticket, " SL to breakeven at ", newSL);
            }
         }
         else  // SELL position
         {
            double breakEvenSL = NormalizeDouble(entryPrice, digits);
            if(currentSL > breakEvenSL)
            {
               newSL = breakEvenSL;
               shouldModify = true;
               Print("Moving SELL position #", ticket, " SL to breakeven at ", newSL);
            }
         }
      }

      if(currentRMultiple >= 1.5)  // At +1.5R or better - start trailing by 0.5R increments
      {
         double trailLevel = MathFloor(currentRMultiple / 0.5) * 0.5;  // Round down to nearest 0.5R
         double trailDistance = (trailLevel - 1.0) * riskDistance;     // Distance to trail from breakeven

         if(posType == POSITION_TYPE_BUY)
         {
            double trailSL = NormalizeDouble(entryPrice + trailDistance, digits);
            if(trailSL > currentSL)
            {
               newSL = trailSL;
               shouldModify = true;
               Print("Trailing BUY position #", ticket, " SL to ", newSL, " (", DoubleToString(trailLevel, 1), "R level)");
            }
         }
         else  // SELL position
         {
            double trailSL = NormalizeDouble(entryPrice - trailDistance, digits);
            if(trailSL < currentSL)
            {
               newSL = trailSL;
               shouldModify = true;
               Print("Trailing SELL position #", ticket, " SL to ", newSL, " (", DoubleToString(trailLevel, 1), "R level)");
            }
         }
      }

      // Execute the stop loss modification
      if(shouldModify)
      {
         if(!trade.PositionModify(ticket, newSL, currentTP))
         {
            Print("Error modifying position #", ticket, ": ", trade.ResultRetcodeDescription());
         }
         else
         {
            Print("Successfully modified position #", ticket, " - New SL: ", newSL);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| MODULE 8 - Friday Trade Exit                                    |
//| Close all trades at 15:00 server time on Friday                 |
//+------------------------------------------------------------------+
void CloseOnFriday()
{
   // Static variables declared at function level for proper scope
   static bool fridayCloseExecuted = false;
   static int lastFridayClose = -1;
   static bool flagReset = false;

   MqlDateTime timeStruct;
   TimeToStruct(TimeCurrent(), timeStruct);

   // Check if it's Friday (day 5) and 15:00 (hour 15)
   if(timeStruct.day_of_week == 5 && timeStruct.hour == 15)
   {
      // Only execute once per Friday at 15:00 (prevent multiple executions in same hour)
      if(!fridayCloseExecuted || timeStruct.day != lastFridayClose)
      {
//         Print("=== FRIDAY 15:00 - EXECUTING WEEKEND CLOSE PROCEDURE ===");

         int totalPositions = 0;
         int closedPositions = 0;
         int failedCloses = 0;

         // Loop through all positions for this symbol
         for(int i = PositionsTotal() - 1; i >= 0; i--)
         {
            if(!positionInfo.SelectByIndex(i))
               continue;

            // Only close positions for current symbol
            if(positionInfo.Symbol() != _Symbol)
               continue;

            totalPositions++;
            ulong ticket = positionInfo.Ticket();
            double volume = positionInfo.Volume();
            ENUM_POSITION_TYPE posType = positionInfo.PositionType();
            double entryPrice = positionInfo.PriceOpen();
            double currentPrice = positionInfo.PriceCurrent();
            double profit = positionInfo.Profit();

            string posTypeStr = (posType == POSITION_TYPE_BUY) ? "BUY" : "SELL";

            Print("Closing ", posTypeStr, " position #", ticket,
                  " | Volume: ", volume,
                  " | Entry: ", entryPrice,
                  " | Current: ", currentPrice,
                  " | P&L: $", DoubleToString(profit, 2));

            // Close the position
            if(trade.PositionClose(ticket))
            {
               closedPositions++;
               Print("Successfully closed position #", ticket);
            }
            else
            {
               failedCloses++;
               Print("ERROR: Failed to close position #", ticket, " - ", trade.ResultRetcodeDescription());
            }

            // Small delay to avoid overwhelming the server
            Sleep(100);
         }

         // Summary report
         if(totalPositions > 0)
         {
            Print("=== FRIDAY CLOSE SUMMARY ===");
            Print("Total positions found: ", totalPositions);
            Print("Successfully closed: ", closedPositions);
            Print("Failed to close: ", failedCloses);
            Print("Weekend hold protection: ACTIVE");
         }
         else
         {
//            Print("No open positions found - Weekend protection complete");
         }

         fridayCloseExecuted = true;
         lastFridayClose = timeStruct.day;

//         Print("=== WEEKEND CLOSE PROCEDURE COMPLETED ===");
      }
   }
   else
   {
      // Reset the flag when it's not Friday 15:00
      if(timeStruct.day_of_week != 5 || timeStruct.hour != 15)
      {
         if(!flagReset)
         {
            fridayCloseExecuted = false;
            flagReset = true;
         }
      }
      else
      {
         flagReset = false;
      }
   }
}

//+------------------------------------------------------------------+
//| Helper: Count open positions for this symbol                     |
//+------------------------------------------------------------------+
int CountOpenPositions()
{
   int count = 0;
   for(int i = 0; i < PositionsTotal(); i++)
   {
      if(positionInfo.SelectByIndex(i))
      {
         if(positionInfo.Symbol() == _Symbol && positionInfo.Magic() == 123456)
         {
            count++;
         }
      }
   }
   return count;
}

//+------------------------------------------------------------------+
//| MODULE 1 - H1 Trend Filter                                      |
//| Returns: "bullish", "bearish", or "neutral"                     |
//+------------------------------------------------------------------+
string GetTrendDirection()
{
   double emaFast[1];
   double emaSlow[1];
   double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   // Get EMA values from H1 timeframe
   if(CopyBuffer(emaFastH1Handle, 0, 0, 1, emaFast) != 1 ||
      CopyBuffer(emaSlowH1Handle, 0, 0, 1, emaSlow) != 1)
   {
      Print("Error getting EMA values");
      return "neutral";
   }

   // Check trend conditions
   if(currentPrice > emaFast[0] && currentPrice > emaSlow[0])
   {
      return "bullish";
   }
   else if(currentPrice < emaFast[0] && currentPrice < emaSlow[0])
   {
      return "bearish";
   }
   else
   {
      return "neutral";
   }
}

//+------------------------------------------------------------------+
//| Get H4 Trend Direction for stronger bias                        |
//+------------------------------------------------------------------+
string GetH4TrendDirection()
{
   double emaFast[1];
   double emaSlow[1];
   double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   // Get EMA values from H4 timeframe
   if(CopyBuffer(emaFastH4Handle, 0, 0, 1, emaFast) != 1 ||
      CopyBuffer(emaSlowH4Handle, 0, 0, 1, emaSlow) != 1)
   {
      return "neutral";
   }

   // Check trend conditions
   if(currentPrice > emaFast[0] && currentPrice > emaSlow[0])
   {
      return "bullish";
   }
   else if(currentPrice < emaFast[0] && currentPrice < emaSlow[0])
   {
      return "bearish";
   }
   else
   {
      return "neutral";
   }
}

//+------------------------------------------------------------------+
//| Helper: Check for Bullish Engulfing Pattern                     |
//+------------------------------------------------------------------+
bool IsBullishEngulfing(double &open[], double &high[], double &low[], double &close[])
{
   // Previous candle: bearish (red)
   bool prevBearish = close[1] < open[1];

   // Current candle: bullish (green) and engulfs previous
   bool currBullish = close[0] > open[0];
   bool engulfs = (open[0] < close[1]) && (close[0] > open[1]);

   return prevBearish && currBullish && engulfs;
}

//+------------------------------------------------------------------+
//| Helper: Check for Bearish Engulfing Pattern                     |
//+------------------------------------------------------------------+
bool IsBearishEngulfing(double &open[], double &high[], double &low[], double &close[])
{
   // Previous candle: bullish (green)
   bool prevBullish = close[1] > open[1];

   // Current candle: bearish (red) and engulfs previous
   bool currBearish = close[0] < open[0];
   bool engulfs = (open[0] > close[1]) && (close[0] < open[1]);

   return prevBullish && currBearish && engulfs;
}

bool HasOpenPosition()
{
   CPositionInfo info;
   for(int i=0;i<PositionsTotal();i++)
      if(info.SelectByIndex(i) && info.Symbol()==_Symbol && info.Magic()==123456)
         return true;
   return false;
}
