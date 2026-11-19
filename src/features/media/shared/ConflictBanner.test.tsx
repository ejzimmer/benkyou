import { describe, it, expect, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictBanner } from './ConflictBanner';
import { Conflict } from './localFirst/editTimes';

function renderBanner(initialConflicts: Conflict[]) {
  let conflicts = initialConflicts;
  const listeners = new Set<() => void>();
  const notify = () => act(() => listeners.forEach((onChange) => onChange()));
  const keepMine = vi.fn();
  const keepTheirs = vi.fn();
  render(
    <ConflictBanner
      conflictStatus={{
        subscribe: (onChange) => {
          listeners.add(onChange);
          return () => listeners.delete(onChange);
        },
        listConflicts: () => conflicts,
        keepMine,
        keepTheirs,
      }}
    />,
  );
  return {
    keepMine,
    keepTheirs,
    resolveConflicts: () => {
      conflicts = [];
      notify();
    },
  };
}

const descriptionClash = {
  path: 'v2/work/0b6e2f4c-1a2b-4c3d-8e9f-0a1b2c3d4e5f/description',
  mine: 'Email Sam about the venue deposit',
  theirs: 'Email Sam about the venue',
  item: {
    id: '0b6e2f4c-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
    description: 'Email Sam',
  },
};
const statusClash = {
  path: 'v2/projects/0b6e2f4c-1a2b-4c3d-8e9f-0a1b2c3d4e61/status',
  mine: 'paused',
  theirs: 'done',
  item: { id: '0b6e2f4c-1a2b-4c3d-8e9f-0a1b2c3d4e61', description: 'Fence' },
};
const deletedThere = {
  path: 'v2/projects/0b6e2f4c-1a2b-4c3d-8e9f-0a1b2c3d4e60',
  mine: { id: '0b6e2f4c-1a2b-4c3d-8e9f-0a1b2c3d4e60', description: 'Fix gate' },
  theirs: null,
};
const deletedHere = {
  path: 'v2/projects/0b6e2f4c-1a2b-4c3d-8e9f-0a1b2c3d4e60',
  mine: null,
  theirs: {
    id: '0b6e2f4c-1a2b-4c3d-8e9f-0a1b2c3d4e60',
    description: 'Fix gate',
  },
};
const pushIdDeletedThere = {
  path: 'v2/today/日/-NqXbT2fHk9LmZ4wQa1c',
  mine: { id: '-NqXbT2fHk9LmZ4wQa1c', description: 'Water plants' },
  theirs: null,
};

const createDailyTask = (
  id: string,
  description: string,
  position: number,
) => ({
  id,
  description,
  position,
});
const dailyList = {
  'wash-up': createDailyTask('wash-up', 'Wash up', 1),
  stretch: createDailyTask('stretch', 'Stretch', 2),
  journal: createDailyTask('journal', 'Write journal', 0),
  laundry: createDailyTask('laundry', 'Laundry', 3),
};
const moveClash = (id: string, mine: number, theirs: number) => ({
  path: `v2/today/日/${id}/position`,
  mine,
  theirs,
  item: dailyList[id as keyof typeof dailyList],
  list: dailyList,
});
const journalMovedToTop = [
  moveClash('journal', 0, 2),
  moveClash('wash-up', 1, 0),
  moveClash('stretch', 2, 1),
];

async function openConflicts() {
  await userEvent.click(screen.getByRole('button', { name: 'Resolve' }));
}

