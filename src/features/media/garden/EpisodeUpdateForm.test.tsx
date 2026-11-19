import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalContext } from '../shared/controls/ModalContext';
import { EpisodeUpdateForm } from './EpisodeUpdateForm';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { lupin } from './testMedia';
import { Episode, EpisodeUpdate, TvSeries } from './types';

const UPDATE_PATH = [
  'lupin',
  'seasons',
  's1',
  'episodes',
  'e2',
  'updates',
  'new',
];
const NOW = '2026-10-17T09:00:00Z';

const renderForm = (episodeId = 'e2', series: TvSeries = lupin) => {
  const closeModal = vi.fn();
  const episode = series.seasons!.s1.episodes![episodeId];
  const renderEpisode = (episodeNow: Episode) => (
    <ModalContext.Provider value={{ closeModal }}>
      <EpisodeUpdateForm
        series={series}
        season={series.seasons!.s1}
        episode={episodeNow}
      />
    </ModalContext.Provider>
  );
  const view = renderWithLanguageMediaStorage(renderEpisode(episode));
  return {
    user: userEvent.setup(),
    closeModal,
    ...view,
    rerenderWithUpdate: (update: Partial<EpisodeUpdate>) =>
      view.rerender(
        renderEpisode({
          ...episode,
          updates: {
            new: { at: NOW, lookups: 0, aiQuestions: 0, ...update },
          },
        }),
      ),
  };
};

