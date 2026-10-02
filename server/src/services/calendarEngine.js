/**
 * Trading Calendar & Daily P&L Engine (100% Real-Time Grounded)
 * Dynamically aggregates executed paper trades from tradeHistory.
 * No fake pre-populated historical profits.
 */

const { getTradeHistory } = require('./strategyEngine');
const { getUSTradeHistory } = require('./usStrategyEngine');
const { NSE_HOLIDAYS_2026 } = require('./realMarketService');
const { US_HOLIDAYS_2026 } = require('./usMarketService');

function getMonthPLData(month = null, year = null, market = 'IN') {
  const isUS = (market || 'IN').toUpperCase() === 'US';
  const currency = isUS ? '$' : '₹';
  const locale = isUS ? 'en-US' : 'en-IN';
  const holidays = isUS ? (US_HOLIDAYS_2026 || []) : NSE_HOLIDAYS_2026;
  const now = new Date();
  const currentYear = year || now.getFullYear();
  const currentMonth = month || (now.getMonth() + 1);
  const currentDay = now.getDate();

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const calendarDays = [];

  // Group actual user closed paper trades by day of the month
  const tradeHistory = isUS ? (getUSTradeHistory() || []) : (getTradeHistory() || []);
  const dayTradesMap = {};

  tradeHistory.forEach(trade => {
    const tradeDate = new Date(trade.closedAt || trade.openedAt || now);
    if (tradeDate.getFullYear() === currentYear && (tradeDate.getMonth() + 1) === currentMonth) {
      const d = tradeDate.getDate();
      if (!dayTradesMap[d]) {
        dayTradesMap[d] = {
          trades: [],
          pl: 0
        };
      }
      dayTradesMap[d].trades.push(trade);
      dayTradesMap[d].pl += (trade.realizedPL || 0);
    }
  });

  let totalNetPL = 0;
  let greenDays = 0;
  let redDays = 0;
  let totalTrades = 0;
  let bestDayPL = 0;
  let bestDayDate = '';

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentYear, currentMonth - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = (currentYear === now.getFullYear() && currentMonth === (now.getMonth() + 1) && day === currentDay);
    const isFuture = (currentYear === now.getFullYear() && currentMonth === (now.getMonth() + 1) && day > currentDay)
                  || (currentYear > now.getFullYear())
                  || (currentYear === now.getFullYear() && currentMonth > (now.getMonth() + 1));

    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = dayTradesMap[day];
    const holiday = (holidays || []).find(h => h.date === dateStr);

    if (isWeekend) {
      calendarDays.push({
        date: dateStr,
        day,
        dayOfWeek,
        dayName: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
        type: 'WEEKEND',
        status: 'MARKET_CLOSED',
        isMarketOpen: false,
        marketClosedReason: 'Exchange Closed (Saturday / Sunday Weekend)',
        netPL: null,
        tradesCount: 0
      });
    } else if (holiday && (!dayData || dayData.trades.length === 0)) {
      calendarDays.push({
        date: dateStr,
        day,
        dayOfWeek,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        type: 'HOLIDAY',
        status: 'HOLIDAY_CLOSED',
        isMarketOpen: false,
        marketClosedReason: `Exchange Closed (${holiday.name})`,
        holidayName: holiday.name,
        netPL: null,
        tradesCount: 0
      });
    } else if (isFuture) {
      calendarDays.push({
        date: dateStr,
        day,
        dayOfWeek,
        type: 'UPCOMING',
        status: 'UPCOMING',
        netPL: 0,
        tradesCount: 0
      });
    } else if (dayData && dayData.trades.length > 0) {
      totalNetPL += dayData.pl;
      totalTrades += dayData.trades.length;

      if (dayData.pl > 0) {
        greenDays++;
        if (dayData.pl > bestDayPL) {
          bestDayPL = dayData.pl;
          bestDayDate = dateStr;
        }
      } else if (dayData.pl < 0) {
        redDays++;
      }

      const wins = dayData.trades.filter(t => (t.realizedPL || 0) > 0).length;
      const winRate = Math.round((wins / dayData.trades.length) * 100);
      const topTrade = [...dayData.trades].sort((a, b) => (b.realizedPL || 0) - (a.realizedPL || 0))[0];

      calendarDays.push({
        date: dateStr,
        day,
        dayOfWeek,
        type: 'TRADING_DAY',
        status: dayData.pl >= 0 ? 'PROFIT' : 'LOSS',
        netPL: dayData.pl,
        tradesCount: dayData.trades.length,
        winRate,
        topGainer: topTrade ? `${topTrade.symbol} (${topTrade.realizedPL >= 0 ? '+' : ''}₹${topTrade.realizedPL.toFixed(0)})` : 'Session Active',
        isToday,
        tradesList: dayData.trades.map(t => ({
          symbol: t.symbol,
          action: t.direction,
          pl: t.realizedPL,
          strategy: t.horizon
        }))
      });
    } else {
      // Trading day with 0 trades (genuine clean state)
      calendarDays.push({
        date: dateStr,
        day,
        dayOfWeek,
        type: 'TRADING_DAY',
        status: 'NO_TRADES',
        netPL: 0,
        tradesCount: 0,
        winRate: 0,
        topGainer: isToday ? 'Session Active (0 Trades Placed)' : 'No Trades Executed',
        isToday,
        tradesList: []
      });
    }
  }

  const tradingDaysSoFar = greenDays + redDays;
  const winRate = tradingDaysSoFar > 0 ? +((greenDays / tradingDaysSoFar) * 100).toFixed(1) : 0;
  const avgDailyPL = tradingDaysSoFar > 0 ? +(totalNetPL / tradingDaysSoFar).toFixed(2) : 0;
  const firstDayDate = new Date(currentYear, currentMonth - 1, 1);
  const firstDayOfWeekIndex = firstDayDate.getDay();

  return {
    monthName: new Date(currentYear, currentMonth - 1, 1).toLocaleString('en-US', { month: 'long' }),
    monthNumber: currentMonth,
    year: currentYear,
    firstDayOfWeekIndex,
    daysInMonth,
    summary: {
      totalNetPL: `${totalNetPL >= 0 ? '+' : ''}${currency}${totalNetPL.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      netPLRaw: totalNetPL,
      totalTrades,
      greenDays,
      redDays,
      winRate: `${winRate}%`,
      winStreak: greenDays > 0 ? `${greenDays} Day${greenDays > 1 ? 's' : ''}` : '0 Days',
      avgDailyPL: `${avgDailyPL >= 0 ? '+' : ''}${currency}${avgDailyPL.toLocaleString(locale, { minimumFractionDigits: 2 })}`,
      bestDay: bestDayPL > 0 ? `+${currency}${bestDayPL.toLocaleString(locale, { minimumFractionDigits: 2 })} (${bestDayDate})` : '—'
    },
    calendarDays
  };
}

module.exports = {
  getMonthPLData
};