describe('ConflictBanner', () => {
  describe('with one conflict', () => {
    it('says there was a conflict while uploading', () => {
      renderBanner([descriptionClash]);

      expect(screen.getByRole('alert')).toHaveTextContent(
        '1 conflict while uploading',
      );
    });
  });

  describe('with several conflicts', () => {
    it('counts them', () => {
      renderBanner([descriptionClash, statusClash]);

      expect(screen.getByRole('alert')).toHaveTextContent(
        '2 conflicts while uploading',
      );
    });
  });

  describe('when resolving', () => {
    describe('a field where your change adds words', () => {
      it('highlights the added words', async () => {
        renderBanner([descriptionClash]);

        await openConflicts();

        const conflict = screen.getByRole('listitem', { name: 'Description' });
        expect(conflict).toHaveTextContent('Email Sam about the venue deposit');
        expect(within(conflict).getByText('deposit').tagName).toBe('INS');
      });
    });

    describe('a field where your change replaces the value', () => {
      it('strikes out theirs and highlights yours', async () => {
        renderBanner([statusClash]);

        await openConflicts();

        const conflict = screen.getByRole('listitem', {
          name: 'Status · Fence',
        });
        expect(within(conflict).getByText('done').tagName).toBe('DEL');
        expect(within(conflict).getByText('paused').tagName).toBe('INS');
      });
    });

    describe('an item deleted on the other device', () => {
      it('shows your copy of it as added and says it was deleted there', async () => {
        renderBanner([deletedThere]);

        await openConflicts();

        const conflict = screen.getByRole('listitem', { name: 'Projects' });
        expect(within(conflict).getByText('Fix gate').tagName).toBe('INS');
        expect(conflict).toHaveTextContent('Deleted on the other device');
      });
    });

    describe('an item deleted on this device', () => {
      it('strikes out their copy and says it was deleted here', async () => {
        renderBanner([deletedHere]);

        await openConflicts();

        const conflict = screen.getByRole('listitem', { name: 'Projects' });
        expect(within(conflict).getByText('Fix gate').tagName).toBe('DEL');
        expect(conflict).toHaveTextContent('Deleted on this device');
      });
    });

    describe('an item with an older style of id', () => {
      it('names the section it was in rather than its id', async () => {
        renderBanner([pushIdDeletedThere]);

        await openConflicts();

        const conflict = screen.getByRole('listitem', { name: 'Today' });
        expect(within(conflict).getByText('Water plants').tagName).toBe('INS');
      });
    });

    describe('a list reordered on both devices', () => {
      it('counts the reorder as one conflict', () => {
        renderBanner(journalMovedToTop);

        expect(screen.getByRole('alert')).toHaveTextContent(
          '1 conflict while uploading',
        );
      });

      describe('when opened', () => {
        async function openReorder() {
          renderBanner(journalMovedToTop);
          await openConflicts();
          return screen.getByRole('listitem', { name: 'Order · Today' });
        }

        it('shows the moved item at both its new and old positions', async () => {
          const conflict = await openReorder();

          expect(
            within(within(conflict).getByRole('list'))
              .getAllByRole('listitem')
              .map((item) => item.textContent),
          ).toEqual([
            'Write journal',
            'Wash up',
            'Stretch',
            'Write journal',
            'Laundry',
          ]);
        });

        it('highlights its new position as added', async () => {
          const conflict = await openReorder();

          expect(within(conflict).getByRole('insertion')).toHaveTextContent(
            'Write journal',
          );
        });

        it('strikes out its old position, numbered as it was', async () => {
          const conflict = await openReorder();

          const oldPosition = within(
            within(conflict).getByRole('list'),
          ).getAllByRole('listitem')[3];
          expect(within(oldPosition).getByRole('deletion')).toHaveTextContent(
            'Write journal',
          );
          expect(oldPosition).toHaveAttribute('value', '3');
        });
      });

      it('keeps every position in your order when asked', async () => {
        const { keepMine } = renderBanner(journalMovedToTop);
        await openConflicts();

        await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

        expect(keepMine.mock.calls).toEqual(
          journalMovedToTop.map(({ path }) => [path]),
        );
      });

      it('discards every position in your order when asked', async () => {
        const { keepTheirs } = renderBanner(journalMovedToTop);
        await openConflicts();

        await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

        expect(keepTheirs.mock.calls).toEqual(
          journalMovedToTop.map(({ path }) => [path]),
        );
      });
    });

    describe('with several conflicts', () => {
      it('discards all of them when asked', async () => {
        const { keepTheirs } = renderBanner([descriptionClash, statusClash]);
        await openConflicts();

        await userEvent.click(
          screen.getByRole('button', { name: 'Discard all' }),
        );

        expect(keepTheirs.mock.calls).toEqual([
          [descriptionClash.path],
          [statusClash.path],
        ]);
      });

      it('keeps all of them when asked', async () => {
        const { keepMine } = renderBanner([descriptionClash, statusClash]);
        await openConflicts();

        await userEvent.click(screen.getByRole('button', { name: 'Keep all' }));

        expect(keepMine.mock.calls).toEqual([
          [descriptionClash.path],
          [statusClash.path],
        ]);
      });
    });

    it('keeps your change when asked', async () => {
      const { keepMine } = renderBanner([descriptionClash]);
      await openConflicts();

      await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

      expect(keepMine).toHaveBeenCalledWith(descriptionClash.path);
    });

    it('discards your change when asked', async () => {
      const { keepTheirs } = renderBanner([descriptionClash]);
      await openConflicts();

      await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

      expect(keepTheirs).toHaveBeenCalledWith(descriptionClash.path);
    });
  });

  describe('once every conflict is resolved', () => {
    it('goes away', () => {
      const { resolveConflicts } = renderBanner([descriptionClash]);
      const banner = screen.getByRole('alert');

      resolveConflicts();

      expect(banner).not.toBeInTheDocument();
    });
  });
});
