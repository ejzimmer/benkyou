export type OrderChange = {
  id: string;
  kind: 'same' | 'added' | 'removed';
  position: number;
};

type Score = { kept: number; displacement: number };

const isBetter = (a: Score, b: Score) =>
  a.kept > b.kept || (a.kept === b.kept && a.displacement < b.displacement);

export function diffOrders(
  myOrder: string[],
  theirOrder: string[],
): OrderChange[] {
  const scores = scoreCommonOrders(myOrder, theirOrder);
  const changes: OrderChange[] = [];
  let mine = 0;
  let theirs = 0;
  while (mine < myOrder.length || theirs < theirOrder.length) {
    const next = chooseNextStep(scores, myOrder, theirOrder, mine, theirs);
    if (next === 'same') {
      changes.push({ id: myOrder[mine], kind: 'same', position: mine });
      mine++;
      theirs++;
    } else if (next === 'added') {
      changes.push({ id: myOrder[mine], kind: 'added', position: mine });
      mine++;
    } else {
      changes.push({
        id: theirOrder[theirs],
        kind: 'removed',
        position: theirs,
      });
      theirs++;
    }
  }
  return changes;
}

function chooseNextStep(
  scores: Score[][],
  myOrder: string[],
  theirOrder: string[],
  mine: number,
  theirs: number,
): OrderChange['kind'] {
  if (mine === myOrder.length) return 'removed';
  if (theirs === theirOrder.length) return 'added';
  if (
    myOrder[mine] === theirOrder[theirs] &&
    !isBetter(scores[mine][theirs], matchScore(scores, mine, theirs))
  ) {
    return 'same';
  }
  return isBetter(scores[mine][theirs + 1], scores[mine + 1][theirs])
    ? 'removed'
    : 'added';
}

function scoreCommonOrders(myOrder: string[], theirOrder: string[]) {
  const scores: Score[][] = Array.from({ length: myOrder.length + 1 }, () =>
    Array.from({ length: theirOrder.length + 1 }, () => ({
      kept: 0,
      displacement: 0,
    })),
  );
  for (let mine = myOrder.length - 1; mine >= 0; mine--) {
    for (let theirs = theirOrder.length - 1; theirs >= 0; theirs--) {
      const skipMine = scores[mine + 1][theirs];
      const skipTheirs = scores[mine][theirs + 1];
      let best = isBetter(skipTheirs, skipMine) ? skipTheirs : skipMine;
      if (myOrder[mine] === theirOrder[theirs]) {
        const match = matchScore(scores, mine, theirs);
        if (!isBetter(best, match)) best = match;
      }
      scores[mine][theirs] = best;
    }
  }
  return scores;
}

function matchScore(scores: Score[][], mine: number, theirs: number): Score {
  const after = scores[mine + 1][theirs + 1];
  return {
    kept: after.kept + 1,
    displacement: after.displacement + Math.abs(mine - theirs),
  };
}
