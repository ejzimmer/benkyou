import './TokenScreen.css'
import { useRef, useState, type FormEvent } from 'react'
import { WaniKaniClient } from '../api/client'
import { ApiError } from '../api/errors'
import type { User } from '../api/types'
import { IconButton } from '../components/IconButton'
import { ShakeInput, type ShakeInputHandle } from '../components/ShakeInput'
import { ArrowIcon } from '../icons'

interface Props {
  onSignedIn: (token: string, user: User) => void
}

export function TokenScreen({ onSignedIn }: Props) {
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<ShakeInputHandle>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (isLoading) return

    const value = token.trim()
    if (!value) {
      inputRef.current?.setError({ message: 'Enter your API token', isMessageVisible: true })
      return
    }

    inputRef.current?.setError(null)
    setIsLoading(true)
    try {
      const user = await new WaniKaniClient(value).getUser()
      onSignedIn(value, user.data)
    } catch (e) {
      inputRef.current?.setError({ message: e instanceof ApiError && e.status === 401 ? 'Invalid token' : 'Could not reach WaniKani', isMessageVisible: true })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="field" onSubmit={submit}>
      <label htmlFor="token">API token</label>
      <div className="row">
        <ShakeInput
          id="token"
          ref={inputRef}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <IconButton className="submit" type="submit" isLoading={isLoading} label="Sign in">
          <ArrowIcon />
        </IconButton>
      </div>
    </form>
  )
}
