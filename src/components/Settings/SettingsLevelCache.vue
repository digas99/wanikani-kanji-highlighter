<template>
	<!-- the subjects kept from WaniKani, level by level (like the Backup section above it) -->
	<div class="settings-section level-cache">
		<p class="settings-section-title">Subject cache</p>
		<div class="settings-section-body">
			<p class="settings-description">
				Every WaniKani level is kept in this browser and synced automatically. Click a level to
				load it again from WaniKani.
			</p>

			<div class="setting-row">
				<div class="settings-item-label">
					{{ cachedCount }} of {{ overview.length || 60 }} levels cached
					<div class="settings-description">{{ subjectTotal.toLocaleString() }} subjects</div>
				</div>
				<div class="level-cache-actions setting-control">
					<button
						type="button"
						class="settings-button secondary"
						:disabled="syncingMissing || cachedCount === overview.length"
						:title="cachedCount === overview.length ? 'Every level is cached' : 'Load the levels that aren\'t cached'"
						@click="syncMissing"
					>
						{{ syncingMissing ? 'Syncing…' : 'Sync missing' }}
					</button>
					<button type="button" class="level-cache-refresh" title="Check again" aria-label="Check the cache again" @click="refresh">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" /></svg>
					</button>
				</div>
			</div>

			<div class="level-cache-head">
				<span class="level-cache-heading">Levels</span>
				<span class="level-cache-key"><span class="lc-key cached"></span>Cached</span>
				<span class="level-cache-key"><span class="lc-key empty"></span>Not cached</span>
				<span class="level-cache-key"><span class="lc-key mine"></span>Your level</span>
			</div>

			<p v-if="!overview.length" class="level-cache-empty">
				Level cache info could not be loaded. Try refreshing, or reload the extension after updating.
			</p>

			<div v-else class="level-grid">
					<button
						v-for="entry in overview"
						:key="entry.level"
						type="button"
						class="level-tile"
						:class="tileClass(entry)"
						:title="tileTitle(entry)"
						:disabled="wk.reloadingLevel === entry.level"
						@click="reloadLevel(entry.level)"
					>
						<span class="level-number">{{ entry.level }}</span>
						<span class="level-meta">
							<template v-if="wk.reloadingLevel === entry.level">…</template>
							<template v-else-if="entry.cached">{{ entry.subjectCount }}</template>
							<template v-else>—</template>
						</span>
					</button>
				</div>

			<!-- the level clicked last: its details, in a card like Backup's -->
			<div v-if="selectedEntry" class="level-detail">
				<p class="level-detail-title">Level {{ selectedEntry.level }}</p>
				<dl>
					<div><dt>Status</dt><dd>{{ selectedEntry.cached ? 'Cached' : 'Not cached' }}</dd></div>
					<div v-if="selectedEntry.cached"><dt>Subjects</dt><dd>{{ selectedEntry.subjectCount }}</dd></div>
					<div><dt>Last loaded</dt><dd>{{ formatTime(selectedEntry.lastLoaded) }}</dd></div>
					<div v-if="selectedEntry.cacheExpires"><dt>Refreshed after</dt><dd>{{ formatTime(selectedEntry.cacheExpires) }}</dd></div>
				</dl>
				<button
					type="button"
					class="settings-button"
					:disabled="wk.reloadingLevel === selectedEntry.level"
					@click="reloadLevel(selectedEntry.level)"
				>
					{{ wk.reloadingLevel === selectedEntry.level ? 'Reloading…' : 'Load again from WaniKani' }}
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import { formatCacheTimestamp } from '@/utils/scripts/subjectCache';

export default {
	name: 'SettingsLevelCache',

	data() {
		return {
			selectedLevel: null,
			syncingMissing: false,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		overview() {
			return this.wk.levelCacheOverview;
		},
		cachedCount() {
			return this.overview.filter(entry => entry.cached).length;
		},
		subjectTotal() {
			return this.overview.reduce((sum, entry) => sum + (entry.cached ? Number(entry.subjectCount) || 0 : 0), 0);
		},
		selectedEntry() {
			if (!this.selectedLevel) return null;
			return this.overview.find(entry => entry.level === this.selectedLevel) ?? null;
		},
	},

	mounted() {
		this.refresh();
	},

	methods: {
		formatTime: formatCacheTimestamp,
		async refresh() {
			await this.wk.refreshLevelCacheOverview();
		},
		async syncMissing() {
			this.syncingMissing = true;
			try {
				await this.wk.syncMissingLevels();
				await this.refresh();
			} finally {
				this.syncingMissing = false;
			}
		},
		tileClass(entry) {
			return {
				cached: entry.cached,
				empty: !entry.cached,
				selected: this.selectedLevel === entry.level,
				mine: entry.level === this.wk.userInfo?.level,
			};
		},
		tileTitle(entry) {
			const lines = [
				`Level ${entry.level}`,
				entry.cached ? `${entry.subjectCount} subjects cached` : 'Not cached',
				`Last loaded: ${formatCacheTimestamp(entry.lastLoaded)}`,
				'Click to force reload',
			];
			return lines.join('\n');
		},
		async reloadLevel(level) {
			this.selectedLevel = level;
			await this.wk.forceReloadLevel(level);
		},
	},
};
</script>

<style scoped>
.settings-section-body > .settings-description:first-child {
	padding-bottom: 4px;
}

.level-cache-actions {
	display: flex;
	align-items: center;
	gap: 6px;
}

.level-cache-actions .settings-button:disabled {
	opacity: 0.5;
	cursor: default;
}

.level-cache-refresh {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--row-border-color);
	border-radius: var(--control-radius, 8px);
	background: var(--fill-color);
	color: var(--font-sec-color);
	cursor: pointer;
}

