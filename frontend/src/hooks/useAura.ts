import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface UseAuraReturn {
  displayedAura: number;
  updateAura: (newAura: number) => Promise<void>;
}

export const useAura = (
  initialAura: number = 0, 
  userId: string | undefined
): UseAuraReturn => {
  const [displayedAura, setDisplayedAura] = useState(initialAura);

  useEffect(() => {
    setDisplayedAura(initialAura);
  }, [initialAura]);

  const updateAura = useCallback(async (newAura: number) => {
    try {
      // Update local display immediately for better UX
      setDisplayedAura(newAura);
      
      // Update Firestore
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          currentAura: newAura
        });
        console.log('✅ Aura updated successfully in Firestore:', newAura);
      }
    } catch (error) {
      console.error('❌ Error updating aura in Firestore:', error);
      // Revert the local change if Firestore update failed
      setDisplayedAura(initialAura);
      throw error;
    }
  }, [userId, initialAura]);

  return {
    displayedAura,
    updateAura
  };
};