describe('EpisodeUpdateForm', () => {
  beforeEach(() => {
    vi
      .spyOn(Temporal.Now, 'instant')
      .mockReturnValue(Temporal.Instant.from(NOW));
    vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('new' as ReturnType<typeof crypto.randomUUID>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('the title', () => {
    describe('for a named episode', () => {
      it('shows the episode name', () => {
        renderForm('e1');

        expect(
          screen.getByRole('heading', { name: 'Chapitre 1' }),
        ).toBeInTheDocument();
      });
    });

    describe('for an unnamed episode', () => {
      it('shows the series, season and episode number', () => {
        renderForm();

        expect(
          screen.getByRole('heading', { name: 'Lupin 1-2' }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('the time', () => {
    describe('for the episode I am up to', () => {
      it('starts where I am up to', () => {
        renderForm();

        expect(screen.getByRole('textbox', { name: 'Minutes' })).toHaveValue(
          '12',
        );
        expect(screen.getByRole('textbox', { name: 'Seconds' })).toHaveValue(
          '34',
        );
      });
    });

    describe('for an episode with a length', () => {
      it('shows the length', () => {
        renderForm('e1');

        expect(screen.getByText('/ 47:06')).toBeInTheDocument();
      });
    });
  });

  describe('adding one lookup', () => {
    describe('before anything else is saved', () => {
      it('starts an update with one lookup, at the time I am up to', async () => {
        const { user, storageContext } = renderForm();

        await user.click(
          screen.getByRole('button', { name: 'Add a lookup to Lupin 1-2' }),
        );

        expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
          at: NOW,
          lookups: 1,
          aiQuestions: 0,
          timestampInSeconds: 754,
        });
      });
    });

    describe('once the update is started', () => {
      it('adds the lookup to that update', async () => {
        const { user, storageContext, rerenderWithUpdate } = renderForm();
        const addLookup = screen.getByRole('button', {
          name: 'Add a lookup to Lupin 1-2',
        });

        await user.click(addLookup);
        rerenderWithUpdate({ lookups: 1 });
        await user.click(addLookup);

        expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
          lookups: 2,
        });
      });
    });
  });

  describe('adding one AI question', () => {
    it('starts an update with one AI question', async () => {
      const { user, storageContext } = renderForm();

      await user.click(
        screen.getByRole('button', {
          name: 'Add an AI question to Lupin 1-2',
        }),
      );

      expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
        at: NOW,
        lookups: 0,
        aiQuestions: 1,
        timestampInSeconds: 754,
      });
    });
  });

  describe('clicking save', () => {
    describe('after moving the understood slider', () => {
      it('saves an update of how much I understood', async () => {
        const { user, storageContext } = renderForm();

        fireEvent.change(screen.getByRole('slider', { name: 'Understood' }), {
          target: { value: '85' },
        });
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
          at: NOW,
          lookups: 0,
          aiQuestions: 0,
          understood: 85,
          timestampInSeconds: 754,
        });
      });
    });

    describe('after changing the time', () => {
      const changeTime = async () => {
        const view = renderForm();
        const minutes = screen.getByRole('textbox', { name: 'Minutes' });
        await view.user.clear(minutes);
        await view.user.type(minutes, '20');
        await view.user.click(screen.getByRole('button', { name: 'Save' }));
        return view;
      };

      it('saves where I am up to', async () => {
        const { storageContext } = await changeTime();

        expect(storageContext.updateItem).toHaveBeenCalledWith(['lupin'], {
          upTo: { season: 1, episode: 2, timestampInSeconds: 1234 },
        });
      });

      it('saves an update at that time', async () => {
        const { storageContext } = await changeTime();

        expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
          at: NOW,
          lookups: 0,
          aiQuestions: 0,
          timestampInSeconds: 1234,
        });
      });
    });

    describe('with nothing recorded', () => {
      it('saves no update', async () => {
        const { user, storageContext } = renderForm();

        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(storageContext.updateItem).not.toHaveBeenCalledWith(
          UPDATE_PATH,
          expect.anything(),
        );
      });
    });

    it('closes the form', async () => {
      const { user, closeModal } = renderForm();

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(closeModal).toHaveBeenCalled();
    });
  });

  describe('pressing enter in a field', () => {
    it('saves the update', async () => {
      const { user, storageContext } = renderForm();
      const askedAi = screen.getByRole('spinbutton', { name: 'Asked AI' });

      await user.clear(askedAi);
      await user.type(askedAi, '5{Enter}');

      expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
        at: NOW,
        lookups: 0,
        aiQuestions: 5,
        timestampInSeconds: 754,
      });
    });

    it('closes the form', async () => {
      const { user, closeModal } = renderForm();

      await user.type(
        screen.getByRole('spinbutton', { name: 'Looked up' }),
        '{Enter}',
      );

      expect(closeModal).toHaveBeenCalled();
    });
  });

  describe('editing an existing update', () => {
    const EXISTING_PATH = [
      'lupin',
      'seasons',
      's1',
      'episodes',
      'e2',
      'updates',
      'u2',
    ];
    const createUpdate = (
      day: number,
      timestampInSeconds: number,
    ): EpisodeUpdate => ({
      at: `2026-10-0${day}T09:00:00Z`,
      timestampInSeconds,
      lookups: 3,
      aiQuestions: 1,
      understood: 60,
    });
    const series: TvSeries = {
      ...lupin,
      seasons: {
        s1: {
          ...lupin.seasons!.s1,
          episodes: {
            ...lupin.seasons!.s1.episodes,
            e2: {
              ...lupin.seasons!.s1.episodes!.e2,
              updates: { u1: createUpdate(1, 300), u2: createUpdate(2, 754) },
            },
          },
        },
      },
    };

    const renderEditForm = (updateKey: string) => {
      const closeModal = vi.fn();
      const view = renderWithLanguageMediaStorage(
        <ModalContext.Provider value={{ closeModal }}>
          <EpisodeUpdateForm
            series={series}
            season={series.seasons!.s1}
            episode={series.seasons!.s1.episodes!.e2}
            updateKey={updateKey}
          />
        </ModalContext.Provider>,
      );
      return { user: userEvent.setup(), closeModal, ...view };
    };

    it('shows the date of that update', () => {
      renderEditForm('u2');

      expect(screen.getByText('02 Oct')).toBeInTheDocument();
    });

    it('shows what that update recorded', () => {
      renderEditForm('u1');

      expect(screen.getByRole('spinbutton', { name: 'Looked up' })).toHaveValue(
        3,
      );
      expect(screen.getByRole('spinbutton', { name: 'Asked AI' })).toHaveValue(
        1,
      );
      expect(screen.getByRole('textbox', { name: 'Minutes' })).toHaveValue(
        '05',
      );
      expect(screen.getByRole('slider', { name: 'Understood' })).toHaveValue(
        '60',
      );
    });

    describe('clicking save after changing the time', () => {
      const changeTime = async (updateKey: string) => {
        const view = renderEditForm(updateKey);
        const minutes = screen.getByRole('textbox', { name: 'Minutes' });
        await view.user.clear(minutes);
        await view.user.type(minutes, '20');
        await view.user.click(screen.getByRole('button', { name: 'Save' }));
        return view;
      };

      it('saves the changes to that update', async () => {
        const { storageContext } = await changeTime('u2');

        expect(storageContext.updateItem).toHaveBeenCalledWith(EXISTING_PATH, {
          lookups: 3,
          aiQuestions: 1,
          understood: 60,
          timestampInSeconds: 1234,
        });
      });

      describe('when it is the latest update with a time', () => {
        it('moves where I am up to', async () => {
          const { storageContext } = await changeTime('u2');

          expect(storageContext.updateItem).toHaveBeenCalledWith(['lupin'], {
            upTo: { season: 1, episode: 2, timestampInSeconds: 1234 },
          });
        });
      });

      describe('when a later update has a time', () => {
        it('leaves where I am up to', async () => {
          const { storageContext } = await changeTime('u1');

          expect(storageContext.updateItem).not.toHaveBeenCalledWith(
            ['lupin'],
            expect.anything(),
          );
        });
      });
    });

    describe('deleting it', () => {
      const deleteUpdate = async (updateKey: string) => {
        const view = renderEditForm(updateKey);
        await view.user.click(screen.getByRole('button', { name: 'Delete' }));
        await view.user.click(
          screen.getByRole('button', { name: 'Confirm delete' }),
        );
        return view;
      };

      it('deletes that update and closes the form', async () => {
        const { storageContext, closeModal } = await deleteUpdate('u2');

        expect(storageContext.deleteItem).toHaveBeenCalledWith(EXISTING_PATH);
        expect(closeModal).toHaveBeenCalled();
      });

      describe('when it is the latest update with a time', () => {
        it('moves where I am up to back to the update before it', async () => {
          const { storageContext } = await deleteUpdate('u2');

          expect(storageContext.updateItem).toHaveBeenCalledWith(['lupin'], {
            upTo: { season: 1, episode: 2, timestampInSeconds: 300 },
          });
        });
      });

      describe('when a later update has a time', () => {
        it('leaves where I am up to', async () => {
          const { storageContext } = await deleteUpdate('u1');

          expect(storageContext.deleteItem).toHaveBeenCalled();
          expect(storageContext.updateItem).not.toHaveBeenCalled();
        });
      });
    });
  });
});
