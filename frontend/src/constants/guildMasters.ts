export interface GuildMaster {
  name: string;
  avatar: string;
  messageTemplate: string;
}

export const GUILD_MASTERS: Record<string, GuildMaster> = {
  'titans': {
    name: 'Thủ lĩnh Kael',
    avatar: '👨‍🏫',
    messageTemplate: 'Chào mừng {displayName} đến với Lò Rèn Titan! Hãy hoàn thành các nhiệm vụ rèn luyện để tích lũy AURA và trở thành Vệ Thần thực thụ.'
  },
  'illumination': {
    name: 'Hiền triết Lyra',
    avatar: '👩‍🔬',
    messageTemplate: 'Chào mừng {displayName} đến với Viện Khai Sáng! Hãy theo đuổi tri thức và khai sáng tâm hồn qua các nhiệm vụ học tập.'
  },
  'envoys': {
    name: 'Sứ giả Zephyr', 
    avatar: '🕊️',
    messageTemplate: 'Chào mừng {displayName} đến với Hội Ngôn Sứ! Hãy kết nối các vùng đất và mang hòa bình qua các sứ mệnh của chúng ta.'
  }
};

export const DEFAULT_GUILD_MASTER: GuildMaster = {
  name: 'Thủ lĩnh Học viện',
  avatar: '👨‍🏫',
  messageTemplate: 'Chào mừng {displayName} đến với Học viện! Hãy hoàn thành các nhiệm vụ để rèn luyện bản thân.'
};

export const getGuildMasterMessage = (guildId?: string, displayName?: string): { master: GuildMaster; message: string } => {
  const master = guildId && GUILD_MASTERS[guildId] ? GUILD_MASTERS[guildId] : DEFAULT_GUILD_MASTER;
  const message = master.messageTemplate.replace('{displayName}', displayName || 'bạn');
  
  return { master, message };
};