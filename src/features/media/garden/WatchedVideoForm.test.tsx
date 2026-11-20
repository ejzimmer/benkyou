import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalContext } from '../../../journal/controls/ModalContext';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { hugo } from './testMedia';
import { Video } from './types';
import { WatchedVideoForm } from './WatchedVideoForm';

const renderForm = () => {
  const closeModal = vi.fn();
  return {
    user: userEvent.setup(),
    closeModal,
    ...renderWithLanguageMediaStorage(
      <ModalContext.Provider value={{ closeModal }}>
        <WatchedVideoForm channel={hugo} />
      </ModalContext.Provider>,
    ),
  };
};

describe('WatchedVideoForm', () => {
  it('is titled with the channel name', () => {
    renderForm();

    expect(
      screen.getByRole('heading', { name: 'HugoDécrypte' }),
    ).toBeInTheDocument();
  });

  describe('clicking save', () => {
    describe('with everything filled in', () => {
      it('adds the video as watched to the end', async () => {
        const { user, storageContext } = renderForm();

        await user.type(
          screen.getByRole('textbox', { name: 'URL' }),
          'https://youtu.be/3',
        );
        await user.click(screen.getByRole('button', { name: 'Add a lookup' }));
        await user.click(screen.getByRole('button', { name: 'Add a lookup' }));
        await user.click(
          screen.getByRole('button', { name: 'Add an AI question' }),
        );
        fireEvent.change(screen.getByRole('slider', { name: 'Understood' }), {
          target: { value: '70' },
        });
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(storageContext.addItem).toHaveBeenCalledWith(
          ['hugo', 'videos'],
          {
            url: 'https://youtu.be/3',
            status: 'done',
            lookups: 2,
            aiQuestions: 1,
            understood: 70,
          },
        );
      });

      it('closes the form', async () => {
        const { user, closeModal } = renderForm();

        await user.type(
          screen.getByRole('textbox', { name: 'URL' }),
          'https://youtu.be/3',
        );
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(closeModal).toHaveBeenCalled();
      });
    });

    describe('without a URL', () => {
      it('does not add the video', async () => {
        const { user, storageContext } = renderForm();

        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(storageContext.addItem).not.toHaveBeenCalled();
      });
    });

    describe('when understood was never set', () => {
      it('leaves it unset', async () => {
        const { user, storageContext } = renderForm();

        await user.type(
          screen.getByRole('textbox', { name: 'URL' }),
          'https://youtu.be/3',
        );
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(storageContext.addItem).toHaveBeenCalledWith(
          ['hugo', 'videos'],
          expect.objectContaining({ understood: undefined }),
        );
      });
    });
  });

  describe('editing a video', () => {
    const watchedVideo: Video = {
      id: 'v3',
      url: 'https://youtu.be/3',
      lengthInSeconds: 1470,
      upToInSeconds: 1470,
      status: 'done',
      lookups: 2,
      aiQuestions: 1,
      understood: 70,
    };
    const VIDEO_PATH = ['hugo', 'videos', 'v3'];

    const renderEditForm = (video: Video) => {
      const closeModal = vi.fn();
      return {
        user: userEvent.setup(),
        closeModal,
        ...renderWithLanguageMediaStorage(
          <ModalContext.Provider value={{ closeModal }}>
            <WatchedVideoForm channel={hugo} video={video} />
          </ModalContext.Provider>,
        ),
      };
    };

    it('shows what was recorded for it', () => {
      renderEditForm(watchedVideo);

      expect(screen.getByRole('textbox', { name: 'URL' })).toHaveValue(
        'https://youtu.be/3',
      );
      expect(screen.getByRole('spinbutton', { name: 'Looked up' })).toHaveValue(
        2,
      );
      expect(screen.getByRole('spinbutton', { name: 'Asked AI' })).toHaveValue(
        1,
      );
      expect(screen.getByRole('slider', { name: 'Understood' })).toHaveValue(
        '70',
      );
    });

    describe('for a video with an added date', () => {
      it('shows that date', () => {
        renderEditForm({ ...watchedVideo, createdAt: '2026-10-12T09:00:00Z' });

        expect(screen.getByText('12 Oct')).toBeInTheDocument();
      });
    });

    describe('clicking save', () => {
      const addLookupAndSave = async (video: Video) => {
        const view = renderEditForm(video);
        await view.user.click(
          screen.getByRole('button', { name: 'Add a lookup' }),
        );
        await view.user.click(screen.getByRole('button', { name: 'Save' }));
        return view;
      };

      it('saves the changes', async () => {
        const { storageContext } = await addLookupAndSave(watchedVideo);

        expect(storageContext.updateItem).toHaveBeenCalledWith(VIDEO_PATH, {
          url: 'https://youtu.be/3',
          lookups: 3,
          aiQuestions: 1,
          understood: 70,
        });
      });

      it('closes the form', async () => {
        const { closeModal } = await addLookupAndSave(watchedVideo);

        expect(closeModal).toHaveBeenCalled();
      });
    });

    describe('clicking delete', () => {
      describe('once', () => {
        it('asks me to confirm', async () => {
          const { user, storageContext } = renderEditForm(watchedVideo);

          await user.click(screen.getByRole('button', { name: 'Delete' }));

          expect(
            screen.getByRole('button', { name: 'Confirm delete' }),
          ).toBeInTheDocument();
          expect(storageContext.deleteItem).not.toHaveBeenCalled();
        });
      });

      describe('twice', () => {
        const deleteVideo = async () => {
          const view = renderEditForm(watchedVideo);
          await view.user.click(screen.getByRole('button', { name: 'Delete' }));
          await view.user.click(
            screen.getByRole('button', { name: 'Confirm delete' }),
          );
          return view;
        };

        it('deletes the video', async () => {
          const { storageContext } = await deleteVideo();

          expect(storageContext.deleteItem).toHaveBeenCalledWith(VIDEO_PATH);
        });

        it('closes the form', async () => {
          const { closeModal } = await deleteVideo();

          expect(closeModal).toHaveBeenCalled();
        });
      });
    });
  });
});
