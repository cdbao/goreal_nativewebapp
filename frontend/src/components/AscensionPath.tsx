import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AscensionPath.css';

interface Level {
  id: number;
  name: string;
  englishName: string;
  icon: string;
  requiredAura: number;
  description: string;
  rewards: {
    icon: string;
    name: string;
    description: string;
  }[];
  isUnlocked: boolean;
  isCurrent: boolean;
}

const AscensionPath: React.FC = () => {
  const { userData } = useAuth();
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const [hoveredReward, setHoveredReward] = useState<{ levelId: number; rewardIndex: number } | null>(null);

  const levels: Level[] = [
    {
      id: 0,
      name: "KHỞI SINH",
      englishName: "GENESIS",
      icon: "🔰",
      requiredAura: 0,
      description: "Bước đầu tiên của hành trình. Mọi Vệ Thần đều bắt đầu từ đây.",
      rewards: [
        { icon: "🎯", name: "Nhiệm Vụ Đầu Tiên", description: "Quyền truy cập vào hệ thống nhiệm vụ cơ bản" },
        { icon: "📊", name: "Theo Dõi Tiến Trình", description: "Có thể xem thống kê AURA và streak cá nhân" }
      ],
      isUnlocked: true,
      isCurrent: false
    },
    {
      id: 1,
      name: "MÔN SINH",
      englishName: "ACOLYTE", 
      icon: "📜",
      requiredAura: 100,
      description: "Học hỏi những kiến thức nền tảng và rèn luyện kỷ luật bản thân.",
      rewards: [
        { icon: "🔥", name: "Lửa Ý Chí", description: "Tăng 10% tốc độ tích lũy AURA từ nhiệm vụ hàng ngày" },
        { icon: "📚", name: "Sách Hướng Dẫn", description: "Mở khóa thêm nhiều loại nhiệm vụ đa dạng" }
      ],
      isUnlocked: false,
      isCurrent: false
    },
    {
      id: 2,
      name: "CHẤP SỰ",
      englishName: "GUARDIAN",
      icon: "🛡️", 
      requiredAura: 500,
      description: "Bảo vệ bản thân khỏi sự cám dỗ và xây dựng thói quen bền vững.",
      rewards: [
        { icon: "🛡️", name: "Giáp Tay Bền Bỉ", description: "Giảm 15% penalty khi miss streak, dễ dàng phục hồi động lực" },
        { icon: "⚡", name: "Năng Lượng Tập Trung", description: "Bonus AURA khi hoàn thành liên tiếp nhiệm vụ trong ngày" }
      ],
      isUnlocked: false,
      isCurrent: false
    },
    {
      id: 3,
      name: "SƯ HUYNH/TỶ", 
      englishName: "WARRIOR",
      icon: "⚔️",
      requiredAura: 1500,
      description: "Trở thành tấm gương cho những người mới và chia sẻ kinh nghiệm.",
      rewards: [
        { icon: "👥", name: "Quyền Cố Vấn", description: "Có thể hướng dẫn và hỗ trợ Môn Sinh mới" },
        { icon: "🏆", name: "Danh Hiệu Chiến Binh", description: "Hiển thị danh hiệu đặc biệt trên profile" }
      ],
      isUnlocked: false,
      isCurrent: false
    },
    {
      id: 4,
      name: "CHÂN NHÂN",
      englishName: "SAGE",
      icon: "👑",
      requiredAura: 5000,
      description: "Đạt được sự cân bằng hoàn hảo giữa rèn luyện và đời thực.",
      rewards: [
        { icon: "🌟", name: "Aura Chân Nhân", description: "AURA decay chậm hơn 50% khi không hoạt động" },
        { icon: "🎭", name: "Quyền Tùy Chỉnh", description: "Tùy chỉnh giao diện và tạo nhiệm vụ cá nhân" }
      ],
      isUnlocked: false,
      isCurrent: false
    },
    {
      id: 5,
      name: "HUYỀN THOẠI",
      englishName: "LEGENDARY",
      icon: "✨",
      requiredAura: 10000,
      description: "Những huyền thoại sống, nguồn cảm hứng cho toàn bộ Titans' Guild.",
      rewards: [
        { icon: "🌈", name: "Hào Quang Huyền Thoại", description: "Aura trail đặc biệt hiển thị sau tên" },
        { icon: "🔮", name: "Quyền Tối Thượng", description: "Truy cập vào các tính năng độc quyền và sự kiện đặc biệt" }
      ],
      isUnlocked: false,
      isCurrent: false
    }
  ];

  const [processedLevels, setProcessedLevels] = useState<Level[]>(levels);

  useEffect(() => {
    if (!userData) return;

    const currentAura = userData.currentAura || 0;
    
    // Find current level based on AURA
    let currentLevelIndex = 0;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (currentAura >= levels[i].requiredAura) {
        currentLevelIndex = i;
        break;
      }
    }
    
    const updatedLevels = levels.map((level, index) => {
      const isUnlocked = currentAura >= level.requiredAura;
      const isCurrent = index === currentLevelIndex;
      
      return {
        ...level,
        isUnlocked,
        isCurrent
      };
    });

    setProcessedLevels(updatedLevels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const getCurrentLevel = (aura: number): number => {
    for (let i = levels.length - 1; i >= 0; i--) {
      if (aura >= levels[i].requiredAura) {
        return i;
      }
    }
    return 0;
  };

  const getProgressToNextLevel = (aura: number, currentLevelIndex: number): number => {
    if (currentLevelIndex >= levels.length - 1) return 100;
    
    const currentLevel = levels[currentLevelIndex];
    const nextLevel = levels[currentLevelIndex + 1];
    
    const progress = ((aura - currentLevel.requiredAura) / (nextLevel.requiredAura - currentLevel.requiredAura)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const currentAura = userData?.currentAura || 0;
  const currentLevelIndex = getCurrentLevel(currentAura);
  const progressToNext = getProgressToNextLevel(currentAura, currentLevelIndex);

  return (
    <div 
      className="ascension-path"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e17 0%, #1a1a2e 30%, #16213e 70%, #0f1419 100%)',
        backgroundAttachment: 'fixed',
        padding: '2rem',
        position: 'relative',
        overflowX: 'hidden',
        color: 'white'
      }}
    >
      <div className="path-header">
        <h2 
          className="path-title"
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '800',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF6B6B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 2px 2px 8px rgba(0, 0, 0, 0.8)',
            filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.5))'
          }}
        >
          <span className="title-icon" style={{ display: 'block', fontSize: '0.8em', marginBottom: '0.5rem' }}>🏔️</span>
          Con Đường Thăng Cấp
        </h2>
        <p 
          className="path-subtitle"
          style={{
            fontSize: '1.3rem',
            color: 'rgba(255, 255, 255, 0.95)',
            marginBottom: '2rem',
            textShadow: '1px 1px 3px rgba(0, 0, 0, 0.7)',
            fontWeight: '500'
          }}
        >
          Hành trình từ Khởi Sinh đến Huyền Thoại - Aethelgard
        </p>
        
        <div className="current-status">
          <div className="current-level">
            <span className="current-icon">{processedLevels[currentLevelIndex]?.icon}</span>
            <div className="current-info">
              <h3>{processedLevels[currentLevelIndex]?.name}</h3>
              <p>AURA hiện tại: <span className="aura-count">{currentAura}</span></p>
            </div>
          </div>
          
          {currentLevelIndex < levels.length - 1 && (
            <div className="next-level-progress">
              <div className="progress-label">
                Tiến trình đến {processedLevels[currentLevelIndex + 1]?.name}
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${progressToNext}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {Math.round(progressToNext)}%
                </div>
              </div>
              <div className="aura-needed">
                Cần thêm: <span>{levels[currentLevelIndex + 1].requiredAura - currentAura} AURA</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ascension-road">
        <div className="road-path">
          {processedLevels.map((level, index) => (
            <div key={level.id} className="road-segment">
              {/* Connection Line */}
              {index > 0 && (
                <div className={`connection-line ${level.isUnlocked ? 'unlocked' : 'locked'}`}>
                  <div className="line-flow"></div>
                </div>
              )}
              
              {/* Level Card */}
              <div 
                className={`level-card ${level.isUnlocked ? 'unlocked' : 'locked'} ${level.isCurrent ? 'current' : ''}`}
                onMouseEnter={() => setHoveredLevel(level.id)}
                onMouseLeave={() => setHoveredLevel(null)}
              >
                <div className="level-icon-container">
                  <div className="level-icon">
                    {level.isUnlocked ? level.icon : '🔒'}
                  </div>
                  {level.isCurrent && <div className="current-glow"></div>}
                </div>
                
                <div className="level-info">
                  <div className="level-header">
                    <h3 
                      className="level-name"
                      style={{
                        fontSize: '1.8rem',
                        fontWeight: '800',
                        color: '#00E5FF',
                        marginBottom: '0.5rem',
                        textShadow: '0 0 10px rgba(0, 229, 255, 0.6), 1px 1px 3px rgba(0, 0, 0, 0.8)',
                        filter: 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.4))'
                      }}
                    >
                      {level.name}
                    </h3>
                    <p className="level-english">{level.englishName}</p>
                    <div className="aura-requirement">
                      {level.requiredAura > 0 ? `${level.requiredAura} AURA` : 'Điểm bắt đầu'}
                    </div>
                  </div>
                  
                  <p className="level-description">{level.description}</p>
                  
                  <div className="level-rewards">
                    <h4>Phần thưởng:</h4>
                    <div className="rewards-list">
                      {level.rewards.map((reward, rewardIndex) => (
                        <div 
                          key={rewardIndex}
                          className={`reward-item ${level.isUnlocked ? 'unlocked' : 'locked'}`}
                          onMouseEnter={() => setHoveredReward({ levelId: level.id, rewardIndex })}
                          onMouseLeave={() => setHoveredReward(null)}
                        >
                          <span className="reward-icon">
                            {level.isUnlocked ? reward.icon : '🔒'}
                          </span>
                          <span className="reward-name">{reward.name}</span>
                          
                          {/* Reward Tooltip */}
                          {hoveredReward?.levelId === level.id && 
                           hoveredReward?.rewardIndex === rewardIndex && (
                            <div className="reward-tooltip">
                              <div className="tooltip-content">
                                <strong>{reward.name}</strong>
                                <p>{reward.description}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Level Hover Effects */}
                {hoveredLevel === level.id && level.isUnlocked && (
                  <div className="level-hover-glow"></div>
                )}
                
                {/* Unlock Animation (placeholder for future use) */}
                {level.isUnlocked && (
                  <div className="unlock-particles">
                    <div className="particle particle-1"></div>
                    <div className="particle particle-2"></div>
                    <div className="particle particle-3"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Road End Glow */}
        <div className="road-end">
          <div className="end-glow"></div>
          <p className="path-complete-text">
            {currentLevelIndex === levels.length - 1 
              ? "🎉 Bạn đã đạt đến đỉnh cao Huyền Thoại!" 
              : "Hành trình vẫn còn tiếp tục..."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AscensionPath;