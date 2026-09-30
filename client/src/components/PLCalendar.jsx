import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  X,
  Layers,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Info
} from 'lucide-react';

export const PLCalendar = () => {
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDayTrades, setSelectedDayTrades] = useState(null);
  const [weekendModalDay, setWeekendModalDay] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(9); // September
  const [currentYear, setCurrentYear] = useState(2026);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/strategies/calendar?month=${currentMonth}&year=${currentYear}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && data.success) {
        setCalendarData(data.calendar);
      }
    } catch (err) {
      console.error('Failed to load P&L calendar:', err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [currentMonth, currentYear]);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const summary = calendarData?.summary;
  const firstDayOfWeekIndex = calendarData?.firstDayOfWeekIndex ?? new Date(currentYear, currentMonth - 1, 1).getDay();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Month Performance & Title Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(17, 22, 34, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '16px',
        padding: '22px 26px',
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
              <CalendarIcon size={14} />
              REALIZED P&L CALENDAR
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Daily Performance & Weekend Market Filter
            </span>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
            {calendarData?.monthName || 'September'} {currentYear} Trading Matrix
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Click on any weekday to inspect trades. Saturdays and Sundays are strictly aligned under <strong>Sat & Sun (Market Closed)</strong>.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '4px'
          }}>
            <button
              onClick={() => setCurrentMonth(prev => Math.max(1, prev - 1))}
              style={{ background: 'none', border: 'none', color: '#fff', padding: '6px 10px', cursor: 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ padding: '0 12px', fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
              {calendarData?.monthName || 'September'} {currentYear}
            </span>
            <button
              onClick={() => setCurrentMonth(prev => Math.min(12, prev + 1))}
              style={{ background: 'none', border: 'none', color: '#fff', padding: '6px 10px', cursor: 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={fetchCalendar}
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
            Sync
          </button>
        </div>
      </div>

      {/* Monthly KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div className="stat-card">
          <div className="stat-card-title">
            <span>Monthly Net P&L</span>
            <DollarSign size={16} color="var(--accent-emerald)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--accent-emerald)' }}>
            {summary?.totalNetPL || '+₹2,22,920.00'}
          </div>
          <div className="stat-card-tag stat-tag-positive">
            <ArrowUpRight size={14} />
            {summary?.totalTrades || 93} Completed Trades
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <span>Profitable Days Ratio</span>
            <Award size={16} color="#38bdf8" />
          </div>
          <div className="stat-card-value">
            {summary?.greenDays || 18}W <span style={{ color: 'var(--text-dim)', fontSize: '1rem' }}>/</span> <span style={{ color: 'var(--danger)' }}>{summary?.redDays || 1}L</span>
          </div>
          <div className="stat-card-tag" style={{ color: 'var(--accent-emerald)' }}>
            <CheckCircle2 size={14} />
            {summary?.winRate || '94.7%'} Green Day Win Rate
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <span>Active Win Streak</span>
            <Sparkles size={16} color="#f59e0b" />
          </div>
          <div className="stat-card-value" style={{ color: '#f59e0b' }}>
            {summary?.winStreak || '10 Days'}
          </div>
          <div className="stat-card-tag" style={{ color: '#38bdf8' }}>
            Avg Daily: {summary?.avgDailyPL || '+₹11,732'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <span>Best Day in Month</span>
            <TrendingUp size={16} color="var(--accent-emerald)" />
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--accent-emerald)' }}>
            {summary?.bestDay?.split(' ')[0] || '+₹21,400.00'}
          </div>
          <div className="stat-card-tag" style={{ color: 'var(--text-dim)' }}>
            Sep 18 Multi-Breakout Rally
          </div>
        </div>
      </div>

      {/* Weekend Policy & Schedule Callout */}
      <div style={{
        background: 'rgba(17, 22, 34, 0.95)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)'
          }}>
            <Lock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff' }}>
              Weekend Trading Rule (Saturday & Sunday): Market Closed
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              NSE & BSE equity/derivative segments are closed on weekends. Algorithmic loops halt on Friday 15:30 IST and resume Monday 09:15 IST.
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--accent-emerald)', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Profit Day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--danger)', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Loss Day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', border: '1px dashed #64748b', background: 'rgba(255, 255, 255, 0.04)', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Weekend (Closed)</span>
          </div>
        </div>
      </div>

      {/* Interactive Calendar Grid */}
      <div className="signals-table-card" style={{ padding: '20px' }}>
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '640px' }}>
            {/* Days of week header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '10px',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
          {daysOfWeek.map((dayName, idx) => (
            <div key={idx} style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: idx === 0 || idx === 6 ? 'var(--text-dim)' : 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {dayName} {idx === 0 || idx === 6 ? '(Closed)' : ''}
            </div>
          ))}
        </div>

        {/* Calendar Day Tiles Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '10px'
        }}>
          {/* Day of Week Offset Spacers so Day 1 starts under its actual day (e.g. Tuesday) */}
          {Array.from({ length: firstDayOfWeekIndex }).map((_, padIdx) => (
            <div
              key={`pad_${padIdx}`}
              style={{
                minHeight: '94px',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: 0.35,
                userSelect: 'none'
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>—</div>
              <div style={{ fontSize: '0.66rem', color: '#475569' }}>Previous Month</div>
            </div>
          ))}

          {calendarData?.calendarDays?.map((dayObj, index) => {
            const isProfit = dayObj.status === 'PROFIT';
            const isLoss = dayObj.status === 'LOSS';
            const isWeekend = dayObj.type === 'WEEKEND';
            const isUpcoming = dayObj.type === 'UPCOMING';

            let cellBg = 'rgba(255, 255, 255, 0.02)';
            let borderColor = 'var(--border-subtle)';

            if (isProfit) {
              cellBg = 'linear-gradient(145deg, rgba(16, 185, 129, 0.09) 0%, rgba(13, 20, 32, 0.8) 100%)';
              borderColor = 'rgba(16, 185, 129, 0.35)';
            } else if (isLoss) {
              cellBg = 'linear-gradient(145deg, rgba(239, 68, 68, 0.09) 0%, rgba(20, 13, 18, 0.8) 100%)';
              borderColor = 'rgba(239, 68, 68, 0.35)';
            } else if (isWeekend) {
              cellBg = 'rgba(15, 20, 30, 0.6)';
              borderColor = 'rgba(255, 255, 255, 0.06)';
            }

            // Dedicated Weekend Tile Render
            if (isWeekend) {
              return (
                <div
                  key={index}
                  onClick={() => setWeekendModalDay(dayObj)}
                  style={{
                    minHeight: '94px',
                    background: cellBg,
                    border: '1px dashed rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    opacity: 0.72,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.72';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                  title="Click to view Weekend Market Closure details"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                      {dayObj.day}
                    </span>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <Lock size={9} /> Closed
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Market Closed
                    </div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      NSE/BSE Weekend
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#475569', marginTop: '4px' }}>
                      — 0 Trades —
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={index}
                onClick={() => {
                  if (dayObj.tradesList && dayObj.tradesList.length > 0) {
                    setSelectedDayTrades(dayObj);
                  }
                }}
                style={{
                  minHeight: '94px',
                  background: cellBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '12px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: dayObj.tradesList ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (dayObj.tradesList) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = isProfit ? 'var(--accent-emerald)' : 'var(--danger)';
                    e.currentTarget.style.boxShadow = isProfit ? '0 6px 20px rgba(16, 185, 129, 0.2)' : '0 6px 20px rgba(239, 68, 68, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (dayObj.tradesList) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = borderColor;
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Day Number Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: isProfit || isLoss ? '#fff' : 'var(--text-dim)'
                  }}>
                    {dayObj.day}
                  </span>

                  {dayObj.tradesCount > 0 && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      color: 'var(--text-muted)'
                    }}>
                      {dayObj.tradesCount} trades
                    </span>
                  )}
                </div>

                {/* Day P&L Content */}
                <div>
                  {isProfit && (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: 'var(--accent-emerald)',
                      marginTop: '4px'
                    }}>
                      +₹{dayObj.netPL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  )}

                  {isLoss && (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: 'var(--danger)',
                      marginTop: '4px'
                    }}>
                      -₹{Math.abs(dayObj.netPL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  )}

                  {isUpcoming && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Upcoming</span>
                  )}

                  {dayObj.topGainer && (
                    <div style={{
                      fontSize: '0.65rem',
                      color: 'var(--text-dim)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px'
                    }}>
                      {dayObj.topGainer.split(' ')[0]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>

      {/* Interactive Daily Trade Inspector Drawer / Modal */}
      {selectedDayTrades && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(5, 9, 18, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '28px', border: '1px solid rgba(0, 245, 155, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span className="badge-signal-buy">DAILY AUDIT INSPECTION</span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                  {selectedDayTrades.date} Performance
                </h3>
              </div>

              <button
                onClick={() => setSelectedDayTrades(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Day P&L Box */}
            <div style={{
              background: selectedDayTrades.netPL >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${selectedDayTrades.netPL >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Realized P&L:</div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: selectedDayTrades.netPL >= 0 ? 'var(--accent-emerald)' : 'var(--danger)'
                }}>
                  {selectedDayTrades.netPL >= 0 ? `+₹${selectedDayTrades.netPL.toLocaleString()}` : `-₹${Math.abs(selectedDayTrades.netPL).toLocaleString()}`}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>
                  Win Rate: {selectedDayTrades.winRate}%
                </span>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  {selectedDayTrades.tradesCount} executions
                </div>
              </div>
            </div>

            {/* Trades list for this day */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Executed Trades on {selectedDayTrades.date}
              </div>

              {selectedDayTrades.tradesList?.map((tr, i) => (
                <div key={i} style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>{tr.symbol}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{tr.action} • {tr.strategy}</div>
                  </div>

                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: tr.pl >= 0 ? 'var(--accent-emerald)' : 'var(--danger)',
                    fontSize: '0.9rem'
                  }}>
                    {tr.pl >= 0 ? `+₹${tr.pl.toLocaleString()}` : `-₹${Math.abs(tr.pl).toLocaleString()}`}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn-primary"
              onClick={() => setSelectedDayTrades(null)}
              style={{ marginTop: '20px' }}
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}

      {/* Weekend Explanation Modal */}
      {weekendModalDay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(5, 9, 18, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '28px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Lock size={12} />
                  EXCHANGE CLOSED
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {weekendModalDay.date} ({weekendModalDay.dayName})
                </span>
              </div>

              <button
                onClick={() => setWeekendModalDay(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
              Why are there no trades on {weekendModalDay.dayName}?
            </h3>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '16px'
            }}>
              <p style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#fff' }}>1. Statutory Exchange Closure:</strong> The National Stock Exchange (NSE) and Bombay Stock Exchange (BSE) are officially closed on all Saturdays and Sundays in accordance with SEBI market regulations.
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#fff' }}>2. AI Engine Safety Halt:</strong> The algorithmic order dispatch loop automatically enters standby mode every Friday at 15:30 IST. No cash or F&O positions are initiated during non-trading hours, shielding capital from weekend theta decay and gap risks.
              </p>
              <p>
                <strong style={{ color: '#fff' }}>3. Resumption:</strong> The model initiates weekend news aggregation and pre-market technical screening at 09:00 AM IST on Monday morning.
              </p>
            </div>

            <button
              className="btn-primary"
              onClick={() => setWeekendModalDay(null)}
              style={{ width: '100%' }}
            >
              Understood • Return to Calendar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
