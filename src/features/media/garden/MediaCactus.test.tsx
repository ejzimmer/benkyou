import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';
import { MediaCactus } from './MediaCactus';
import { hugo } from './testMedia';
import { YoutubeChannel } from './types';

describe('MediaCactus', () => {
  describe('clicking the play sign', () => {
    it('opens a form to add a watched video', async () => {
      const user = userEvent.setup();
      renderWithLanguageMediaStorage(<MediaCactus channel={hugo} />);

      await user.click(
        screen.getByRole('button', { name: 'Add a watched video' }),
      );

      expect(
        screen.getByRole('form', {
          name: 'Add a watched video to HugoDécrypte',
        }),
      ).toBeInTheDocument();
    });

    describe('when the form is submitted', () => {
      it('closes the form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<MediaCactus channel={hugo} />);
        await user.click(
          screen.getByRole('button', { name: 'Add a watched video' }),
        );
        const form = screen.getByRole('form', {
          name: 'Add a watched video to HugoDécrypte',
        });

        await user.type(
          screen.getByRole('textbox', { name: 'URL' }),
          'https://youtu.be/3{Enter}',
        );

        expect(form).not.toBeInTheDocument();
      });
    });
  });

  describe('clicking the edit sign', () => {
    it('opens a form to edit the channel', async () => {
      const user = userEvent.setup();
      renderWithLanguageMediaStorage(<MediaCactus channel={hugo} />);

      await user.click(screen.getByRole('button', { name: 'Edit' }));

      expect(
        screen.getByRole('form', { name: 'Edit HugoDécrypte' }),
      ).toBeInTheDocument();
    });
  });

  describe('clicking an arm', () => {
    it('opens that video in the watched video form', async () => {
      const user = userEvent.setup();
      renderWithLanguageMediaStorage(<MediaCactus channel={hugo} />);

      await user.click(
        screen.getByRole('button', { name: 'Edit https://youtu.be/1' }),
      );

      expect(
        screen.getByRole('form', { name: 'Edit https://youtu.be/1' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: 'Looked up' })).toHaveValue(
        7,
      );
    });
  });

  describe('hovering an arm', () => {
    it('shows the date its video was added', async () => {
      const user = userEvent.setup();
      const channel: YoutubeChannel = {
        ...hugo,
        videos: {
          ...hugo.videos,
          v1: { ...hugo.videos!.v1, createdAt: '2026-10-12T09:00:00Z' },
        },
      };
      renderWithLanguageMediaStorage(<MediaCactus channel={channel} />);

      await user.hover(
        screen.getByRole('button', { name: 'Edit https://youtu.be/1' }),
      );

      expect(screen.getByRole('tooltip')).toHaveTextContent('12 Oct');
    });
  });

  describe('clicking a crown of flowers', () => {
    it('opens its video in the watched video form', async () => {
      const user = userEvent.setup();
      const channel: YoutubeChannel = {
        ...hugo,
        videos: { v1: { ...hugo.videos!.v1, understood: 60 } },
      };
      renderWithLanguageMediaStorage(<MediaCactus channel={channel} />);

      await user.click(screen.getAllByTestId('saguaro-blossom')[0]);

      expect(
        screen.getByRole('form', { name: 'Edit https://youtu.be/1' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: 'Looked up' })).toHaveValue(
        7,
      );
    });
  });

  describe('hovering a crown of flowers', () => {
    it('shows the date its video was added', async () => {
      const user = userEvent.setup();
      const channel: YoutubeChannel = {
        ...hugo,
        videos: {
          v1: {
            ...hugo.videos!.v1,
            understood: 60,
            createdAt: '2026-10-12T09:00:00Z',
          },
        },
      };
      renderWithLanguageMediaStorage(<MediaCactus channel={channel} />);

      await user.hover(screen.getAllByTestId('saguaro-blossom')[0]);

      expect(screen.getByRole('tooltip')).toHaveTextContent('12 Oct');
    });
  });
});
