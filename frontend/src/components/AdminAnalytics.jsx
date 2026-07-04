import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AdminAnalytics({ authHeaders }) {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalTickets: 0,
    resolvedTickets: 0,
    avgResponseTime: '0min',
    satisfactionScore: 0,
    topQuestions: [],
    dailyStats: [],
    recentActivity: []
  });
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/analytics?range=${timeRange}`, { 
        headers: authHeaders() 
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, title, value, change, color = 'primary' }) => (
    <div className="analytics-stat-card">
      <div className="stat-icon" style={{ background: `var(--${color})` }}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {change && (
          <div className={`stat-change ${change > 0 ? 'positive' : 'negative'}`}>
            {change > 0 ? '↗' : '↘'} {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  );

  const QuickInsight = ({ title, description, action }) => (
    <div className="quick-insight">
      <div className="insight-content">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <button className="insight-action">{action}</button>
    </div>
  );

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="admin-analytics">
      {/* Time Range Selector */}
      <div className="analytics-header">
        <h2>Analytics Dashboard</h2>
        <div className="time-range-selector">
          {[
            { value: '1d', label: '24h' },
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
            { value: '90d', label: '90 days' }
          ].map(range => (
            <button
              key={range.value}
              className={`range-btn ${timeRange === range.value ? 'active' : ''}`}
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="analytics-stats-grid">
        <StatCard
          icon="👥"
          title="Total Users"
          value={analytics.totalUsers.toLocaleString()}
          change={12}
          color="primary"
        />
        <StatCard
          icon="🎫"
          title="Support Tickets"
          value={analytics.totalTickets.toLocaleString()}
          change={-5}
          color="warning"
        />
        <StatCard
          icon="✅"
          title="Resolution Rate"
          value={`${Math.round((analytics.resolvedTickets / analytics.totalTickets) * 100)}%`}
          change={8}
          color="success"
        />
        <StatCard
          icon="⚡"
          title="Avg Response Time"
          value={analytics.avgResponseTime}
          change={-15}
          color="accent"
        />
        <StatCard
          icon="⭐"
          title="Satisfaction Score"
          value={`${analytics.satisfactionScore}/5`}
          change={3}
          color="secondary"
        />
        <StatCard
          icon="🤖"
          title="AI Resolution Rate"
          value="87%"
          change={22}
          color="primary"
        />
      </div>

      {/* Charts Section */}
      <div className="analytics-charts">
        <div className="chart-container">
          <h3>Daily Activity</h3>
          <div className="simple-chart">
            {analytics.dailyStats.map((day, i) => (
              <div key={i} className="chart-bar">
                <div 
                  className="bar-fill" 
                  style={{ height: `${(day.tickets / 50) * 100}%` }}
                  title={`${day.date}: ${day.tickets} tickets`}
                ></div>
                <span className="bar-label">{day.date.slice(-2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="top-questions">
          <h3>Most Asked Questions</h3>
          <div className="questions-list">
            {analytics.topQuestions.map((q, i) => (
              <div key={i} className="question-item">
                <div className="question-rank">#{i + 1}</div>
                <div className="question-content">
                  <div className="question-text">{q.question}</div>
                  <div className="question-count">{q.count} times asked</div>
                </div>
                <div className="question-trend">
                  {q.trend === 'up' ? '📈' : q.trend === 'down' ? '📉' : '➡️'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="quick-insights">
        <h3>Quick Insights</h3>
        <div className="insights-grid">
          <QuickInsight
            title="Peak Hours"
            description="Most tickets come in between 2-4 PM"
            action="Adjust Staffing"
          />
          <QuickInsight
            title="FAQ Gap"
            description="15 common questions aren't in your FAQ"
            action="Add FAQs"
          />
          <QuickInsight
            title="AI Training"
            description="AI confidence is low on billing questions"
            action="Improve Training"
          />
          <QuickInsight
            title="Response Time"
            description="Average response time increased by 23%"
            action="Review Process"
          />
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="activity-feed">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {analytics.recentActivity.map((activity, i) => (
            <div key={i} className="activity-item">
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-content">
                <div className="activity-text">{activity.text}</div>
                <div className="activity-time">{activity.time}</div>
              </div>
              <div className="activity-status">
                <span className={`status-dot ${activity.status}`}></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="analytics-actions">
        <button className="btn-secondary">
          📊 Export Report
        </button>
        <button className="btn-secondary">
          📧 Schedule Email
        </button>
        <button className="btn-primary">
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
}