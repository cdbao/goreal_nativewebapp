import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ErrorLog } from '../utils/errorLogger';
import './ErrorLogsViewer.css';

const ErrorLogsViewer: React.FC = () => {
  const [errorLogs, setErrorLogs] = useState<(ErrorLog & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    errorType: string;
    severity: string;
    timeRange: string;
  }>({
    errorType: 'all',
    severity: 'all',
    timeRange: '24h'
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchErrorLogs();
  }, [filter]);

  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      
      let q = query(
        collection(db, 'errorLogs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      // Apply filters
      if (filter.errorType !== 'all') {
        q = query(q, where('errorType', '==', filter.errorType));
      }
      
      if (filter.severity !== 'all') {
        q = query(q, where('severity', '==', filter.severity));
      }

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (ErrorLog & { id: string })[];

      // Filter by time range
      const now = new Date();
      const filteredLogs = logs.filter(log => {
        if (filter.timeRange === 'all') return true;
        
        let logTime: Date;
        if (log.timestamp instanceof Timestamp) {
          logTime = log.timestamp.toDate();
        } else if (log.timestamp?.toDate) {
          logTime = log.timestamp.toDate();
        } else {
          return true; // Include if we can't parse the timestamp
        }

        const timeDiff = now.getTime() - logTime.getTime();
        
        switch (filter.timeRange) {
          case '1h': return timeDiff <= 60 * 60 * 1000;
          case '24h': return timeDiff <= 24 * 60 * 60 * 1000;
          case '7d': return timeDiff <= 7 * 24 * 60 * 60 * 1000;
          case '30d': return timeDiff <= 30 * 24 * 60 * 60 * 1000;
          default: return true;
        }
      });

      setErrorLogs(filteredLogs);
    } catch (error) {
      console.error('Error fetching error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  };

  const getErrorTypeIcon = (errorType: string) => {
    switch (errorType) {
      case 'javascript': return '🐛';
      case 'api': return '🌐';
      case 'upload': return '📤';
      case 'auth': return '🔐';
      case 'firestore': return '🗄️';
      case 'general': return '❗';
      default: return '❓';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      let date: Date;
      if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
      } else if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else {
        return 'Invalid timestamp';
      }
      
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch (error) {
      return 'Error parsing time';
    }
  };

  if (loading) {
    return (
      <div className="error-logs-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải error logs...</p>
      </div>
    );
  }

  return (
    <div className="error-logs-viewer">
      <div className="error-logs-header">
        <h2>🐛 Error Logs & Bug Detection</h2>
        <div className="error-stats">
          <div className="stat-item critical">
            <span className="stat-value">
              {errorLogs.filter(log => log.severity === 'critical').length}
            </span>
            <span className="stat-label">Critical</span>
          </div>
          <div className="stat-item high">
            <span className="stat-value">
              {errorLogs.filter(log => log.severity === 'high').length}
            </span>
            <span className="stat-label">High</span>
          </div>
          <div className="stat-item total">
            <span className="stat-value">{errorLogs.length}</span>
            <span className="stat-label">Total Logs</span>
          </div>
        </div>
      </div>

      <div className="error-logs-filters">
        <select 
          value={filter.errorType} 
          onChange={(e) => setFilter({...filter, errorType: e.target.value})}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="javascript">JavaScript</option>
          <option value="api">API</option>
          <option value="upload">Upload</option>
          <option value="auth">Authentication</option>
          <option value="firestore">Firestore</option>
          <option value="general">General</option>
        </select>

        <select 
          value={filter.severity} 
          onChange={(e) => setFilter({...filter, severity: e.target.value})}
          className="filter-select"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select 
          value={filter.timeRange} 
          onChange={(e) => setFilter({...filter, timeRange: e.target.value})}
          className="filter-select"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>

        <button onClick={fetchErrorLogs} className="btn btn-primary refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="error-logs-list">
        {errorLogs.length === 0 ? (
          <div className="no-errors">
            <div className="no-errors-icon">✅</div>
            <h3>No errors found</h3>
            <p>No errors match the current filter criteria. The system is running smoothly!</p>
          </div>
        ) : (
          errorLogs.map((log) => (
            <div 
              key={log.id} 
              className={`error-log-item ${log.severity} ${expandedLog === log.id ? 'expanded' : ''}`}
            >
              <div 
                className="error-log-header" 
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="error-log-icons">
                  {getSeverityIcon(log.severity)}
                  {getErrorTypeIcon(log.errorType)}
                </div>
                
                <div className="error-log-info">
                  <div className="error-message">{log.message}</div>
                  <div className="error-meta">
                    <span className="error-type">{log.errorType}</span>
                    <span className="error-component">{log.component}</span>
                    <span className="error-time">{formatTimestamp(log.timestamp)}</span>
                  </div>
                </div>

                <div className="error-expand-icon">
                  {expandedLog === log.id ? '▼' : '▶'}
                </div>
              </div>

              {expandedLog === log.id && (
                <div className="error-log-details">
                  <div className="detail-section">
                    <h4>Stack Trace:</h4>
                    <pre className="stack-trace">{log.stack || 'No stack trace available'}</pre>
                  </div>
                  
                  <div className="detail-section">
                    <h4>Technical Details:</h4>
                    <div className="technical-details">
                      <div><strong>URL:</strong> {log.url}</div>
                      <div><strong>User Agent:</strong> {log.userAgent}</div>
                      <div><strong>User ID:</strong> {log.userId || 'Anonymous'}</div>
                    </div>
                  </div>

                  {log.additionalData && (
                    <div className="detail-section">
                      <h4>Additional Data:</h4>
                      <pre className="additional-data">
                        {JSON.stringify(log.additionalData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ErrorLogsViewer;