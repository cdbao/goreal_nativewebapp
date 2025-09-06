import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { storage, db } from '../firebase';
import { Quest } from '../types';
import './QuestReporting.css';

interface QuestReportingProps {
  quest: Quest;
  onClose: () => void;
}

const QuestReporting: React.FC<QuestReportingProps> = ({ quest, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { currentUser } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('File quá lớn! Vui lòng chọn file dưới 10MB.');
        return;
      }

      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/avi',
        'video/mov',
      ];

      console.log('QuestReporting file validation:', {
        fileName: file.name,
        fileType: file.type,
        isValid: allowedTypes.includes(file.type),
      });

      if (!allowedTypes.includes(file.type)) {
        alert(
          `Định dạng file không được hỗ trợ!\n\nFile hiện tại: ${file.type}\nĐịnh dạng được hỗ trợ: ${allowedTypes.join(', ')}`
        );
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !currentUser) {
      alert('Vui lòng chọn file và đảm bảo đã đăng nhập.');
      return;
    }

    setUploading(true);

    try {
      // Generate unique submission ID
      const submissionId = `${currentUser.uid}_${quest.questId}_${Date.now()}`;

      // Upload file to Firebase Storage
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `submissions/${currentUser.uid}/${submissionId}.${fileExtension}`;
      const storageRef = ref(storage, fileName);

      const snapshot = await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Create submission document in Firestore
      await addDoc(collection(db, 'submissions'), {
        submissionId,
        userId: currentUser.uid,
        questId: quest.questId,
        proofData: downloadURL,
        proofType: 'image',
        status: 'pending',
        submittedAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting quest report:', error);
      alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay">
        <div className="reporting-modal">
          <div className="success-content">
            <div className="success-icon">✅</div>
            <h3>Báo cáo đã được gửi thành công!</h3>
            <p>Hội Đồng sẽ xem xét và phê duyệt báo cáo của bạn sớm nhất.</p>
            <div className="success-animation">🔥 Chờ nhận AURA 🔥</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="reporting-modal">
        <div className="modal-header">
          <h3>🔥 Báo cáo rèn luyện</h3>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <div className="quest-info">
          <h4>{quest.title}</h4>
          <p>{quest.description}</p>
          <div className="reward-info">
            <span>Phần thưởng: +{quest.auraReward} AURA</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="reporting-form">
          <div className="upload-section">
            <label htmlFor="proof-file" className="upload-label">
              📸 Tải lên bằng chứng rèn luyện
            </label>

            <div className="upload-area">
              <input
                id="proof-file"
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,video/avi,video/mov"
                onChange={handleFileSelect}
                className="file-input"
                disabled={uploading}
              />

              {selectedFile ? (
                <div className="file-preview">
                  <div className="file-info">
                    <span className="file-name">📄 {selectedFile.name}</span>
                    <span className="file-size">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>

                  {selectedFile.type.startsWith('image/') && (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="image-preview"
                    />
                  )}
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📁</div>
                  <p>Chọn ảnh hoặc video ngắn</p>
                  <small>Tối đa 10MB • JPG, PNG, GIF, MP4, MOV</small>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={uploading}
            >
              Hủy
            </button>

            <button
              type="submit"
              className="submit-button"
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner"></span>
                  Đang gửi...
                </>
              ) : (
                '🔥 Gửi báo cáo'
              )}
            </button>
          </div>
        </form>

        <div className="reporting-tips">
          <h5>💡 Mẹo báo cáo hiệu quả:</h5>
          <ul>
            <li>Chụp ảnh rõ nét, có ánh sáng tốt</li>
            <li>Thể hiện rõ quá trình thực hiện nhiệm vụ</li>
            <li>Video ngắn (dưới 1 phút) sẽ được ưu tiên xét duyệt</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuestReporting;
