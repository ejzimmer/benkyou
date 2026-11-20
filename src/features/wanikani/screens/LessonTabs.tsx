import { SubjectCharacters } from '../components/SubjectCharacters'
import type { StudyItem } from '../data/studyItem'

interface Props {
  items: readonly StudyItem[]
  currentIndex: number
  onSelect: (index: number) => void
}

export function LessonTabs({ items, currentIndex, onSelect }: Props) {
  return (
    <ol className="lesson-tabs" aria-label="Lessons in this batch">
      {items.map((item, index) => (
        <li key={item.assignment.id}>
          <button
            type="button"
            lang="ja"
            data-type={item.assignment.data.subject_type}
            aria-current={index === currentIndex ? 'step' : undefined}
            onClick={() => onSelect(index)}
          >
            <SubjectCharacters subject={item.subject.data} />
          </button>
        </li>
      ))}
    </ol>
  )
}
