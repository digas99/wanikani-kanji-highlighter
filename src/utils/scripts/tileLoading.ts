/**
 * Long tile lists draw more tiles as they're scrolled to (TilesList.vue). While a list jumps to
 * a section (its bar), that's paused: the sections passed on the way would otherwise load more,
 * pushing the one jumped to further down each time.
 */
let pausedUntil = 0;

export function pauseTileLoading(ms: number): void {
	pausedUntil = Math.max(pausedUntil, Date.now() + ms);
}

/** How long loading is still paused (0: not). */
export function tileLoadingPausedFor(): number {
	return Math.max(0, pausedUntil - Date.now());
}
