import { Topic, FeedItem, Language, AppSettings } from "../types";

const TOPICS_KEY = 'infopulse_topics';
const FEED_KEY = 'infopulse_feed';
const FAV_KEY = 'infopulse_favorites';
const LANG_KEY = 'infopulse_lang';
const SETTINGS_KEY = 'infopulse_settings';

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

export const getStoredFavorites = (): FeedItem[] => {
  const data = localStorage.getItem(FAV_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveFavorites = (favs: FeedItem[]) => {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
};

export const getStoredLanguage = (): Language => {
  const data = localStorage.getItem(LANG_KEY);
  return (data === 'zh' || data === 'en') ? data : 'zh';
};

export const saveLanguage = (lang: Language) => {
  localStorage.setItem(LANG_KEY, lang);
};

export const getStoredSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { excludedSources: [] };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};