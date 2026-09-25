/**
 * AI Market Sentiment & News Analysis Engine
 * Features:
 * 1. Global Market Sentiment & Fear/Greed Index Calculation
 * 2. Natural Language Financial Sentiment Analysis for News Headlines
 * 3. Automated Buy/Sell Signal Generation based on Positive & Negative News
 * 4. FII/DII Institutional Flow & Put-Call Ratio (PCR) Tracking
 */

const { executeTrade } = require('./strategyEngine');

// Financial dictionary with polarity weights
const SENTIMENT_LEXICON = {
  // Strong positive (+2.5 to +3.5)
  'record profit': 3.5,
  'beats estimates': 3.2,
  'deal win': 3.0,
  'mega deal': 3.4,
  'acquisition': 2.5,
  'upgrade': 2.8,
  'upgraded': 2.8,
  'soars': 3.0,
  'surges': 3.0,
  'dividend hike': 2.6,
  'buyback': 2.9,
  'strong growth': 2.7,
  'revenue jump': 3.0,
  'breakthrough': 3.2,
  'bullish': 2.5,
  'outperform': 2.7,
  'high margin': 2.6,
  'expansion': 2.4,
  'order win': 2.8,
  'all-time high': 3.2,
  'rally': 2.4,

  // Moderate positive (+1.0 to +2.0)
  'growth': 1.6,
  'profit': 1.8,
  'gain': 1.4,
  'positive': 1.5,
  'approval': 2.0,
  'partnership': 1.8,
  'optimistic': 1.5,
  'rebound': 1.9,
  'recovery': 1.7,

  // Strong negative (-2.5 to -3.5)
  'plunges': -3.2,
  'slumps': -3.0,
  'miss estimates': -3.2,
  'downgrade': -2.9,
  'downgraded': -2.9,
  'fraud': -3.5,
  'scam': -3.5,
  'probe': -2.8,
  'investigation': -2.7,
  'lawsuit': -2.8,
  'debt default': -3.5,
  'net loss': -3.1,
  'margin compression': -2.8,
  'losses': -2.6,
  'penalty': -2.7,
  'crisis': -3.2,
  'sales drop': -2.8,
  'revenue decline': -2.9,
  'bearish': -2.5,
  'selloff': -2.8,

  // Moderate negative (-1.0 to -2.0)
  'drop': -1.5,
  'fall': -1.4,
  'decline': -1.6,
  'pressure': -1.7,
  'warning': -2.0,
  'delay': -1.6,
  'weak': -1.8,
  'cut': -1.5,
  'loss': -1.8,
  'headwind': -1.9
};

// Simulated Market Sentiment Metrics
let marketSentimentData = {
  fearAndGreedIndex: 68, // 0-100: 0=Extreme Fear, 50=Neutral, 100=Extreme Greed
  sentimentLabel: 'GREED / BULLISH',
  marketBreadth: {
    advances: 34,
    declines: 16,
    unchanged: 0,
    ratio: '2.13 (Strong Breadth)'
  },
  institutionalFlows: {
    fiiNet: '+₹2,140.50 Cr', // Foreign Institutional Investors
    diiNet: '+₹1,320.80 Cr', // Domestic Institutional Investors
    totalNet: '+₹3,461.30 Cr (Net Buyers)'
  },
  derivativesSentiment: {
    pcrIndex: 1.18, // Put-Call Ratio > 1.0 indicates bullish sentiment
    pcrInterpretation: 'Bullish Put Writing Support',
    indiaVIX: 13.45, // Volatility Index (< 15 = Low Volatility / Bullish)
    vixChange: '-3.2%'
  },
  lastUpdated: new Date().toISOString()
};

