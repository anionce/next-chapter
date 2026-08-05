/** Standard chess-style Elo — every book starts here until compared. */
export const DEFAULT_ELO = 1500

/** Higher = each comparison swings ratings further. 32 is the common default
 * (used by FIDE for new/improving players) — comparisons here are just as
 * infrequent per book as early chess games, so ratings should move fast
 * enough to reflect a handful of real preferences, not creep slowly. */
const K_FACTOR = 32

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
}

/** Updates both ratings after a single head-to-head result. `winner` is
 * whichever side actually won — there are no draws in a "which did you
 * prefer" matchup. */
export function updateElo(ratingA: number, ratingB: number, winner: "A" | "B"): [number, number] {
  const expectedA = expectedScore(ratingA, ratingB)
  const scoreA = winner === "A" ? 1 : 0
  const newA = ratingA + K_FACTOR * (scoreA - expectedA)
  const newB = ratingB + K_FACTOR * (1 - scoreA - (1 - expectedA))
  return [Math.round(newA), Math.round(newB)]
}
