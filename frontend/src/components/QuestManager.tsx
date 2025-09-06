import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Quest, GuildId } from '../types';
import { GUILDS, getGuildDisplayName } from '../constants/guilds';
import './QuestManager.css';

interface QuestFormData {
  title: string;
  description: string;
  auraReward: number;
  isActive: boolean;
  guild: GuildId;
  reportType: 'image' | 'text' | 'audio' | 'video';
}

const QuestManager: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [formData, setFormData] = useState<QuestFormData>({
    title: '',
    description: '',
    auraReward: 50,
    isActive: true,
    guild: 'titans',
    reportType: 'image'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      setLoading(true);
      const questsQuery = query(collection(db, 'quests'), orderBy('title', 'asc'));
      const questSnapshot = await getDocs(questsQuery);
      
      const questList: Quest[] = [];
      questSnapshot.forEach((doc) => {
        questList.push({
          questId: doc.id,
          ...doc.data()
        } as Quest);
      });
      
      setQuests(questList);
    } catch (error) {
      console.error('Error fetching quests:', error);
      alert('Lỗi khi tải danh sách quest');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      title: '',
      description: '',
      auraReward: 50,
      isActive: true,
      guild: 'titans',
      reportType: 'image'
    });
    setShowCreateModal(true);
  };

  const openEditModal = (quest: Quest) => {
    setEditingQuest(quest);
    setFormData({
      title: quest.title,
      description: quest.description,
      auraReward: quest.auraReward,
      isActive: quest.isActive,
      guild: quest.guild,
      reportType: quest.reportType
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingQuest(null);
    setFormData({
      title: '',
      description: '',
      auraReward: 50,
      isActive: true,
      guild: 'titans',
      reportType: 'image'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'auraReward') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateQuest = async () => {
    if (!formData.title.trim() || !formData.description.trim() || formData.auraReward < 1) {
      alert('Vui lòng điền đầy đủ thông tin và đảm bảo phần thưởng AURA > 0');
      return;
    }

    try {
      setSubmitting(true);
      
      const newQuestData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        auraReward: formData.auraReward,
        isActive: formData.isActive,
        guild: formData.guild,
        reportType: formData.reportType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'quests'), newQuestData);
      
      // Add to local state
      const newQuest: Quest = {
        questId: docRef.id,
        ...newQuestData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setQuests(prev => [...prev, newQuest].sort((a, b) => a.title.localeCompare(b.title)));
      closeModals();
      alert('✅ Tạo quest mới thành công!');
      
    } catch (error) {
      console.error('Error creating quest:', error);
      alert('❌ Lỗi khi tạo quest mới');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditQuest = async () => {
    if (!editingQuest || !formData.title.trim() || !formData.description.trim() || formData.auraReward < 1) {
      alert('Vui lòng điền đầy đủ thông tin và đảm bảo phần thưởng AURA > 0');
      return;
    }

    try {
      setSubmitting(true);
      
      const questRef = doc(db, 'quests', editingQuest.questId);
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        auraReward: formData.auraReward,
        isActive: formData.isActive,
        guild: formData.guild,
        updatedAt: serverTimestamp()
      };

      await updateDoc(questRef, updateData);
      
      // Update local state
      setQuests(prev => prev.map(quest => 
        quest.questId === editingQuest.questId 
          ? { ...quest, ...updateData, updatedAt: new Date() }
          : quest
      ).sort((a, b) => a.title.localeCompare(b.title)));
      
      closeModals();
      alert('✅ Cập nhật quest thành công!');
      
    } catch (error) {
      console.error('Error updating quest:', error);
      alert('❌ Lỗi khi cập nhật quest');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleQuestStatus = async (quest: Quest) => {
    try {
      const questRef = doc(db, 'quests', quest.questId);
      const newStatus = !quest.isActive;
      
      await updateDoc(questRef, { 
        isActive: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setQuests(prev => prev.map(q => 
        q.questId === quest.questId 
          ? { ...q, isActive: newStatus, updatedAt: new Date() }
          : q
      ));
      
      alert(`✅ Quest đã được ${newStatus ? 'kích hoạt' : 'tắt'}`);
      
    } catch (error) {
      console.error('Error toggling quest status:', error);
      alert('❌ Lỗi khi thay đổi trạng thái quest');
    }
  };

  const activeQuestsCount = quests.filter(q => q.isActive).length;
  const inactiveQuestsCount = quests.filter(q => !q.isActive).length;

  if (loading) {
    return (
      <div className="quest-manager">
        <div className="loading-state">
          <div className="loading-icon">⚔️</div>
          <h3>Đang tải danh sách quest...</h3>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="quest-manager">
      <div className="manager-header">
        <h2 className="manager-title">
          <span className="title-icon">⚔️</span>
          Quản Lý Quest
        </h2>
        <p className="manager-subtitle">
          Tạo, sửa và quản lý tất cả các nhiệm vụ trong Lò Rèn Titan
        </p>

        {/* Statistics */}
        <div className="quest-stats">
          <div className="stat-card active">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="stat-number">{activeQuestsCount}</span>
              <span className="stat-label">Quest đang hoạt động</span>
            </div>
          </div>
          <div className="stat-card inactive">
            <div className="stat-icon">❌</div>
            <div className="stat-info">
              <span className="stat-number">{inactiveQuestsCount}</span>
              <span className="stat-label">Quest đã tắt</span>
            </div>
          </div>
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-number">{quests.length}</span>
              <span className="stat-label">Tổng cộng</span>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="action-bar">
          <button 
            className="create-button"
            onClick={openCreateModal}
          >
            <span className="button-icon">➕</span>
            Tạo Quest Mới
          </button>
        </div>
      </div>

      <div className="manager-content">
        {quests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Chưa có quest nào</h3>
            <p>Hãy tạo quest đầu tiên để bắt đầu cuộc phiêu lưu!</p>
            <button 
              className="create-button primary"
              onClick={openCreateModal}
            >
              ➕ Tạo Quest Đầu Tiên
            </button>
          </div>
        ) : (
          <div className="quest-table-container">
            <div className="table-wrapper">
              <table className="quest-table">
                <thead>
                  <tr>
                    <th>Tên Quest</th>
                    <th>Mô tả</th>
                    <th>Guild</th>
                    <th>AURA</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {quests.map((quest) => (
                    <tr key={quest.questId} className={quest.isActive ? 'active' : 'inactive'}>
                      <td className="quest-title-cell">
                        <div className="quest-title">{quest.title}</div>
                      </td>
                      <td className="quest-description-cell">
                        <div className="quest-description-preview">
                          {quest.description.length > 100 
                            ? quest.description.substring(0, 100) + '...'
                            : quest.description
                          }
                        </div>
                      </td>
                      <td className="guild-cell">
                        <div className="guild-info">
                          <span className="guild-icon">{GUILDS[quest.guild].icon}</span>
                          <span className="guild-name">{getGuildDisplayName(quest.guild)}</span>
                        </div>
                      </td>
                      <td className="aura-cell">
                        <div className="aura-reward">
                          <span className="aura-icon">🔥</span>
                          <span className="aura-amount">{quest.auraReward}</span>
                        </div>
                      </td>
                      <td className="status-cell">
                        <div className={`status-badge ${quest.isActive ? 'active' : 'inactive'}`}>
                          <span className="status-icon">
                            {quest.isActive ? '✅' : '❌'}
                          </span>
                          <span className="status-text">
                            {quest.isActive ? 'Hoạt động' : 'Đã tắt'}
                          </span>
                        </div>
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button
                            className="edit-button"
                            onClick={() => openEditModal(quest)}
                            title="Chỉnh sửa quest"
                          >
                            <span className="button-icon">✏️</span>
                            Sửa
                          </button>
                          <button
                            className={`toggle-button ${quest.isActive ? 'deactivate' : 'activate'}`}
                            onClick={() => toggleQuestStatus(quest)}
                            title={quest.isActive ? 'Tắt quest' : 'Bật quest'}
                          >
                            <span className="button-icon">
                              {quest.isActive ? '⏸️' : '▶️'}
                            </span>
                            {quest.isActive ? 'Tắt' : 'Bật'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Quest Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <span className="modal-icon">➕</span>
                Tạo Quest Mới
              </h3>
              <button 
                className="close-button"
                onClick={closeModals}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateQuest(); }}>
                <div className="form-group">
                  <label htmlFor="title">
                    <span className="field-icon">📝</span>
                    Tên Quest *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Rèn luyện sức mạnh hàng ngày"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">
                    <span className="field-icon">📋</span>
                    Mô tả chi tiết *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Mô tả chi tiết về nhiệm vụ, yêu cầu cần hoàn thành..."
                    rows={4}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="guild">
                    <span className="field-icon">⚔️</span>
                    Thuộc Guild *
                  </label>
                  <select
                    id="guild"
                    name="guild"
                    value={formData.guild}
                    onChange={handleInputChange}
                    required
                  >
                    {Object.values(GUILDS).map((guild) => (
                      <option key={guild.id} value={guild.id}>
                        {guild.icon} {guild.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="reportType">
                    <span className="field-icon">📋</span>
                    Loại báo cáo *
                  </label>
                  <select
                    id="reportType"
                    name="reportType"
                    value={formData.reportType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="image">📸 Hình ảnh</option>
                    <option value="text">📝 Văn bản</option>
                    <option value="audio">🎤 Ghi âm</option>
                    <option value="video">🎥 Video</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="auraReward">
                    <span className="field-icon">🔥</span>
                    Phần thưởng AURA *
                  </label>
                  <input
                    type="number"
                    id="auraReward"
                    name="auraReward"
                    value={formData.auraReward}
                    onChange={handleInputChange}
                    min="1"
                    max="1000"
                    required
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label htmlFor="isActive" className="checkbox-label">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    <span className="field-icon">⚡</span>
                    Kích hoạt quest ngay sau khi tạo
                  </label>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button"
                onClick={closeModals}
                disabled={submitting}
              >
                Hủy
              </button>
              <button 
                className="submit-button"
                onClick={handleCreateQuest}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="button-spinner"></div>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <span className="button-icon">💾</span>
                    Lưu Quest
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quest Modal */}
      {showEditModal && editingQuest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <span className="modal-icon">✏️</span>
                Chỉnh Sửa Quest
              </h3>
              <button 
                className="close-button"
                onClick={closeModals}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleEditQuest(); }}>
                <div className="form-group">
                  <label htmlFor="edit-title">
                    <span className="field-icon">📝</span>
                    Tên Quest *
                  </label>
                  <input
                    type="text"
                    id="edit-title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Rèn luyện sức mạnh hàng ngày"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-description">
                    <span className="field-icon">📋</span>
                    Mô tả chi tiết *
                  </label>
                  <textarea
                    id="edit-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Mô tả chi tiết về nhiệm vụ, yêu cầu cần hoàn thành..."
                    rows={4}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-guild">
                    <span className="field-icon">⚔️</span>
                    Thuộc Guild *
                  </label>
                  <select
                    id="edit-guild"
                    name="guild"
                    value={formData.guild}
                    onChange={handleInputChange}
                    required
                  >
                    {Object.values(GUILDS).map((guild) => (
                      <option key={guild.id} value={guild.id}>
                        {guild.icon} {guild.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-reportType">
                    <span className="field-icon">📋</span>
                    Loại báo cáo *
                  </label>
                  <select
                    id="edit-reportType"
                    name="reportType"
                    value={formData.reportType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="image">📸 Hình ảnh</option>
                    <option value="text">📝 Văn bản</option>
                    <option value="audio">🎤 Ghi âm</option>
                    <option value="video">🎥 Video</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-auraReward">
                    <span className="field-icon">🔥</span>
                    Phần thưởng AURA *
                  </label>
                  <input
                    type="number"
                    id="edit-auraReward"
                    name="auraReward"
                    value={formData.auraReward}
                    onChange={handleInputChange}
                    min="1"
                    max="1000"
                    required
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label htmlFor="edit-isActive" className="checkbox-label">
                    <input
                      type="checkbox"
                      id="edit-isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    <span className="field-icon">⚡</span>
                    Quest đang hoạt động
                  </label>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button"
                onClick={closeModals}
                disabled={submitting}
              >
                Hủy
              </button>
              <button 
                className="submit-button"
                onClick={handleEditQuest}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="button-spinner"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <span className="button-icon">💾</span>
                    Lưu Thay Đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestManager;