import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Submission, User, Quest } from '../types';
import { formatDate } from '../utils/dateUtils';
import ImprovedBackgroundManager from './ImprovedBackgroundManager';
import QuestManager from './QuestManager';
import ErrorBoundary from './ErrorBoundary';
import ErrorLogsViewer from './ErrorLogsViewer';
import { errorLogger } from '../utils/errorLogger';
import './AdminPanel.css';

interface SubmissionWithDetails extends Submission {
  userName?: string;
  questTitle?: string;
}

const AdminPanel: React.FC = () => {
  const { userData, logout } = useAuth();
  const [pendingSubmissions, setPendingSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'submissions' | 'backgrounds' | 'quests' | 'errors'>('submissions');

  useEffect(() => {
    console.log('AdminPanel useEffect:', {
      userData,
      role: userData?.role,
      isAdmin: userData?.role === 'admin'
    });
    
    if (userData?.role === 'admin') {
      fetchPendingSubmissions();
    }
  }, [userData]);

  const fetchPendingSubmissions = async () => {
    try {
      console.log('AdminPanel: Fetching pending submissions...');
      
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('status', '==', 'pending')
      );
      
      const submissionsSnapshot = await getDocs(submissionsQuery);
      
      console.log('AdminPanel: Query result:', {
        size: submissionsSnapshot.size,
        empty: submissionsSnapshot.empty,
        docs: submissionsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          data: doc.data() 
        }))
      });
      
      const submissions = submissionsSnapshot.docs.map(doc => ({
        submissionId: doc.id,
        ...doc.data()
      } as Submission));

      // Fetch user and quest details for each submission
      console.log('AdminPanel: Fetching details for submissions:', submissions.map(s => ({ 
        submissionId: s.submissionId, 
        userId: s.userId, 
        questId: s.questId 
      })));
      
      const submissionsWithDetails = await Promise.all(
        submissions.map(async (submission) => {
          try {
            console.log(`AdminPanel: Fetching details for submission ${submission.submissionId || submission.id}`);
            
            const [userDoc, questDoc] = await Promise.all([
              getDoc(doc(db, 'users', submission.userId)),
              getDoc(doc(db, 'quests', submission.questId))
            ]);

            console.log(`AdminPanel: Details fetched for ${submission.submissionId || submission.id}:`, {
              userExists: userDoc.exists(),
              questExists: questDoc.exists(),
              userDisplayName: userDoc.exists() ? (userDoc.data() as User).displayName : 'N/A',
              questTitle: questDoc.exists() ? (questDoc.data() as Quest).title : 'N/A'
            });

            return {
              ...submission,
              userName: userDoc.exists() ? (userDoc.data() as User).displayName : 'Unknown User',
              questTitle: questDoc.exists() ? (questDoc.data() as Quest).title : 'Unknown Quest'
            };
          } catch (error) {
            console.error(`AdminPanel: Error fetching details for submission ${submission.submissionId || submission.id}:`, error);
            return {
              ...submission,
              userName: 'Error Loading User',
              questTitle: 'Error Loading Quest'
            };
          }
        })
      );

      setPendingSubmissions(submissionsWithDetails);
    } catch (error) {
      console.error('Error fetching pending submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    if (processing) return;
    
    setProcessing(submissionId);
    
    try {
      // Call the Cloud Function for approval
      const response = await fetch(`${process.env.REACT_APP_CLOUD_FUNCTION_URL || 'https://us-central1-goreal-470006.cloudfunctions.net'}/approveSubmission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submissionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Submission approved successfully:', result);

      // Remove the approved submission from the list
      setPendingSubmissions(prev => 
        prev.filter(submission => (submission.submissionId || submission.id) !== submissionId)
      );
      
      alert(`✅ Báo cáo đã được phê duyệt! Player đã nhận +${result.auraRewarded || 0} AURA và ceremony sẽ được kích hoạt!`);
      
    } catch (error: any) {
      console.error('Error approving submission:', error);
      
      // Log the error
      errorLogger.logError({
        errorType: 'general',
        message: `Failed to approve submission: ${error.message}`,
        stack: error.stack,
        severity: 'high',
        component: 'AdminPanel',
        additionalData: {
          submissionId,
          action: 'approve'
        }
      }, userData?.userId);
      
      alert('Có lỗi xảy ra khi phê duyệt báo cáo. Vui lòng thử lại.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (submissionId: string) => {
    if (processing) return;
    
    setProcessing(submissionId);
    
    try {
      // Call the Cloud Function for rejection
      const response = await fetch(`${process.env.REACT_APP_CLOUD_FUNCTION_URL || 'https://us-central1-goreal-470006.cloudfunctions.net'}/rejectSubmission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submissionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Submission rejected successfully:', result);

      // Remove the rejected submission from the list
      setPendingSubmissions(prev => 
        prev.filter(submission => (submission.submissionId || submission.id) !== submissionId)
      );
      
      alert('❌ Báo cáo đã bị từ chối.');
      
    } catch (error: any) {
      console.error('Error rejecting submission:', error);
      
      // Log the error
      errorLogger.logError({
        errorType: 'general',
        message: `Failed to reject submission: ${error.message}`,
        stack: error.stack,
        severity: 'high',
        component: 'AdminPanel',
        additionalData: {
          submissionId,
          action: 'reject'
        }
      }, userData?.userId);
      
      alert('Có lỗi xảy ra khi từ chối báo cáo. Vui lòng thử lại.');
    } finally {
      setProcessing(null);
    }
  };

  // Check if user has admin access
  if (!userData || userData.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="access-denied">
          <h2>🚫 Truy cập bị từ chối</h2>
          <p>Bạn không có quyền truy cập vào trang này.</p>
          <button onClick={() => window.history.back()} className="back-button">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-title">
          <h1>👑 Hội Đồng Thẩm Định</h1>
          <p>Quản lý báo cáo rèn luyện - Titans' Guild</p>
        </div>
        
        <div className="admin-actions">
          <button onClick={fetchPendingSubmissions} className="refresh-button">
            🔄 Làm mới Submissions
          </button>
          <button onClick={() => window.location.reload()} className="refresh-button">
            🔄 Reload Trang
          </button>
          <button onClick={logout} className="logout-button">
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          📋 Báo cáo
        </button>
        <button 
          className={`tab-button ${activeTab === 'backgrounds' ? 'active' : ''}`}
          onClick={() => setActiveTab('backgrounds')}
        >
          🖼️ Hình nền
        </button>
        <button 
          className={`tab-button ${activeTab === 'quests' ? 'active' : ''}`}
          onClick={() => setActiveTab('quests')}
        >
          ⚔️ Quản Lý Quest
        </button>
        <button 
          className={`tab-button ${activeTab === 'errors' ? 'active' : ''}`}
          onClick={() => setActiveTab('errors')}
        >
          🐛 Error Logs
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'submissions' && (
          <>
            <div className="admin-stats">
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <span className="stat-number">{pendingSubmissions.length}</span>
                  <span className="stat-label">Báo cáo chờ duyệt</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">👤</div>
                <div className="stat-info">
                  <span className="stat-number">{userData.displayName}</span>
                  <span className="stat-label">Admin đang hoạt động</span>
                </div>
              </div>
            </div>

            <div className="submissions-section">
          <h3>🔍 Báo cáo chờ thẩm định</h3>
          
          {pendingSubmissions.length === 0 ? (
            <div className="no-submissions">
              <div className="empty-icon">✅</div>
              <h4>Tất cả báo cáo đã được xử lý!</h4>
              <p>Hiện tại không có báo cáo nào chờ duyệt.</p>
            </div>
          ) : (
            <div className="submissions-list">
              {pendingSubmissions.map((submission) => (
                <div key={submission.submissionId || submission.id} className="submission-card">
                  <div className="submission-header">
                    <div className="submission-info">
                      <h4>{submission.questTitle}</h4>
                      <div className="submission-meta">
                        <span className="user-name">👤 {submission.userName}</span>
                        <span className="submission-date">
                          📅 {formatDate(submission.submittedAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="submission-status">
                      <span className="status-badge pending">Chờ duyệt</span>
                    </div>
                  </div>

                  <div className="proof-section">
                    <label>🔍 Bằng chứng rèn luyện:</label>
                    <div className="proof-content">
                      {submission.proofType === 'text' ? (
                        <div className="proof-text">
                          <pre>{submission.proofData as string}</pre>
                        </div>
                      ) : submission.proofType === 'image' ? (
                        <img 
                          src={submission.proofData as string} 
                          alt="Proof" 
                          className="proof-image"
                          loading="lazy"
                        />
                      ) : submission.proofType === 'video' ? (
                        <video 
                          src={submission.proofData as string} 
                          controls 
                          className="proof-video"
                          preload="metadata"
                        >
                          Trình duyệt không hỗ trợ video
                        </video>
                      ) : submission.proofType === 'audio' ? (
                        <audio 
                          src={submission.proofData as string}
                          controls
                          className="proof-audio"
                        >
                          Trình duyệt không hỗ trợ audio
                        </audio>
                      ) : (
                        <div className="proof-unknown">
                          📋 Báo cáo đã được nộp
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="submission-actions">
                    <button
                      onClick={() => handleReject(submission.submissionId || submission.id || submission.id || '')}
                      disabled={processing === (submission.submissionId || submission.id || submission.id)}
                      className="reject-button"
                    >
                      {processing === (submission.submissionId || submission.id) ? (
                        <>
                          <span className="spinner"></span>
                          Đang xử lý...
                        </>
                      ) : (
                        '❌ Từ chối'
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleApprove(submission.submissionId || submission.id || '')}
                      disabled={processing === (submission.submissionId || submission.id)}
                      className="approve-button"
                    >
                      {processing === (submission.submissionId || submission.id) ? (
                        <>
                          <span className="spinner"></span>
                          Đang xử lý...
                        </>
                      ) : (
                        '✅ Phê duyệt'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          </>
        )}

        {activeTab === 'backgrounds' && (
          <ErrorBoundary>
            <ImprovedBackgroundManager />
          </ErrorBoundary>
        )}

        {activeTab === 'quests' && (
          <QuestManager />
        )}

        {activeTab === 'errors' && (
          <ErrorBoundary>
            <ErrorLogsViewer />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;