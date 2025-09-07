import React, { useState, useEffect } from 'react';
import kaelDialogue from '../content/kaelDialogue.json';
import './KaelIntroModal.css';

interface KaelIntroModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConnectStrava: () => void;
}

const KaelIntroModal: React.FC<KaelIntroModalProps> = ({ 
  isVisible, 
  onClose, 
  onConnectStrava 
}) => {
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [displayText, setDisplayText] = useState('');

  const dialogueLines = kaelDialogue.introduction.dialogue;
  const currentLine = dialogueLines[currentDialogueIndex];

  // Typing animation effect
  useEffect(() => {
    if (!isVisible || !currentLine) return;

    setIsTyping(true);
    setDisplayText('');
    
    let index = 0;
    const typingInterval = setInterval(() => {
      if (index < currentLine.length) {
        setDisplayText(currentLine.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 30); // Typing speed

    return () => clearInterval(typingInterval);
  }, [currentDialogueIndex, currentLine, isVisible]);

  const handleNext = () => {
    if (isTyping) {
      // Skip typing animation
      setDisplayText(currentLine);
      setIsTyping(false);
    } else if (currentDialogueIndex < dialogueLines.length - 1) {
      setCurrentDialogueIndex(currentDialogueIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentDialogueIndex > 0) {
      setCurrentDialogueIndex(currentDialogueIndex - 1);
    }
  };

  const handleConnect = () => {
    onConnectStrava();
    onClose();
  };

  if (!isVisible) return null;

  const isLastDialogue = currentDialogueIndex === dialogueLines.length - 1;
  const isFirstDialogue = currentDialogueIndex === 0;

  return (
    <div className="kael-modal-overlay">
      <div className="kael-modal">
        <div className="kael-modal-header">
          <div className="kael-avatar">
            <span className="kael-icon">{kaelDialogue.character.avatar}</span>
            <div className="kael-aura-effect"></div>
          </div>
          <div className="kael-title">
            <h2>{kaelDialogue.character.name}</h2>
            <p className="kael-subtitle">{kaelDialogue.character.title}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="kael-modal-body">
          <div className="dialogue-container">
            <div className="dialogue-text">
              <p>{displayText}</p>
              {isTyping && <span className="typing-cursor">|</span>}
            </div>
            
            <div className="dialogue-progress">
              <div className="progress-dots">
                {dialogueLines.map((_, index) => (
                  <span 
                    key={index} 
                    className={`dot ${index <= currentDialogueIndex ? 'active' : ''}`}
                  ></span>
                ))}
              </div>
              <span className="progress-text">
                {currentDialogueIndex + 1} / {dialogueLines.length}
              </span>
            </div>
          </div>
        </div>

        <div className="kael-modal-footer">
          <div className="dialogue-controls">
            <button 
              className="dialogue-btn secondary" 
              onClick={handlePrevious}
              disabled={isFirstDialogue}
            >
              ← Previous
            </button>
            
            {!isLastDialogue ? (
              <button 
                className="dialogue-btn primary" 
                onClick={handleNext}
              >
                {isTyping ? 'Skip' : 'Continue'} →
              </button>
            ) : (
              <div className="final-actions">
                <button 
                  className="dialogue-btn secondary" 
                  onClick={onClose}
                >
                  Maybe Later
                </button>
                <button 
                  className="dialogue-btn primary connect-btn" 
                  onClick={handleConnect}
                >
                  <span className="btn-icon">🧭</span>
                  {kaelDialogue.introduction.callToAction}
                </button>
              </div>
            )}
          </div>
          
          {isLastDialogue && (
            <div className="call-to-action-text">
              <p>{kaelDialogue.introduction.subtext}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KaelIntroModal;