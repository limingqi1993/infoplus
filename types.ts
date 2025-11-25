export interface Topic {
  id: string;
  query: string; // The user input sentence
  scheduleTime: string; // e.g., "07:00"
  createdAt: number;
}

export interface SourceLink {
  title: string;
  url: string;
}

export interface FeedItem {
  id: string;
  topicId: string;
  topicQuery: string;
  content: string; // Markdown content
  sources: SourceLink[];
  timestamp: number;
  isRead: boolean;
  isFavorite?: boolean;
  imageUrl?: string;
}

export type ViewState = 'feed' | 'add' | 'mine';
export type Language = 'en' | 'zh';

export interface AppSettings {
  excludedSources: string[]; // e.g. ['twitter', 'weibo']
}