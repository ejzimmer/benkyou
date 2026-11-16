import './Synonyms.css'
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { WaniKaniClient } from '../api/client'
import { ApiError } from '../api/errors'
import { IconButton } from '../components/IconButton'
import { CloseIcon, PlusIcon } from '../icons'
import { addSynonym } from '../synonyms/addSynonym'
import { saveSynonyms } from '../synonyms/saveSynonyms'
import { useSynonyms } from '../synonyms/useSynonyms'

interface Props {
  subjectId: number
  client: WaniKaniClient
}

export function Synonyms({ subjectId, client }: Props) {
  const synonyms = useSynonyms(subjectId)
  const [isAdding, setIsAdding] = useState(false)
  const [typed, setTyped] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  async function save(updated: readonly string[]) {
    setIsSaving(true)
    setError(null)
    try {
      await saveSynonyms(client, subjectId, updated)
      return true
    } catch (saveError) {
      setError(getErrorMessage(saveError))
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault()
    const updated = addSynonym(synonyms, typed)
    if (updated !== synonyms && !(await save(updated))) return
    closeForm()
  }

  function closeForm() {
    setIsAdding(false)
    setTyped('')
  }

  function closeFormOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') closeForm()
  }

  return (
    <div className="synonyms">
      {synonyms.length > 0 && (
        <ul aria-label="Synonyms">
          {synonyms.map((synonym) => (
            <li key={synonym}>
              {synonym}
              <IconButton
                className="remove"
                label="Remove"
                isLoading={isSaving}
                onClick={() => void save(synonyms.filter((other) => other !== synonym))}
              >
                <CloseIcon />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {isAdding ? (
        <form onSubmit={(event) => void add(event)}>
          <label htmlFor={inputId} className="visually-hidden">Synonym</label>
          <input
            id={inputId}
            // The user just asked for this box, so jumping straight to it is expected.
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            value={typed}
            readOnly={isSaving}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={closeFormOnEscape}
          />
          <IconButton className="add" type="submit" label="Add" isLoading={isSaving}>
            <PlusIcon />
          </IconButton>
        </form>
      ) : (
        <IconButton className="add" label="Add synonym" onClick={() => setIsAdding(true)}>
          <PlusIcon />
        </IconButton>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return 'Token can’t edit synonyms'
  if (error instanceof ApiError && error.status === 422) return error.message
  return 'Couldn’t save'
}
