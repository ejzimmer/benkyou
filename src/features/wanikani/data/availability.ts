import type { Resource, Subject, User } from '../api/types'

// Hidden subjects are retired by WaniKani, and levels above the subscription
// can't be studied. We keep both in the database (an incremental sync wouldn't
// bring them back if the subscription changed) and leave them out here instead.
export function isSubjectAvailable(subject: Resource<Subject>, user: User) {
  return subject.data.hidden_at === null && subject.data.level <= user.subscription.max_level_granted
}