// Seeded live financial news feed
let newsFeed = [
  {
    id: 'news_001',
    symbol: 'RELIANCE.NS',
    headline: 'Reliance Jio posts 18% YoY jump in net profit, subscriber base crosses 480M with expanding 5G ARPU',
    source: 'Bloomberg Markets',
    timestamp: '10 mins ago',
    sentimentScore: 84, // -100 to +100
    sentimentLabel: 'VERY_BULLISH',
    tradeSignal: 'BUY',
    targetProjection: '+2.8%',
    stopLossProjection: '-0.8%',
    confidence: 91,
    impact: 'HIGH',
    rationale: 'Robust earnings beat + ARPU acceleration confirms top-line momentum across retail & telecom.'
  },
  {
    id: 'news_002',
    symbol: 'TCS.NS',
    headline: 'TCS secures $1.8B multi-year cloud transformation mega deal with European banking consortium',
    source: 'Reuters Financial',
    timestamp: '25 mins ago',
    sentimentScore: 78,
    sentimentLabel: 'BULLISH',
    tradeSignal: 'BUY',
    targetProjection: '+3.2%',
    stopLossProjection: '-1.0%',
    confidence: 88,
    impact: 'HIGH',
    rationale: 'Major multi-year deal win offsets IT discretionary spending slowdown concerns.'
  },
  {
    id: 'news_003',
    symbol: 'HDFCBANK.NS',
    headline: 'HDFC Bank faces temporary net interest margin compression amid elevated cost of funds post-merger',
    source: 'Financial Times',
    timestamp: '42 mins ago',
    sentimentScore: -64,
    sentimentLabel: 'BEARISH',
    tradeSignal: 'SELL',
    targetProjection: '+2.5% (Short / Put)',
    stopLossProjection: '-0.9%',
    confidence: 85,
    impact: 'HIGH',
    rationale: 'Margin compression warning likely to trigger short-term institutional selling pressure.'
  },
  {
    id: 'news_004',
    symbol: 'INFY.NS',
    headline: 'Infosys raises constant currency annual revenue growth guidance to 4.5%, deal pipeline surges to record $3.2B',
    source: 'CNBC TV18',
    timestamp: '1 hour ago',
    sentimentScore: 86,
    sentimentLabel: 'VERY_BULLISH',
    tradeSignal: 'BUY',
    targetProjection: '+3.5%',
    stopLossProjection: '-1.1%',
    confidence: 93,
    impact: 'HIGH',
    rationale: 'Guidance upgrade is an institutional green flag triggering automated quantitative buying.'
  },
  {
    id: 'news_005',
    symbol: 'ICICIBANK.NS',
    headline: 'ICICI Bank Q3 asset quality strengthens as Gross NPA drops to multi-year low of 2.15%',
    source: 'Mint',
    timestamp: '2 hours ago',
    sentimentScore: 72,
    sentimentLabel: 'BULLISH',
    tradeSignal: 'BUY',
    targetProjection: '+2.2%',
    stopLossProjection: '-0.7%',
    confidence: 86,
    impact: 'MEDIUM',
    rationale: 'Improving credit metrics and declining slippages enhance return on equity (RoE).'
  },
  {
    id: 'news_006',
    symbol: 'TATAMOTORS.NS',
    headline: 'Tata Motors commercial vehicle export volume contracts 14% amid Middle East logistics bottlenecks',
    source: 'Economic Times',
    timestamp: '3 hours ago',
    sentimentScore: -48,
    sentimentLabel: 'MODERATE_BEARISH',
    tradeSignal: 'SELL',
    targetProjection: '+1.8% (Short / Put)',
    stopLossProjection: '-0.8%',
    confidence: 79,
    impact: 'MEDIUM',
    rationale: 'Supply chain friction creates short-term downward drag on commercial vehicle margins.'
  }
];

