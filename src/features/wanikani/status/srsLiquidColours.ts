import { SrsGroup } from './types';

export const SRS_LIQUID_COLOURS: Record<
  SrsGroup,
  { edge: string; light: string; base: string; dark: string }
> = {
  apprentice: {
    edge: '#900060',
    light: '#eb66be',
    base: '#dd0093',
    dark: '#7a0051',
  },
  guru: { edge: '#581d67', light: '#b881c5', base: '#882d9e', dark: '#4b1957' },
  master: {
    edge: '#1b328e',
    light: '#7f94e9',
    base: '#294ddb',
    dark: '#172a78',
  },
  enlightened: {
    edge: '#006090',
    light: '#66beeb',
    base: '#0093dd',
    dark: '#00517a',
  },
  burned: {
    edge: '#2c2c2c',
    light: '#8e8e8e',
    base: '#434343',
    dark: '#252525',
  },
};
