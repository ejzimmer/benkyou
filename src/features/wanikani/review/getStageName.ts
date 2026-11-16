const STAGE_NAMES = [
  'Lesson',
  'Apprentice 1',
  'Apprentice 2',
  'Apprentice 3',
  'Apprentice 4',
  'Guru 1',
  'Guru 2',
  'Master',
  'Enlightened',
  'Burned',
]

export function getStageName(stage: number) {
  return STAGE_NAMES[stage] ?? `Stage ${stage}`
}
