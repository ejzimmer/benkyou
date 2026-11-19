import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalContext } from '../../../journal/controls/ModalContext';
import { AddMediaForm } from './AddMediaForm';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';

function renderForm() {
  const closeModal = vi.fn();
  const view = renderWithLanguageMediaStorage(
    <ModalContext.Provider value={{ closeModal }}>
      <AddMediaForm />
    </ModalContext.Provider>,
  );
  return { user: userEvent.setup(), closeModal, ...view };
}

describe('AddMediaForm', () => {
  describe('when it first renders', () => {
    it('has the book series type selected', () => {
      renderForm();

      expect(screen.getByRole('radio', { name: 'Book series' })).toBeChecked();
    });

    it('has French selected', () => {
      renderForm();

      expect(screen.getByRole('radio', { name: 'French' })).toBeChecked();
    });
  });

  describe('when a tv series is submitted', () => {
    it('adds it with its number of seasons', async () => {
      const { user, storageContext } = renderForm();

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Lupin');
      await user.click(screen.getByRole('radio', { name: 'TV series' }));
      await user.type(screen.getByRole('spinbutton', { name: 'Seasons' }), '3');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(storageContext.addMedia).toHaveBeenCalledWith({
        type: 'tv',
        name: 'Lupin',
        language: 'french',
        seasonCount: 3,
      });
    });

    describe('without a number of seasons', () => {
      it('adds it without one', async () => {
        const { user, storageContext } = renderForm();

        await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Lupin');
        await user.click(screen.getByRole('radio', { name: 'TV series' }));
        await user.click(screen.getByRole('button', { name: 'Add' }));

        expect(storageContext.addMedia).toHaveBeenCalledWith({
          type: 'tv',
          name: 'Lupin',
          language: 'french',
          seasonCount: undefined,
        });
      });
    });
  });

  describe('when a youtube channel is submitted', () => {
    it('adds it', async () => {
      const { user, storageContext } = renderForm();

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Yuyu');
      await user.click(screen.getByRole('radio', { name: 'YouTube channel' }));
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(storageContext.addMedia).toHaveBeenCalledWith({
        type: 'youtube',
        name: 'Yuyu',
        language: 'french',
      });
    });
  });

  describe('when a manga series is submitted', () => {
    it('adds it with its number of volumes', async () => {
      const { user, storageContext } = renderForm();

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Yotsuba');
      await user.click(screen.getByRole('radio', { name: 'Manga series' }));
      await user.type(
        screen.getByRole('spinbutton', { name: 'Volumes' }),
        '15',
      );
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(storageContext.addMedia).toHaveBeenCalledWith({
        type: 'manga',
        name: 'Yotsuba',
        language: 'french',
        volumeCount: 15,
      });
    });
  });

  describe('when a book series is submitted', () => {
    it('adds it with its first volume', async () => {
      const { user, storageContext } = renderForm();

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Astérix');
      await user.type(
        screen.getByRole('textbox', { name: 'Volume 1' }),
        'Astérix le Gaulois',
      );
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(storageContext.addMedia).toHaveBeenCalledWith({
        type: 'book',
        name: 'Astérix',
        language: 'french',
        volumeNames: ['Astérix le Gaulois'],
      });
    });

    describe('with more volumes added', () => {
      it('adds a volume for each title entered', async () => {
        const { user, storageContext } = renderForm();

        await user.type(
          screen.getByRole('textbox', { name: 'Name' }),
          'Astérix',
        );
        await user.click(
          screen.getByRole('button', { name: 'Add another volume' }),
        );
        await user.click(
          screen.getByRole('button', { name: 'Add another volume' }),
        );
        await user.type(
          screen.getByRole('textbox', { name: 'Volume 1' }),
          'Astérix le Gaulois',
        );
        await user.type(
          screen.getByRole('textbox', { name: 'Volume 3' }),
          'La Serpe d’or',
        );
        await user.click(screen.getByRole('button', { name: 'Add' }));

        expect(storageContext.addMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            volumeNames: ['Astérix le Gaulois', 'La Serpe d’or'],
          }),
        );
      });
    });
  });

  describe('when a language is chosen', () => {
    it('adds the media in that language', async () => {
      const { user, storageContext } = renderForm();

      await user.type(
        screen.getByRole('textbox', { name: 'Name' }),
        'よつばと！',
      );
      await user.click(screen.getByRole('radio', { name: 'Japanese' }));
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(storageContext.addMedia).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'japanese' }),
      );
    });
  });

  describe('after adding', () => {
    it('closes the form', async () => {
      const { user, closeModal } = renderForm();

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Lupin');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(closeModal).toHaveBeenCalled();
    });
  });

  describe('without a name', () => {
    it('does not add anything', async () => {
      const { user, storageContext } = renderForm();

      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(storageContext.addMedia).not.toHaveBeenCalled();
    });
  });
});
