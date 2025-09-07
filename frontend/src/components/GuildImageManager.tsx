import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './GuildImageManager.css';

interface GuildImageData {
  id: string;
  name: string;
  icon: string;
  currentImageUrl: string | null;
  focus: string;
}

const GuildImageManager: React.FC = () => {
  const { userData } = useAuth();
  const [guilds, setGuilds] = useState<GuildImageData[]>([
    {
      id: 'titans',
      name: 'Titans',
      icon: '⚡',
      currentImageUrl: null,
      focus: 'KỶ LUẬT & SỨC MẠNH'
    },
    {
      id: 'illumination',
      name: 'Illumination',
      icon: '🔮',
      currentImageUrl: null,
      focus: 'TRÍ TUỆ & KIẾN THỨC'
    },
    {
      id: 'envoys',
      name: 'Envoys',
      icon: '🌿',
      currentImageUrl: null,
      focus: 'GIAO TIẾP & KẾT NỐI'
    }
  ]);

  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: File}>({});
  const [previewUrls, setPreviewUrls] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadCurrentImages();
  }, []);

  const initializeGuildDocument = async (guildId: string, guildData: GuildImageData) => {
    try {
      const guildDoc = await getDoc(doc(db, 'guilds', guildId));
      if (!guildDoc.exists()) {
        // Create the guild document
        await setDoc(doc(db, 'guilds', guildId), {
          id: guildId,
          name: guildData.name,
          icon: guildData.icon,
          focus: guildData.focus,
          imageUrl: null,
          theme: {
            primary: guildId === 'titans' ? '#FF6B35' : guildId === 'illumination' ? '#4A90E2' : '#50C878',
            secondary: guildId === 'titans' ? '#FF8C42' : guildId === 'illumination' ? '#7BB3F0' : '#6BCF7F',
            accent: guildId === 'titans' ? '#FFB340' : guildId === 'illumination' ? '#A8D0F0' : '#85E89D',
            background: guildId === 'titans' ? 'linear-gradient(135deg, #FF6B35, #FF8C42)' : 
                       guildId === 'illumination' ? 'linear-gradient(135deg, #4A90E2, #7BB3F0)' : 
                       'linear-gradient(135deg, #50C878, #6BCF7F)'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Initialized guild document: ${guildId}`);
      }
    } catch (error) {
      console.error(`Error initializing guild ${guildId}:`, error);
    }
  };

  const loadCurrentImages = async () => {
    try {
      const updatedGuilds = await Promise.all(
        guilds.map(async (guild) => {
          // Initialize guild document if it doesn't exist
          await initializeGuildDocument(guild.id, guild);
          
          const guildDoc = await getDoc(doc(db, 'guilds', guild.id));
          if (guildDoc.exists()) {
            const guildData = guildDoc.data();
            return {
              ...guild,
              currentImageUrl: guildData.imageUrl || null
            };
          }
          return guild;
        })
      );
      setGuilds(updatedGuilds);
    } catch (error) {
      console.error('Error loading current images:', error);
    }
  };

  const handleFileSelect = (guildId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
      return;
    }

    setSelectedFiles(prev => ({
      ...prev,
      [guildId]: file
    }));

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPreviewUrls(prev => ({
      ...prev,
      [guildId]: previewUrl
    }));
  };

  const uploadGuildImage = async (guildId: string) => {
    const file = selectedFiles[guildId];
    if (!file || !userData) {
      return;
    }

    setUploading(guildId);

    try {
      // Upload to Firebase Storage
      const imageRef = ref(storage, `guild_images/${guildId}.png`);
      const uploadResult = await uploadBytes(imageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // Update Firestore document
      const guildDocRef = doc(db, 'guilds', guildId);
      await updateDoc(guildDocRef, {
        imageUrl: downloadUrl,
        updatedAt: new Date(),
        updatedBy: userData.userId
      });

      // Update local state
      setGuilds(prev => prev.map(guild => 
        guild.id === guildId 
          ? { ...guild, currentImageUrl: downloadUrl }
          : guild
      ));

      // Clear selected file and preview
      setSelectedFiles(prev => {
        const updated = { ...prev };
        delete updated[guildId];
        return updated;
      });

      setPreviewUrls(prev => {
        const updated = { ...prev };
        URL.revokeObjectURL(updated[guildId]); // Clean up blob URL
        delete updated[guildId];
        return updated;
      });

      alert(`✅ Hình ảnh Guild ${guilds.find(g => g.id === guildId)?.name} đã được cập nhật thành công!`);

    } catch (error: any) {
      console.error('Error uploading guild image:', error);
      alert(`❌ Lỗi khi tải hình ảnh: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="guild-image-manager">
      <div className="section-header">
        <h2>🏛️ QUẢN LÝ HÌNH ẢNH GUILD</h2>
        <p>Tải lên và quản lý hình ảnh đại diện cho các Guild</p>
      </div>

      <div className="guilds-grid">
        {guilds.map((guild) => (
          <div key={guild.id} className="guild-card">
            <div className="guild-header">
              <div className="guild-info">
                <span className="guild-icon">{guild.icon}</span>
                <div className="guild-details">
                  <h3 className="guild-name">{guild.name}</h3>
                  <p className="guild-focus">{guild.focus}</p>
                </div>
              </div>
            </div>

            <div className="guild-image-section">
              <div className="current-image">
                <label>Hình ảnh hiện tại:</label>
                <div className="image-display">
                  {guild.currentImageUrl ? (
                    <img 
                      src={guild.currentImageUrl} 
                      alt={`${guild.name} current`}
                      className="current-guild-image"
                    />
                  ) : (
                    <div className="no-image">
                      <span>Chưa có hình ảnh</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="upload-section">
                <label htmlFor={`file-${guild.id}`} className="file-input-label">
                  📁 TẢI LÊN HÌNH ẢNH
                </label>
                <input
                  id={`file-${guild.id}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(guild.id, file);
                    }
                  }}
                  className="file-input"
                  disabled={uploading === guild.id}
                />

                {previewUrls[guild.id] && (
                  <div className="preview-section">
                    <label>Xem trước:</label>
                    <img 
                      src={previewUrls[guild.id]} 
                      alt={`${guild.name} preview`}
                      className="preview-image"
                    />
                  </div>
                )}
              </div>

              <div className="action-buttons">
                <button
                  onClick={() => uploadGuildImage(guild.id)}
                  disabled={!selectedFiles[guild.id] || uploading === guild.id}
                  className={`save-button ${!selectedFiles[guild.id] ? 'disabled' : ''}`}
                >
                  {uploading === guild.id ? (
                    <>
                      <span className="spinner"></span>
                      Đang tải lên...
                    </>
                  ) : (
                    <>
                      💾 LƯU THAY ĐỔI
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="instructions">
        <h4>📋 Hướng dẫn:</h4>
        <ul>
          <li>✅ Chỉ chấp nhận file hình ảnh (PNG, JPG, GIF, WebP)</li>
          <li>✅ Kích thước tối đa: 5MB</li>
          <li>✅ Khuyến nghị tỷ lệ: 1:1 (hình vuông) hoặc 3:4 (portrait)</li>
          <li>✅ Hình ảnh sẽ hiển thị trong màn hình "Chọn Guild"</li>
        </ul>
      </div>
    </div>
  );
};

export default GuildImageManager;