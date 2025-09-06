import React, { useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';

const QuestDebugger: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runPermissionTest = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    const info: any = {
      timestamp: new Date().toISOString(),
      user: {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: userData?.displayName,
        guild: userData?.guild,
        role: userData?.role
      },
      tests: {}
    };

    try {
      // Test 1: Read user document
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        info.tests.readUserDoc = {
          success: true,
          exists: userDoc.exists(),
          data: userDoc.exists() ? userDoc.data() : null
        };
      } catch (error: any) {
        info.tests.readUserDoc = {
          success: false,
          error: error.message,
          code: error.code
        };
      }

      // Test 2: Read quests collection
      try {
        const questsQuery = collection(db, 'quests');
        const questsSnapshot = await getDocs(questsQuery);
        info.tests.readQuests = {
          success: true,
          count: questsSnapshot.size,
          quests: questsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };
      } catch (error: any) {
        info.tests.readQuests = {
          success: false,
          error: error.message,
          code: error.code
        };
      }

      // Test 3: Read activeQuests subcollection
      try {
        const activeQuestsQuery = collection(db, `users/${currentUser.uid}/activeQuests`);
        const activeQuestsSnapshot = await getDocs(activeQuestsQuery);
        info.tests.readActiveQuests = {
          success: true,
          count: activeQuestsSnapshot.size,
          activeQuests: activeQuestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };
      } catch (error: any) {
        info.tests.readActiveQuests = {
          success: false,
          error: error.message,
          code: error.code
        };
      }

      // Test 4: Try to create a test activeQuest
      try {
        const testQuestRef = doc(db, `users/${currentUser.uid}/activeQuests/test-quest-${Date.now()}`);
        await setDoc(testQuestRef, {
          questId: 'test-quest',
          acceptedAt: serverTimestamp(),
          status: 'accepted',
          isTest: true
        });
        info.tests.createActiveQuest = {
          success: true,
          message: 'Successfully created test activeQuest'
        };
      } catch (error: any) {
        info.tests.createActiveQuest = {
          success: false,
          error: error.message,
          code: error.code
        };
      }

    } catch (error: any) {
      info.generalError = {
        error: error.message,
        code: error.code
      };
    }

    setDebugInfo(info);
    setIsLoading(false);
  };

  if (!currentUser) {
    return (
      <div style={{ 
        background: 'rgba(244, 67, 54, 0.1)',
        border: '1px solid rgba(244, 67, 54, 0.3)',
        borderRadius: '8px',
        padding: '16px',
        margin: '16px',
        color: 'white'
      }}>
        <h3>🚫 Chưa đăng nhập</h3>
        <p>Vui lòng đăng nhập để test permissions.</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      padding: '20px',
      margin: '16px',
      color: 'white'
    }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#9C27B0', margin: 0 }}>🔍 Quest Permission Debugger</h3>
        <button
          onClick={runPermissionTest}
          disabled={isLoading}
          style={{
            background: isLoading ? '#666' : 'linear-gradient(135deg, #9C27B0, #673AB7)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '⏳ Testing...' : '🧪 Run Permission Test'}
        </button>
      </div>

      {debugInfo && (
        <div>
          <h4 style={{ color: '#FFD700' }}>👤 User Info</h4>
          <div style={{ 
            background: 'rgba(255, 215, 0, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div><strong>UID:</strong> {debugInfo.user.uid}</div>
            <div><strong>Email:</strong> {debugInfo.user.email}</div>
            <div><strong>Display Name:</strong> {debugInfo.user.displayName || 'N/A'}</div>
            <div><strong>Guild:</strong> {debugInfo.user.guild || 'N/A'}</div>
            <div><strong>Role:</strong> {debugInfo.user.role || 'N/A'}</div>
          </div>

          <h4 style={{ color: '#4CAF50' }}>🧪 Permission Tests</h4>
          
          {Object.entries(debugInfo.tests).map(([testName, result]: [string, any]) => (
            <div
              key={testName}
              style={{
                background: result.success 
                  ? 'rgba(76, 175, 80, 0.1)' 
                  : 'rgba(244, 67, 54, 0.1)',
                border: `1px solid ${result.success 
                  ? 'rgba(76, 175, 80, 0.3)' 
                  : 'rgba(244, 67, 54, 0.3)'}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px'
              }}
            >
              <div style={{ 
                fontWeight: 'bold',
                color: result.success ? '#4CAF50' : '#F44336',
                marginBottom: '8px'
              }}>
                {result.success ? '✅' : '❌'} {testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </div>
              
              {result.success ? (
                <div>
                  {result.message && <div>Message: {result.message}</div>}
                  {result.count !== undefined && <div>Count: {result.count}</div>}
                  {result.exists !== undefined && <div>Exists: {result.exists ? 'Yes' : 'No'}</div>}
                </div>
              ) : (
                <div>
                  <div style={{ color: '#F44336' }}>
                    <strong>Error:</strong> {result.error}
                  </div>
                  {result.code && (
                    <div style={{ color: '#FF9800' }}>
                      <strong>Code:</strong> {result.code}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <details style={{ marginTop: '16px' }}>
            <summary style={{ cursor: 'pointer', color: '#2196F3' }}>
              🔍 Raw Debug Data
            </summary>
            <pre style={{ 
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '12px',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '12px',
              marginTop: '8px'
            }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default QuestDebugger;