.level-cache-refresh:hover {
	color: var(--pill-color, #e36f94);
	border-color: var(--pill-color, #e36f94);
}

.level-cache-refresh svg {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

/* "LEVELS" and the key, on one line (like Backup's "What to back up") */
.level-cache-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px 12px;
	padding: 12px 12px 8px;
}

.level-cache-heading {
	margin-right: auto;
	font-size: 10.5px;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--font-sec-color);
}

.level-cache-key {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 11px;
	color: var(--font-sec-color);
}

.lc-key {
	display: inline-block;
	flex-shrink: 0;
	width: 10px;
	height: 10px;
	box-sizing: border-box;
	border-radius: 3px;
	border: 1px solid var(--row-border-color);
	background: var(--fill-color);
}

.lc-key.cached {
	border-color: var(--success-color, #30a46c);
	box-shadow: inset 0 -3px 0 var(--success-color, #30a46c);
}

.lc-key.empty {
	border-style: dashed;
	border-color: var(--muted-color, #999);
}

.lc-key.mine {
	border-color: var(--pill-color, #e36f94);
	border-width: 2px;
}

.level-cache-empty {
	margin: 0;
	padding: 20px 12px;
	text-align: center;
	color: var(--muted-color);
	font-size: 12px;
	line-height: 1.5;
}

.level-grid {
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	gap: 6px;
	padding: 0 12px 12px;
}

/* a level: a small card; cached ones have a green bar at the bottom */
.level-tile {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 42px;
	padding: 4px 2px 6px;
	border: 1px solid var(--row-border-color);
	border-radius: 9px;
	background: var(--surface-muted-color, rgba(0, 0, 0, 0.03));
	color: var(--font-color);
	font-family: inherit;
	overflow: hidden;
	cursor: pointer;
	transition: border-color 0.15s, transform 0.15s;
}

.level-tile.cached::after {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 3px;
	background: var(--success-color, #30a46c);
}

.level-tile.empty {
	border-style: dashed;
	border-color: var(--muted-color, #aaa);
	background: transparent;
}

.level-tile.empty .level-number {
	color: var(--muted-color);
}

.level-tile.mine {
	border: 2px solid var(--pill-color, #e36f94);
}

.level-tile.mine .level-number {
	color: var(--pill-color, #e36f94);
}

.level-tile:hover:not(:disabled) {
	border-color: var(--pill-color, #e36f94);
	transform: translateY(-1px);
}

.level-tile.selected {
	box-shadow: 0 0 0 2px var(--pill-color, #e36f94);
}

.level-tile:disabled {
	opacity: 0.6;
	cursor: wait;
}

.level-number {
	font-size: 14px;
	font-weight: 800;
	line-height: 1;
	color: var(--heading-color, var(--font-color));
}

.level-meta {
	margin-top: 3px;
	font-size: 9.5px;
	color: var(--font-sec-color);
}

/* the clicked level's details: an inset card, like Backup's File / Google Drive */
.level-detail {
	margin: 0 12px 12px;
	padding: 10px 12px 12px;
	border: 1px solid var(--row-border-color);
	border-radius: 12px;
	background: var(--surface-muted-color, rgba(0, 0, 0, 0.03));
	font-size: 12px;
}

.level-detail-title {
	margin: 0 0 6px;
	font-size: 13px;
	font-weight: 800;
	color: var(--font-color);
}

.level-detail dl {
	display: grid;
	gap: 3px;
	margin: 0;
}

.level-detail dl > div {
	display: flex;
	justify-content: space-between;
	gap: 10px;
}

.level-detail dt {
	color: var(--font-sec-color);
}

.level-detail dd {
	margin: 0;
	font-weight: 600;
	color: var(--font-color);
}

.level-detail .settings-button {
	width: 100%;
	margin-top: 10px;
}
</style>

