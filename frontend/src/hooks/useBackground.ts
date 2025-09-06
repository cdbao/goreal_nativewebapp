import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AppConfig } from '../types';

export const useBackground = () => {
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const configCollection = collection(db, 'config');

    const unsubscribe = onSnapshot(
      configCollection,
      snapshot => {
        try {
          if (!snapshot.empty) {
            const config = snapshot.docs[0].data() as AppConfig;
            setBackgroundUrl(config.homePageBackgroundUrl || '');
          } else {
            setBackgroundUrl('');
          }
        } catch (error) {
          console.error('Error loading background config:', error);
          setBackgroundUrl('');
        } finally {
          setLoading(false);
        }
      },
      error => {
        console.error('Error listening to background config:', error);
        setBackgroundUrl('');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { backgroundUrl, loading };
};
