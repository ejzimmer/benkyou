import { Language, MediaType } from './types';

export const LANGUAGE_NAMES: Record<Language, string> = {
  french: 'French',
  japanese: 'Japanese',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  french: '🇫🇷',
  japanese: '🇯🇵',
};

export const MEDIA_TYPE_NAMES: Record<MediaType, string> = {
  book: 'Book series',
  manga: 'Manga series',
  youtube: 'YouTube channel',
  tv: 'TV series',
};
