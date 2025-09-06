import React, { useState, useEffect } from 'react';
import { storage, db } from '../firebase';
import { serverTimestamp } from 'firebase/firestore';
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
} from 'firebase/firestore';
import { BackgroundImage, AppConfig } from '../types';

const BackgroundManager: React.FC = () => {
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([]);
  const [currentBackground, setCurrentBackground] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBackgrounds();
    loadCurrentConfig();
  }, []);

  const loadBackgrounds = async () => {
    try {
      const backgroundsRef = collection(db, 'backgrounds');
      const q = query(backgroundsRef, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);

      const backgroundList: BackgroundImage[] = [];
      snapshot.forEach(doc => {
        backgroundList.push({ id: doc.id, ...doc.data() } as BackgroundImage);
      });

      setBackgrounds(backgroundList);
    } catch (error) {
      console.error('Error loading backgrounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentConfig = async () => {
    try {
      const configDoc = await getDocs(collection(db, 'config'));
      if (!configDoc.empty) {
        const config = configDoc.docs[0].data() as AppConfig;
        setCurrentBackground(config.homePageBackgroundUrl);
      }
    } catch (error) {
      console.error('Error loading current config:', error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File phải nhỏ hơn 5MB');
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const storageRef = ref(storage, `backgrounds/${fileName}`);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const newBackground: Omit<BackgroundImage, 'id'> = {
        url: downloadURL,
        thumbnailUrl: downloadURL, // Fallback: use same URL as thumbnail
        name: file.name,
        originalName: file.name,
        fileSize: file.size,
        dimensions: { width: 0, height: 0 }, // Will be updated later if needed
        uploadedAt: serverTimestamp() as any, // Firebase timestamp
        uploadedBy: 'legacy', // Mark as legacy upload
      };

      const docRef = await addDoc(collection(db, 'backgrounds'), newBackground);

      setBackgrounds(prev => [
        {
          id: docRef.id,
          ...newBackground,
        },
        ...prev,
      ]);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Lỗi upload hình ảnh');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const selectBackground = async (background: BackgroundImage) => {
    try {
      const configCollection = collection(db, 'config');
      const configSnapshot = await getDocs(configCollection);

      const newConfig = {
        homePageBackgroundUrl: background.url,
      };

      if (configSnapshot.empty) {
        await addDoc(configCollection, newConfig);
      } else {
        const configDoc = configSnapshot.docs[0];
        await updateDoc(doc(db, 'config', configDoc.id), newConfig);
      }

      setCurrentBackground(background.url);
      alert('Đã cập nhật hình nền trang chủ');
    } catch (error) {
      console.error('Error updating background:', error);
      alert('Lỗi cập nhật hình nền');
    }
  };

  const deleteBackground = async (background: BackgroundImage) => {
    if (!window.confirm('Xóa hình nền này?')) return;

    try {
      await deleteDoc(doc(db, 'backgrounds', background.id));

      const storageRef = ref(storage, background.url);
      await deleteObject(storageRef);

      setBackgrounds(prev => prev.filter(bg => bg.id !== background.id));

      if (currentBackground === background.url) {
        setCurrentBackground('');
        const configSnapshot = await getDocs(collection(db, 'config'));
        if (!configSnapshot.empty) {
          const configDoc = configSnapshot.docs[0];
          await updateDoc(doc(db, 'config', configDoc.id), {
            homePageBackgroundUrl: '',
          });
        }
      }
    } catch (error) {
      console.error('Error deleting background:', error);
      alert('Lỗi xóa hình nền');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-xl">⚔️ Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">
          🖼️ Quản lý hình nền trang chủ
        </h2>

        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-yellow-600">
          <h3 className="text-lg font-semibold mb-2">📤 Upload hình nền mới</h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-600 file:text-black hover:file:bg-yellow-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            Hỗ trợ: JPG, PNG, GIF. Tối đa 5MB
          </p>
          {uploading && (
            <p className="text-yellow-400 mt-2">⏳ Đang upload...</p>
          )}
        </div>

        {currentBackground && (
          <div className="mb-6 p-4 bg-green-900 rounded-lg border border-green-600">
            <h3 className="text-lg font-semibold mb-2">✅ Hình nền hiện tại</h3>
            <img
              src={currentBackground}
              alt="Current background"
              className="w-32 h-20 object-cover rounded border border-green-400"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {backgrounds.map(background => (
          <div
            key={background.id}
            className={`bg-gray-800 rounded-lg p-4 border-2 transition-colors ${
              currentBackground === background.url
                ? 'border-green-500 bg-green-900'
                : 'border-gray-600 hover:border-yellow-500'
            }`}
          >
            <img
              src={background.url}
              alt={background.name}
              className="w-full h-32 object-cover rounded mb-3"
            />

            <h4
              className="text-sm font-semibold mb-2 truncate"
              title={background.name}
            >
              {background.name}
            </h4>

            <p className="text-xs text-gray-400 mb-3">
              {new Date(
                background.uploadedAt?.seconds * 1000
              ).toLocaleDateString('vi-VN')}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => selectBackground(background)}
                disabled={currentBackground === background.url}
                className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition-colors ${
                  currentBackground === background.url
                    ? 'bg-green-600 text-white cursor-not-allowed'
                    : 'bg-yellow-600 text-black hover:bg-yellow-500'
                }`}
              >
                {currentBackground === background.url
                  ? '✅ Đang dùng'
                  : '🎯 Chọn'}
              </button>

              <button
                onClick={() => deleteBackground(background)}
                className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-500 transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {backgrounds.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-xl font-semibold mb-2">Chưa có hình nền nào</h3>
          <p className="text-gray-400">Upload hình nền đầu tiên để bắt đầu</p>
        </div>
      )}
    </div>
  );
};

export default BackgroundManager;
