import { IconButton } from '../components/IconButton'
import { ArrowIcon, UndoIcon } from '../icons'

interface Props {
  isShowingAnswer: boolean
  onRedo: () => void
}

export function AnswerButtons({ isShowingAnswer, onRedo }: Props) {
  return (
    <>
      {isShowingAnswer && (
        <IconButton className="icon-btn typo" type="button" onClick={onRedo} label="Typo, redo">
          <UndoIcon />
        </IconButton>
      )}
      <IconButton className="submit" type="submit" label={isShowingAnswer ? 'Next' : 'Submit'}>
        <ArrowIcon />
      </IconButton>
    </>
  )
}
