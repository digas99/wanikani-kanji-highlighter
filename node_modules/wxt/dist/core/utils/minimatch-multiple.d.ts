import { MinimatchOptions } from 'minimatch';
/**
 * Run [`minimatch`](https://npmjs.com/package/minimatch) against multiple
 * patterns.
 *
 * Supports negated patterns, the order does not matter. If your `search` string
 * matches any of the negative patterns, it will return `false`.
 *
 * @example
 * ```ts
 * minimatchMultiple('a.json', ['*.json', '!b.json']); // => true
 * minimatchMultiple('b.json', ['*.json', '!b.json']); // => false
 * ```
 */
export declare function minimatchMultiple(search: string, patterns: string[] | undefined, options?: MinimatchOptions): boolean;
