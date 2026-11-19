import { PrintSeries, TvSeries, YoutubeChannel } from './types';

export const lupin: TvSeries = {
  id: 'lupin',
  type: 'tv',
  name: 'Lupin',
  language: 'french',
  seasons: {
    s1: {
      id: 's1',
      number: 1,
      episodes: {
        e1: {
          id: 'e1',
          number: 1,
          name: 'Chapitre 1',
          lengthInSeconds: 2826,
          lookups: 12,
          aiQuestions: 2,
          understood: 70,
        },
        e2: {
          id: 'e2',
          number: 2,
          lookups: 4,
          aiQuestions: 0,
          status: 'in-progress',
        },
      },
    },
  },
  upTo: { season: 1, episode: 2, timestampInSeconds: 754 },
};

export const hugo: YoutubeChannel = {
  id: 'hugo',
  type: 'youtube',
  name: 'HugoDécrypte',
  language: 'french',
  videos: {
    v1: {
      id: 'v1',
      url: 'https://youtu.be/1',
      lengthInSeconds: 3725,
      upToInSeconds: 1200,
      lookups: 7,
      aiQuestions: 1,
    },
    v2: {
      id: 'v2',
      url: 'https://youtu.be/2',
      lookups: 0,
      aiQuestions: 0,
      status: 'done',
    },
  },
};

export const yotsuba: PrintSeries = {
  id: 'yotsuba',
  type: 'manga',
  name: 'よつばと！',
  language: 'japanese',
  volumes: {
    vol1: {
      id: 'vol1',
      number: 1,
      pages: 220,
      updates: {
        u1: {
          at: '2026-09-20T09:00:00Z',
          page: 41,
          lookups: 20,
          aiQuestions: 3,
          understood: 60,
        },
      },
    },
    vol2: {
      id: 'vol2',
      number: 2,
      status: 'in-progress',
    },
  },
  upTo: { volume: 1, page: 41 },
};
