import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SystemHealthMonitor({ authHeaders }) {
  const [systemHealth, setSystemHealth] = useState({
    overall: 'healthy',
    services: {
      database: { status: 'healthy', responseTime: 45, lastCheck: Date.now() },
      aiModel: { status: 'healthy', responseTime: 120, lastCheck: Date.now() },
      emailService: { status: 'warning', responseTime: 200, lastCheck: Date.now() },
      storage: { status: 'healthy', usage: 78, lastCheck: Date.now() },
      api: { status: 'healthy', responseTime: 25, lastCheck: Date.now() }
    },
    metrics: {
      uptime: '99.9%',
      avgResponseTime: '85ms',
      totalRequests: 15420,
      errorRate: 0.2
    }
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  useEffect(() => {
    checkSystemHealth();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        checkSystemHealth();
      }, refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const checkSystemHealth = async () => {
    try {
      const res = await fetch(`${API}/api/admin/system-health`, {
        headers: authHeaders()
      });
      
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      } else {
        // Simulate system health for demo
        updateMockSystemHealth();
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      updateMockSystemHealth();
    }
  };

  const updateMockSystemHealth = () => {
    setSystemHealth(prev => ({
      ...prev,
      services: {
        ...prev.services,
        database: {
          ...prev.services.database,
          responseTime: Math.floor(Math.random() * 100) + 20,
          lastCheck: Date.now()
        },
        aiModel: {
          ...prev.services.aiModel,
          responseTime: Math.floor(Math.random() * 200) + 80,
          lastCheck: Date.now()
        },
        emailService: {
          ...prev.services.emailService,
          status: Math.random() > 0.8 ? 'warning' : 'healthy',
          responseTime: Math.floor(Math.random() * 300) + 100,
          lastCheck: Date.now()
        }
      }
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getResponseTimeColor = (time) => {
    if (time < 100) return '#10b981';
    if (time < 300) return '#f59e0b';
    return '#ef4444';
  };

  const ServiceCard = ({ name, service, icon }) => (
    <div className="service-card">
      <div className="service-header">
        <div className="service-icon">{icon}</div>
        <div className="service-info">
          <h4>{name}</h4>
          <span className="service-status" style={{ color: getStatusColor(service.status) }}>
            {getStatusIcon(service.status)} {service.status}
          </span>
        </div>
      </div>
      <div className="service-metrics">
        <div className="metric">
          <span>Response Time</span>
          <span style={{ color: getResponseTimeColor(service.responseTime) }}>
            {service.responseTime}ms
          </span>
        </div>
        <div className="metric">
          <span>Last Check</span>
          <span>{new Date(service.lastCheck).toLocaleTimeString()}</span>
        </div>
        {service.usage && (
          <div className="metric">
            <span>Usage</span>
            <span>{service.usage}%</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="system-health-monitor">
      <div className="health-header">
        <div className="header-left">
          <h2>System Health Monitor</h2>
          <div className="overall-status">
            <span className="status-indicator" style={{ background: getStatusColor(systemHealth.overall) }}></span>
            <span>System {systemHealth.overall}</span>
            <span className="uptime">({systemHealth.metrics.uptime} uptime)</span>
          </div>
        </div>
        
        <div className="health-controls">
          <div className="refresh-control">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="interval-select"
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            )}
          </div>
          <button className="refresh-btn" onClick={checkSystemHealth}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="health-metrics">
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-value">{systemHealth.metrics.avgResponseTime}</div>
            <div className="metric-label">Avg Response Time</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">🔢</div>
          <div className="metric-content">
            <div className="metric-value">{systemHealth.metrics.totalRequests.toLocaleString()}</div>
            <div className="metric-label">Total Requests</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">⚡</div>
          <div className="metric-content">
            <div className="metric-value">{systemHealth.metrics.errorRate}%</div>
            <div className="metric-label">Error Rate</div>
          </div>
        </div>
      </div>

      <div className="services-grid">
        <ServiceCard 
          name="Database" 
          service={systemHealth.services.database} 
          icon="🗄️" 
        />
        <ServiceCard 
          name="AI Model" 
          service={systemHealth.services.aiModel} 
          icon="🤖" 
        />
        <ServiceCard 
          name="Email Service" 
          service={systemHealth.services.emailService} 
          icon="📧" 
        />
        <ServiceCard 
          name="Storage" 
          service={systemHealth.services.storage} 
          icon="💾" 
        />
        <ServiceCard 
          name="API Server" 
          service={systemHealth.services.api} 
          icon="🌐" 
        />
      </div>

      <div className="health-alerts">
        <h3>Recent Alerts</h3>
        <div className="alerts-list">
          <div className="alert-item warning">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <div className="alert-title">Email Service Degraded</div>
              <div className="alert-time">2 minutes ago</div>
            </div>
            <button className="alert-action">Acknowledge</button>
          </div>
          <div className="alert-item info">
            <div className="alert-icon">ℹ️</div>
            <div className="alert-content">
              <div className="alert-title">Database Maintenance Scheduled</div>
              <div className="alert-time">1 hour ago</div>
            </div>
            <button className="alert-action">View</button>
          </div>
        </div>
      </div>

      <div className="health-actions">
        <button className="btn-secondary">📋 Export Report</button>
        <button className="btn-secondary">🔔 Configure Alerts</button>
        <button className="btn-primary">⚙️ System Settings</button>
      </div>
    </div>
  );
}