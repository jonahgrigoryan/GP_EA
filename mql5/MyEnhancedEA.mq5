//+------------------------------------------------------------------+
//|                                       MT5-IntradaySwingEA.mq5 |
//|                              FundingPips Evaluation Strategy |
//|                                                              |
//+------------------------------------------------------------------+
#property copyright "MT5 Intraday Swing EA"
#property link      ""
#property version   "1.00"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include "gp_rule.mqh"
#include "helpers.mqh"

//--- Input parameters
input double RiskPercent = 0.5;        // Risk per trade (%) - KEEP
input int    RSI_Period = 14;          // RSI Period - KEEP
input int    EMA_Fast = 50;            // Fast EMA Period - KEEP
input int    EMA_Slow = 200;           // Slow EMA Period - KEEP
input double SL_ATR_Multiplier = 1.5;  // Stop Loss ATR Multiplier - KEEP
input double TP_ATR_Multiplier = 3.5;  // Take Profit ATR Multiplier - KEEP (Good R:R)
input bool   UseEngulfingFilter = true; // Use Engulfing Pattern Filter - RESTORE TO TRUE (CRITICAL FOR LONGS & SHORTS)
input double MaxDailyDrawdown = 3.0;   // Maximum Daily Drawdown (%) - KEEP (Proven effective)
input int    MaxConcurrentTrades = 1;  // Maximum concurrent trades - KEEP
input bool   AllowNeutralTrend = true; // Allow trades in neutral H1 trend - KEEP
input double MinATRPips = 7.5;         // Minimum ATR in pips - RESTORE TO 7.5 (from Golden Long settings)
input bool   UseH4TrendFilter = true;  // Use H4 trend for additional confirmation - KEEP
input int    MaxTradesPerDay = 3;      // Maximum trades per day - RESTORE TO 3 (from Golden Long settings)

//--- Global variables
int emaFastH1Handle;
int emaSlowH1Handle;
int emaFastH4Handle;
int emaSlowH4Handle;
int emaFastM15Handle;
int rsiM15Handle;
int atrM15Handle;

// Daily drawdown tracking
double dailyStartingBalance = 0.0;
int currentDay = -1;

// Daily trade tracking
int dailyTradeCount = 0;
int lastTradeDay = -1;

// Trade management objects
CTrade trade;
CPositionInfo positionInfo;


