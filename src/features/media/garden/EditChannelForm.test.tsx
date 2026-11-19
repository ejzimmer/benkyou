import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalContext } from '../../../journal/controls/ModalContext';
import { EditChannelForm } from './EditChannelForm';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { YoutubeChannel } from './types';

const hugo: YoutubeChannel = {
  id: 'hugo',
  type: 'youtube',
  name: 'HugoDécrypte',
  language: 'french',
  videos: {
    v1: {
      id: 'v1',
      url: 'https://youtu.be/1',
      lengthInSeconds: 3725,
      upToInSeconds: 1200,
      lookups: 0,
      aiQuestions: 0,
    },
    v2: {
      id: 'v2',
      url: 'https://youtu.be/2',
      lengthInSeconds: 600,
      upToInSeconds: 600,
      status: 'done',
      lookups: 0,
      aiQuestions: 0,
    },
  },
};

const renderForm = () => {
  const closeModal = vi.fn();
  return {
    user: userEvent.setup(),
    closeModal,
    ...renderWithLanguageMediaStorage(
      <ModalContext.Provider value={{ closeModal }}>
        <EditChannelForm channel={hugo} />
      </ModalContext.Provider>,
    ),
  };
};

describe('EditChannelForm', () => {
  it('shows each video link', () => {
    renderForm();

    const [first, second] = screen.getAllByRole('textbox', { name: 'URL' });

    expect(first).toHaveValue('https://youtu.be/1');
    expect(second).toHaveValue('https://youtu.be/2');
  });

  describe('when saved', () => {
    it('saves the name and language', async () => {
      const { user, storageContext } = renderForm();

      await user.click(screen.getByRole('radio', { name: 'Japanese' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(storageContext.updateItem).toHaveBeenCalledWith(['hugo'], {
        name: 'HugoDécrypte',
        language: 'japanese',
      });
    });

    it('closes the form', async () => {
      const { user, closeModal } = renderForm();

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(closeModal).toHaveBeenCalled();
    });

    describe('after changing a video link', () => {
      it('saves the new link', async () => {
        const { user, storageContext } = renderForm();
        const [url] = screen.getAllByRole('textbox', { name: 'URL' });

        await user.clear(url);
        await user.type(url, 'https://youtu.be/one');
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(storageContext.updateItem).toHaveBeenCalledWith(
          ['hugo', 'videos', 'v1'],
          { url: 'https://youtu.be/one' },
        );
      });
    });
  });

  describe('when deleted', () => {
    it('deletes the channel and closes the form', async () => {
      const { user, storageContext, closeModal } = renderForm();

      await user.click(
        screen.getByRole('button', { name: 'Delete HugoDécrypte' }),
      );
      await user.click(screen.getByRole('button', { name: 'Confirm delete' }));

      expect(storageContext.deleteItem).toHaveBeenCalledWith(['hugo']);
      expect(closeModal).toHaveBeenCalled();
    });
  });
});
