import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as Sentry from "@sentry/react";
import { auth, db } from '../firebase';
import { User, GuildId } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  updateUserGuild: (guildId: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const register = async (email: string, password: string, displayName: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      const newUserData: User = {
        userId: user.uid,
        displayName,
        email,
        guild: "", // No guild assigned, user must select one
        level: "Môn Sinh",
        currentAura: 0,
        currentStreak: 0,
        role: "player"
      };

      await setDoc(doc(db, 'users', user.uid), newUserData);
      setUserData(newUserData);
    } catch (error) {
      console.error('Error in register function:', error);
      throw error; // Re-throw để component có thể xử lý
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    setUserData(null);
    // Xóa User Context khỏi Sentry
    Sentry.setUser(null);
    await signOut(auth);
  };

  const fetchUserData = async (user: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUserData(userData);
        
        // Thiết lập User Context cho Sentry
        Sentry.setUser({
          id: user.uid,
          email: user.email || undefined,
          username: userData.displayName,
          role: userData.role,
          guild: userData.guild,
          level: userData.level
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Sentry.captureException(error);
      throw error;
    }
  };

  const updateUserGuild = async (guildId: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    if (!['titans', 'illumination', 'envoys'].includes(guildId)) {
      throw new Error('Invalid guild selection');
    }

    try {
      // Store previous guild for rollback
      const previousGuild = userData?.guild;

      // Optimistically update local state first
      if (userData) {
        const updatedUserData = { ...userData, guild: guildId as GuildId };
        setUserData(updatedUserData);

        // Update Sentry user context immediately
        Sentry.setUser({
          id: currentUser.uid,
          email: currentUser.email || undefined,
          username: userData.displayName,
          role: userData.role,
          guild: guildId,
          level: userData.level
        });
      }

      // Update Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        guild: guildId,
        updatedAt: new Date()
      });

      // Verify the update by fetching fresh data
      await fetchUserData(currentUser);

    } catch (error) {
      console.error('Error updating guild:', error);
      Sentry.captureException(error);

      // Rollback optimistic update if it failed
      if (userData && userData.guild !== guildId) {
        // Only rollback if the update actually failed
        const originalUserData = { ...userData };
        setUserData(originalUserData);

        // Rollback Sentry context
        Sentry.setUser({
          id: currentUser.uid,
          email: currentUser.email || undefined,
          username: userData.displayName,
          role: userData.role,
          guild: userData.guild,
          level: userData.level
        });
      }

      throw error;
    }
  };

  const refreshUserData = async () => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      await fetchUserData(currentUser);
    } catch (error) {
      console.error('Error refreshing user data:', error);
      Sentry.captureException(error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    login,
    register,
    logout,
    loading,
    updateUserGuild,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};