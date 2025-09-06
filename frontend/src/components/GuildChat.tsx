import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getGuildInfo } from '../constants/guilds';
import './GuildChat.css';

interface ChatMessage {
  messageId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: any;
  isSystemMessage?: boolean;
}

const GuildChat: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const guildInfo = userData?.guild ? getGuildInfo(userData.guild) : null;

  // Real-time message listener
  useEffect(() => {
    if (!userData?.guild) return;

    console.log('Setting up Guild Chat listener for:', userData.guild);
    
    const messagesQuery = query(
      collection(db, `guildChats/${userData.guild}/messages`),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        console.log('Guild Chat messages updated, size:', snapshot.size);
        
        const newMessages: ChatMessage[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          newMessages.push({
            messageId: doc.id,
            userId: data.userId,
            userName: data.userName,
            message: data.message,
            timestamp: data.timestamp,
            isSystemMessage: data.isSystemMessage || false
          });
        });
        
        // Reverse to show oldest first
        setMessages(newMessages.reverse());
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to guild chat:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userData?.guild]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser || !userData?.guild || isSending) {
      return;
    }

    setIsSending(true);
    
    try {
      console.log('Sending message to guild:', userData.guild);
      
      const messageData = {
        userId: currentUser.uid,
        userName: userData.displayName || 'Chiến Binh Vô Danh',
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        guild: userData.guild
      };

      await addDoc(
        collection(db, `guildChats/${userData.guild}/messages`), 
        messageData
      );

      setNewMessage('');
      messageInputRef.current?.focus();
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại!');
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isMyMessage = (message: ChatMessage) => {
    return message.userId === currentUser?.uid;
  };

  if (!userData?.guild) {
    return (
      <div className="guild-chat-error frosted-glass">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h3>Không thể truy cập Chat Guild</h3>
          <p>Bạn cần phải là thành viên của một Guild để sử dụng tính năng này.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="guild-chat-loading frosted-glass">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Đang tải kênh chat {guildInfo?.displayName}...</h3>
          <p>Kết nối với các Chiến Binh khác...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="guild-chat frosted-glass" 
      data-guild={userData.guild}
      style={{
        background: 'rgba(20, 25, 35, 0.95)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        color: 'white'
      }}
    >
      {/* Chat Header */}
      <div className="chat-header">
        <div className="guild-info">
          <div className="guild-avatar animate-pulse">
            {guildInfo?.icon}
          </div>
          <div className="guild-details">
            <h2 
              className="text-fantasy text-primary"
              style={{
                color: '#00E5FF',
                textShadow: '0 0 10px rgba(0, 229, 255, 0.6), 1px 1px 3px rgba(0, 0, 0, 0.8)',
                filter: 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.4))',
                fontWeight: '800'
              }}
            >
              💬 Kênh Chat {guildInfo?.displayName}
            </h2>
            <p 
              className="text-muted"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              Hội thoại riêng cho thành viên {guildInfo?.displayName}
            </p>
          </div>
        </div>
        <div className="online-count">
          <span className="online-indicator"></span>
          <span className="online-text">Kết nối</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">💬</div>
            <h3>Chưa có tin nhắn nào</h3>
            <p>Hãy là người đầu tiên gửi lời chào đến các Chiến Binh khác trong {guildInfo?.displayName}!</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message, index) => (
              <div
                key={message.messageId}
                className={`message-item ${isMyMessage(message) ? 'my-message' : 'other-message'} ${
                  message.isSystemMessage ? 'system-message' : ''
                } animate-fadeInUp`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {!isMyMessage(message) && !message.isSystemMessage && (
                  <div className="message-avatar">
                    <span>⚔️</span>
                  </div>
                )}
                
                <div className="message-content">
                  {!message.isSystemMessage && (
                    <div className="message-header">
                      <span className="message-author text-primary">
                        {isMyMessage(message) ? 'Bạn' : message.userName}
                      </span>
                      <span className="message-time text-muted">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`message-bubble ${message.isSystemMessage ? 'system-bubble' : ''}`}>
                    {message.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <div className="input-container">
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Gửi tin nhắn đến ${guildInfo?.displayName}...`}
            className="message-input"
            maxLength={500}
            disabled={isSending}
          />
          <button
            type="submit"
            className={`btn ${isSending ? 'btn-ghost' : 'btn-primary'} send-button`}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <div className="sending-spinner"></div>
            ) : (
              <span>📤</span>
            )}
          </button>
        </div>
        
        <div className="input-footer">
          <span className="character-count text-muted">
            {newMessage.length}/500
          </span>
          <span className="input-hint text-muted">
            Nhấn Enter để gửi tin nhắn
          </span>
        </div>
      </form>
    </div>
  );
};

export default GuildChat;