import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GardenErrorBoundary } from './GardenErrorBoundary'

type Storage = { isBlocked: boolean }

function Garden({ storage }: { storage: Storage }) {
  if (storage.isBlocked) throw new Error('IndexedDB blocked')
  return <main />
}

describe('GardenErrorBoundary', () => {
  describe('when the garden fails to open', () => {
    it('says so', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      render(
        <GardenErrorBoundary>
          <Garden storage={{ isBlocked: true }} />
        </GardenErrorBoundary>,
      )

      expect(screen.getByRole('alert')).toHaveTextContent(
        "The garden couldn't open its storage on this device.",
      )
    })

    describe('and the user tries again', () => {
      it('shows the garden once it opens', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const user = userEvent.setup()
        const storage = { isBlocked: true }
        render(
          <GardenErrorBoundary>
            <Garden storage={storage} />
          </GardenErrorBoundary>,
        )
        storage.isBlocked = false

        await user.click(screen.getByRole('button', { name: 'Try again' }))

        expect(screen.getByRole('main')).toBeInTheDocument()
      })
    })
  })
})
