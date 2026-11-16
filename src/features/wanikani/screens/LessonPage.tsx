import type { ReactNode } from 'react'
import type { WaniKaniClient } from '../api/client'
import type { ContextSentence, Reading, Resource, Subject } from '../api/types'
import { MarkedUpText } from '../components/MarkedUpText'
import { SubjectCharacters } from '../components/SubjectCharacters'
import { Synonyms } from './Synonyms'

interface Props {
  subject: Resource<Subject>
  subjectsById: ReadonlyMap<number, Resource<Subject>>
  client: WaniKaniClient
}

const READING_TYPES = [
  { type: 'onyomi', name: 'On’yomi', isNameShown: true },
  { type: 'kunyomi', name: 'Kun’yomi', isNameShown: true },
  { type: 'nanori', name: 'Nanori', isNameShown: true },
  { type: undefined, name: 'Readings', isNameShown: false },
] as const

export function LessonPage({ subject: { id: subjectId, data: subject }, subjectsById, client }: Props) {
  const componentSubjects = (subject.component_subject_ids ?? []).flatMap((id) => subjectsById.get(id) ?? [])

  return (
    <article className="lesson-page">
      <div className="lesson-item" lang="ja">
        <SubjectCharacters subject={subject} />
      </div>

      <LessonSection title="Meaning">
        <Meanings subject={subject} />
        <Synonyms subjectId={subjectId} client={client} />
        <MarkedUpText text={subject.meaning_mnemonic} />
      </LessonSection>

      {subject.readings && subject.readings.length > 0 && (
        <LessonSection title="Reading">
          <Readings readings={subject.readings} />
          {subject.reading_mnemonic && <MarkedUpText text={subject.reading_mnemonic} />}
        </LessonSection>
      )}

      {componentSubjects.length > 0 && (
        <LessonSection title="Made of">
          <ComponentSubjects subjects={componentSubjects} />
        </LessonSection>
      )}

      {subject.context_sentences && subject.context_sentences.length > 0 && (
        <LessonSection title="In context">
          <ContextSentences sentences={subject.context_sentences} />
        </LessonSection>
      )}
    </article>
  )
}

function LessonSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Meanings({ subject }: { subject: Subject }) {
  const [primary, ...others] = subject.meanings.filter((meaning) => meaning.accepted_answer)

  return (
    <p className="answers">
      {primary?.meaning}
      {others.length > 0 && <span className="alternatives">{others.map((other) => other.meaning).join(', ')}</span>}
    </p>
  )
}

function Readings({ readings }: { readings: readonly Reading[] }) {
  const groups = READING_TYPES.map(({ type, name, isNameShown }) => ({
    name,
    isNameShown,
    readings: readings.filter((reading) => reading.type === type),
  })).filter((group) => group.readings.length > 0)

  return (
    <dl className="readings">
      {groups.map((group) => (
        <div key={group.name}>
          <dt className={group.isNameShown ? undefined : 'visually-hidden'}>{group.name}</dt>
          <dd lang="ja">
            {group.readings.map((reading) => (
              <span key={reading.reading} className={reading.accepted_answer ? 'accepted' : undefined}>
                {reading.reading}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ComponentSubjects({ subjects }: { subjects: readonly Resource<Subject>[] }) {
  return (
    <ul className="component-subjects">
      {subjects.map((subject) => (
        <li key={subject.id} data-type={subject.object}>
          <span lang="ja"><SubjectCharacters subject={subject.data} /></span>
          {subject.data.meanings.find((meaning) => meaning.primary)?.meaning}
        </li>
      ))}
    </ul>
  )
}

function ContextSentences({ sentences }: { sentences: readonly ContextSentence[] }) {
  return (
    <ul className="sentences">
      {sentences.map((sentence) => (
        <li key={sentence.ja}>
          <p lang="ja">{sentence.ja}</p>
          <p>{sentence.en}</p>
        </li>
      ))}
    </ul>
  )
}
