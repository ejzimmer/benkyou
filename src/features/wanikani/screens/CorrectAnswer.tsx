import type { WaniKaniClient } from '../api/client'
import type { Resource, Subject } from '../api/types'
import type { QuestionType } from '../quiz/session'
import { Synonyms } from './Synonyms'

interface Props {
  subject: Resource<Subject>
  type: QuestionType
  client: WaniKaniClient
}

export function CorrectAnswer({ subject, type, client }: Props) {
  const { data } = subject
  const answers =
    type === 'meaning'
      ? data.meanings.filter((m) => m.accepted_answer).map((m) => m.meaning)
      : (data.readings ?? []).filter((r) => r.accepted_answer).map((r) => r.reading)

  return (
    <div className="reveal">
      <div className="correct" lang={type === 'reading' ? 'ja' : 'en'}>
        {answers.join(', ')}
      </div>
      {type === 'meaning' && <Synonyms subjectId={subject.id} client={client} />}
    </div>
  )
}
