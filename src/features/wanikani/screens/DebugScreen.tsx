import './DebugScreen.css'
import { useLiveQuery } from 'dexie-react-hooks'
import type { User } from '../api/types'
import { IconButton } from '../components/IconButton'
import { isSubjectAvailable } from '../data/availability'
import { type CollectionName, db } from '../data/db'
import { SyncIcon } from '../icons'

interface Props {
  user: User
  isSyncing: boolean
  syncError: string | null
  onSync: () => void
}

const COLLECTION_LABELS: Record<CollectionName, string> = {
  subjects: 'Subjects',
  assignments: 'Assignments',
  reviewStatistics: 'Review statistics',
  studyMaterials: 'Study materials',
  spacedRepetitionSystems: 'SRS systems',
}

export function DebugScreen({ user, isSyncing, syncError, onSync }: Props) {
  const rows = useLiveQuery(() => countStoredAndUsableRows(user), [user])
  const syncStates = useLiveQuery(() => db.syncState.toArray())
  const lastSyncedAt = syncStates
    ?.map((state) => Temporal.Instant.from(state.lastSyncedAt))
    .toSorted(Temporal.Instant.compare)
    .at(-1)

  return (
    <div className="debug">
      <div className="level">{user.level}</div>
      <div className="meta">
        {user.subscription.active ? user.subscription.type : 'free'} · max {user.subscription.max_level_granted}
      </div>

      <section>
        <div className="heading">
          <h2>Local data</h2>
          <IconButton className="icon-btn" onClick={onSync} isLoading={isSyncing} label="Sync now">
            <SyncIcon />
          </IconButton>
        </div>
        <table>
          <thead>
            <tr>
              <th>Collection</th>
              <th>Stored</th>
              <th>Usable</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map(({ name, stored, usable }) => (
              <tr key={name}>
                <th>{COLLECTION_LABELS[name]}</th>
                <td>{stored}</td>
                <td>{usable}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">
          {syncError ?? (lastSyncedAt ? `Last synced ${lastSyncedAt.toLocaleString()}` : 'Not synced yet')}
        </p>
      </section>

      <section>
        <h2>Preferences</h2>
        <pre>{JSON.stringify(user.preferences, null, 2)}</pre>
      </section>
    </div>
  )
}

async function countStoredAndUsableRows(user: User) {
  const subjects = await db.subjects.toArray()
  const availableIds = new Set(subjects.filter((s) => isSubjectAvailable(s, user)).map((s) => s.id))
  const [assignments, reviewStatistics, studyMaterials, srsCount] = await Promise.all([
    db.assignments.toArray(),
    db.reviewStatistics.toArray(),
    db.studyMaterials.toArray(),
    db.spacedRepetitionSystems.count(),
  ])
  const countUsable = (items: { data: { subject_id: number; hidden: boolean } }[]) =>
    items.filter((item) => !item.data.hidden && availableIds.has(item.data.subject_id)).length

  return [
    { name: 'subjects', stored: subjects.length, usable: availableIds.size },
    { name: 'assignments', stored: assignments.length, usable: countUsable(assignments) },
    { name: 'reviewStatistics', stored: reviewStatistics.length, usable: countUsable(reviewStatistics) },
    { name: 'studyMaterials', stored: studyMaterials.length, usable: countUsable(studyMaterials) },
    { name: 'spacedRepetitionSystems', stored: srsCount, usable: srsCount },
  ] satisfies { name: CollectionName; stored: number; usable: number }[]
}
