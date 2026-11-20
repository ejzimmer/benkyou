import './LessonPages.css'
import { useState } from 'react'
import type { WaniKaniClient } from '../api/client'
import type { Resource, Subject } from '../api/types'
import { IconButton } from '../components/IconButton'
import { useKeyboardShortcut } from '../components/useKeyboardShortcut'
import type { StudyItem } from '../data/studyItem'
import { ArrowIcon, BackIcon, CloseIcon } from '../icons'
import { LessonPage } from './LessonPage'
import { LessonTabs } from './LessonTabs'

interface Props {
  batch: readonly StudyItem[]
  subjectsById: ReadonlyMap<number, Resource<Subject>>
  client: WaniKaniClient
  onStartQuiz: () => void
  onExit: () => void
}

export function LessonPages({ batch, subjectsById, client, onStartQuiz, onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentItem = batch[currentIndex]
  const isLastPage = currentIndex === batch.length - 1

  function goBack() {
    setCurrentIndex(currentIndex - 1)
  }

  function goForward() {
    if (isLastPage) onStartQuiz()
    else setCurrentIndex(currentIndex + 1)
  }

  useKeyboardShortcut('ArrowLeft', goBack, currentIndex > 0)
  useKeyboardShortcut('ArrowRight', goForward)

  return (
    <div className="lesson" data-type={currentItem.assignment.data.subject_type}>
      <div className="lesson-bar">
        <LessonTabs items={batch} currentIndex={currentIndex} onSelect={setCurrentIndex} />
        <IconButton className="icon-btn" onClick={onExit} label="End lessons" tooltipAlign="end">
          <CloseIcon />
        </IconButton>
      </div>

      <LessonPage subject={currentItem.subject} subjectsById={subjectsById} client={client} />

      <nav className="lesson-nav">
        <IconButton
          className="back"
          disabled={currentIndex === 0}
          onClick={goBack}
          label="Previous"
          aria-keyshortcuts="ArrowLeft"
        >
          <BackIcon />
        </IconButton>
        <IconButton
          className="next"
          onClick={goForward}
          label={isLastPage ? 'Start quiz' : 'Next'}
          aria-keyshortcuts="ArrowRight"
        >
          <ArrowIcon />
        </IconButton>
      </nav>
    </div>
  )
}
