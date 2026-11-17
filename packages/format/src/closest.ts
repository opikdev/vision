export function closest(
  target: string,
  options: Iterable<string>,
  maxDistance = Math.max(2, Math.floor(target.length / 3)),
): string | undefined {
  let best: string | undefined;
  let bestDistance = maxDistance + 1;
  let bestPrefix = 0;
  for (const option of options) {
    if (Math.abs(option.length - target.length) > bestDistance) continue;
    const distance = levenshtein(target, option);
    const prefix = commonPrefixLength(target, option);
    if (distance > maxDistance) continue;
    if (distance < bestDistance || (distance === bestDistance && prefix > bestPrefix)) {
      best = option;
      bestDistance = distance;
      bestPrefix = prefix;
    }
  }
  return best;
}

function commonPrefixLength(a: string, b: string): number {
  let length = 0;
  while (length < a.length && a[length] === b[length]) length++;
  return length;
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}
