/**
 * Permutes an array of 4 entries to always show the logged-in user at the top-left (index 0).
 *
 * Seating order mapping:
 * - UI Slot 0 (Top-Left): index 0
 * - UI Slot 1 (Bottom-Left): index 1
 * - UI Slot 2 (Top-Right): index 2
 * - UI Slot 3 (Bottom-Right): index 3
 *
 * Mathematically, for any index k, the permuted index is k ^ loggedInIndex.
 */
export function permutePlayerArray<T>(array: T[], loggedInIndex: number): T[] {
  if (loggedInIndex < 0 || loggedInIndex > 3 || array.length !== 4) {
    return array;
  }
  return [
    array[0 ^ loggedInIndex],
    array[1 ^ loggedInIndex],
    array[2 ^ loggedInIndex],
    array[3 ^ loggedInIndex],
  ];
}
