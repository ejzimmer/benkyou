import { describe, it, expect } from 'vitest'
import { createEditTimeUpdates, separateConflicts } from './editTimes';

function createServer(data: Record<string, unknown>) {
  return async (path: string) =>
    path
      .split('/')
      .reduce<unknown>(
        (node, key) =>
          typeof node === 'object' && node !== null
            ? (node as Record<string, unknown>)[key]
            : undefined,
        data,
      ) ?? null;
}

const copyNothing = () => undefined;

describe('createEditTimeUpdates', () => {
  describe('for a changed field', () => {
    it('records when it was edited', () => {
      expect(
        createEditTimeUpdates({ 'v2/work/t1/description': 'new' }, 10),
      ).toEqual({ 'v2/_edited/work/t1/description/_at': 10 });
    });
  });

  describe('for a delete', () => {
    it('replaces every edit time below it with the time of the delete', () => {
      expect(createEditTimeUpdates({ 'v2/work/t1': null }, 10)).toEqual({
        'v2/_edited/work/t1': { _at: 10 },
      });
    });
  });

  describe('for a path outside the data', () => {
    it('records nothing', () => {
      expect(createEditTimeUpdates({ minimumAppVersion: 2 }, 10)).toEqual({});
    });
  });
});

describe('separateConflicts', () => {
  describe('when nothing was edited elsewhere', () => {
    it('keeps every update', async () => {
      const updates = { 'v2/work/t1/description': 'mine' };

      expect(
        await separateConflicts(updates, 10, createServer({}), copyNothing),
      ).toEqual({ kept: updates, conflicts: [] });
    });
  });

  describe('when the field was edited elsewhere', () => {
    const server = createServer({
      v2: {
        work: { t1: { description: 'theirs' } },
        _edited: { work: { t1: { description: { _at: 20 } } } },
      },
    });

    describe('before my edit', () => {
      it('keeps the update', async () => {
        const updates = { 'v2/work/t1/description': 'mine' };

        expect(
          await separateConflicts(updates, 30, server, copyNothing),
        ).toEqual({
          kept: updates,
          conflicts: [],
        });
      });
    });

    describe('after my edit', () => {
      it('sets the update aside with both versions', async () => {
        expect(
          await separateConflicts(
            { 'v2/work/t1/description': 'mine', 'v2/work/t2/done': true },
            10,
            server,
            copyNothing,
          ),
        ).toEqual({
          kept: { 'v2/work/t2/done': true },
          conflicts: [
            { path: 'v2/work/t1/description', mine: 'mine', theirs: 'theirs' },
          ],
        });
      });

      describe('to the same value as mine', () => {
        it('drops the update without a conflict', async () => {
          expect(
            await separateConflicts(
              { 'v2/work/t1/description': 'theirs', 'v2/work/t2/done': true },
              10,
              server,
              copyNothing,
            ),
          ).toEqual({ kept: { 'v2/work/t2/done': true }, conflicts: [] });
        });
      });
    });
  });

  describe('when the item was deleted elsewhere after my edit', () => {
    it('offers my copy of the whole item back', async () => {
      const server = createServer({
        v2: { _edited: { work: { t1: { _at: 20 } } } },
      });
      const myCopy = { id: 't1', description: 'mine' };

      expect(
        await separateConflicts(
          { 'v2/work/t1/description': 'mine', 'v2/work/t1/done': true },
          10,
          server,
          (path) => (path === 'v2/work/t1' ? myCopy : undefined),
        ),
      ).toEqual({
        kept: {},
        conflicts: [{ path: 'v2/work/t1', mine: myCopy, theirs: null }],
      });
    });
  });

  describe('when I delete an item', () => {
    const item = { id: 't1', description: 'theirs' };
    const server = createServer({
      v2: {
        work: { t1: item },
        _edited: { work: { t1: { description: { _at: 20 } } } },
      },
    });

    describe('that was edited elsewhere afterwards', () => {
      it('sets the delete aside', async () => {
        expect(
          await separateConflicts(
            { 'v2/work/t1': null },
            10,
            server,
            copyNothing,
          ),
        ).toEqual({
          kept: {},
          conflicts: [{ path: 'v2/work/t1', mine: null, theirs: item }],
        });
      });
    });

    describe('that was edited elsewhere before', () => {
      it('keeps the delete', async () => {
        expect(
          await separateConflicts(
            { 'v2/work/t1': null },
            30,
            server,
            copyNothing,
          ),
        ).toEqual({ kept: { 'v2/work/t1': null }, conflicts: [] });
      });
    });
  });
});
