import React, { useState, useEffect } from 'react';
import { 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  ShieldCheck, 
  Play, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sliders
} from 'lucide-react';

export const NewsSentimentTrader = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customSymbol, setCustomSymbol] = useState('RELIANCE.NS');
  const [analyzingText, setAnalyzingText] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [tradeHorizon, setTradeHorizon] = useState('INTRADAY');
  const [tradeNotice, setTradeNotice] = useState('');
  const [executingTradeId, setExecutingTradeId] = useState(null);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sentiment/news');
      const data = await res.json();
      if (data.success) {
        setNewsList(data.news || []);
      }
    } catch (err) {
      console.error('Failed to fetch news feed:', err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Analyze custom text entered by user
  const handleAnalyzeCustomText = async (e) => {
    if (e) e.preventDefault();
    if (!customText.trim()) return;

    setAnalyzingText(true);
    setAnalysisResult(null);
    setTradeNotice('');

    try {
      const res = await fetch('/api/sentiment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: customText.trim(), symbol: customSymbol })
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.analysis);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzingText(false);
    }
  };

  // Publish analyzed custom news into feed
  const handlePublishAndTrade = async () => {
    if (!customText.trim()) return;

    try {
      const res = await fetch('/api/sentiment/publish-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: customText.trim(),
          source: 'User Analyst Feed',
          symbol: customSymbol
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchNews();
        setCustomText('');
        setAnalysisResult(null);
        // Automatically trigger trade on the newly published news item
        handleExecuteNewsTrade(data.newsItem.id);
      }
    } catch (err) {
      console.error('Publish news error:', err);
    }
  };

  // Execute trade based on news item
  const handleExecuteNewsTrade = async (newsId) => {
    setExecutingTradeId(newsId);
    setTradeNotice('');

    try {
      const res = await fetch('/api/sentiment/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsId, horizon: tradeHorizon, quantity: 50 })
      });
      const data = await res.json();

      if (data.success) {
        setTradeNotice(data.message);
        setTimeout(() => setTradeNotice(''), 7000);
      } else {
        alert(data.message || 'Trade execution failed.');
      }
    } catch (err) {
      console.error('News trade error:', err);
    } finally {
      setExecutingTradeId(null);
    }
  };

  const sampleHeadlines = [
    {
      label: '🟢 Positive: Reliance AI & 5G Deal',
      text: 'Reliance Jio secures mega deal with tech consortium and reports 24% revenue surge in 5G services.',
      symbol: 'RELIANCE.NS'
    },
    {
      label: '🔴 Negative: Bank Margin Crisis',
      text: 'HDFC Bank shares plunge following unexpected net loss and sharp margin compression warnings.',
      symbol: 'HDFCBANK.NS'
    },
    {
      label: '🟢 Positive: TCS Cloud Deal Beat',
      text: 'TCS beats estimates with record profit jump and announces $2.4B cloud transformation partnership.',
      symbol: 'TCS.NS'
    },
    {
      label: '🔴 Negative: Automaker Sales Slump',
      text: 'Tata Motors sales drop 16% amid supply chain bottleneck and regulatory compliance delay.',
      symbol: 'TATAMOTORS.NS'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Notice Banner */}
      {tradeNotice && (
        <div className="alert-box alert-success" style={{ marginBottom: 0 }}>
          <Sparkles size={18} style={{ flexShrink: 0 }} />
          <div>{tradeNotice}</div>
        </div>
      )}

      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(15, 23, 42, 0.85) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Newspaper size={14} />
              AI Natural Language Sentiment Trader
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time Polarity Scoring (-100 to +100)
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            News-Driven Trading Engine
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Automatically triggers <strong>BUY / CALL</strong> orders on positive news catalyst beats, and <strong>SELL / PUT</strong> orders on negative downgrades with the built-in Profit-Lock Guard.
          </p>
        </div>

        {/* Execution Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trade Mode:</span>
          <select
            value={tradeHorizon}
            onChange={(e) => setTradeHorizon(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="INTRADAY">Intraday (Equity)</option>
            <option value="SHORT_TERM">Short-Term Swing</option>
            <option value="F_AND_O">Futures & Options (Calls/Puts)</option>
          </select>

          <button
            onClick={fetchNews}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Interactive AI News Test Lab & Simulator */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Interactive AI News Test Lab & Simulator
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Type any headline or click a quick scenario to test sentiment scoring
          </span>
        </div>

        {/* Quick Clickable Sample Headlines */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {sampleHeadlines.map((sample, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCustomText(sample.text);
                setCustomSymbol(sample.symbol);
                setAnalysisResult(null);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                color: '#cbd5e1',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleAnalyzeCustomText}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '280px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter financial headline or earnings release (e.g., 'Company reports 30% jump in profit and wins mega contract')..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                style={{ paddingLeft: '16px' }}
              />
            </div>

            <select
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '0 14px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                outline: 'none',
                minWidth: '150px'
              }}
            >
              <option value="RELIANCE.NS">RELIANCE.NS</option>
              <option value="TCS.NS">TCS.NS</option>
              <option value="HDFCBANK.NS">HDFCBANK.NS</option>
              <option value="INFY.NS">INFY.NS</option>
              <option value="ICICIBANK.NS">ICICIBANK.NS</option>
              <option value="TATAMOTORS.NS">TATAMOTORS.NS</option>
            </select>

            <button
              type="submit"
              className="btn-primary"
              disabled={analyzingText || !customText.trim()}
              style={{ width: 'auto', padding: '0 20px', minHeight: '44px' }}
            >
              {analyzingText ? (
                <>
                  <span className="spinner"></span>
                  Scoring...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Analyze Sentiment
                </>
              )}
            </button>
          </div>
        </form>

        {/* Live Analysis Output Card */}
        {analysisResult && (
          <div style={{
            marginTop: '18px',
            background: analysisResult.score >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            border: `1px solid ${analysisResult.score >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className={analysisResult.score >= 0 ? 'badge-signal-buy' : 'badge-signal-hold'} style={{
                  background: analysisResult.score < 0 ? 'rgba(244, 63, 94, 0.2)' : undefined,
                  color: analysisResult.score < 0 ? '#fda4af' : undefined
                }}>
                  {analysisResult.label} ({analysisResult.score > 0 ? `+${analysisResult.score}` : analysisResult.score})
                </span>
                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>{analysisResult.symbol}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence: {analysisResult.confidence}%</span>
              </div>
              <p style={{ color: 'var(--text-main)', fontSize: '0.88rem', margin: '4px 0' }}>
                "{analysisResult.text}"
              </p>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {analysisResult.rationale}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handlePublishAndTrade}
                style={{
                  background: analysisResult.score >= 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '10px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem'
                }}
              >
                <Play size={14} fill="#fff" />
                {analysisResult.score >= 0 ? 'Execute Positive Trade (BUY)' : 'Execute Negative Trade (SELL / PUT)'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Financial News Feed & Signals Table */}
      <div className="signals-table-card">
        <div className="table-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              Live Financial News Stream & AI Signals
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
              Real-time headlines classified by NLP sentiment score with direct one-click trade execution
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {newsList.map((item) => {
            const isPositive = item.sentimentScore >= 0;
            const isVeryHigh = Math.abs(item.sentimentScore) >= 75;

            return (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ flex: '1', minWidth: '320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span className="symbol-badge">{item.symbol}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{item.source} • {item.timestamp}</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: isPositive ? '#34d399' : '#fda4af',
                        border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
                      }}
                    >
                      {item.sentimentLabel} ({item.sentimentScore > 0 ? `+${item.sentimentScore}` : item.sentimentScore})
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', lineHeight: '1.4', marginBottom: '4px' }}>
                    {item.headline}
                  </h4>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {item.rationale}
                  </p>
                </div>

                {/* Signal & Trade Action Panel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Projected Move</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isPositive ? '#34d399' : '#fda4af', fontSize: '0.9rem' }}>
                      {item.targetProjection}
                    </div>
                  </div>

                  <button
                    onClick={() => handleExecuteNewsTrade(item.id)}
                    disabled={executingTradeId === item.id}
                    style={{
                      background: isPositive
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                      border: 'none',
                      color: isPositive ? '#051610' : '#fff',
                      fontWeight: 700,
                      padding: '9px 16px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isPositive ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(244, 63, 94, 0.3)'
                    }}
                  >
                    {executingTradeId === item.id ? (
                      <span className="spinner"></span>
                    ) : (
                      <>
                        <Play size={13} fill={isPositive ? '#051610' : '#fff'} />
                        {isPositive ? `Buy ${tradeHorizon === 'F_AND_O' ? 'Call (CE)' : 'Stock'}` : `Buy ${tradeHorizon === 'F_AND_O' ? 'Put (PE)' : 'Short'}`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
