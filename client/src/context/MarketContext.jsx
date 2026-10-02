import React, { createContext, useContext, useState, useEffect } from 'react';

const MarketContext = createContext();

export function MarketProvider({ children }) {
  const [marketRegion, setMarketRegionState] = useState(() => {
    return localStorage.getItem('preferred_market') || 'IN';
  });

  const [marketSession, setMarketSession] = useState({
    isOpen: false,
    status: 'LOADING',
    tradingHours: '',
    nextSessionMessage: '',
    currency: marketRegion === 'US' ? '$' : '₹'
  });

  const setMarketRegion = (region) => {
    const cleanRegion = region.toUpperCase() === 'US' ? 'US' : 'IN';
    setMarketRegionState(cleanRegion);
    localStorage.setItem('preferred_market', cleanRegion);
  };

  const toggleMarket = () => {
    setMarketRegion(marketRegion === 'IN' ? 'US' : 'IN');
  };

  const currency = marketRegion === 'US' ? '$' : '₹';
  const currencyCode = marketRegion === 'US' ? 'USD' : 'INR';
  const marketName = marketRegion === 'US' ? 'Wall Street (NYSE / NASDAQ)' : 'Dalal Street (NSE / BSE)';
  const marketShortName = marketRegion === 'US' ? 'USA' : 'India';

  const formatCurrency = (amount, decimals = 2) => {
    const val = parseFloat(amount) || 0;
    const sign = val < 0 ? '-' : '';
    const absVal = Math.abs(val);

    if (marketRegion === 'US') {
      return `${sign}$${absVal.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    } else {
      return `${sign}₹${absVal.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
  };

  // Fetch session info whenever market region changes
  useEffect(() => {
    let isMounted = true;
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/market/real-quotes?market=${marketRegion}`);
        const data = await res.json();
        if (isMounted && data.success) {
          setMarketSession({
            isOpen: data.isMarketOpen,
            status: data.marketStatus,
            tradingHours: data.tradingHours,
            nextSessionMessage: data.nextSessionMessage,
            currency: data.currency || currency,
            timeString: data.nyTimeString || data.istTimeString
          });
        }
      } catch (e) {
        // Fallback
      }
    };

    fetchSession();
    const interval = setInterval(fetchSession, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [marketRegion]);

  return (
    <MarketContext.Provider value={{
      marketRegion,
      setMarketRegion,
      toggleMarket,
      currency,
      currencyCode,
      marketName,
      marketShortName,
      marketSession,
      formatCurrency
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
}
