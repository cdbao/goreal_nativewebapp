import React, { useState } from 'react';
import { auth, db } from '../firebase';

const FirebaseDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showPanel, setShowPanel] = useState(false);

  const checkFirebaseConfig = () => {
    let info = '🔧 FIREBASE DEBUG RESULTS:\n\n';

    // Kiểm tra environment variables
    const configs = [
      ['API Key', process.env.REACT_APP_FIREBASE_API_KEY],
      ['Auth Domain', process.env.REACT_APP_FIREBASE_AUTH_DOMAIN],
      ['Project ID', process.env.REACT_APP_FIREBASE_PROJECT_ID],
      ['Storage Bucket', process.env.REACT_APP_FIREBASE_STORAGE_BUCKET],
      [
        'Messaging Sender ID',
        process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      ],
      ['App ID', process.env.REACT_APP_FIREBASE_APP_ID],
    ];

    info += '📋 CONFIG STATUS:\n';
    configs.forEach(([name, value]) => {
      const status = value ? '✅' : '❌';
      const preview = value ? `${value.substring(0, 20)}...` : 'MISSING';
      info += `${status} ${name}: ${preview}\n`;
    });

    // Kiểm tra Firebase instances
    info += '\n🔥 FIREBASE INSTANCES:\n';
    info += `✅ Auth: ${auth ? 'OK' : 'FAILED'}\n`;
    info += `✅ Firestore: ${db ? 'OK' : 'FAILED'}\n`;

    // Kiểm tra .env file
    info += '\n📂 FILE CHECK:\n';
    info += '❓ .env file: Check if exists in frontend folder\n';
    info += '❓ Restart: Did you restart npm start after editing .env?\n';

    // Lời khuyên
    info += '\n💡 NEXT STEPS:\n';
    if (!process.env.REACT_APP_FIREBASE_API_KEY) {
      info += '1. Tạo file .env trong frontend folder\n';
      info += '2. Copy config từ Firebase Console\n';
      info += '3. Restart npm start\n';
    } else {
      info += '1. Config đã có, test thử đăng ký/đăng nhập\n';
      info += '2. Nếu vẫn lỗi, check Firebase Console\n';
    }

    console.log(info);
    setDebugInfo(info);
    setShowPanel(true);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: '#007bff',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 9999,
          color: 'white',
          border: '2px solid #0056b3',
        }}
      >
        <button
          onClick={checkFirebaseConfig}
          style={{
            padding: '8px 12px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🔧 Debug Firebase Config
        </button>
        <div style={{ marginTop: '8px', fontSize: '10px' }}>
          Check console + popup for results
        </div>
      </div>

      {showPanel && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#2d3748',
            color: '#ffffff',
            padding: '20px',
            borderRadius: '10px',
            zIndex: 10000,
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace',
            border: '2px solid #4a5568',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px',
            }}
          >
            <h3 style={{ margin: 0, color: '#ffd700' }}>
              🔧 Firebase Debug Panel
            </h3>
            <button
              onClick={() => setShowPanel(false)}
              style={{
                background: '#e53e3e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          <pre
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: '1.4',
              margin: 0,
            }}
          >
            {debugInfo}
          </pre>

          <div
            style={{
              marginTop: '15px',
              padding: '10px',
              background: '#4a5568',
              borderRadius: '5px',
            }}
          >
            <strong style={{ color: '#ffd700' }}>
              🚨 Nếu vẫn lỗi API key:
            </strong>
            <br />
            1. Kiểm tra file .env có trong thư mục frontend/
            <br />
            2. Restart: npm start
            <br />
            3. Xem hướng dẫn: FIX_FIREBASE_API_KEY.md
          </div>
        </div>
      )}
    </>
  );
};

export default FirebaseDebug;
