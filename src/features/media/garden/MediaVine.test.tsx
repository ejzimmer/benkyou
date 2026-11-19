import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { MediaVine } from './MediaVine';
import { lupin } from './testMedia';
import { TvSeries } from './types';

describe('MediaVine', () => {
  it('names the vine after the series', () => {
    renderWithLanguageMediaStorage(<MediaVine series={lupin} />);

    expect(screen.getByRole('img', { name: 'Lupin' })).toBeInTheDocument();
  });

  it('puts up a signpost with the series name', () => {
    renderWithLanguageMediaStorage(<MediaVine series={lupin} />);

    expect(screen.getByText('Lupin')).toHaveClass('sign-board');
  });

  describe('clicking the update sign', () => {
    it('opens a form to track the current episode', async () => {
      const user = userEvent.setup();
      renderWithLanguageMediaStorage(<MediaVine series={lupin} />);

      await user.click(screen.getByRole('button', { name: 'Update' }));

      expect(
        screen.getByRole('form', { name: 'Track Lupin 1-2' }),
      ).toBeInTheDocument();
    });

    describe('when the form is submitted', () => {
      it('closes the form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaVine series={lupin} />);
        await user.click(screen.getByRole('button', { name: 'Update' }));
        const form = screen.getByRole('form', { name: 'Track Lupin 1-2' });

        await user.type(
          screen.getByRole('spinbutton', { name: 'Looked up' }),
          '{Enter}',
        );

        expect(form).not.toBeInTheDocument();
      });
    });
  });

  describe('clicking a season’s branch', () => {
    it('opens a form to add an episode to that season', async () => {
      const user = userEvent.setup();
      renderWithLanguageMediaStorage(<MediaVine series={lupin} />);

      await user.click(
        screen.getByRole('button', { name: 'Add an episode to season 1' }),
      );

      expect(
        screen.getByRole('form', { name: 'Add an episode to Lupin season 1' }),
      ).toBeInTheDocument();
    });
  });

  describe('an episode with updates', () => {
    const episode = lupin.seasons!.s1.episodes!.e1;
    const series: TvSeries = {
      ...lupin,
      seasons: {
        s1: {
          ...lupin.seasons!.s1,
          episodes: {
            ...lupin.seasons!.s1.episodes,
            e1: {
              ...episode,
              updates: {
                flowering: {
                  at: '2026-10-01T09:00:00Z',
                  timestampInSeconds: 1000,
                  lookups: 4,
                  aiQuestions: 0,
                  understood: 70,
                },
                bare: {
                  at: '2026-10-02T09:00:00Z',
                  timestampInSeconds: 2000,
                  lookups: 1,
                  aiQuestions: 0,
                },
              },
            },
          },
        },
      },
    };
    const getStretches = () =>
      screen.getAllByRole('button', { name: 'Edit update to Chapitre 1' });

    describe('clicking the stretch of shoot an update grew', () => {
      it('opens that update in the update form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaVine series={series} />);

        await user.click(getStretches()[0]);

        expect(
          screen.getByRole('form', { name: 'Track Chapitre 1' }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('spinbutton', { name: 'Looked up' }),
        ).toHaveValue(4);
      });
    });

    describe('hovering the stretch of shoot an update grew', () => {
      describe('when the update has flowers', () => {
        it('highlights them', async () => {
          const user = userEvent.setup();
          renderWithLanguageMediaStorage(<MediaVine series={series} />);
          const raceme = screen.getByTestId('wisteria-raceme');

          await user.hover(getStretches()[0]);

          expect(raceme).toHaveClass('highlighted');
        });
      });

      describe('when the update has no flowers', () => {
        it('shows a ghost of them', async () => {
          const user = userEvent.setup();
          renderWithLanguageMediaStorage(<MediaVine series={series} />);

          await user.hover(getStretches()[1]);

          expect(
            screen
              .getAllByTestId('wisteria-raceme')
              .filter((raceme) => raceme.classList.contains('ghost')),
          ).toHaveLength(1);
        });
      });

      it('shows the date of the update', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaVine series={series} />);

        await user.hover(getStretches()[1]);

        expect(screen.getByRole('tooltip')).toHaveTextContent('02 Oct');
      });
    });

    describe('clicking the flowers an update grew', () => {
      it('opens that update in the update form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaVine series={series} />);

        await user.click(screen.getByTestId('wisteria-raceme'));

        expect(
          screen.getByRole('form', { name: 'Track Chapitre 1' }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('spinbutton', { name: 'Looked up' }),
        ).toHaveValue(4);
      });
    });

    describe('hovering the flowers an update grew', () => {
      it('shows the date of the update', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaVine series={series} />);

        await user.hover(screen.getByTestId('wisteria-raceme'));

        expect(screen.getByRole('tooltip')).toHaveTextContent('01 Oct');
      });
    });
  });
});
