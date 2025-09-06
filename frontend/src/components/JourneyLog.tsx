import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Submission, Quest } from '../types';
import './JourneyLog.css';

interface SubmissionWithDetails extends Submission {
  questTitle?: string;
  questDescription?: string;
  formattedDate?: string;
  relativeTime?: string;
  auraReward?: number;
}

const JourneyLog: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  useEffect(() => {
    if (currentUser?.uid) {
      fetchSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const fetchSubmissions = async () => {
    console.log('fetchSubmissions called with:', {
      currentUserUid: currentUser?.uid,
      userDataUserId: userData?.userId,
      hasCurrentUser: !!currentUser,
      hasUserData: !!userData
    });
    
    if (!currentUser?.uid) {
      console.log('No currentUser.uid found, exiting fetchSubmissions');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Querying submissions for userId:', currentUser.uid);
      
      // Query user's submissions using currentUser.uid
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('userId', '==', currentUser.uid),
        orderBy('submittedAt', 'desc')
      );

      const submissionsSnapshot = await getDocs(submissionsQuery);
      
      console.log('Submissions query result:', {
        size: submissionsSnapshot.size,
        empty: submissionsSnapshot.empty,
        docs: submissionsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
      });
      
      // Get quest details for each submission
      const submissionsWithDetails = await Promise.all(
        submissionsSnapshot.docs.map(async (submissionDoc) => {
          const submissionData = { 
            submissionId: submissionDoc.id, 
            ...submissionDoc.data() 
          } as Submission;

          // Get quest details
          let questTitle = 'Nhiệm vụ không xác định';
          let questDescription = '';
          let auraReward = 0;
          
          if (submissionData.questId) {
            try {
              const questDoc = await getDoc(doc(db, 'quests', submissionData.questId));
              if (questDoc.exists()) {
                const questData = questDoc.data() as Quest;
                questTitle = questData.title;
                questDescription = questData.description;
                auraReward = questData.auraReward || 0;
              }
            } catch (error) {
              console.error('Error fetching quest details:', error);
            }
          }

          // Format dates
          let formattedDate = 'Không xác định';
          let relativeTime = '';
          
          if (submissionData.submittedAt) {
            const date = typeof submissionData.submittedAt.toDate === 'function' 
              ? submissionData.submittedAt.toDate() 
              : new Date(submissionData.submittedAt);
            
            formattedDate = date.toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            // Calculate relative time
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            if (diffDays > 0) {
              relativeTime = `${diffDays} ngày trước`;
            } else if (diffHours > 0) {
              relativeTime = `${diffHours} giờ trước`;
            } else if (diffMinutes > 0) {
              relativeTime = `${diffMinutes} phút trước`;
            } else {
              relativeTime = 'Vừa xong';
            }
          }

          return {
            ...submissionData,
            questTitle,
            questDescription,
            formattedDate,
            relativeTime,
            auraReward
          };
        })
      );

      setSubmissions(submissionsWithDetails);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '🔍';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Bị từ chối';
      case 'pending': return 'Chờ duyệt';
      default: return 'Không xác định';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'neutral';
    }
  };

  const filteredSubmissions = submissions.filter(submission => 
    filter === 'all' || submission.status === filter
  );

  const totalApproved = submissions.filter(s => s.status === 'approved').length;
  const totalPending = submissions.filter(s => s.status === 'pending').length;
  const totalRejected = submissions.filter(s => s.status === 'rejected').length;

  if (loading) {
    return (
      <div className="journey-log">
        <div className="loading-state">
          <div className="loading-icon">📜</div>
          <h3>Đang tải nhật ký hành trình...</h3>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="journey-log"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e17 0%, #1a1a2e 30%, #16213e 70%, #0f1419 100%)',
        backgroundAttachment: 'fixed',
        padding: '2rem',
        position: 'relative',
        overflowX: 'hidden',
        color: 'white'
      }}
    >
      <div 
        className="log-header"
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          marginBottom: '3rem',
          color: 'white'
        }}
      >
        <h2 
          className="log-title"
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: '800',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF6B6B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 2px 2px 8px rgba(0, 0, 0, 0.8)',
            letterSpacing: '0.02em',
            filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.5))'
          }}
        >
          <span className="title-icon" style={{ display: 'block', fontSize: '0.8em', marginBottom: '0.5rem' }}>📜</span>
          Nhật Ký Hành Trình
        </h2>
        <p 
          className="log-subtitle"
          style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.95)',
            marginBottom: '3rem',
            textShadow: '1px 1px 3px rgba(0, 0, 0, 0.7)',
            fontWeight: '500'
          }}
        >
          Lịch sử rèn luyện và thành tựu của bạn trong Lò Rèn Titan
        </p>

        {/* Statistics */}
        <div className="journey-stats">
          <div className="stat-card approved">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="stat-number">{totalApproved}</span>
              <span className="stat-label">Đã hoàn thành</span>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <span className="stat-number">{totalPending}</span>
              <span className="stat-label">Chờ duyệt</span>
            </div>
          </div>
          <div className="stat-card rejected">
            <div className="stat-icon">❌</div>
            <div className="stat-info">
              <span className="stat-number">{totalRejected}</span>
              <span className="stat-label">Cần cải thiện</span>
            </div>
          </div>
        </div>

        {/* Refresh button */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <button
            onClick={fetchSubmissions}
            disabled={loading}
            style={{
              background: 'linear-gradient(45deg, #9C27B0, #3F51B5)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {loading ? '🔄 Đang tải...' : '🔄 Làm mới Nhật ký'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả ({submissions.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Đã duyệt ({totalApproved})
          </button>
          <button 
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Chờ duyệt ({totalPending})
          </button>
          <button 
            className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Từ chối ({totalRejected})
          </button>
        </div>
      </div>

      <div className="log-content">
        {filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗞️</div>
            <h3>
              {filter === 'all' 
                ? 'Chưa có hành trình nào được ghi lại'
                : `Chưa có báo cáo nào với trạng thái "${getStatusText(filter)}"`
              }
            </h3>
            <p>
              {filter === 'all'
                ? 'Hãy bắt đầu hoàn thành các nhiệm vụ để ghi lại hành trình rèn luyện của bạn!'
                : 'Thay đổi bộ lọc để xem các báo cáo khác.'
              }
            </p>
          </div>
        ) : (
          <div className="timeline">
            {filteredSubmissions.map((submission, index) => (
              <div key={submission.submissionId} className="timeline-item">
                <div className="timeline-marker">
                  <div className={`marker-icon ${getStatusColor(submission.status)}`}>
                    {getStatusIcon(submission.status)}
                  </div>
                  {index < filteredSubmissions.length - 1 && <div className="timeline-line"></div>}
                </div>
                
                <div className="timeline-content">
                  <div 
                    className="submission-card"
                    style={{
                      background: 'rgba(20, 25, 35, 0.95)',
                      backdropFilter: 'blur(15px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '15px',
                      padding: '2rem',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }}
                  >
                    <div className="submission-header">
                      <h3 
                        className="quest-title"
                        style={{
                          fontSize: '1.4rem',
                          fontWeight: '800',
                          color: '#00E5FF',
                          margin: '0',
                          lineHeight: '1.3',
                          textShadow: '0 0 10px rgba(0, 229, 255, 0.6), 1px 1px 3px rgba(0, 0, 0, 0.8)',
                          filter: 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.4))'
                        }}
                      >
                        {submission.questTitle}
                      </h3>
                      <div className={`status-badge ${getStatusColor(submission.status)}`}>
                        {getStatusIcon(submission.status)} {getStatusText(submission.status)}
                      </div>
                    </div>
                    
                    <p 
                      className="quest-description"
                      style={{
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontSize: '1rem',
                        lineHeight: '1.7',
                        marginBottom: '1.5rem',
                        fontStyle: 'italic',
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.6)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '0.8rem',
                        borderRadius: '8px',
                        borderLeft: '3px solid rgba(0, 229, 255, 0.5)'
                      }}
                    >
                      {submission.questDescription}
                    </p>
                    
                    <div className="submission-details">
                      <div className="detail-item">
                        <span className="detail-label">📅 Thời gian:</span>
                        <span className="detail-value">
                          {submission.formattedDate}
                          <span className="relative-time">({submission.relativeTime})</span>
                        </span>
                      </div>
                      
                      {submission.status === 'approved' && (
                        <div className="detail-item success">
                          <span className="detail-label">🎉 AURA nhận được:</span>
                          <span className="detail-value aura-reward">
                            +{submission.auraReward} AURA - Đã được cộng vào tài khoản ⚡
                          </span>
                        </div>
                      )}
                      
                      {submission.status === 'pending' && (
                        <div className="detail-item warning">
                          <span className="detail-label">⏳ AURA sẽ nhận:</span>
                          <span className="detail-value aura-pending">
                            +{submission.auraReward} AURA - Sau khi được duyệt
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Proof preview */}
                    {submission.proofData && (
                      <div className="proof-preview">
                        <span className="proof-label">🔍 Bằng chứng rèn luyện:</span>
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
                            />
                          ) : submission.proofType === 'video' ? (
                            <video 
                              src={submission.proofData as string} 
                              className="proof-video"
                              preload="metadata"
                              controls
                            />
                          ) : submission.proofType === 'audio' ? (
                            <audio 
                              src={submission.proofData as string}
                              className="proof-audio"
                              controls
                            />
                          ) : (
                            <div className="proof-unknown">
                              📋 Báo cáo đã được nộp
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JourneyLog;