import './ShakeInput.css'
import { useId, useImperativeHandle, useRef, useState, type ChangeEvent, type ComponentProps, type Ref } from 'react'
import { CompositionTracker } from './CompositionTracker'

export interface InputError {
  message: string
  isMessageVisible: boolean
  wrongCharacterIndexes?: readonly number[]
}

export interface ShakeInputHandle {
  focus: () => void
  setError: (error: InputError | null) => void
  isConfirmingText: (time: number) => boolean
}

type Props = Omit<ComponentProps<'input'>, 'ref'> & {
  ref?: Ref<ShakeInputHandle>
}

export function ShakeInput({ className, ref, onChange, ...inputProps }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<InputError | null>(null)
  const [compositionTracker] = useState(() => new CompositionTracker())
  const messageId = useId()
  const wrongCharacterIndexes = error?.wrongCharacterIndexes

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    setError: (newError) => {
      setError(newError)
      if (newError) {
        inputRef.current?.focus()
        shake(containerRef.current)
      }
    },
    isConfirmingText: (time) => compositionTracker.isConfirmingText(time),
  }), [compositionTracker])

  function clearErrorAndChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null)
    onChange?.(event)
  }

  return (
    <div ref={containerRef} className="shake-input">
      <input
        ref={inputRef}
        className={`${className ?? ''} ${getErrorClass(error)}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        onChange={clearErrorAndChange}
        onCompositionStart={() => compositionTracker.recordStart()}
        onCompositionEnd={(event) => compositionTracker.recordEnd(event.timeStamp)}
        {...inputProps}
      />
      {wrongCharacterIndexes && (
        <HighlightedCharacters text={String(inputProps.value ?? '')} indexes={wrongCharacterIndexes} />
      )}
      <p id={messageId} role="alert" className={error?.isMessageVisible === false ? 'visually-hidden' : 'message'}>
        {error?.message}
      </p>
    </div>
  )
}

function HighlightedCharacters({ text, indexes }: { text: string; indexes: readonly number[] }) {
  return (
    <div className="highlights" aria-hidden="true">
      {[...text].map((character, index) => (
        // The text is a snapshot of the input's value, so a character's position is its identity.
        // oxlint-disable-next-line react/no-array-index-key
        <span key={index} className={indexes.includes(index) ? 'wrong' : undefined}>{character}</span>
      ))}
    </div>
  )
}

function getErrorClass(error: InputError | null) {
  if (!error) return ''
  return error.wrongCharacterIndexes ? 'highlighted' : 'error'
}

const SHAKE_KEYFRAMES = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-8px)' },
  { transform: 'translateX(8px)' },
  { transform: 'translateX(-8px)' },
  { transform: 'translateX(8px)' },
  { transform: 'translateX(0)' },
]

function shake(element: HTMLElement | null) {
  element?.animate(SHAKE_KEYFRAMES, { duration: 200 })
}
