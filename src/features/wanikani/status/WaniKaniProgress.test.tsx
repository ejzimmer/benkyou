import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearCachedCollections } from './collectionCache';
import { WaniKaniProgress } from './WaniKaniProgress';

const subjects = [
  { id: 1, object: 'radical', data: { level: 1, hidden_at: null } },
  { id: 2, object: 'kanji', data: { level: 1, hidden_at: null } },
  { id: 3, object: 'kana_vocabulary', data: { level: 1, hidden_at: null } },
  { id: 4, object: 'radical', data: { level: 2, hidden_at: null } },
  { id: 5, object: 'kanji', data: { level: 2, hidden_at: null } },
  { id: 6, object: 'kanji', data: { level: 2, hidden_at: null } },
  { id: 7, object: 'kanji', data: { level: 2, hidden_at: '2025-01-01' } },
];

const assignments = [
  { id: 11, object: 'assignment', data: createAssignment(1, 9, true) },
  { id: 12, object: 'assignment', data: createAssignment(2, 9, true) },
  { id: 13, object: 'assignment', data: createAssignment(3, 6, true) },
  { id: 14, object: 'assignment', data: createAssignment(4, 5, true) },
  { id: 15, object: 'assignment', data: createAssignment(5, 3, false) },
];

const levelProgressions = [
  {
    id: 21,
    object: 'level_progression',
    data: {
      level: 1,
      unlocked_at: '2026-09-01T00:00:00Z',
      passed_at: '2026-09-11T00:00:00Z',
      abandoned_at: null,
    },
  },
  {
    id: 22,
    object: 'level_progression',
    data: {
      level: 2,
      unlocked_at: '2026-09-11T00:00:00Z',
      passed_at: null,
      abandoned_at: null,
    },
  },
];

function createAssignment(
  subjectId: number,
  srsStage: number,
  isPassed: boolean,
) {
  return {
    subject_id: subjectId,
    srs_stage: srsStage,
    passed_at: isPassed ? '2026-01-01T00:00:00Z' : null,
    hidden: false,
  };
}

function createCollection(data: unknown[]) {
  return {
    data_updated_at: '2026-09-01T00:00:00Z',
    pages: { next_url: null },
    data,
  };
}

