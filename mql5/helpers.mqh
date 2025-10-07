#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

void GetSLTP(double entryPrice, bool isBuy, double &sl, double &tp)
{
   double atr = iATR(_Symbol, PERIOD_M15, 14, 1);
   double slDistance = atr * 1.5;
   double tpDistance = atr * 3.5;
   if(isBuy)
   {
      sl = entryPrice - slDistance;
      tp = entryPrice + tpDistance;
   }
   else
   {
      sl = entryPrice + slDistance;
      tp = entryPrice - tpDistance;
   }
}

double CalculateLotSize(double slPips)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmount = balance * 0.01; // 1% risk
   double pipValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double lot = riskAmount / (slPips * pipValue);
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(lot < minLot) lot = minLot;
   return MathFloor(lot/step)*step;
}

bool HasOpenPosition()
{
   CPositionInfo info;
   for(int i=0;i<PositionsTotal();i++)
      if(info.SelectByIndex(i) && info.Symbol()==_Symbol && info.Magic()==123456)
         return true;
   return false;
}
