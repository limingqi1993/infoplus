import { Topic, FeedItem, Language } from "../types";

const TOPICS_KEY = 'infopulse_topics';
const FEED_KEY = 'infopulse_feed';
const LANG_KEY = 'infopulse_lang';

export const getStoredTopics = (): Topic[] => {
  const data = localStorage.getItem(TOPICS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTopics = (topics: Topic[]) => {
  localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
};

export const getStoredFeed = (): FeedItem[] => {
  const data = localStorage.getItem(FEED_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveFeed = (feed: FeedItem[]) => {
  localStorage.setItem(FEED_KEY, JSON.stringify(feed));
};

export const getStoredLanguage = (): Language => {
  const data = localStorage.getItem(LANG_KEY);
  return (data === 'zh' || data === 'en') ? data : 'zh'; // Default to Chinese as per context implies interest
};

export const saveLanguage = (lang: Language) => {
  localStorage.setItem(LANG_KEY, lang);
};