// NLP Sentiment Analyzer
function analyzeNewsText(text, symbolHint = 'RELIANCE.NS') {
  if (!text || typeof text !== 'string') {
    return {
      score: 0,
      label: 'NEUTRAL',
      signal: 'HOLD',
      confidence: 50,
      rationale: 'No text provided for analysis.'
    };
  }

  const lower = text.toLowerCase();
  let totalScore = 0;
  let matches = [];

  for (const [phrase, weight] of Object.entries(SENTIMENT_LEXICON)) {
    if (lower.includes(phrase)) {
      totalScore += weight;
      matches.push({ phrase, weight });
    }
  }

  // Normalize score between -100 and +100
  let normalizedScore = Math.max(-100, Math.min(100, Math.round(totalScore * 28)));

  let label = 'NEUTRAL';
  let signal = 'HOLD';
  let confidence = 70;

  if (normalizedScore >= 60) {
    label = 'VERY_BULLISH';
    signal = 'BUY';
    confidence = Math.min(96, 75 + matches.length * 5);
  } else if (normalizedScore >= 25) {
    label = 'BULLISH';
    signal = 'BUY';
    confidence = Math.min(90, 70 + matches.length * 4);
  } else if (normalizedScore <= -60) {
    label = 'VERY_BEARISH';
    signal = 'SELL'; // or BUY_PUT in F&O
    confidence = Math.min(96, 75 + matches.length * 5);
  } else if (normalizedScore <= -25) {
    label = 'BEARISH';
    signal = 'SELL';
    confidence = Math.min(88, 68 + matches.length * 4);
  }

  // Detect symbol if in text
  let detectedSymbol = symbolHint;
  if (lower.includes('reliance') || lower.includes('jio')) detectedSymbol = 'RELIANCE.NS';
  else if (lower.includes('tcs') || lower.includes('tata consultancy')) detectedSymbol = 'TCS.NS';
  else if (lower.includes('hdfc')) detectedSymbol = 'HDFCBANK.NS';
  else if (lower.includes('infosys') || lower.includes('infy')) detectedSymbol = 'INFY.NS';
  else if (lower.includes('icici')) detectedSymbol = 'ICICIBANK.NS';
  else if (lower.includes('tata motors')) detectedSymbol = 'TATAMOTORS.NS';

  return {
    symbol: detectedSymbol,
    text,
    score: normalizedScore,
    label,
    signal,
    confidence,
    matchedKeywords: matches.map(m => m.phrase),
    rationale: matches.length > 0
      ? `Keywords detected: [${matches.map(m => m.phrase).join(', ')}] generating ${label} sentiment.`
      : 'No strong directional financial keywords matched; baseline neutral sentiment.'
  };
}

// Add a news headline and trigger analysis
function addNewsAndAnalyze(headline, source = 'Live Feed', symbol = 'RELIANCE.NS') {
  const analysis = analyzeNewsText(headline, symbol);

  const newNewsItem = {
    id: `news_${Date.now()}`,
    symbol: analysis.symbol,
    headline,
    source,
    timestamp: 'Just now',
    sentimentScore: analysis.score,
    sentimentLabel: analysis.label,
    tradeSignal: analysis.signal,
    targetProjection: analysis.signal === 'BUY' ? '+2.8%' : (analysis.signal === 'SELL' ? '+2.5% (Put/Short)' : '0%'),
    stopLossProjection: '-0.8%',
    confidence: analysis.confidence,
    impact: Math.abs(analysis.score) >= 60 ? 'HIGH' : 'MEDIUM',
    rationale: analysis.rationale
  };

  newsFeed.unshift(newNewsItem);
  return newNewsItem;
}

// Execute automated trade from news sentiment
function executeNewsTrade(newsId, horizon = 'INTRADAY', quantity = 50) {
  const newsItem = newsFeed.find(n => n.id === newsId);
  if (!newsItem) return null;

  if (newsItem.tradeSignal === 'HOLD') {
    throw new Error('Cannot execute trade on neutral sentiment news.');
  }

  // Stock base prices
  const priceMap = {
    'RELIANCE.NS': 2984.50,
    'TCS.NS': 4120.10,
    'HDFCBANK.NS': 1538.20,
    'INFY.NS': 1675.25,
    'ICICIBANK.NS': 1184.40,
    'TATAMOTORS.NS': 982.50
  };

  const basePrice = priceMap[newsItem.symbol] || 1500.0;
  const isPositive = newsItem.tradeSignal === 'BUY';

  let direction = isPositive ? 'BUY' : 'SELL';
  let optionDetails = null;

  // If executing in F&O horizon:
  if (horizon === 'F_AND_O') {
    if (isPositive) {
      direction = 'BUY_CALL';
      optionDetails = {
        recommendedStrike: `${Math.round(basePrice / 50) * 50} CE`,
        premium: +(basePrice * 0.024).toFixed(2)
      };
    } else {
      direction = 'BUY_PUT';
      optionDetails = {
        recommendedStrike: `${Math.round(basePrice / 50) * 50} PE`,
        premium: +(basePrice * 0.024).toFixed(2)
      };
    }
  }

  const trade = executeTrade({
    symbol: newsItem.symbol,
    horizon,
    direction,
    price: basePrice,
    quantity,
    optionDetails
  });

  return {
    trade,
    newsItem
  };
}

module.exports = {
  getMarketSentiment: () => marketSentimentData,
  getNewsFeed: () => newsFeed,
  analyzeNewsText,
  addNewsAndAnalyze,
  executeNewsTrade
};
