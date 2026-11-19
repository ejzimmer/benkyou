import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalContext } from '../shared/controls/ModalContext';
import { ProgressUpdateForm } from './ProgressUpdateForm';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { yotsuba } from './testMedia';
import { PrintSeries, ProgressUpdate, Volume } from './types';

const volume = yotsuba.volumes!.vol1;

const UPDATE_PATH = ['yotsuba', 'volumes', 'vol1', 'updates', 'new'];
const NOW = '2026-10-16T09:00:00Z';

const renderForm = (series: PrintSeries = yotsuba) => {
  const closeModal = vi.fn();
  const renderVolume = (volumeNow: Volume) => (
    <ModalContext.Provider value={{ closeModal }}>
      <ProgressUpdateForm series={series} volume={volumeNow} />
    </ModalContext.Provider>
  );
  const view = renderWithLanguageMediaStorage(
    renderVolume(series.volumes!.vol1),
  );
  return {
    user: userEvent.setup(),
    closeModal,
    ...view,
    rerenderWithUpdate: (update: Partial<ProgressUpdate>) =>
      view.rerender(
        renderVolume({
          ...volume,
          updates: {
            ...volume.updates,
            new: { at: NOW, lookups: 0, aiQuestions: 0, ...update },
          },
        }),
      ),
  };
};

