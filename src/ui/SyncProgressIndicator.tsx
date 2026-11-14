import type { ComponentType } from "react"
import {
  SYNC_STAGES,
  type SyncProgress,
  type SyncStage,
} from "../lib/sync/syncTypes"
import { CardsIcon } from "./CardsIcon"
import { ImageIcon } from "./ImageIcon"
import { UploadIcon } from "./UploadIcon"

type Props = {
  progress: SyncProgress
}

const STAGE_LABELS: Record<SyncStage, string> = {
  cards: "カード",
  images: "画像",
  upload: "アップロード",
}

const STAGE_ICONS: Record<SyncStage, ComponentType<{ className?: string }>> = {
  cards: CardsIcon,
  images: ImageIcon,
  upload: UploadIcon,
}

type StageState = "done" | "active" | "pending"

function getStageState(stage: SyncStage, current: SyncStage): StageState {
  const stageIndex = SYNC_STAGES.indexOf(stage)
  const currentIndex = SYNC_STAGES.indexOf(current)
  if (stageIndex < currentIndex) return "done"
  if (stageIndex === currentIndex) return "active"
  return "pending"
}

export function SyncProgressIndicator({ progress }: Props) {
  const label = STAGE_LABELS[progress.stage]
  const percent =
    progress.fraction == null ? null : Math.round(progress.fraction * 100)

  return (
    <div className="sync-progress">
      <ol className="sync-stages">
        {SYNC_STAGES.map((stage) => {
          const Icon = STAGE_ICONS[stage]
          const state = getStageState(stage, progress.stage)
          return (
            <li
              key={stage}
              className={`sync-stage ${state}`}
              title={STAGE_LABELS[stage]}
              aria-label={STAGE_LABELS[stage]}
              aria-current={state === "active" ? "step" : undefined}
            >
              <Icon className="sync-stage-icon" />
            </li>
          )
        })}
      </ol>
      <div
        className={
          percent == null
            ? "sync-progress-bar indeterminate"
            : "sync-progress-bar"
        }
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        title={percent == null ? label : `${label} ${percent}%`}
      >
        <span
          className="sync-progress-fill"
          style={percent == null ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
