import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddMediaButton } from './AddMediaButton';
import { renderWithLanguageMediaStorage } from './languageMediaStorageTestUtils';

describe('AddMediaButton', () => {
  describe('clicking the seedling', () => {
    it('opens the form to add media', async () => {
      const user = userEvent.setup();
      renderWithLanguageMediaStorage(<AddMediaButton />);

      await user.click(screen.getByRole('button', { name: 'Add media' }));

      expect(
        screen.getByRole('form', { name: 'Add media' }),
      ).toBeInTheDocument();
    });

    describe('when the form is submitted', () => {
      it('closes the form', async () => {
        const user = userEvent.setup();
        renderWithLanguageMediaStorage(<AddMediaButton />);
        await user.click(screen.getByRole('button', { name: 'Add media' }));
        const form = screen.getByRole('form', { name: 'Add media' });

        await user.type(
          screen.getByRole('textbox', { name: 'Name' }),
          'Lupin{Enter}',
        );

        expect(form).not.toBeInTheDocument();
      });
    });
  });
});
