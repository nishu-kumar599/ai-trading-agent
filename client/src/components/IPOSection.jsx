import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  Layers, 
  DollarSign, 
  CheckCircle2, 
  ChevronRight, 
  Search, 
  Zap, 
  Flame, 
  ArrowUpRight, 
  Award, 
  BarChart2, 
  X, 
  RefreshCw,
  Info,
  Calendar,
  Building2
} from 'lucide-react';

export const IPOSection = ({ onExecutePaperTrade }) => {
  const [ipos, setIpos] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('OPEN'); // OPEN, UPCOMING, LISTED, MY_BIDS
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // ALL, MAINBOARD, SME
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [myBids, setMyBids] = useState([]);

  // Modals state
  const [selectedIpoForBid, setSelectedIpoForBid] = useState(null);
  const [selectedIpoForAnalysis, setSelectedIpoForAnalysis] = useState(null);
  const [bidLots, setBidLots] = useState(1);
  const [upiId, setUpiId] = useState('trader@okhdfcbank');
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    fetchIpos();
    fetchMyBids();
  }, [statusFilter, categoryFilter]);

  const fetchIpos = async () => {
    try {
      setLoading(true);
      const url = `/api/ipo/list?status=${statusFilter === 'MY_BIDS' ? 'ALL' : statusFilter}&category=${categoryFilter}`;
      const res = await fetch(url);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        setIpos(data.ipos || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to load IPO data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBids = async () => {
    try {
      const res = await fetch('/api/ipo/my-bids');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        setMyBids(data.bids || []);
      }
    } catch (err) {
      console.error('Failed to load user bids:', err);
    }
  };

  const handleOpenBidModal = (ipo) => {
    setSelectedIpoForBid(ipo);
    setBidLots(1);
    setBidSubmitting(false);
  };

  const handleSubmitPaperBid = async (e) => {
    e.preventDefault();
    if (!selectedIpoForBid) return;
    try {
      setBidSubmitting(true);
      const res = await fetch('/api/ipo/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipoId: selectedIpoForBid.id,
          lots: bidLots,
          category: 'RETAIL',
          upiId
        })
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        setActionMessage({
          type: 'success',
          text: data.message
        });
        setSelectedIpoForBid(null);
        fetchMyBids();
        fetchIpos();
      } else {
        setActionMessage({
          type: 'error',
          text: data?.error || 'Failed to submit bid'
        });
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: 'Error submitting virtual IPO bid'
      });
    } finally {
      setBidSubmitting(false);
    }
  };

  const handleSimulateListing = async (bidId) => {
    try {
      const res = await fetch(`/api/ipo/bid/${bidId}/simulate-listing`, {
        method: 'POST'
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        setActionMessage({
          type: 'success',
          text: data.message
        });
        fetchMyBids();
        fetchIpos();
      } else {
        setActionMessage({
          type: 'error',
          text: data?.error || 'Failed to simulate listing day'
        });
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: 'Error simulating listing outcome'
      });
    }
  };

  const filteredIpos = ipos.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || 
           item.symbol.toLowerCase().includes(q) || 
           item.sector.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Title & Performance Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(17, 22, 34, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '16px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--accent-emerald)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Rocket size={13} />
              PRIMARY MARKET INTELLIGENCE
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              NSE & BSE • Mainboard & SME
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', margin: '4px 0' }}>
            Indian Stock Market IPO Radar & Paper Bidding
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, maxWidth: '680px' }}>
            Track real-time Grey Market Premium (GMP), institutional subscription multiples, AI valuation scores, and simulate applying with paper funds before putting real capital at risk.
          </p>
        </div>

        {/* Global Quick Action Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            padding: '10px 16px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Highest Open GMP</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
              {stats?.highestGmpPct || '+54%'}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            padding: '10px 16px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Avg Listing Gain</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
              {stats?.avgListingGainPct || '+117.5%'}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            padding: '10px 16px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Virtual Bids Placed</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
              {myBids.length}
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div style={{
          background: actionMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${actionMessage.type === 'error' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.4)'}`,
          color: actionMessage.type === 'error' ? 'var(--danger)' : 'var(--accent-emerald)',
          padding: '12px 18px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.84rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '12px 18px'
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'OPEN', label: 'Open Now', count: stats?.activeCount },
            { id: 'UPCOMING', label: 'Upcoming', count: stats?.upcomingCount },
            { id: 'LISTED', label: 'Recently Listed', count: stats?.listedCount },
            { id: 'MY_BIDS', label: 'My Applications', count: myBids.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                background: statusFilter === tab.id ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                border: '1px solid',
                borderColor: statusFilter === tab.id ? 'rgba(16, 185, 129, 0.4)' : 'transparent',
                color: statusFilter === tab.id ? 'var(--accent-emerald)' : 'var(--text-muted)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: statusFilter === tab.id ? 700 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: statusFilter === tab.id ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.08)',
                  color: statusFilter === tab.id ? '#051610' : 'var(--text-dim)',
                  fontWeight: 800
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Category Filter and Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Mainboard vs SME */}
          {statusFilter !== 'MY_BIDS' && (
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '2px' }}>
              {['ALL', 'MAINBOARD', 'SME'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    background: categoryFilter === cat ? 'var(--accent-emerald)' : 'transparent',
                    color: categoryFilter === cat ? '#051610' : 'var(--text-muted)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat === 'ALL' ? 'All Segments' : cat}
                </button>
              ))}
            </div>
          )}

          {/* Search Box */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px' }} />
            <input
              type="text"
              placeholder="Search company or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '6px 12px 6px 30px',
                fontSize: '0.78rem',
                color: '#fff',
                outline: 'none',
                width: '190px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {statusFilter === 'MY_BIDS' ? (
        /* ================= MY VIRTUAL BIDS TAB ================= */
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          overflowX: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--accent-emerald)" />
              My Virtual IPO Applications & UPI Mandates
            </h3>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
              Simulates SEBI UPI ASBA blocking with zero real capital risk
            </span>
          </div>

          {myBids.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Rocket size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No active IPO applications yet.</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Switch to the "Open Now" tab and click "Paper Apply" on any IPO to simulate an application.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Bid ID / Date</th>
                  <th style={{ padding: '10px 14px' }}>Company</th>
                  <th style={{ padding: '10px 14px' }}>Lots / Shares</th>
                  <th style={{ padding: '10px 14px' }}>Capital Blocked</th>
                  <th style={{ padding: '10px 14px' }}>Allotment Odds</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Realized P&L</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myBids.map(bid => (
                  <tr key={bid.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.82rem' }}>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{bid.id}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{bid.appliedDate}</div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 800, color: '#fff' }}>{bid.companyName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>{bid.symbol} • {bid.category}</div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{bid.lots} Lot{bid.lots > 1 ? 's' : ''}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '6px' }}>({bid.shares} sh)</span>
                    </td>
                    <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                      ₹{bid.totalBlocked.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {bid.allotmentOdds}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: bid.allotmentStatus === 'ALLOTTED' 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : (bid.allotmentStatus === 'NOT_ALLOTTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.12)'),
                        color: bid.allotmentStatus === 'ALLOTTED' 
                          ? 'var(--accent-emerald)' 
                          : (bid.allotmentStatus === 'NOT_ALLOTTED' ? 'var(--danger)' : '#38bdf8'),
                        border: '1px solid currentColor'
                      }}>
                        {bid.allotmentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                      {bid.pnlRealized ? (
                        <span style={{ color: bid.realizedPL > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                          {bid.realizedPL > 0 ? `+₹${bid.realizedPL.toLocaleString()}` : '₹0 (Refunded)'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>Awaiting Listing</span>
                      )}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      {!bid.pnlRealized ? (
                        <button
                          onClick={() => handleSimulateListing(bid.id)}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#051610',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Zap size={12} />
                          Simulate Listing Day
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* ================= IPO CARDS GRID ================= */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(390px, 1fr))', gap: '20px' }}>
          {filteredIpos.map(ipo => {
            const isListed = ipo.status === 'LISTED';
            const isOpen = ipo.status === 'OPEN';
            const isUpcoming = ipo.status === 'UPCOMING';

            return (
              <div 
                key={ipo.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Header Row: Company & Badges */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: ipo.category === 'MAINBOARD' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                          color: ipo.category === 'MAINBOARD' ? '#38bdf8' : '#eab308',
                          border: '1px solid currentColor'
                        }}>
                          {ipo.category}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {ipo.exchange}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                        {ipo.name}
                      </h3>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {ipo.sector}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: isOpen 
                        ? 'rgba(16, 185, 129, 0.15)' 
                        : (isListed ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)'),
                      color: isOpen 
                        ? 'var(--accent-emerald)' 
                        : (isListed ? '#38bdf8' : 'var(--text-muted)'),
                      border: '1px solid currentColor',
                      whiteSpace: 'nowrap'
                    }}>
                      {ipo.badge || ipo.status}
                    </span>
                  </div>

                  {/* Dates & Timeline */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: 'var(--text-dim)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    margin: '12px 0'
                  }}>
                    <div>
                      <span>Opens: </span>
                      <strong style={{ color: '#fff' }}>{ipo.openDate}</strong>
                    </div>
                    <div>
                      <span>Closes: </span>
                      <strong style={{ color: '#fff' }}>{ipo.closeDate}</strong>
                    </div>
                    <div>
                      <span>Listing: </span>
                      <strong style={{ color: 'var(--accent-emerald)' }}>{ipo.listingDate}</strong>
                    </div>
                  </div>

                  {/* Pricing & Issue Metrics Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    padding: '12px',
                    borderRadius: '10px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Price Band</div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                        {isListed ? `₹${ipo.issuePrice}` : `₹${ipo.priceRange?.min} - ₹${ipo.priceRange?.max}`}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Lot Size / Min</div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                        {ipo.lotSize} sh (₹{ipo.minInvestment?.toLocaleString()})
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Issue Size</div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                        ₹{ipo.issueSize?.toLocaleString()} Cr
                      </div>
                    </div>
                  </div>

                  {/* Grey Market Premium (GMP) or Listing Performance Card */}
                  {isListed ? (
                    <div style={{
                      marginTop: '12px',
                      background: 'rgba(16, 185, 129, 0.06)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Day 1 Listing Gain</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                          +{ipo.listingGainPct}% (Listed at ₹{ipo.listingPrice})
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Current Price / ROI</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                          ₹{ipo.currentPrice} (+{ipo.totalGainPct}%)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: '12px',
                      background: 'rgba(56, 189, 248, 0.06)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Flame size={12} color="#38bdf8" />
                          <span>Estimated GMP Trend: {ipo.gmp?.trend}</span>
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                          +₹{ipo.gmp?.value} (+{ipo.gmp?.percentage}%)
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Exp Listing Price</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                          ₹{ipo.gmp?.expectedListingPrice}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subscription Multiples Bar */}
                  {ipo.subscription && ipo.subscription.overall > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <span>Subscription: <strong style={{ color: 'var(--accent-emerald)' }}>{ipo.subscription.overall}x Overall</strong></span>
                        <span>QIB: {ipo.subscription.qib}x • Retail: {ipo.subscription.retail}x</span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, ipo.subscription.overall * 5)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #38bdf8, #10b981)',
                          borderRadius: '3px'
                        }}></div>
                      </div>
                    </div>
                  )}

                  {/* AI Sentinel Verdict Banner */}
                  {ipo.aiRating && (
                    <div style={{
                      marginTop: '14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '10px 12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: ipo.aiRating.verdict.includes('STRONG') 
                            ? 'var(--accent-emerald)' 
                            : (ipo.aiRating.verdict.includes('AVOID') ? 'var(--danger)' : '#38bdf8')
                        }}>
                          ★ AI VERDICT: {ipo.aiRating.verdict}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                          Score: {ipo.aiRating.score}/100
                        </span>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        {ipo.aiRating.summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => setSelectedIpoForAnalysis(ipo)}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Info size={14} />
                    AI Deep Dive
                  </button>

                  {isOpen && (
                    <button
                      onClick={() => handleOpenBidModal(ipo)}
                      style={{
                        flex: 1.2,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#051610',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Zap size={14} />
                      Paper Apply (Bid)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL 1: PAPER BID SIMULATOR ================= */}
      {selectedIpoForBid && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedIpoForBid(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#051610'
              }}>
                <Rocket size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Apply for {selectedIpoForBid.name}
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)' }}>
                  Virtual UPI ASBA Application Simulator
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPaperBid}>
              {/* Lots Stepper */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                  Select Lots (1 Lot = {selectedIpoForBid.lotSize} Shares @ ₹{selectedIpoForBid.priceRange?.max})
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setBidLots(prev => Math.max(1, prev - 1))}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="14" // Max retail limit
                    value={bidLots}
                    onChange={(e) => setBidLots(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      flex: 1,
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      height: '38px',
                      textAlign: 'center',
                      color: '#fff',
                      fontSize: '1rem',
                      fontWeight: 700
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setBidLots(prev => prev + 1)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* UPI ID Simulator */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                  Simulated UPI ID Handle
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@okhdfcbank"
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.84rem'
                  }}
                />
              </div>

              {/* Total Calculation Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Total Shares:</span>
                  <strong style={{ color: '#fff' }}>{bidLots * selectedIpoForBid.lotSize} Shares</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Cut-off Bid Price:</span>
                  <strong style={{ color: '#fff' }}>₹{selectedIpoForBid.priceRange?.max}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Exp Allotment Odds:</span>
                  <strong style={{ color: 'var(--accent-emerald)' }}>
                    {selectedIpoForBid.subscription?.retail > 1 
                      ? `1 in ${Math.round(selectedIpoForBid.subscription.retail)} (~${Math.round((1 / selectedIpoForBid.subscription.retail) * 100)}%)` 
                      : 'High (~100%)'}
                  </strong>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>Total Virtual Capital Blocked:</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                    ₹{(bidLots * selectedIpoForBid.lotSize * selectedIpoForBid.priceRange?.max).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Zero Real Money Risk Tag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '18px' }}>
                <ShieldCheck size={16} color="var(--accent-emerald)" />
                <span>Paper Trading Sandbox active. Zero real bank debit will take place.</span>
              </div>

              <button
                type="submit"
                disabled={bidSubmitting}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#051610',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {bidSubmitting ? <RefreshCw size={16} className="spinner" /> : <Rocket size={16} />}
                <span>Submit Virtual UPI Mandate</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: AI DEEP DIVE & FINANCIALS ================= */}
      {selectedIpoForAnalysis && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedIpoForAnalysis(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'var(--accent-emerald)',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                AI SENTINEL RESEARCH & VALUATIONS
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: '8px 0 2px' }}>
                {selectedIpoForAnalysis.name}
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {selectedIpoForAnalysis.sector} • {selectedIpoForAnalysis.category}
              </div>
            </div>

            {/* AI Verdict Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(17, 22, 34, 0.95) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Final AI Recommendation</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                  {selectedIpoForAnalysis.aiRating?.verdict}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>AI Confidence Score</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                  {selectedIpoForAnalysis.aiRating?.score}<span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>/100</span>
                </div>
              </div>
            </div>

            {/* 3-Year Financials Table */}
            {selectedIpoForAnalysis.aiRating?.financials && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
                  Key Financial Health & Valuations
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '14px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Revenue 3Y CAGR</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                      {selectedIpoForAnalysis.aiRating.financials.revenue3YCAGR}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>EBITDA Margin</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                      {selectedIpoForAnalysis.aiRating.financials.ebitdaMargin}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>PAT Margin</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                      {selectedIpoForAnalysis.aiRating.financials.patMargin}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>P/E Multiple</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                      {selectedIpoForAnalysis.aiRating.financials.peRatio}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Industry P/E</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                      {selectedIpoForAnalysis.aiRating.financials.industryPE}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Return on Net Worth (RoNW)</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                      {selectedIpoForAnalysis.aiRating.financials.ronw}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Listed Peers Comparison */}
            {selectedIpoForAnalysis.aiRating?.peers && selectedIpoForAnalysis.aiRating.peers.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
                  Peer Valuation Comparison
                </h4>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  {selectedIpoForAnalysis.aiRating.peers.map((peer, idx) => (
                    <div key={idx} style={{
                      flex: 1,
                      minWidth: '140px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '8px 12px',
                      borderRadius: '6px'
                    }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{peer.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        P/E: <strong style={{ color: '#38bdf8' }}>{peer.pe}x</strong> • P/B: {peer.pb}x
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Risks (SWOT) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.04)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '14px'
              }}>
                <h5 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-emerald)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} /> Key Moats & Strengths
                </h5>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {selectedIpoForAnalysis.aiRating?.strengths?.map((st, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{st}</li>
                  ))}
                </ul>
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.04)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '14px'
              }}>
                <h5 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--danger)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> Key Investment Risks
                </h5>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {selectedIpoForAnalysis.aiRating?.risks?.map((rk, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{rk}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
