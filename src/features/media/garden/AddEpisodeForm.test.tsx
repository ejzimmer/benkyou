import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalContext } from '../shared/controls/ModalContext';
import { AddEpisodeForm } from './AddEpisodeForm';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { lupin } from './testMedia';
import { TvSeries } from './types';

const episodesPath = ['lupin', 'seasons', 's1', 'episodes'];

const renderForm = (series: TvSeries = lupin) => {
  const closeModal = vi.fn();
  return {
    user: userEvent.setup(),
    closeModal,
    ...renderWithLanguageMediaStorage(
      <ModalContext.Provider value={{ closeModal }}>
        <AddEpisodeForm series={series} season={series.seasons!.s1} />
      </ModalContext.Provider>,
      { addItem: vi.fn(() => 'e3') },
    ),
  };
};

const fillInEpisode = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Chapitre 3');
  await user.type(screen.getByRole('textbox', { name: 'Minutes' }), '45');
  await user.type(screen.getByRole('textbox', { name: 'Seconds' }), '30');
};

const fillInComprehension = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.click(screen.getByRole('button', { name: 'Add a lookup' }));
  await user.click(screen.getByRole('button', { name: 'Add a lookup' }));
  await user.click(screen.getByRole('button', { name: 'Add an AI question' }));
  fireEvent.change(screen.getByRole('slider', { name: 'Understood' }), {
    target: { value: '70' },
  });
};

describe('AddEpisodeForm', () => {
  it('is titled with the series and the new episode’s number', () => {
    renderForm();

    expect(
      screen.getByRole('heading', { name: 'Lupin 1-3' }),
    ).toBeInTheDocument();
  });

  describe('clicking add', () => {
    describe('with only a name and length', () => {
      it('adds the episode to the end of the season, unwatched', async () => {
        const { user, storageContext } = renderForm();

        await fillInEpisode(user);
        await user.click(screen.getByRole('button', { name: 'Add episode' }));

        expect(storageContext.addItem).toHaveBeenCalledWith(episodesPath, {
          number: 3,
          name: 'Chapitre 3',
          lengthInSeconds: 2730,
          lookups: 0,
          aiQuestions: 0,
        });
      });

      it('closes the form', async () => {
        const { user, closeModal } = renderForm();

        await fillInEpisode(user);
        await user.click(screen.getByRole('button', { name: 'Add episode' }));

        expect(closeModal).toHaveBeenCalled();
      });
    });

    describe('with look-ups and comprehension', () => {
      it('adds the episode as watched', async () => {
        const { user, storageContext } = renderForm();

        await fillInEpisode(user);
        await fillInComprehension(user);
        await user.click(screen.getByRole('button', { name: 'Add episode' }));

        expect(storageContext.addItem).toHaveBeenCalledWith(
          episodesPath,
          expect.objectContaining({ number: 3, status: 'done' }),
        );
      });

      it('records them as one update covering the whole episode', async () => {
        const { user, storageContext } = renderForm();

        await fillInEpisode(user);
        await fillInComprehension(user);
        await user.click(screen.getByRole('button', { name: 'Add episode' }));

        expect(storageContext.updateItem).toHaveBeenCalledWith(
          [...episodesPath, 'e3', 'updates', expect.any(String)],
          {
            at: expect.any(String),
            timestampInSeconds: 2730,
            lookups: 2,
            aiQuestions: 1,
            understood: 70,
          },
        );
      });

      describe('when the series is up to an earlier episode', () => {
        it('moves the series up to the end of the new episode', async () => {
          const { user, storageContext } = renderForm();

          await fillInEpisode(user);
          await fillInComprehension(user);
          await user.click(screen.getByRole('button', { name: 'Add episode' }));

          expect(storageContext.updateItem).toHaveBeenCalledWith(['lupin'], {
            upTo: { season: 1, episode: 3, timestampInSeconds: 2730 },
          });
        });
      });

      describe('when the series is up to a later season', () => {
        it('only records the update', async () => {
          const { user, storageContext } = renderForm({
            ...lupin,
            upTo: { season: 2, episode: 1, timestampInSeconds: 60 },
          });

          await fillInEpisode(user);
          await fillInComprehension(user);
          await user.click(screen.getByRole('button', { name: 'Add episode' }));

          expect(
            vi
              .mocked(storageContext.updateItem)
              .mock.calls.map(([path]) => path[path.length - 2]),
          ).toEqual(['updates']);
        });
      });
    });
  });
});
