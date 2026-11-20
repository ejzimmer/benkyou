import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalContext } from '../../../journal/controls/ModalContext';
import { AddVolumeForm } from './AddVolumeForm';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { yotsuba } from './testMedia';
import { PrintSeries } from './types';

const miserables: PrintSeries = {
  id: 'miserables',
  type: 'book',
  name: 'Les Misérables',
  language: 'french',
  volumes: {},
};

const renderForm = (series: PrintSeries) => {
  const closeModal = vi.fn();
  return {
    user: userEvent.setup(),
    closeModal,
    ...renderWithLanguageMediaStorage(
      <ModalContext.Provider value={{ closeModal }}>
        <AddVolumeForm series={series} />
      </ModalContext.Provider>,
    ),
  };
};

describe('AddVolumeForm', () => {
  describe('the title', () => {
    it('shows the series and the new volume number', () => {
      renderForm(yotsuba);

      expect(
        screen.getByRole('heading', { name: 'よつばと！ 3' }),
      ).toBeInTheDocument();
    });
  });

  describe('for manga', () => {
    describe('with pages', () => {
      it('adds the next volume to the series', async () => {
        const { user, storageContext } = renderForm(yotsuba);

        await user.type(
          screen.getByRole('spinbutton', { name: 'Pages' }),
          '200',
        );
        await user.click(screen.getByRole('button', { name: 'Add volume' }));

        expect(storageContext.addItem).toHaveBeenCalledWith(
          ['yotsuba', 'volumes'],
          { number: 3, branchSeed: 'volume-3', pages: 200 },
        );
      });

      it('closes the form', async () => {
        const { user, closeModal } = renderForm(yotsuba);

        await user.type(
          screen.getByRole('spinbutton', { name: 'Pages' }),
          '200',
        );
        await user.click(screen.getByRole('button', { name: 'Add volume' }));

        expect(closeModal).toHaveBeenCalled();
      });
    });

    describe('without pages', () => {
      it('does not add the volume', async () => {
        const { user, storageContext } = renderForm(yotsuba);

        await user.click(screen.getByRole('button', { name: 'Add volume' }));

        expect(storageContext.addItem).not.toHaveBeenCalled();
      });
    });
  });

  describe('for books', () => {
    describe('with a name and pages', () => {
      it('adds the volume with its name', async () => {
        const { user, storageContext } = renderForm(miserables);

        await user.type(
          screen.getByRole('textbox', { name: 'Name' }),
          'Fantine',
        );
        await user.type(
          screen.getByRole('spinbutton', { name: 'Pages' }),
          '480',
        );
        await user.click(screen.getByRole('button', { name: 'Add volume' }));

        expect(storageContext.addItem).toHaveBeenCalledWith(
          ['miserables', 'volumes'],
          {
            number: 1,
            branchSeed: 'volume-1',
            name: 'Fantine',
            pages: 480,
          },
        );
      });
    });

    describe('without a name', () => {
      it('does not add the volume', async () => {
        const { user, storageContext } = renderForm(miserables);

        await user.type(
          screen.getByRole('spinbutton', { name: 'Pages' }),
          '480',
        );
        await user.click(screen.getByRole('button', { name: 'Add volume' }));

        expect(storageContext.addItem).not.toHaveBeenCalled();
      });
    });
  });
});
