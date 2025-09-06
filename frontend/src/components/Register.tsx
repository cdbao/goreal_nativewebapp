import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }

    if (password.length < 6) {
      return setError('Mật khẩu phải có ít nhất 6 ký tự');
    }

    try {
      setError('');
      setLoading(true);
      await register(email, password, displayName);
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Xử lý các loại lỗi Firebase cụ thể
      if (error?.code === 'auth/email-already-in-use') {
        setError('Email này đã được sử dụng. Vui lòng sử dụng email khác.');
      } else if (error?.code === 'auth/invalid-email') {
        setError('Email không hợp lệ.');
      } else if (error?.code === 'auth/weak-password') {
        setError('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.');
      } else if (error?.code === 'auth/network-request-failed') {
        setError('Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.');
      } else if (error?.code === 'auth/too-many-requests') {
        setError('Quá nhiều yêu cầu. Vui lòng thử lại sau.');
      } else {
        setError(`Đăng ký thất bại: ${error?.message || 'Lỗi không xác định'}`);
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Gia nhập Titans' Guild</h2>
          <p>Bắt đầu hành trình trở thành Vệ Thần</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="displayName">Tên hiển thị</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <button disabled={loading} type="submit" className="auth-button">
            {loading ? 'Đang đăng ký...' : 'Gia nhập Guild'}
          </button>
        </form>
        
        <div className="auth-switch">
          <p>
            Đã có tài khoản?{' '}
            <button type="button" onClick={onSwitchToLogin} className="link-button">
              Đăng nhập
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;