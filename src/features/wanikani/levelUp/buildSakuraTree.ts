import { createRandom } from './createRandom'

export const TREE_WIDTH = 640
export const TREE_HEIGHT = 440

const SEED = 39
const MAX_DEPTH = 6
const BLOSSOMS_PER_TIP = 4

export interface Branch {
  id: number
  path: string
  width: number
}

export interface Blossom {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
}

export interface SakuraTree {
  branches: Branch[]
  blossoms: Blossom[]
}

interface Growth {
  x: number
  y: number
  angle: number
  length: number
  width: number
  depth: number
}

export function buildSakuraTree(): SakuraTree {
  const random = createRandom(SEED)
  const tree: SakuraTree = { branches: [], blossoms: [] }
  growBranch(tree, random, { x: TREE_WIDTH / 2, y: TREE_HEIGHT - 30, angle: -Math.PI / 2, length: 70, width: 15, depth: 0 })
  tree.blossoms = shuffleSeeded(tree.blossoms, random)
  for (const [order, blossom] of tree.blossoms.entries()) blossom.id = order
  return tree
}

function growBranch(tree: SakuraTree, random: () => number, growth: Growth) {
  const { x, y, angle, length, width, depth } = growth
  const end = { x: x + Math.cos(angle) * length, y: y + Math.sin(angle) * length }
  const bend = (random() - 0.5) * length * 0.3
  const control = {
    x: (x + end.x) / 2 + Math.cos(angle + Math.PI / 2) * bend,
    y: (y + end.y) / 2 + Math.sin(angle + Math.PI / 2) * bend,
  }
  tree.branches.push({ id: tree.branches.length, path: `M${round(x)},${round(y)} Q${round(control.x)},${round(control.y)} ${round(end.x)},${round(end.y)}`, width: round(width) })

  if (depth >= 3) addBlossoms(tree, random, end, length)
  if (depth === MAX_DEPTH) return

  const spread = depth === 0 ? 0.62 : 0.5
  for (const side of [-1, 1]) {
    growBranch(tree, random, {
      ...end,
      angle: angle + side * spread * (0.6 + random() * 0.8) + (random() - 0.5) * 0.2,
      length: length * (0.74 + random() * 0.16),
      width: width * 0.66,
      depth: depth + 1,
    })
  }
}

function addBlossoms(tree: SakuraTree, random: () => number, tip: { x: number; y: number }, length: number) {
  for (let i = 0; i < BLOSSOMS_PER_TIP; i++) {
    tree.blossoms.push({
      id: 0,
      x: round(tip.x + (random() - 0.5) * length * 1.1),
      y: round(tip.y + (random() - 0.5) * length * 0.9),
      rotation: Math.round(random() * 72),
      scale: round(0.7 + random() * 0.6),
    })
  }
}

function shuffleSeeded<T>(items: readonly T[], random: () => number) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function round(value: number) {
  return Math.round(value * 10) / 10
}
