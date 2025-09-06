import React, { useState, useEffect } from 'react';
import { storage, db } from '../firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { BackgroundImage, AppConfig } from '../types';
import {
  createThumbnail,
  validateImageFile,
  formatFileSize,
  getImageDimensions,
} from '../utils/imageUtils';
import { errorLogger } from '../utils/errorLogger';
import AuthDebugger from './AuthDebugger';
import './ImprovedBackgroundManager.css';

interface UploadProgress {
  fileName: string;
  progress: number;
  stage:
    | 'validating'
    | 'creating-thumbnail'
    | 'uploading-main'
    | 'uploading-thumbnail'
    | 'saving'
    | 'completed'
    | 'error';
  error?: string;
}

const ImprovedBackgroundManager: React.FC = () => {
  const { userData } = useAuth();
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([]);
  const [currentBackground, setCurrentBackground] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [showDebugger, setShowDebugger] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    loadBackgrounds();
    loadCurrentConfig();
  }, []);

  const loadBackgrounds = async () => {
    try {
      setLoading(true);
      const backgroundsRef = collection(db, 'backgrounds');
      const q = query(backgroundsRef, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);

      const backgroundList: BackgroundImage[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        backgroundList.push({
          id: doc.id,
          ...data,
          // Backward compatibility for old records
          originalName: data.originalName || data.name,
          fileSize: data.fileSize || 0,
          dimensions: data.dimensions || { width: 0, height: 0 },
        } as BackgroundImage);
      });

      setBackgrounds(backgroundList);
    } catch (error) {
      console.error('Error loading backgrounds:', error);
      alert('Lỗi tải danh sách hình nền: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentConfig = async () => {
    try {
      const configCollection = collection(db, 'config');
      const configSnapshot = await getDocs(configCollection);

      if (!configSnapshot.empty) {
        const config = configSnapshot.docs[0].data() as AppConfig;
        setCurrentBackground(config.homePageBackgroundUrl || '');
      }
    } catch (error) {
      console.error('Error loading current config:', error);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setSelectedFiles(files);

    // Create preview URLs
    const previews: string[] = [];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      const validation = validateImageFile(file);
      if (validation.valid) {
        previews.push(URL.createObjectURL(file));
      }
    }
    setPreviewImages(previews);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Check if user is admin
    if (userData?.role !== 'admin') {
      const errorMsg = 'Only administrators can upload background images';
      setLastError(errorMsg);
      errorLogger.logError(
        {
          errorType: 'auth',
          message: errorMsg,
          severity: 'medium',
          component: 'ImprovedBackgroundManager',
          additionalData: {
            userRole: userData?.role,
            userId: userData?.userId,
          },
        },
        userData?.userId
      );
      return;
    }

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      await uploadSingleFile(file);
    }

    // Clean up
    setSelectedFiles(null);
    setPreviewImages([]);
    setUploadProgress(null);

    // Reload backgrounds
    await loadBackgrounds();
  };

  const uploadSingleFile = async (file: File) => {
    const fileName = file.name;

    try {
      // Stage 1: Validation
      setUploadProgress({ fileName, progress: 0, stage: 'validating' });

      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Stage 2: Create thumbnail
      setUploadProgress({
        fileName,
        progress: 20,
        stage: 'creating-thumbnail',
      });

      const thumbnailBlob = await createThumbnail(file, {
        width: 300,
        height: 200,
        quality: 0.8,
      });

      // Stage 3: Upload main image
      setUploadProgress({ fileName, progress: 40, stage: 'uploading-main' });

      const timestamp = Date.now();
      const mainFileName = `${timestamp}-${file.name}`;
      const mainStorageRef = ref(storage, `backgrounds/${mainFileName}`);

      await uploadBytes(mainStorageRef, file);
      const mainDownloadURL = await getDownloadURL(mainStorageRef);

      // Stage 4: Upload thumbnail
      setUploadProgress({
        fileName,
        progress: 70,
        stage: 'uploading-thumbnail',
      });

      const thumbnailFileName = `thumb-${timestamp}-${file.name}`;
      const thumbnailStorageRef = ref(
        storage,
        `backgrounds/thumbnails/${thumbnailFileName}`
      );

      await uploadBytes(thumbnailStorageRef, thumbnailBlob);
      const thumbnailDownloadURL = await getDownloadURL(thumbnailStorageRef);

      // Stage 5: Save to Firestore
      setUploadProgress({ fileName, progress: 90, stage: 'saving' });

      const newBackground: Omit<BackgroundImage, 'id'> = {
        url: mainDownloadURL,
        thumbnailUrl: thumbnailDownloadURL,
        name: mainFileName,
        originalName: file.name,
        fileSize: file.size,
        dimensions,
        uploadedAt: serverTimestamp(),
        uploadedBy: userData?.userId,
      };

      await addDoc(collection(db, 'backgrounds'), newBackground);

      // Stage 6: Completed
      setUploadProgress({ fileName, progress: 100, stage: 'completed' });

      setTimeout(() => {
        if (uploadProgress?.fileName === fileName) {
          setUploadProgress(null);
        }
      }, 2000);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      const errorMessage = error.message || 'Unknown error';
      setLastError(errorMessage);

      // Log the error for admin monitoring
      errorLogger.logUploadError(
        `Background upload failed: ${errorMessage}`,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadStage: uploadProgress?.stage || 'unknown',
          errorCode: error.code,
          errorName: error.name,
          isPermissionError:
            errorMessage.includes('Permission denied') ||
            errorMessage.includes('403') ||
            errorMessage.includes('unauthorized'),
        },
        userData?.userId
      );

      // Check if it's a permission error
      if (
        errorMessage.includes('Permission denied') ||
        errorMessage.includes('403') ||
        errorMessage.includes('unauthorized')
      ) {
        setShowDebugger(true);
      }

      setUploadProgress({
        fileName,
        progress: 0,
        stage: 'error',
        error: errorMessage,
      });
    }
  };

  const selectBackground = async (background: BackgroundImage) => {
    try {
      const configCollection = collection(db, 'config');
      const configSnapshot = await getDocs(configCollection);

      const newConfig = {
        homePageBackgroundUrl: background.url,
        lastUpdated: serverTimestamp(),
        updatedBy: userData?.userId,
      };

      if (configSnapshot.empty) {
        await addDoc(configCollection, newConfig);
      } else {
        const configDoc = configSnapshot.docs[0];
        await updateDoc(doc(db, 'config', configDoc.id), newConfig);
      }

      setCurrentBackground(background.url);
      alert('✅ Đã cập nhật hình nền trang chủ thành công!');
    } catch (error) {
      console.error('Error updating background:', error);
      alert('❌ Lỗi cập nhật hình nền: ' + (error as Error).message);
    }
  };

  const deleteBackground = async (background: BackgroundImage) => {
    const confirmMessage = `Xóa hình nền "${background.originalName}"?\n\nHành động này không thể hoàn tác.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'backgrounds', background.id));

      // Delete main image from Storage
      try {
        const mainStorageRef = ref(storage, background.url);
        await deleteObject(mainStorageRef);
      } catch (storageError) {
        console.warn('Could not delete main image from storage:', storageError);
      }

      // Delete thumbnail from Storage
      if (background.thumbnailUrl) {
        try {
          const thumbnailStorageRef = ref(storage, background.thumbnailUrl);
          await deleteObject(thumbnailStorageRef);
        } catch (storageError) {
          console.warn(
            'Could not delete thumbnail from storage:',
            storageError
          );
        }
      }

      // Update local state
      setBackgrounds(prev => prev.filter(bg => bg.id !== background.id));

      // If this was the current background, clear it
      if (currentBackground === background.url) {
        setCurrentBackground('');
        const configSnapshot = await getDocs(collection(db, 'config'));
        if (!configSnapshot.empty) {
          const configDoc = configSnapshot.docs[0];
          await updateDoc(doc(db, 'config', configDoc.id), {
            homePageBackgroundUrl: '',
            lastUpdated: serverTimestamp(),
            updatedBy: userData?.userId,
          });
        }
      }

      alert('✅ Đã xóa hình nền thành công!');
    } catch (error) {
      console.error('Error deleting background:', error);
      alert('❌ Lỗi xóa hình nền: ' + (error as Error).message);
    }
  };

  const clearSelection = () => {
    setSelectedFiles(null);
    setPreviewImages([]);
    previewImages.forEach(url => URL.revokeObjectURL(url));
  };

  if (loading) {
    return (
      <div className="background-manager-loading">
        <div className="loading-content">
          <div className="loading-icon">🖼️</div>
          <h3>Đang tải danh sách hình nền...</h3>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="improved-background-manager">
      <div className="manager-header">
        <h2 className="manager-title">
          <span className="title-icon">🖼️</span>
          Quản Lý Hình Nền
        </h2>
        <p className="manager-subtitle">
          Tải lên và quản lý hình nền cho trang chủ của học viện
        </p>
      </div>

      {/* Permission Error Banner */}
      {lastError &&
        (lastError.includes('Permission denied') ||
          lastError.includes('403')) && (
          <div className="error-banner">
            <div className="error-content">
              <div className="error-icon">🚫</div>
              <div className="error-details">
                <h3>Lỗi quyền truy cập (403)</h3>
                <p>
                  Không có quyền upload hình ảnh. Chỉ admin mới có thể upload
                  hình nền.
                </p>
                <p>
                  <strong>Lỗi chi tiết:</strong> {lastError}
                </p>
              </div>
              <div className="error-actions">
                <button
                  onClick={() => setShowDebugger(!showDebugger)}
                  className="debug-toggle-btn"
                >
                  {showDebugger ? '🔍 Ẩn Debug' : '🔍 Debug Quyền'}
                </button>
                <button
                  onClick={() => setLastError(null)}
                  className="close-error-btn"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Auth Debugger */}
      {showDebugger && (
        <div className="debugger-section">
          <AuthDebugger />
        </div>
      )}

      {/* Upload Section */}
      <div className="upload-section">
        <h3 className="section-title">📤 Tải lên hình nền mới</h3>

        <div className="upload-area">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="file-input"
            id="background-upload"
          />
          <label htmlFor="background-upload" className="upload-label">
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              <strong>Nhấp để chọn file</strong> hoặc kéo thả vào đây
            </div>
            <div className="upload-hint">
              Hỗ trợ: JPG, PNG, GIF, WebP • Tối đa 10MB • Có thể chọn nhiều file
            </div>
          </label>
        </div>

        {/* File Previews */}
        {selectedFiles && selectedFiles.length > 0 && (
          <div className="file-preview-section">
            <div className="preview-header">
              <h4>Xem trước ({selectedFiles.length} file)</h4>
              <button onClick={clearSelection} className="clear-btn">
                ✕
              </button>
            </div>

            <div className="preview-grid">
              {Array.from(selectedFiles)
                .slice(0, 5)
                .map((file, index) => {
                  const validation = validateImageFile(file);
                  return (
                    <div key={index} className="preview-item">
                      {validation.valid ? (
                        <img
                          src={previewImages[index]}
                          alt={file.name}
                          className="preview-image"
                        />
                      ) : (
                        <div className="preview-error">
                          <span className="error-icon">⚠️</span>
                          <span className="error-text">Lỗi file</span>
                        </div>
                      )}
                      <div className="preview-info">
                        <div className="file-name" title={file.name}>
                          {file.name.length > 20
                            ? file.name.substring(0, 20) + '...'
                            : file.name}
                        </div>
                        <div className="file-size">
                          {formatFileSize(file.size)}
                        </div>
                        {!validation.valid && (
                          <div className="file-error">{validation.error}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              {selectedFiles.length > 5 && (
                <div className="preview-item more-files">
                  <div className="more-icon">+{selectedFiles.length - 5}</div>
                  <div className="more-text">file khác</div>
                </div>
              )}
            </div>

            <div className="upload-actions">
              <button
                onClick={handleUpload}
                disabled={!!uploadProgress}
                className="upload-btn"
              >
                {uploadProgress
                  ? 'Đang tải lên...'
                  : `📤 Tải lên ${selectedFiles.length} file`}
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="upload-progress">
            <div className="progress-header">
              <span className="progress-file">{uploadProgress.fileName}</span>
              <span className="progress-stage">
                {getStageText(uploadProgress.stage)}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress.progress}%` }}
              ></div>
            </div>
            {uploadProgress.error && (
              <div className="progress-error">❌ {uploadProgress.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Current Background Section */}
      {currentBackground && (
        <div className="current-background-section">
          <h3 className="section-title">✅ Hình nền hiện tại</h3>
          <div className="current-background-card">
            <img
              src={currentBackground}
              alt="Current background"
              className="current-background-image"
            />
            <div className="current-background-info">
              <div className="current-background-label">
                Đang được sử dụng làm hình nền trang chủ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backgrounds Grid */}
      <div className="backgrounds-section">
        <h3 className="section-title">
          🖼️ Thư viện hình nền ({backgrounds.length})
        </h3>

        {backgrounds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <h4>Chưa có hình nền nào</h4>
            <p>Hãy tải lên hình nền đầu tiên để bắt đầu trang trí học viện!</p>
          </div>
        ) : (
          <div className="backgrounds-grid">
            {backgrounds.map(background => (
              <div
                key={background.id}
                className={`background-card ${
                  currentBackground === background.url ? 'current' : ''
                }`}
              >
                <div className="background-image-container">
                  <img
                    src={background.thumbnailUrl || background.url}
                    alt={background.originalName}
                    className="background-image"
                    onError={e => {
                      // Fallback to main image if thumbnail fails
                      const target = e.target as HTMLImageElement;
                      if (target.src !== background.url) {
                        target.src = background.url;
                      }
                    }}
                  />
                  {currentBackground === background.url && (
                    <div className="current-badge">✅ Đang dùng</div>
                  )}
                </div>

                <div className="background-info">
                  <h4
                    className="background-name"
                    title={background.originalName}
                  >
                    {background.originalName}
                  </h4>

                  <div className="background-metadata">
                    <div className="metadata-item">
                      <span className="metadata-label">📏</span>
                      <span className="metadata-value">
                        {background.dimensions.width} ×{' '}
                        {background.dimensions.height}
                      </span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">💾</span>
                      <span className="metadata-value">
                        {formatFileSize(background.fileSize)}
                      </span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">📅</span>
                      <span className="metadata-value">
                        {background.uploadedAt?.seconds
                          ? new Date(
                              background.uploadedAt.seconds * 1000
                            ).toLocaleDateString('vi-VN')
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="background-actions">
                  <button
                    onClick={() => selectBackground(background)}
                    disabled={currentBackground === background.url}
                    className={`action-btn select-btn ${
                      currentBackground === background.url ? 'disabled' : ''
                    }`}
                    title={
                      currentBackground === background.url
                        ? 'Đã được chọn'
                        : 'Chọn làm hình nền'
                    }
                  >
                    {currentBackground === background.url
                      ? '✅ Đang dùng'
                      : '🎯 Chọn'}
                  </button>

                  <button
                    onClick={() => deleteBackground(background)}
                    className="action-btn delete-btn"
                    title="Xóa hình nền này"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get stage text
const getStageText = (stage: UploadProgress['stage']): string => {
  switch (stage) {
    case 'validating':
      return '🔍 Đang kiểm tra file...';
    case 'creating-thumbnail':
      return '🖼️ Đang tạo thumbnail...';
    case 'uploading-main':
      return '📤 Đang tải ảnh gốc...';
    case 'uploading-thumbnail':
      return '📤 Đang tải thumbnail...';
    case 'saving':
      return '💾 Đang lưu thông tin...';
    case 'completed':
      return '✅ Hoàn thành!';
    case 'error':
      return '❌ Có lỗi xảy ra';
    default:
      return '';
  }
};

export default ImprovedBackgroundManager;
