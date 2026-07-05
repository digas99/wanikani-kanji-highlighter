<template>
	<div class="level-cache-panel">
		<div class="settings-section">
			<p class="settings-section-title">Subject sync</p>
			<div class="settings-section-body">
				<p class="settings-description">
					All 60 WaniKani levels are synced automatically. Use the grid below to reload specific levels.
				</p>
				<div class="setting-row">
					<div class="settings-item-label">Missing levels</div>
					<button
						type="button"
						class="settings-button secondary clickable"
						:disabled="syncingMissing"
						@click="syncMissing"
					>
						{{ syncingMissing ? 'Syncing…' : 'Sync missing' }}
					</button>
				</div>
			</div>
		</div>

		<div class="settings-section">
			<p class="settings-section-title">
				Cached levels
				<button type="button" class="refresh-btn clickable" title="Refresh" @click="refresh">↻</button>
			</p>
			<div class="settings-section-body level-cache-body">
				<p class="level-cache-legend">
					<span><i class="dot cached"></i> Cached</span>
					<span><i class="dot empty"></i> Not cached</span>
					<span><i class="dot user-level"></i> Your level</span>
				</p>

				<p v-if="!overview.length" class="level-cache-empty">
					Level cache info could not be loaded. Try refreshing, or reload the extension after updating.
				</p>

				<div v-else class="level-grid">
					<button
						v-for="entry in overview"
						:key="entry.level"
						type="button"
						class="level-tile clickable"
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

				<div v-if="selectedEntry" class="level-detail">
					<p><b>Level {{ selectedEntry.level }}</b></p>
					<p>Status: {{ selectedEntry.cached ? 'Cached' : 'Not cached' }}</p>
					<p v-if="selectedEntry.cached">Subjects: {{ selectedEntry.subjectCount }}</p>
					<p>Last loaded: {{ formatTime(selectedEntry.lastLoaded) }}</p>
					<p v-if="selectedEntry.cacheExpires">Cache refresh after: {{ formatTime(selectedEntry.cacheExpires) }}</p>
					<button
						type="button"
						class="settings-button clickable"
						:disabled="wk.reloadingLevel === selectedEntry.level"
						@click="reloadLevel(selectedEntry.level)"
					>
						{{ wk.reloadingLevel === selectedEntry.level ? 'Reloading…' : 'Force reload from WaniKani' }}
					</button>
				</div>
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
				'user-level': entry.level === this.wk.userInfo?.level,
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
.level-cache-panel {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.refresh-btn {
	margin-left: auto;
	border: none;
	background: transparent;
	color: white;
	font-size: 16px;
	padding: 0 4px;
}

.level-cache-body {
	padding: 12px;
}

.level-cache-legend {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	font-size: 11px;
	color: var(--font-sec-color);
	margin-bottom: 12px;
}

.level-cache-legend span {
	display: inline-flex;
	align-items: center;
	gap: 5px;
}

.dot {
	width: 10px;
	height: 10px;
	border-radius: 2px;
	display: inline-block;
}

.dot.cached {
	background: var(--success-color);
}

.dot.empty {
	background: var(--border-color);
}

.dot.user-level {
	background: var(--wanikani);
}

.level-cache-empty {
	text-align: center;
	color: var(--muted-color);
	font-size: 12px;
	padding: 24px 12px;
	line-height: 1.5;
}

.level-grid {
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	gap: 6px;
}

.level-tile {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 46px;
	padding: 4px;
	border: 2px solid var(--surface-border-color);
	border-radius: 6px;
	background: var(--surface-subtle-color);
	font-family: inherit;
	transition: 0.15s;
	color: var(--font-color);
}

.level-tile.cached {
	background: var(--success-muted-color);
	border-color: var(--success-color);
}

.level-tile.empty {
	background: var(--surface-subtle-color);
	border-color: var(--surface-border-color);
	color: var(--muted-color);
}

.level-tile.user-level {
	border-color: var(--wanikani);
}

.level-tile.selected {
	outline: 2px solid var(--default-color);
	outline-offset: 1px;
}

.level-tile:disabled {
	opacity: 0.7;
	cursor: wait;
}

.level-number {
	font-size: 14px;
	font-weight: 700;
	color: var(--default-color);
	line-height: 1;
}

.level-meta {
	font-size: 9px;
	color: var(--font-sec-color);
	margin-top: 2px;
}

.level-detail {
	margin-top: 14px;
	padding: 12px;
	border-radius: 8px;
	background: var(--surface-muted-color);
	border: 1px solid var(--surface-border-color);
	font-size: 12px;
	line-height: 1.5;
}

.level-detail p {
	margin: 0 0 4px;
}

.level-detail .settings-button {
	margin-top: 10px;
	width: 100%;
}
</style>