function respondWith(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const fetchMock = vi.fn();

function mockWaniKani() {
  fetchMock.mockImplementation((url: string) => {
    const { pathname } = new URL(url);
    if (pathname === '/v2/user') return respondWith({ data: { level: 2 } });
    if (pathname === '/v2/subjects')
      return respondWith(createCollection(subjects));
    if (pathname === '/v2/assignments')
      return respondWith(createCollection(assignments));
    if (pathname === '/v2/level_progressions')
      return respondWith(createCollection(levelProgressions));
    return respondWith({}, 404);
  });
}

function getRequestedUrls() {
  return fetchMock.mock.calls.map(([url]) => url as string);
}

function renderWaniKani(apiKey: string) {
  const onInvalidApiKey = vi.fn();
  const view = render(
    <WaniKaniProgress apiKey={apiKey} onInvalidApiKey={onInvalidApiKey} />,
  );
  return { ...view, onInvalidApiKey };
}

beforeEach(async () => {
  globalThis.fetch = fetchMock;
  await clearCachedCollections();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WaniKaniProgress', () => {
  describe('with an API key saved', () => {
    beforeEach(() => {
      mockWaniKani();
    });

    it('shows progress through the current level', async () => {
      renderWaniKani('my-key');

      const level = await screen.findByRole('region', { name: 'Level 2' });
      expect(
        within(level).getByRole('img', {
          name: 'Radicals 1 of 1, Kanji 0 of 2',
        }),
      ).toBeInTheDocument();
    });

    it('predicts how long until level 60 is finished', async () => {
      vi.useFakeTimers({
        now: new Date('2026-09-15T00:00:00Z'),
        toFake: ['Date', 'Temporal'],
      });
      renderWaniKani('my-key');

      const level = await screen.findByRole('region', { name: 'Level 2' });
      expect(
        within(level).getByRole('img', { name: 'Days remaining' }),
      ).toBeInTheDocument();
      expect(level).toHaveTextContent('586');
    });

    it('shows how many of each type are at each SRS stage', async () => {
      renderWaniKani('my-key');

      expect(
        await screen.findByRole('img', {
          name: 'Kanji: 1 apprentice, 0 guru, 0 master, 0 enlightened, 1 burned of 3',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('img', {
          name: 'Vocabulary: 0 apprentice, 1 guru, 0 master, 0 enlightened, 0 burned of 1',
        }),
      ).toBeInTheDocument();
    });

    it('shows the percent of each type unlocked at each level', async () => {
      renderWaniKani('my-key');

      expect(
        await screen.findByRole('img', {
          name: 'Level 2: Radicals 100% unlocked, Kanji 50% unlocked, Vocabulary 0% unlocked',
        }),
      ).toBeInTheDocument();
    });

    it('marks the types that are fully burned at each level', async () => {
      renderWaniKani('my-key');

      expect(
        await screen.findByRole('img', {
          name: 'Level 1: Radicals 100% unlocked and burned, Kanji 100% unlocked and burned, Vocabulary 100% unlocked',
        }),
      ).toBeInTheDocument();
    });

    it('shows every level up to 60', async () => {
      renderWaniKani('my-key');

      expect(
        await screen.findByRole('img', {
          name: 'Level 60: Radicals 0% unlocked, Kanji 0% unlocked, Vocabulary 0% unlocked',
        }),
      ).toBeInTheDocument();
    });

    describe('hovering over the progress', () => {
      it('shows how many kanji and radicals have passed on the current level rings', async () => {
        const user = userEvent.setup();
        renderWaniKani('my-key');
        const rings = await screen.findByRole('img', {
          name: 'Radicals 1 of 1, Kanji 0 of 2',
        });
        const kanjiRing = within(rings).getByTestId('kanji-ring');
        const radicalRing = within(rings).getByTestId('radical-ring');

        await user.hover(kanjiRing);
        expect(screen.getByRole('tooltip')).toHaveTextContent('Kanji: 0/2');

        await user.hover(radicalRing);
        expect(screen.getByRole('tooltip')).toHaveTextContent('Radicals: 1/1');
      });

      it('shows how many of each type are unlocked on each level gem', async () => {
        const user = userEvent.setup();
        renderWaniKani('my-key');
        const cluster = await screen.findByRole('img', {
          name: /^Level 2:/,
        });
        const kanjiGem = within(cluster).getByTestId('kanji-gem');

        await user.hover(kanjiGem);

        expect(screen.getByRole('tooltip')).toHaveTextContent('Kanji: 1/2');
      });

      it('shows how many are in each SRS stage on the vial layers', async () => {
        const user = userEvent.setup();
        renderWaniKani('my-key');
        const vial = await screen.findByRole('img', { name: /^Kanji:/ });
        const apprenticeLayer = within(vial).getByTestId('apprentice-layer');

        await user.hover(apprenticeLayer);

        expect(screen.getByRole('tooltip')).toHaveTextContent('1 apprentice');
      });

      it('shows the expected finish date on the days remaining', async () => {
        vi.useFakeTimers({
          now: new Date('2026-09-15T00:00:00Z'),
          toFake: ['Date', 'Temporal'],
        });
        const user = userEvent.setup({
          advanceTimers: (ms) => vi.advanceTimersByTime(ms),
        });
        renderWaniKani('my-key');
        const level = await screen.findByRole('region', { name: 'Level 2' });
        const stopwatch = within(level).getByRole('img', {
          name: 'Days remaining',
        });

        await user.hover(stopwatch);

        expect(screen.getByRole('tooltip')).toHaveTextContent('23 Apr 2028');
      });

      it('hides the tooltip when the pointer moves away', async () => {
        const user = userEvent.setup();
        renderWaniKani('my-key');
        const rings = await screen.findByRole('img', {
          name: 'Radicals 1 of 1, Kanji 0 of 2',
        });
        const kanjiRing = within(rings).getByTestId('kanji-ring');
        await user.hover(kanjiRing);
        const tooltip = screen.getByRole('tooltip');

        await user.unhover(kanjiRing);

        expect(tooltip).not.toBeVisible();
      });
    });

    describe('when progress has been loaded before', () => {
      it('only asks WaniKani for what changed since then', async () => {
        const { unmount } = renderWaniKani('my-key');
        await screen.findByRole('region', { name: 'Level 2' });
        unmount();
        fetchMock.mockClear();

        renderWaniKani('my-key');
        await screen.findByRole('region', { name: 'Level 2' });

        expect(getRequestedUrls()).toContain(
          'https://api.wanikani.com/v2/subjects?updated_after=2026-09-01T00%3A00%3A00Z',
        );
      });
    });
  });

  describe('when WaniKani rejects the saved API key', () => {
    beforeEach(() => {
      fetchMock.mockImplementation(() => respondWith({}, 401));
    });

    it('reports the key as invalid', async () => {
      const { onInvalidApiKey } = renderWaniKani('old-key');

      await waitFor(() => expect(onInvalidApiKey).toHaveBeenCalled());
    });
  });
});
