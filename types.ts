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
}

export type ViewState = 'feed' | 'add' | 'mine';
export type Language = 'en' | 'zh';
