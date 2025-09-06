import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './AuthDebugger.css';

const AuthDebugger: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebugCheck = async () => {
    setLoading(true);
    const info: any = {
      timestamp: new Date().toISOString(),
      authentication: {
        isSignedIn: !!currentUser,
        userId: currentUser?.uid || null,
        email: currentUser?.email || null,
        emailVerified: currentUser?.emailVerified || false,
      },
      userData: {
        exists: !!userData,
        role: userData?.role || null,
        guild: userData?.guild || null,
        displayName: userData?.displayName || null,
        fullData: userData,
      },
      adminCheck: {
        hasRole: userData?.role === 'admin',
        canAccessAdmin: userData?.role === 'admin',
      },
    };

    // Additional Firestore check
    if (currentUser?.uid) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        info.firestoreCheck = {
          documentExists: userDocSnap.exists(),
          documentData: userDocSnap.exists() ? userDocSnap.data() : null,
          role: userDocSnap.exists() ? userDocSnap.data()?.role : null,
        };
      } catch (error) {
        info.firestoreCheck = {
          error: (error as Error).message,
        };
      }
    }

    setDebugInfo(info);
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      runDebugCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userData]);

  if (!currentUser) {
    return (
      <div className="auth-debugger">
        <div className="debug-card error">
          <h3>🚫 Chưa đăng nhập</h3>
          <p>Vui lòng đăng nhập để kiểm tra quyền upload hình ảnh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-debugger">
      <div className="debug-header">
        <h2>🔍 Auth & Permission Debugger</h2>
        <button
          onClick={runDebugCheck}
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? '⏳ Đang kiểm tra...' : '🔄 Kiểm tra lại'}
        </button>
      </div>

      {debugInfo && (
        <div className="debug-results">
          {/* Authentication Status */}
          <div
            className={`debug-card ${debugInfo.authentication.isSignedIn ? 'success' : 'error'}`}
          >
            <h3>🔐 Trạng thái Authentication</h3>
            <div className="debug-details">
              <div className="debug-item">
                <span className="label">Đã đăng nhập:</span>
                <span
                  className={`value ${debugInfo.authentication.isSignedIn ? 'success' : 'error'}`}
                >
                  {debugInfo.authentication.isSignedIn ? '✅ Có' : '❌ Không'}
                </span>
              </div>
              <div className="debug-item">
                <span className="label">User ID:</span>
                <span className="value">
                  {debugInfo.authentication.userId || 'N/A'}
                </span>
              </div>
              <div className="debug-item">
                <span className="label">Email:</span>
                <span className="value">
                  {debugInfo.authentication.email || 'N/A'}
                </span>
              </div>
              <div className="debug-item">
                <span className="label">Email verified:</span>
                <span
                  className={`value ${debugInfo.authentication.emailVerified ? 'success' : 'warning'}`}
                >
                  {debugInfo.authentication.emailVerified ? '✅ Có' : '⚠️ Chưa'}
                </span>
              </div>
            </div>
          </div>

          {/* User Data */}
          <div
            className={`debug-card ${debugInfo.userData.exists ? 'success' : 'error'}`}
          >
            <h3>👤 User Data trong Firestore</h3>
            <div className="debug-details">
              <div className="debug-item">
                <span className="label">Document tồn tại:</span>
                <span
                  className={`value ${debugInfo.userData.exists ? 'success' : 'error'}`}
                >
                  {debugInfo.userData.exists ? '✅ Có' : '❌ Không'}
                </span>
              </div>
              <div className="debug-item">
                <span className="label">Role:</span>
                <span
                  className={`value ${debugInfo.userData.role === 'admin' ? 'success' : 'info'}`}
                >
                  {debugInfo.userData.role || 'N/A'}
                </span>
              </div>
              <div className="debug-item">
                <span className="label">Guild:</span>
                <span className="value">
                  {debugInfo.userData.guild || 'N/A'}
                </span>
              </div>
              <div className="debug-item">
                <span className="label">Display Name:</span>
                <span className="value">
                  {debugInfo.userData.displayName || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Admin Check */}
          <div
            className={`debug-card ${debugInfo.adminCheck.canAccessAdmin ? 'success' : 'warning'}`}
          >
            <h3>👑 Quyền Admin</h3>
            <div className="debug-details">
              <div className="debug-item">
                <span className="label">Có quyền Admin:</span>
                <span
                  className={`value ${debugInfo.adminCheck.canAccessAdmin ? 'success' : 'warning'}`}
                >
                  {debugInfo.adminCheck.canAccessAdmin ? '✅ Có' : '⚠️ Không'}
                </span>
              </div>
              <div className="debug-item">
                <span className="label">Có thể upload hình nền:</span>
                <span
                  className={`value ${debugInfo.adminCheck.canAccessAdmin ? 'success' : 'error'}`}
                >
                  {debugInfo.adminCheck.canAccessAdmin ? '✅ Có' : '❌ Không'}
                </span>
              </div>
            </div>
          </div>

          {/* Firestore Direct Check */}
          {debugInfo.firestoreCheck && (
            <div
              className={`debug-card ${debugInfo.firestoreCheck.documentExists ? 'success' : 'error'}`}
            >
              <h3>🗄️ Firestore Direct Check</h3>
              <div className="debug-details">
                {debugInfo.firestoreCheck.error ? (
                  <div className="debug-item">
                    <span className="label">Lỗi:</span>
                    <span className="value error">
                      {debugInfo.firestoreCheck.error}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="debug-item">
                      <span className="label">Document exists:</span>
                      <span
                        className={`value ${debugInfo.firestoreCheck.documentExists ? 'success' : 'error'}`}
                      >
                        {debugInfo.firestoreCheck.documentExists
                          ? '✅ Có'
                          : '❌ Không'}
                      </span>
                    </div>
                    <div className="debug-item">
                      <span className="label">Role (direct):</span>
                      <span className="value">
                        {debugInfo.firestoreCheck.role || 'N/A'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Solutions */}
          <div className="debug-card info">
            <h3>🔧 Hướng dẫn khắc phục</h3>
            <div className="debug-solutions">
              {!debugInfo.authentication.isSignedIn && (
                <div className="solution-item error">
                  <strong>❌ Chưa đăng nhập:</strong>
                  <p>
                    Vui lòng đăng nhập vào tài khoản admin để upload hình ảnh.
                  </p>
                </div>
              )}

              {!debugInfo.userData.exists &&
                debugInfo.authentication.isSignedIn && (
                  <div className="solution-item error">
                    <strong>❌ Không có dữ liệu user:</strong>
                    <p>
                      Tài khoản chưa được tạo trong Firestore. Liên hệ developer
                      để tạo user record.
                    </p>
                  </div>
                )}

              {debugInfo.userData.role !== 'admin' &&
                debugInfo.userData.exists && (
                  <div className="solution-item warning">
                    <strong>⚠️ Không có quyền admin:</strong>
                    <p>
                      Tài khoản không có role 'admin'. Chỉ admin mới có thể
                      upload hình nền.
                    </p>
                    <p>
                      Role hiện tại:{' '}
                      <code>{debugInfo.userData.role || 'null'}</code>
                    </p>
                  </div>
                )}

              {debugInfo.adminCheck.canAccessAdmin && (
                <div className="solution-item success">
                  <strong>✅ Quyền hợp lệ:</strong>
                  <p>
                    Tài khoản có đủ quyền upload hình nền. Nếu vẫn lỗi 403, hãy
                    kiểm tra Firebase Storage Rules.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Raw Data (for debugging) */}
          <details className="debug-raw-data">
            <summary>🔍 Raw Debug Data (Developer)</summary>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default AuthDebugger;
