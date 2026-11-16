import './QuestionCard.css'
import type { Subject } from '../api/types'
import { SubjectCharacters } from '../components/SubjectCharacters'
import type { QuestionType } from '../quiz/session'

interface Props {
  subject: Subject
  questionType: QuestionType
  inputId: string
}

export function QuestionCard({ subject, questionType, inputId }: Props) {
  return (
    <div className="question-card" data-question={questionType}>
      <div className="item" lang="ja">
        <span style={{ fontSize: getCharactersFontSize(subject) }}>
          <SubjectCharacters subject={subject} />
        </span>
      </div>
      <label htmlFor={inputId}>{questionType === 'meaning' ? 'Meaning' : 'Reading'}</label>
    </div>
  )
}

function getCharactersFontSize(subject: Subject) {
  const characterCount = subject.characters === null ? 1 : [...subject.characters].length
  const widthShare = (86 / characterCount).toFixed(1)
  return `min(150px, ${widthShare}cqw, 85cqh)`
}
