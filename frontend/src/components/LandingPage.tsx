import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CommunityStats from './CommunityStats';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);

      const sections = document.querySelectorAll('.section');
      const scrollPosition = window.scrollY + window.innerHeight / 2;

      sections.forEach((section, index) => {
        const element = section as HTMLElement;
        const top = element.offsetTop;
        const height = element.offsetHeight;

        if (scrollPosition >= top && scrollPosition < top + height) {
          setCurrentSection(index);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionIndex: number) => {
    const section = document.querySelector(`.section-${sectionIndex}`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation Dots */}
      <div className="scroll-navigation">
        {[0, 1, 2, 3].map(index => (
          <button
            key={index}
            className={`nav-dot ${currentSection === index ? 'active' : ''}`}
            onClick={() => scrollToSection(index)}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="section section-0 hero-section">
        <div
          className="hero-background"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`,
            opacity: Math.max(0, 1 - scrollY / 800),
          }}
        >
          <div className="aethelgard-island">
            <div className="island-glow"></div>
            <div className="floating-particles">
              {[...Array(20)].map((_, i) => (
                <div key={i} className={`particle particle-${i + 1}`}></div>
              ))}
            </div>
          </div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line-1">Tiếng Gọi Từ</span>
            <span className="title-line-2">Hòn Đảo Huyền Thoại</span>
          </h1>
          <p className="hero-subtitle">
            Khám phá thế giới Aethelgard và trở thành Vệ Thần của chính mình
          </p>
          <div className="hero-cta">
            <button
              className="scroll-hint"
              onClick={() => scrollToSection(1)}
              aria-label="Scroll to learn more"
            >
              <span>Khám phá câu chuyện</span>
              <div className="scroll-arrow">
                <div className="arrow-down"></div>
              </div>
            </button>
          </div>
        </div>

        <div className="hero-overlay"></div>
      </section>

      {/* Threat Section */}
      <section className="section section-1 threat-section">
        <div
          className="threat-background"
          style={{
            transform: `translateY(${(scrollY - window.innerHeight) * 0.3}px)`,
          }}
        ></div>

        <div className="section-content">
          <div className="threat-content">
            <h2 className="section-title darkness-title">
              <span className="title-icon">⚡</span>
              Sự Suy Yếu Của AURA
            </h2>

            <div className="threat-story">
              <div className="story-block">
                <div className="story-icon">🌑</div>
                <h3>Bóng Tối Trì Hoãn</h3>
                <p>
                  Một thế lực đen tối đang lan rộng khắp Aethelgard, khiến cho
                  sức mạnh AURA của các Vệ Thần ngày càng suy yếu. Đó chính là
                  "Sự Trì Hoãn" - kẻ thù nguy hiểm nhất của mọi chiến binh.
                </p>
              </div>

              <div className="story-block">
                <div className="story-icon">💔</div>
                <h3>Mất Đi Động Lực</h3>
                <p>
                  Khi Sự Trì Hoãn xâm chiếm tâm hồn, các Vệ Thần mất đi khát
                  vọng chiến đấu, không còn rèn luyện bản thân và dần trở nên
                  yếu đuối trước thử thách.
                </p>
              </div>

              <div className="story-block">
                <div className="story-icon">🌪️</div>
                <h3>Thế Giới Đang Lung Lay</h3>
                <p>
                  Nếu không có những Vệ Thần mạnh mẽ để bảo vệ, hòn đảo
                  Aethelgard sẽ chìm vào bóng tối vĩnh viễn. Thời gian đang cạn
                  kiệt...
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hope Section */}
      <section className="section section-2 hope-section">
        <div
          className="hope-background"
          style={{
            transform: `translateY(${(scrollY - window.innerHeight * 2) * 0.2}px)`,
          }}
        ></div>

        <div className="section-content">
          <div className="hope-content">
            <h2 className="section-title hope-title">
              <span className="title-icon">🏛️</span>
              Học Viện GoREAL - Hy Vọng Cuối Cùng
            </h2>

            <div className="academy-story">
              <div className="academy-intro">
                <div className="academy-emblem">
                  <div className="emblem-inner">
                    <div className="emblem-symbol">⚔️</div>
                  </div>
                </div>
                <p className="academy-description">
                  Trong lúc thế giới tối tăm nhất, Học Viện GoREAL được thành
                  lập với một sứ mệnh thiêng liêng: biến những thử thách ảo
                  thành sức mạnh thực sự.
                </p>
              </div>

              <div className="philosophy-blocks">
                <div className="philosophy-block">
                  <div className="philosophy-icon">🎮</div>
                  <h3>Game Ảo</h3>
                  <p>
                    Chúng tôi tin rằng việc hoàn thành các quest trong game có
                    thể rèn luyện ý chí và kỷ luật
                  </p>
                </div>

                <div className="philosophy-arrow">⟶</div>

                <div className="philosophy-block">
                  <div className="philosophy-icon">📈</div>
                  <h3>Lên Cấp Đời Thực</h3>
                  <p>
                    Mỗi nhiệm vụ hoàn thành sẽ giúp bạn phát triển kỹ năng và
                    thói quen tích cực trong cuộc sống
                  </p>
                </div>
              </div>

              <div className="aura-explanation">
                <h3>🌟 Sức Mạnh AURA</h3>
                <p>
                  AURA không chỉ là điểm số - đó là biểu tượng cho sự kiên trì,
                  kỷ luật và khát vọng vượt qua giới hạn bản thân. Khi AURA của
                  bạn tăng cao, bạn sẽ trở thành Vệ Thần thực thụ, không chỉ
                  trong game mà cả trong đời thực.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Stats Section */}
      <section className="community-stats-section">
        <div className="section-content">
          <CommunityStats />
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="section section-3 cta-section">
        <div className="cta-background">
          <div className="forge-fire">
            <div className="fire-particle"></div>
            <div className="fire-particle"></div>
            <div className="fire-particle"></div>
          </div>
        </div>

        <div className="section-content">
          <div className="cta-content">
            <h2 className="cta-title">
              <span className="title-line-1">🏛️ KHÁM PHÁ THẾ GIỚI GO REAL 🏛️</span>
              <span className="title-line-2">Ba Con Đường Chờ Đón</span>
            </h2>

            <p className="cta-description">
              Học viện Ascension Citadel chào đón những Môn Sinh dũng cảm. 
              Hãy chọn con đường của riêng bạn để trở thành Anh hùng của Aethelgard!
            </p>

            <div className="guild-paths">
              <div className="path-preview">
                <div className="path-item">
                  <span className="path-icon">⚡</span>
                  <span className="path-name">Titans</span>
                  <span className="path-focus">Kỷ Luật & Sức Mạnh</span>
                </div>
                <div className="path-item">
                  <span className="path-icon">🔮</span>
                  <span className="path-name">Illumination</span>
                  <span className="path-focus">Trí Tuệ & Kiến Thức</span>
                </div>
                <div className="path-item">
                  <span className="path-icon">🌿</span>
                  <span className="path-name">Envoys</span>
                  <span className="path-focus">Giao Tiếp & Kết Nối</span>
                </div>
              </div>
            </div>

            <div className="cta-buttons">
              <Link to="/register" className="primary-cta">
                <span className="cta-icon">🛡️</span>
                <span className="cta-text">BẮT ĐẦU HÀNH TRÌNH CỦA BẠN</span>
                <div className="button-glow"></div>
              </Link>

              <Link to="/login" className="secondary-cta">
                <span className="cta-icon">🔓</span>
                <span className="cta-text">Đã Có Tài Khoản</span>
              </Link>
            </div>

            <div className="guild-preview">
              <div className="guild-stats">
                <div className="stat-item">
                  <span className="stat-number">3</span>
                  <span className="stat-label">Guild Paths</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">∞</span>
                  <span className="stat-label">Nhiệm Vụ</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Rèn Luyện</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
