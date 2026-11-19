import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalContext } from '../shared/controls/ModalContext';
import { EditSeriesForm } from './EditSeriesForm';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { PrintSeries } from './types';

const miserables: PrintSeries = {
  id: 'miserables',
  type: 'book',
  name: 'Les Misérables',
  language: 'french',
  volumes: {
    fantine: {
      id: 'fantine',
      number: 1,
      name: 'Fantine',
      pages: 520,
    },
  },
};

const yotsuba: PrintSeries = {
  id: 'yotsuba',
  type: 'manga',
  name: 'よつばと！',
  language: 'japanese',
  volumes: {
    v1: { id: 'v1', number: 1, pages: 220 },
  },
};

const renderForm = (series: PrintSeries) => {
  const closeModal = vi.fn();
  return {
    user: userEvent.setup(),
    closeModal,
    ...renderWithLanguageMediaStorage(
      <ModalContext.Provider value={{ closeModal }}>
        <EditSeriesForm series={series} />
      </ModalContext.Provider>,
    ),
  };
};

describe('EditSeriesForm', () => {
  describe('when saved', () => {
    it('saves the new name', async () => {
      const { user, storageContext } = renderForm(miserables);
      const name = screen.getByRole('textbox', { name: 'Name' });

      await user.clear(name);
      await user.type(name, 'Les Mis');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(storageContext.updateItem).toHaveBeenCalledWith(['miserables'], {
        name: 'Les Mis',
        language: 'french',
      });
    });

    it('saves the chosen language', async () => {
      const { user, storageContext } = renderForm(miserables);

      await user.click(screen.getByRole('radio', { name: 'Japanese' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(storageContext.updateItem).toHaveBeenCalledWith(['miserables'], {
        name: 'Les Misérables',
        language: 'japanese',
      });
    });

    it('closes the form', async () => {
      const { user, closeModal } = renderForm(miserables);

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(closeModal).toHaveBeenCalled();
    });
  });

  describe('for a book series', () => {
    describe('when a volume is renamed and its pages changed', () => {
      it('saves both on the volume', async () => {
        const { user, storageContext } = renderForm(miserables);
        const name = screen.getByRole('textbox', { name: 'Volume 1 name' });
        const pages = screen.getByRole('spinbutton', {
          name: 'Fantine pages',
        });

        await user.clear(name);
        await user.type(name, 'Fantine !');
        await user.clear(pages);
        await user.type(pages, '530');
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(storageContext.updateItem).toHaveBeenCalledWith(
          ['miserables', 'volumes', 'fantine'],
          { name: 'Fantine !', pages: 530 },
        );
      });
    });
  });

  describe('for a manga series', () => {
    describe("when a volume's pages are changed", () => {
      it('saves the pages on the volume', async () => {
        const { user, storageContext } = renderForm(yotsuba);
        const pages = screen.getByRole('spinbutton', {
          name: 'Volume 1 pages',
        });

        await user.clear(pages);
        await user.type(pages, '224');
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(storageContext.updateItem).toHaveBeenCalledWith(
          ['yotsuba', 'volumes', 'v1'],
          { pages: 224 },
        );
      });
    });
  });

  describe('when deleted', () => {
    it('deletes the series and closes the form', async () => {
      const { user, storageContext, closeModal } = renderForm(miserables);

      await user.click(
        screen.getByRole('button', { name: 'Delete Les Misérables' }),
      );
      await user.click(screen.getByRole('button', { name: 'Confirm delete' }));

      expect(storageContext.deleteItem).toHaveBeenCalledWith(['miserables']);
      expect(closeModal).toHaveBeenCalled();
    });
  });
});
