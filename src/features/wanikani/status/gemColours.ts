import { SubjectType } from './types';

export const GEM_COLOURS: Record<
  SubjectType,
  { light: string; base: string; dark: string }
> = {
  radical: { light: '#9ee3ff', base: '#00aaff', dark: '#0068b8' },
  kanji: { light: '#ffa3dc', base: '#ff00aa', dark: '#b3007a' },
  vocabulary: { light: '#dcadff', base: '#aa00ff', dark: '#6c00a8' },
};

export const EMPTY_GEM_COLOUR = '#1a2a52';