describe('ProgressUpdateForm', () => {
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
    describe('for a manga', () => {
      describe('in Japanese', () => {
        describe('with an unnamed volume', () => {
          it('shows the series and full-width volume number', () => {
            renderForm();

            expect(
              screen.getByRole('heading', { name: 'よつばと！ １' }),
            ).toBeInTheDocument();
          });
        });

        describe('with a volume numbered 10 or more', () => {
          it('makes every digit full-width', () => {
            renderForm({
              ...yotsuba,
              volumes: { vol1: { ...volume, number: 12 } },
            });

            expect(
              screen.getByRole('heading', { name: 'よつばと！ １２' }),
            ).toBeInTheDocument();
          });
        });

        describe('with a named volume', () => {
          it('adds the volume name', () => {
            renderForm({
              ...yotsuba,
              volumes: { vol1: { ...volume, name: 'Cosette' } },
            });

            expect(
              screen.getByRole('heading', { name: 'よつばと！ １: Cosette' }),
            ).toBeInTheDocument();
          });
        });
      });

      describe('in French', () => {
        it('shows the series and volume number', () => {
          renderForm({ ...yotsuba, language: 'french', name: 'Astérix' });

          expect(
            screen.getByRole('heading', { name: 'Astérix 1' }),
          ).toBeInTheDocument();
        });
      });
    });

    describe('for a book', () => {
      const archives: PrintSeries = {
        ...yotsuba,
        type: 'book',
        language: 'french',
        name: 'Les Archives de Roshar',
      };

      describe('with an unnamed volume', () => {
        it('shows the series and volume number', () => {
          renderForm(archives);

          expect(
            screen.getByRole('heading', { name: 'Les Archives de Roshar 1' }),
          ).toBeInTheDocument();
        });
      });

      describe('with a named volume', () => {
        it('shows only the volume name', () => {
          renderForm({
            ...archives,
            volumes: { vol1: { ...volume, name: 'Le Livre des Radieux 1' } },
          });

          expect(
            screen.getByRole('heading', { name: 'Le Livre des Radieux 1' }),
          ).toBeInTheDocument();
        });
      });
    });
  });

  describe('the counters', () => {
    it('start at zero, whatever earlier updates recorded', () => {
      renderForm();

      expect(screen.getByRole('spinbutton', { name: 'Looked up' })).toHaveValue(
        0,
      );
      expect(screen.getByRole('spinbutton', { name: 'Asked AI' })).toHaveValue(
        0,
      );
    });
  });

  describe('adding one lookup', () => {
    describe('before anything else is saved', () => {
      it('starts an update with one lookup, at the page I am up to', async () => {
        const { user, storageContext } = renderForm();

        await user.click(
          screen.getByRole('button', { name: 'Add a lookup to Volume 1' }),
        );

        expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
          at: NOW,
          lookups: 1,
          aiQuestions: 0,
          page: 41,
        });
      });
    });

    describe('once the update is started', () => {
      it('adds the lookup to that update', async () => {
        const { user, storageContext, rerenderWithUpdate } = renderForm();
        const addLookup = screen.getByRole('button', {
          name: 'Add a lookup to Volume 1',
        });

        await user.click(addLookup);
        rerenderWithUpdate({ lookups: 1 });
        await user.click(addLookup);

        expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
          lookups: 2,
        });
      });
    });

    it('keeps the form open', async () => {
      const { user, closeModal } = renderForm();

      await user.click(
        screen.getByRole('button', { name: 'Add a lookup to Volume 1' }),
      );

      expect(closeModal).not.toHaveBeenCalled();
    });
  });

  describe('adding one AI question', () => {
    it('starts an update with one AI question', async () => {
      const { user, storageContext } = renderForm();

      await user.click(
        screen.getByRole('button', { name: 'Add an AI question to Volume 1' }),
      );

      expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
        at: NOW,
        lookups: 0,
        aiQuestions: 1,
        page: 41,
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
          page: 41,
        });
      });
    });

    describe('after adding a lookup', () => {
      it('finishes that update', async () => {
        const { user, storageContext, rerenderWithUpdate } = renderForm();

        await user.click(
          screen.getByRole('button', { name: 'Add a lookup to Volume 1' }),
        );
        rerenderWithUpdate({ lookups: 1 });
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
          lookups: 1,
          aiQuestions: 0,
          understood: undefined,
          page: 41,
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
        page: 41,
      });
    });

    describe('with a page', () => {
      const typePage = async () => {
        const view = renderForm();
        const page = screen.getByRole('spinbutton', { name: 'Page' });
        await view.user.clear(page);
        await view.user.type(page, '60{Enter}');
        return view;
      };

      it('saves where I am up to', async () => {
        const { storageContext } = await typePage();

        expect(storageContext.updateItem).toHaveBeenCalledWith(['yotsuba'], {
          upTo: { volume: 1, page: 60 },
        });
      });

      it('saves an update at that page', async () => {
        const { storageContext } = await typePage();

        expect(storageContext.updateItem).toHaveBeenCalledWith(UPDATE_PATH, {
          at: NOW,
          lookups: 0,
          aiQuestions: 0,
          page: 60,
        });
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
    const EXISTING_PATH = ['yotsuba', 'volumes', 'vol1', 'updates', 'u1'];
    const earlierUpdate: ProgressUpdate = {
      at: '2026-09-10T09:00:00Z',
      page: 12,
      lookups: 2,
      aiQuestions: 0,
    };
    const withEarlierUpdate: PrintSeries = {
      ...yotsuba,
      volumes: {
        ...yotsuba.volumes,
        vol1: {
          ...volume,
          updates: { u0: earlierUpdate, ...volume.updates },
        },
      },
    };

    const renderEditForm = (series: PrintSeries, updateKey: string) => {
      const closeModal = vi.fn();
      const view = renderWithLanguageMediaStorage(
        <ModalContext.Provider value={{ closeModal }}>
          <ProgressUpdateForm
            series={series}
            volume={series.volumes!.vol1}
            updateKey={updateKey}
          />
        </ModalContext.Provider>,
      );
      return { user: userEvent.setup(), closeModal, ...view };
    };

    it('shows the date of that update', () => {
      renderEditForm(yotsuba, 'u1');

      expect(screen.getByText('20 Sep')).toBeInTheDocument();
    });

    it('shows what that update recorded', () => {
      renderEditForm(yotsuba, 'u1');

      expect(screen.getByRole('spinbutton', { name: 'Looked up' })).toHaveValue(
        20,
      );
      expect(screen.getByRole('spinbutton', { name: 'Asked AI' })).toHaveValue(
        3,
      );
      expect(screen.getByRole('spinbutton', { name: 'Page' })).toHaveValue(41);
      expect(screen.getByRole('slider', { name: 'Understood' })).toHaveValue(
        '60',
      );
    });

    describe('clicking save', () => {
      const changePage = async (series: PrintSeries, updateKey: string) => {
        const view = renderEditForm(series, updateKey);
        const page = screen.getByRole('spinbutton', { name: 'Page' });
        await view.user.clear(page);
        await view.user.type(page, '50');
        await view.user.click(screen.getByRole('button', { name: 'Save' }));
        return view;
      };

      it('saves the changes to that update', async () => {
        const { storageContext } = await changePage(yotsuba, 'u1');

        expect(storageContext.updateItem).toHaveBeenCalledWith(EXISTING_PATH, {
          lookups: 20,
          aiQuestions: 3,
          understood: 60,
          page: 50,
        });
      });

      describe('when it is the latest update with a page', () => {
        it('moves where I am up to', async () => {
          const { storageContext } = await changePage(yotsuba, 'u1');

          expect(storageContext.updateItem).toHaveBeenCalledWith(['yotsuba'], {
            upTo: { volume: 1, page: 50 },
          });
        });
      });

      describe('when a later update has a page', () => {
        it('leaves where I am up to', async () => {
          const { storageContext } = await changePage(withEarlierUpdate, 'u0');

          expect(storageContext.updateItem).not.toHaveBeenCalledWith(
            ['yotsuba'],
            expect.anything(),
          );
        });
      });
    });

    describe('clicking delete', () => {
      describe('once', () => {
        it('asks me to confirm', async () => {
          const { user, storageContext } = renderEditForm(yotsuba, 'u1');

          await user.click(screen.getByRole('button', { name: 'Delete' }));

          expect(
            screen.getByRole('button', { name: 'Confirm delete' }),
          ).toBeInTheDocument();
          expect(storageContext.deleteItem).not.toHaveBeenCalled();
        });
      });

      describe('twice', () => {
        const deleteUpdate = async (series: PrintSeries, updateKey: string) => {
          const view = renderEditForm(series, updateKey);
          await view.user.click(screen.getByRole('button', { name: 'Delete' }));
          await view.user.click(
            screen.getByRole('button', { name: 'Confirm delete' }),
          );
          return view;
        };

        it('deletes that update', async () => {
          const { storageContext } = await deleteUpdate(yotsuba, 'u1');

          expect(storageContext.deleteItem).toHaveBeenCalledWith(EXISTING_PATH);
        });

        it('closes the form', async () => {
          const { closeModal } = await deleteUpdate(yotsuba, 'u1');

          expect(closeModal).toHaveBeenCalled();
        });

        describe('when it is the latest update with a page', () => {
          describe('and an earlier update has a page', () => {
            it('moves where I am up to back to that page', async () => {
              const { storageContext } = await deleteUpdate(
                withEarlierUpdate,
                'u1',
              );

              expect(storageContext.updateItem).toHaveBeenCalledWith(
                ['yotsuba'],
                { upTo: { volume: 1, page: 12 } },
              );
            });
          });

          describe('and no earlier update has a page', () => {
            it('clears where I am up to', async () => {
              const { storageContext } = await deleteUpdate(yotsuba, 'u1');

              expect(storageContext.updateItem).toHaveBeenCalledWith(
                ['yotsuba'],
                { upTo: undefined },
              );
            });
          });
        });

        describe('when a later update has a page', () => {
          it('leaves where I am up to', async () => {
            const { storageContext } = await deleteUpdate(
              withEarlierUpdate,
              'u0',
            );

            expect(storageContext.updateItem).not.toHaveBeenCalled();
          });
        });
      });
    });
  });
});
