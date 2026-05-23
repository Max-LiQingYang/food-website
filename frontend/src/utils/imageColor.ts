const WARM_COLORS = [
  ['#fff3ed', '#fde0d4'],
  ['#fef6f0', '#fce4d0'],
  ['#fff5ee', '#ffe0cc'],
  ['#fef8f4', '#fbe8dc'],
  ['#fff7f0', '#fde4d0'],
  ['#fef4ec', '#fcd8c4'],
  ['#fffaf5', '#fde8d8'],
  ['#fef7f2', '#fce0cc'],
]

/**
 * Generate a warm-toned gradient CSS string from a string hash.
 */
export function generateColorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // Convert to 32bit integer
  }
  const index = Math.abs(hash) % WARM_COLORS.length
  const [c1, c2] = WARM_COLORS[index]
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`
}