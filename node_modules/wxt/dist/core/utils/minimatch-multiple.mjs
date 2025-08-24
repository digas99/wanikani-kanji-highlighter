import { minimatch } from "minimatch";
export function minimatchMultiple(search, patterns, options) {
  if (patterns == null) return false;
  const negatePatterns = [];
  const positivePatterns = [];
  for (const pattern of patterns) {
    if (pattern[0] === "!") negatePatterns.push(pattern.slice(1));
    else positivePatterns.push(pattern);
  }
  if (negatePatterns.some(
    (negatePattern) => minimatch(search, negatePattern, options)
  ))
    return false;
  return positivePatterns.some(
    (positivePattern) => minimatch(search, positivePattern, options)
  );
}