//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   // Initialize indicators
   emaFastH1Handle = iMA(_Symbol, PERIOD_H1, EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   emaSlowH1Handle = iMA(_Symbol, PERIOD_H1, EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
   emaFastH4Handle = iMA(_Symbol, PERIOD_H4, EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   emaSlowH4Handle = iMA(_Symbol, PERIOD_H4, EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
   emaFastM15Handle = iMA(_Symbol, PERIOD_M15, EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   rsiM15Handle = iRSI(_Symbol, PERIOD_M15, RSI_Period, PRICE_CLOSE);
   atrM15Handle = iATR(_Symbol, PERIOD_M15, 14);

   // Check if indicators were created successfully
   if(emaFastH1Handle == INVALID_HANDLE || emaSlowH1Handle == INVALID_HANDLE ||
      emaFastH4Handle == INVALID_HANDLE || emaSlowH4Handle == INVALID_HANDLE ||
      emaFastM15Handle == INVALID_HANDLE || rsiM15Handle == INVALID_HANDLE ||
      atrM15Handle == INVALID_HANDLE)
   {
      Print("Error creating indicators");
      return INIT_FAILED;
   }

   Print("MT5 Intraday Swing EA initialized successfully");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                               |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   // Release indicator handles
   IndicatorRelease(emaFastH1Handle);
   IndicatorRelease(emaSlowH1Handle);
   IndicatorRelease(emaFastH4Handle);
   IndicatorRelease(emaSlowH4Handle);
   IndicatorRelease(emaFastM15Handle);
   IndicatorRelease(rsiM15Handle);
   IndicatorRelease(atrM15Handle);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // Test MODULE 5 - Trading Session Filter
   bool withinHours = IsWithinTradingHours();
   static bool lastWithinHours = true;
   static datetime lastHourCheck = 0;

   // Print session status every hour or when status changes
   if(withinHours != lastWithinHours || TimeCurrent() - lastHourCheck >= 3600)
   {
      MqlDateTime timeStruct;
      TimeToStruct(TimeCurrent(), timeStruct);
//      Print("Trading Session: ", withinHours ? "ACTIVE" : "CLOSED",
//            " | Server Time: ", IntegerToString(timeStruct.hour, 2, '0'), ":", IntegerToString(timeStruct.min, 2, '0'));
      lastWithinHours = withinHours;
      lastHourCheck = TimeCurrent();
   }

   // Only proceed with signal detection during trading hours
   if(!withinHours)
   {
      return;  // Exit early if outside trading hours
   }

   // Test MODULE 6 - Daily Drawdown Guard
   bool drawdownHit = IsDailyDrawdownLimitHit();
   static bool lastDrawdownHit = false;

   if(drawdownHit != lastDrawdownHit)
   {
      if(drawdownHit)
      {
         Print("TRADING HALTED: Daily drawdown limit exceeded (", MaxDailyDrawdown, "%)");
      }
      else
      {
         Print("TRADING RESUMED: Daily drawdown back within limits");
      }
      lastDrawdownHit = drawdownHit;
   }

   // Block trading if daily drawdown limit is hit
   if(drawdownHit)
   {
      return;  // Exit early if drawdown limit exceeded
   }

   // Check daily trade limit
   MqlDateTime timeCurrent;
   TimeToStruct(TimeCurrent(), timeCurrent);
   int todayDay = timeCurrent.day;

   // Reset daily trade counter for new day
   if(todayDay != lastTradeDay)
   {
      dailyTradeCount = 0;
      lastTradeDay = todayDay;
   }

   // Block trading if daily trade limit reached
   if(dailyTradeCount >= MaxTradesPerDay)
   {
      static datetime lastTradeLimitPrint = 0;
      if(TimeCurrent() - lastTradeLimitPrint >= 3600) // Print once per hour
      {
         Print("🚫 TRADING LIMIT: Maximum trades per day reached (", dailyTradeCount, "/", MaxTradesPerDay, ") - Quality over quantity");
         lastTradeLimitPrint = TimeCurrent();
      }
      return;  // Exit early if trade limit reached
   }

   // Check ATR filter - avoid low volatility periods
   if(!IsVolatilityAcceptable())
   {
      return;  // Skip if market is too quiet
   }

   // Test MODULE 1 - H1 Trend Filter
   string trend = GetTrendDirection();
   string h4Trend = UseH4TrendFilter ? GetH4TrendDirection() : trend;
   static string lastTrend = "";

   // Only print when trend changes to avoid spam
   if(trend != lastTrend)
   {
      //Print("H1 Trend Direction: ", trend);
      lastTrend = trend;
   }

   // Test MODULE 2 - M15 Entry Signals
   static int lastGPSignal = 0;
   int gpSignal = GenerateGPTradeSignal(1);

   if(gpSignal != 0 && gpSignal != lastGPSignal)
   {
      Print(gpSignal==1 ? "BUY signal from GP" : "SELL signal from GP");

      int currentPositions = CountOpenPositions();
      if(currentPositions >= MaxConcurrentTrades)
      {
         Print("GP signal ignored - Maximum concurrent trades reached (", currentPositions, ")");
      }
      else
      {
         double sl, tp;
         double entryPrice = gpSignal==1 ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
         GetSLTP(entryPrice, gpSignal==1, sl, tp);

         double slPips = gpSignal==1 ? (entryPrice - sl) / SymbolInfoDouble(_Symbol, SYMBOL_POINT) : (sl - entryPrice) / SymbolInfoDouble(_Symbol, SYMBOL_POINT);
         double lotSize = CalculateLotSize(slPips);

         trade.SetExpertMagicNumber(123456);
         trade.SetDeviationInPoints(10);

         if(gpSignal==1 ? trade.Buy(lotSize, _Symbol, entryPrice, sl, tp, "GP BUY") : trade.Sell(lotSize, _Symbol, entryPrice, sl, tp, "GP SELL"))
         {
            if(trade.ResultRetcode() == TRADE_RETCODE_DONE)
            {
               Print("✅ GP order executed! Ticket: ", trade.ResultOrder());
               dailyTradeCount++;
               Print("📊 Daily Trade Count: ", dailyTradeCount, "/", MaxTradesPerDay);
            }
            else
            {
               Print("❌ GP order failed! Error: ", trade.ResultRetcode(), " - ", trade.ResultRetcodeDescription());
            }
         }
      }
   }
   lastGPSignal = gpSignal;

   //Module 8
   CloseOnFriday();

   // Test MODULE 7 - Trailing Stop Management
   ManageTrailingStop();
}
