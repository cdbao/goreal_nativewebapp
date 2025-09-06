import { useState, useCallback } from 'react';

export type TabType = 'quests' | 'ascension' | 'journey' | 'chat' | 'honor';

interface UseDashboardStateReturn {
  loading: boolean;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  setLoading: (loading: boolean) => void;
}

export const useDashboardState = (): UseDashboardStateReturn => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('quests');

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const handleLoadingChange = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  return {
    loading,
    activeTab,
    setActiveTab: handleTabChange,
    setLoading: handleLoadingChange
  };
};