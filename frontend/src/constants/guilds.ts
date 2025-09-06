import { GuildInfo, GuildId } from '../types';

// Re-export types for convenience
export type { GuildId, GuildInfo };

export const GUILDS: Record<GuildId, GuildInfo> = {
  titans: {
    id: 'titans',
    name: 'titans',
    displayName: 'Vệ Thần',
    description: 'Guild của những chiến binh mạnh mẽ, bảo vệ Học viện với sức mạnh tuyệt đối',
    theme: {
      primary: '#FF4500', // Đỏ cam đất
      secondary: '#FF6347', 
      accent: '#FFD700',
      background: 'linear-gradient(135deg, #FF4500, #FF6347)'
    },
    icon: '⚡'
  },
  illumination: {
    id: 'illumination', 
    name: 'illumination',
    displayName: 'Khai Sáng',
    description: 'Guild của những học giả thông thái, khai sáng tri thức cho thế giới',
    theme: {
      primary: '#4169E1', // Xanh dương
      secondary: '#87CEEB',
      accent: '#FFFFFF',
      background: 'linear-gradient(135deg, #4169E1, #87CEEB)'
    },
    icon: '🔮'
  },
  envoys: {
    id: 'envoys',
    name: 'envoys', 
    displayName: 'Ngôn Sứ',
    description: 'Guild của những sứ giả hòa bình, kết nối các vùng đất bằng ngoại giao',
    theme: {
      primary: '#32CD32', // Xanh lá
      secondary: '#98FB98',
      accent: '#FFD700', 
      background: 'linear-gradient(135deg, #32CD32, #98FB98)'
    },
    icon: '🌿'
  }
};

export const DEFAULT_GUILD: GuildId = 'titans';

export const getGuildInfo = (guildId: string): GuildInfo => {
  return GUILDS[guildId as GuildId] || GUILDS[DEFAULT_GUILD];
};

export const getGuildDisplayName = (guildId: string): string => {
  return getGuildInfo(guildId).displayName;
};

export const getGuildTheme = (guildId: string) => {
  return getGuildInfo(guildId).theme;
};