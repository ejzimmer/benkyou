import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { MediaTree } from './MediaTree';
import { PrintSeries, Volume } from './types';

const createVolume = (number: number, name: string): Volume => ({
  id: `vol${number}`,
  number,
  name,
  pages: 200,
});

const createSeries = (type: PrintSeries['type']): PrintSeries => ({
  id: 'series',
  type,
  name: 'Series',
  language: 'french',
  volumes: {
    vol1: createVolume(1, 'Fantine'),
    vol2: createVolume(2, 'Cosette'),
  },
});

describe('MediaTree', () => {
  describe('for a book series', () => {
    it('names each branch after its volume', () => {
      renderWithLanguageMediaStorage(
        <MediaTree series={createSeries('book')} />,
      );

      expect(screen.getByText('Fantine')).toBeInTheDocument();
      expect(screen.getByText('Cosette')).toBeInTheDocument();
    });
  });

  describe('for a manga series', () => {
    it('leaves the branches unnamed', () => {
      renderWithLanguageMediaStorage(
        <MediaTree series={createSeries('manga')} />,
      );

      expect(screen.queryByText('Fantine')).not.toBeInTheDocument();
    });
  });

  describe('clicking the update sign', () => {
    it('opens a form to track the current volume', async () => {
      const user = userEvent.setup();
      renderWithLanguageMediaStorage(
        <MediaTree
          series={{ ...createSeries('book'), upTo: { volume: 2, page: 5 } }}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Update' }));

      expect(
        screen.getByRole('form', { name: 'Track Cosette' }),
      ).toBeInTheDocument();
    });

    describe('when the form is submitted', () => {
      it('closes the form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(
          <MediaTree series={createSeries('book')} />,
        );
        await user.click(screen.getByRole('button', { name: 'Update' }));
        const form = screen.getByRole('form', { name: 'Track Fantine' });

        await user.type(
          screen.getByRole('spinbutton', { name: 'Looked up' }),
          '{Enter}',
        );

        expect(form).not.toBeInTheDocument();
      });
    });
  });

  describe('clicking the edit sign', () => {
    it('opens a form to edit the series', async () => {
      const user = userEvent.setup();
      renderWithLanguageMediaStorage(
        <MediaTree series={createSeries('book')} />,
      );

      await user.click(screen.getByRole('button', { name: 'Edit' }));

      expect(
        screen.getByRole('form', { name: 'Edit Series' }),
      ).toBeInTheDocument();
    });
  });

  describe('clicking the next volume branch', () => {
    it('opens a form to add the next volume', async () => {
      const user = userEvent.setup();
      renderWithLanguageMediaStorage(
        <MediaTree series={createSeries('book')} />,
      );

      await user.click(
        screen.getByRole('button', { name: 'Add a volume to Series' }),
      );

      expect(
        screen.getByRole('form', { name: 'Add volume' }),
      ).toHaveTextContent('Series 3');
    });

    describe('when the form is submitted', () => {
      it('closes the form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(
          <MediaTree series={createSeries('manga')} />,
        );
        await user.click(
          screen.getByRole('button', { name: 'Add a volume to Series' }),
        );
        const form = screen.getByRole('form', { name: 'Add volume' });

        await user.type(
          screen.getByRole('spinbutton', { name: 'Pages' }),
          '200{Enter}',
        );

        expect(form).not.toBeInTheDocument();
      });
    });
  });

  describe('a volume with an update', () => {
    const series = createSeries('book');
    const seriesWithUpdate: PrintSeries = {
      ...series,
      volumes: {
        ...series.volumes,
        vol1: {
          ...series.volumes!.vol1,
          updates: {
            u1: {
              at: '2026-10-01T09:00:00Z',
              page: 50,
              lookups: 4,
              aiQuestions: 0,
              understood: 60,
            },
          },
        },
      },
      upTo: { volume: 1, page: 50 },
    };
    const getStretch = () =>
      screen.getByRole('button', { name: 'Edit update to Fantine' });

    describe('clicking the stretch of branch the update grew', () => {
      it('opens that update in the update form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaTree series={seriesWithUpdate} />);

        await user.click(getStretch());

        expect(
          screen.getByRole('form', { name: 'Track Fantine' }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('spinbutton', { name: 'Looked up' }),
        ).toHaveValue(4);
      });
    });

    describe('hovering the stretch of branch the update grew', () => {
      it('shows the date of the update', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaTree series={seriesWithUpdate} />);

        await user.hover(getStretch());

        expect(screen.getByRole('tooltip')).toHaveTextContent('01 Oct');
      });

      describe('then moving away', () => {
        it('hides the date', async () => {
          const user = userEvent.setup();
          renderWithLanguageMediaStorage(
            <MediaTree series={seriesWithUpdate} />,
          );
          await user.hover(getStretch());
          const date = screen.getByRole('tooltip');

          await user.unhover(getStretch());

          expect(date).not.toBeInTheDocument();
        });
      });
    });

    describe('clicking the flower the update grew', () => {
      it('opens that update in the update form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaTree series={seriesWithUpdate} />);

        await user.click(screen.getByTestId('callistemon-flower'));

        expect(
          screen.getByRole('form', { name: 'Track Fantine' }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('spinbutton', { name: 'Looked up' }),
        ).toHaveValue(4);
      });
    });

    describe('hovering the flower the update grew', () => {
      it('shows the date of the update', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaTree series={seriesWithUpdate} />);

        await user.hover(screen.getByTestId('callistemon-flower'));

        expect(screen.getByRole('tooltip')).toHaveTextContent('01 Oct');
      });

      describe('then moving away', () => {
        it('hides the date', async () => {
          const user = userEvent.setup();
          renderWithLanguageMediaStorage(
            <MediaTree series={seriesWithUpdate} />,
          );
          const flower = screen.getByTestId('callistemon-flower');
          await user.hover(flower);
          const date = screen.getByRole('tooltip');

          await user.unhover(flower);

          expect(date).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('a volume with updates a few pages apart', () => {
    const series = createSeries('book');
    const seriesWithUpdates: PrintSeries = {
      ...series,
      volumes: {
        ...series.volumes,
        vol1: {
          ...series.volumes!.vol1,
          updates: {
            u1: {
              at: '2026-10-01T09:00:00Z',
              page: 50,
              lookups: 4,
              aiQuestions: 0,
              understood: 60,
            },
            u2: {
              at: '2026-10-02T09:00:00Z',
              page: 55,
              lookups: 7,
              aiQuestions: 0,
              understood: 70,
            },
          },
        },
      },
      upTo: { volume: 1, page: 55 },
    };

    describe('clicking the second flower', () => {
      it('opens the second update in the update form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(
          <MediaTree series={seriesWithUpdates} />,
        );

        await user.click(screen.getAllByTestId('callistemon-flower')[1]);

        expect(
          screen.getByRole('spinbutton', { name: 'Looked up' }),
        ).toHaveValue(7);
      });
    });
  });
});
