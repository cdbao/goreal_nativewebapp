import React, { useState, useRef, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Quest, Submission } from '../types';
import { errorLogger } from '../utils/errorLogger';
import './DynamicQuestReport.css';

interface DynamicQuestReportProps {
  quest: Quest;
  onSubmissionComplete: (submission: Submission) => void;
  onStartSubmission?: () => void;
}

const DynamicQuestReport: React.FC<DynamicQuestReportProps> = ({
  quest,
  onSubmissionComplete,
  onStartSubmission
}) => {
  const { currentUser } = useAuth();
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const detectReportTypeFromDescription = (description: string): 'image' | 'text' | 'audio' | 'video' => {
    if (!description) return 'text';
    
    const desc = description.toLowerCase();
    
    // Video keywords
    if (desc.includes('clip') || desc.includes('video') || desc.includes('quay') || desc.includes('ghi hình')) {
      return 'video';
    }
    
    // Image keywords  
    if (desc.includes('hình') || desc.includes('ảnh') || desc.includes('chụp') || desc.includes('photo')) {
      return 'image';
    }
    
    // Audio keywords
    if (desc.includes('ghi âm') || desc.includes('audio') || desc.includes('voice') || desc.includes('tiếng')) {
      return 'audio';
    }
    
    // Default to text
    return 'text';
  };

  const getEffectiveReportType = (reportType: string | undefined): 'image' | 'text' | 'audio' | 'video' => {
    const detectedType = reportType || detectReportTypeFromDescription(quest.description);
    // Ensure we return only valid types
    if (detectedType === 'image' || detectedType === 'text' || detectedType === 'audio' || detectedType === 'video') {
      return detectedType;
    }
    return 'text'; // fallback to text for any invalid types
  };

  const getReportTypeIcon = (reportType: string | undefined) => {
    const effectiveType = getEffectiveReportType(reportType);
    const icons = {
      image: '📸',
      text: '📝',
      audio: '🎤',
      video: '🎥'
    };
    return icons[effectiveType as keyof typeof icons] || '📝';
  };

  const getReportTypeName = (reportType: string | undefined) => {
    const effectiveType = getEffectiveReportType(reportType);
    const names = {
      image: 'Hình ảnh',
      text: 'Văn bản', 
      audio: 'Ghi âm',
      video: 'Video'
    };
    return names[effectiveType as keyof typeof names] || 'Văn bản';
  };

  const getPlaceholderText = (reportType: string | undefined) => {
    const effectiveType = getEffectiveReportType(reportType);
    const placeholders = {
      text: 'Chia sẻ chi tiết về quá trình rèn luyện của bạn...\n\nVí dụ:\n- Bạn đã làm gì?\n- Khó khăn gặp phải?\n- Bài học rút ra?\n- Cảm nhận của bạn?',
      image: 'Chọn hình ảnh minh chứng cho quá trình rèn luyện',
      video: 'Chọn video ghi lại quá trình thực hiện',
      audio: 'Ghi âm báo cáo của bạn bằng cách nhấn nút mic'
    };
    return placeholders[effectiveType as keyof typeof placeholders] || 'Chia sẻ chi tiết về quá trình rèn luyện của bạn...';
  };

  // File handling
  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov'],
      audio: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
    };

    const effectiveReportType = getEffectiveReportType(quest.reportType);
    const validTypes = allowedTypes[effectiveReportType as keyof typeof allowedTypes] || [];
    
    console.log('File validation:', {
      fileName: file.name,
      fileType: file.type,
      questReportType: quest.reportType,
      effectiveReportType,
      validTypes,
      isValid: validTypes.includes(file.type)
    });
    
    if (!validTypes.includes(file.type)) {
      alert(`Vui lòng chọn file ${getReportTypeName(quest.reportType).toLowerCase()} hợp lệ!\n\nFile hiện tại: ${file.type}\nĐịnh dạng được hỗ trợ: ${validTypes.join(', ')}`);
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File quá lớn! Vui lòng chọn file dưới 50MB.');
      return;
    }

    setSelectedFile(file);
  }, [quest.reportType]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submission handling
  const handleSubmit = async () => {
    if (!currentUser) return;

    // Validation
    let proofData: string | File = '';
    let hasValidData = false;
    const reportType = getEffectiveReportType(quest.reportType);

    switch (reportType) {
      case 'text':
        if (textContent.trim().length < 10) {
          alert('Vui lòng nhập ít nhất 10 ký tự cho báo cáo văn bản.');
          return;
        }
        proofData = textContent.trim();
        hasValidData = true;
        break;
      
      case 'image':
      case 'video':
        if (!selectedFile) {
          alert(`Vui lòng chọn file ${getReportTypeName(quest.reportType).toLowerCase()}.`);
          return;
        }
        proofData = selectedFile;
        hasValidData = true;
        break;
        
      case 'audio':
        if (!audioBlob && !selectedFile) {
          alert('Vui lòng ghi âm hoặc chọn file audio.');
          return;
        }
        proofData = selectedFile || new File([audioBlob!], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        hasValidData = true;
        break;
    }

    if (!hasValidData) return;

    setIsSubmitting(true);
    if (onStartSubmission) {
      onStartSubmission();
    }

    try {
      let finalProofData: string = '';

      // Handle file uploads
      if (proofData instanceof File || (proofData as any)?.constructor?.name === 'Blob') {
        try {
          const fileRef = ref(storage, `submissions/${currentUser.uid}/${quest.questId}/${Date.now()}-${(proofData as File).name || 'recording'}`);
          const uploadResult = await uploadBytes(fileRef, proofData as File);
          finalProofData = await getDownloadURL(uploadResult.ref);
          
          console.log('File uploaded successfully:', finalProofData);
        } catch (uploadError: any) {
          errorLogger.logUploadError(
            `Failed to upload file: ${uploadError.message}`,
            {
              questId: quest.questId,
              fileName: (proofData as File).name,
              fileSize: (proofData as File).size,
              fileType: (proofData as File).type,
              reportType,
              errorCode: uploadError.code
            },
            currentUser.uid
          );
          throw uploadError;
        }
      } else {
        // Text content
        finalProofData = proofData as string;
      }

      // Create submission document
      const submissionData: Omit<Submission, 'submissionId'> = {
        userId: currentUser.uid,
        questId: quest.questId,
        proofData: finalProofData,
        proofType: reportType,
        status: 'pending',
        submittedAt: serverTimestamp()
      };

      try {
        const submissionRef = await addDoc(collection(db, 'submissions'), submissionData);
        
        const newSubmission: Submission = {
          submissionId: submissionRef.id,
          ...submissionData,
          submittedAt: new Date()
        };

        console.log('Submission created successfully:', submissionRef.id);
        onSubmissionComplete(newSubmission);
      } catch (firestoreError: any) {
        errorLogger.logFirestoreError(
          `Failed to create submission: ${firestoreError.message}`,
          'addDoc',
          {
            questId: quest.questId,
            proofType: reportType,
            errorCode: firestoreError.code
          },
          currentUser.uid
        );
        throw firestoreError;
      }

    } catch (error: any) {
      console.error('Error submitting quest report:', error);
      
      // Log the general error if not already logged
      if (!error.logged) {
        errorLogger.logError({
          errorType: 'general',
          message: `Quest report submission failed: ${error.message}`,
          stack: error.stack,
          severity: 'high',
          component: 'DynamicQuestReport',
          additionalData: {
            questId: quest.questId,
            reportType,
            errorName: error.name,
            errorCode: error.code
          }
        }, currentUser.uid);
      }
      
      alert('Có lỗi xảy ra khi nộp báo cáo. Vui lòng thử lại.');
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = () => {
    // Smart detection of reportType if missing
    const reportType = getEffectiveReportType(quest.reportType);
    
    console.log('Smart reportType detection:', {
      originalReportType: quest.reportType,
      description: quest.description,
      detectedType: detectReportTypeFromDescription(quest.description),
      finalType: reportType
    });
    
    const disabled = (() => {
      switch (reportType) {
        case 'text':
          return textContent.trim().length < 10;
        case 'image':
        case 'video':
          return !selectedFile;
        case 'audio':
          return !audioBlob && !selectedFile;
        default:
          // If still unknown reportType, allow submission (don't block user)
          return false;
      }
    })();
    
    console.log('Submit button disabled check:', {
      originalReportType: quest.reportType,
      effectiveReportType: reportType,
      textContent: textContent.trim().length,
      selectedFile: !!selectedFile,
      audioBlob: !!audioBlob,
      isSubmitting,
      disabled,
      finalDisabled: disabled || isSubmitting
    });
    
    return disabled;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`dynamic-quest-report ${isSubmitting ? 'submitting' : ''}`}>
      {/* Report Header */}
      <div className="report-header">
        <h3 className="report-title">🔥 Hoàn Thành Rèn Luyện</h3>
        <p className="report-subtitle">{quest.title}</p>
        <div className="report-type-badge">
          <span>{getReportTypeIcon(quest.reportType)}</span>
          <span>Yêu cầu: {getReportTypeName(quest.reportType)}</span>
        </div>
      </div>

      {/* Dynamic Input Section */}
      <div className="report-input-section">
        {getEffectiveReportType(quest.reportType) === 'text' && (
          <>
            <label className="input-label">📝 Báo cáo chi tiết</label>
            <textarea
              className="text-input"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder={getPlaceholderText(quest.reportType)}
              rows={8}
            />
          </>
        )}

        {(getEffectiveReportType(quest.reportType) === 'image' || getEffectiveReportType(quest.reportType) === 'video') && (
          <>
            <label className="input-label">
              {getReportTypeIcon(quest.reportType)} Chọn {getReportTypeName(quest.reportType)}
            </label>
            <div 
              className={`file-input-container ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="file-input"
                accept={
                  getEffectiveReportType(quest.reportType) === 'image' ? 'image/*,image/jpeg,image/jpg,image/png,image/gif,image/webp' :
                  getEffectiveReportType(quest.reportType) === 'video' ? 'video/*,video/mp4,video/webm,video/quicktime,video/avi,video/mov' :
                  getEffectiveReportType(quest.reportType) === 'audio' ? 'audio/*,audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/webm' :
                  '*/*'
                }
                onChange={handleFileChange}
              />
              
              {!selectedFile ? (
                <div className="file-input-content">
                  <div className="file-input-icon">
                    {getReportTypeIcon(quest.reportType)}
                  </div>
                  <div className="file-input-text">
                    Kéo thả hoặc nhấn để chọn {getReportTypeName(quest.reportType).toLowerCase()}
                  </div>
                  <div className="file-input-hint">
                    {
                      getEffectiveReportType(quest.reportType) === 'image' ? 'PNG, JPG, GIF, WEBP' :
                      getEffectiveReportType(quest.reportType) === 'video' ? 'MP4, WEBM, MOV, AVI' :
                      getEffectiveReportType(quest.reportType) === 'audio' ? 'MP3, WAV, OGG, WEBM' :
                      'Mọi định dạng'
                    } • Tối đa 50MB
                  </div>
                </div>
              ) : (
                <div className="file-preview">
                  <div className="file-preview-info">
                    <div className="file-preview-icon">✅</div>
                    <div className="file-preview-details">
                      <div className="file-preview-name">{selectedFile.name}</div>
                      <div className="file-preview-size">{formatFileSize(selectedFile.size)}</div>
                    </div>
                    <button 
                      className="file-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                    >
                      ❌ Xóa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {getEffectiveReportType(quest.reportType) === 'audio' && (
          <>
            <label className="input-label">🎤 Ghi âm báo cáo</label>
            <div className="audio-recorder">
              <button
                className={`record-button ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                type="button"
              >
                {isRecording ? '⏹️' : '🎤'}
              </button>
              
              <div className="recording-status">
                {isRecording ? 'Đang ghi âm...' : audioBlob ? 'Đã ghi âm xong' : 'Nhấn để bắt đầu ghi âm'}
              </div>
              
              {(isRecording || audioBlob) && (
                <div className="recording-timer">
                  {formatTime(recordingTime)}
                </div>
              )}
              
              {!audioBlob && !isRecording && (
                <div style={{ marginTop: '16px' }}>
                  <label className="input-label">Hoặc chọn file audio</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Debug Info */}
      <div style={{ 
        background: 'rgba(255, 0, 0, 0.1)', 
        padding: '10px', 
        margin: '10px 0', 
        fontSize: '12px',
        color: 'white'
      }}>
        <div><strong>Debug Quest Object:</strong></div>
        <div>questId: {quest.questId}</div>
        <div>title: {quest.title}</div>
        <div>reportType: "{quest.reportType}" (type: {typeof quest.reportType})</div>
        <div>effectiveReportType: "{getEffectiveReportType(quest.reportType)}"</div>
        <div>textLength: {textContent.length}</div>
        <div>hasFile: {!!selectedFile ? 'true' : 'false'}</div>
        <div>hasAudio: {!!audioBlob ? 'true' : 'false'}</div>
        <div>disabled: {isSubmitDisabled() ? 'true' : 'false'}</div>
        <div><strong>Fix:</strong> Based on description "quay clip", this should be video type</div>
      </div>

      {/* Test Button */}
      <button
        style={{
          background: 'red',
          color: 'white',
          padding: '10px',
          margin: '10px 0',
          border: 'none',
          cursor: 'pointer'
        }}
        onClick={() => {
          console.log('TEST BUTTON CLICKED!');
          alert('Test button works!');
        }}
      >
        🧪 Test Button (Should Always Work)
      </button>

      {/* Submit Button */}
      <button
        className="complete-training-btn"
        onClick={(e) => {
          console.log('Submit button clicked!', {
            disabled: isSubmitDisabled() || isSubmitting,
            event: e,
            target: e.target,
            currentTarget: e.currentTarget
          });
          handleSubmit();
        }}
        disabled={isSubmitDisabled() || isSubmitting}
        style={{
          pointerEvents: 'auto !important' as any,
          cursor: isSubmitDisabled() || isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitDisabled() || isSubmitting ? 0.5 : 1
        }}
      >
        {isSubmitting ? (
          <>
            <span className="submitting-spinner"></span>
            Đang gửi báo cáo...
          </>
        ) : (
          '⚡ Hoàn Thành Rèn Luyện'
        )}
      </button>

      {/* Submitting Overlay */}
      {isSubmitting && (
        <div className="submitting-overlay">
          <div className="submitting-message">
            <span className="submitting-spinner"></span>
            Đang xử lý báo cáo của bạn...
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicQuestReport;