<template>
    <div>
        <div class="levels-in-progress">
            <!-- every row stays rendered; collapsing only changes its state, so it animates -->
            <div
                v-for="row in rows"
                :key="row.key"
                class="level-row"
                :class="[rowState(row) && `level-row-${rowState(row)}`, { 'level-row-peek': isPeek(row) }]"
                :title="isPeek(row) ? 'More levels in progress: click to show all' : null"
                @click="isPeek(row) && $emit('expand')"
            >
                <div class="level-progression-bar-wrapper" :inert="rowState(row) !== '' || null">
                    <ProgressionBar
                        :values="row.entry.bars"
                        :colors="srsStageColors"
                        :sorting="srsStageSorting"
                        type="level"
                        :marker="levelUpMarker(row.level, row.entry)"
                        :link-query="segment => levelSubjectsLink(row.level, row.entry.type, segment.id)"
                    />
                    <RouterLink
                        class="level-progression-label clickable"
                        :to="levelSubjectsLink(row.level, row.entry.type)"
                    >
                        {{ row.level }} {{ typeLabel(row.entry.type) }}
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { RouterLink } from 'vue-router';
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import { srsStages } from '@/utils/scripts/wanikani';
import { useWKStore } from '@/stores';

/** Share of the current level's kanji that must be passed (Guru+) to level up. */
const LEVEL_UP_KANJI_RATIO = 0.9;
/** Bars group Guru and above (and anything passed) into stage 5. */
const PASSED_STAGE = 5;
import { groupBySRSStage, wrapSubjectsToStage5 } from '@/utils/scripts/common';

const TYPE_LABELS = {
    radical: 'Rad',
    kanji: 'Kan',
    vocabulary: 'Voc',
};

export default {
	name: 'LevelsInProgress',
    
    components: {
        RouterLink,
        ProgressionBar,
    },

    props: {
        levels: {
            type: Array,
            default: () => []
        },
        /** Only the current level's bars, with a faded peek at the neighbouring levels. */
        collapsed: {
            type: Boolean,
            default: false,
        },
    },

    emits: ['expand', 'collapsible'],

    data() {
        return {
            srsStageColors: {},
            srsStageSorting: {}
        }
    },

    computed: {
		srsStages() {
			return srsStages;
		},
        filteredLevels() {
            if (!this.levels?.length) return [];

            return this.levels.map(level => ({
                level: level.level,
                types: level.items
                    // in progress = something unlocked and not passed yet;
                    // a type with only locked (and passed) subjects is hidden
                    .filter(typeGroup => typeGroup.items.some(
                        item => item.assignment?.srs_stage != null && item.assignment?.passed_at == null
                    ))
                    .map(typeGroup => ({
                        type: typeGroup.id,
                        bars: groupBySRSStage(wrapSubjectsToStage5(typeGroup.items)).reduce((acc, stage) => {
                            const stageId = parseInt(stage.id);
                            const existingStage = acc.find(s => s.id === stageId);
                            if (existingStage) {
                                existingStage.items.push(...stage.items);
                            } else {
                                acc.push({ id: stageId, items: [...stage.items] });
                            }
                            return acc;
                        }, []),
                    })),
            })).filter(level => level.types.length);
        },
        /** One entry per bar, in display order (levels ascending). */
        rows() {
            return this.filteredLevels.flatMap(level => level.types.map(entry => ({
                key: `${level.level}-${entry.type}`,
                level: Number(level.level),
                entry,
            })));
        },
        /** The level kept when collapsed: the user's current one, else the highest in progress. */
        focusLevel() {
            const levels = this.filteredLevels.map(level => Number(level.level));
            if (!levels.length) return null;
            const current = Number(useWKStore().userInfo?.level);
            return levels.includes(current) ? current : Math.max(...levels);
        },
        /** Collapsing only makes sense when other levels are in progress too. */
        collapsible() {
            return this.filteredLevels.length > 1;
        },
        /** Keys of the bars peeking out under a fade (closest bar on each side of the focus level). */
        peekKeys() {
            const before = this.rows.filter(row => row.level < this.focusLevel).at(-1);
            const after = this.rows.find(row => row.level > this.focusLevel);
            return new Set([before?.key, after?.key].filter(Boolean));
        },
    },

    watch: {
        collapsible: {
            handler(value) {
                this.$emit('collapsible', value);
            },
            immediate: true,
        },
    },

    methods: {
        /** '' = shown, 'peek-before' / 'peek-after' = faded sliver, 'hidden' = collapsed away. */
        rowState(row) {
            if (!this.collapsed || !this.collapsible || row.level === this.focusLevel) return '';
            if (!this.peekKeys.has(row.key)) return 'hidden';
            return row.level < this.focusLevel ? 'peek-before' : 'peek-after';
        },
        isPeek(row) {
            return this.rowState(row).startsWith('peek');
        },
        /**
         * WaniKani levels up once 90% of the current level's kanji are passed (Guru+).
         * Passed is the leftmost segment, so the line marks how far it has to reach.
         */
        levelUpMarker(level, entry) {
            if (entry.type !== 'kanji' || level !== useWKStore().userInfo?.level) return null;

            const total = entry.bars.reduce((sum, bar) => sum + bar.items.length, 0);
            if (!total) return null;
            const needed = Math.ceil(total * LEVEL_UP_KANJI_RATIO);
            const passed = entry.bars.find(bar => bar.id === PASSED_STAGE)?.items.length ?? 0;
            const remaining = Math.max(0, needed - passed);

            return {
                position: (needed / total) * 100,
                reached: remaining === 0,
                title: remaining
                    ? `Level up at ${needed} of ${total} kanji passed (90%) · ${remaining} to go`
                    : `Level up reached: ${passed} of ${total} kanji passed`,
            };
        },
        typeLabel(type) {
            return TYPE_LABELS[type] || type.slice(0, 1).toUpperCase() + type.slice(1, 3);
        },
        levelSubjectsLink(level, subjectType, srs) {
            const query = {
                type: 'level',
                level: String(level),
                subjectType,
            };
            if (srs != null) query.srs = String(srs);
            return { name: 'Subjects', query };
        },
    },
    
    mounted() {
        this.srsStageColors = Object.fromEntries(Object.entries(this.srsStages).map(([k, v]) => [k, v.color]));
        this.srsStageColors['5'] = '#000000';
        // locked: light gray (white vanished against the white card)
        this.srsStageColors['-1'] = '#e2e2ea';
        this.srsStageSorting = { '5': 0, '4': 1, '3': 2, '2': 3, '1': 4, '0': 5, '-1': 6 };
    }
}
</script>

<style scoped>
.levels-in-progress {
    margin: 5px;
    display: flex;
    flex-direction: column;
}

.level-row {
    display: flex;
    flex-direction: column;
    max-height: 40px;
    overflow: hidden;
    transition: max-height 0.3s ease, opacity 0.3s ease, margin-top 0.3s ease;
}

.level-row + .level-row {
    margin-top: 2px;
}

.level-row-hidden {
    max-height: 0;
    opacity: 0;
}

.level-row + .level-row-hidden {
    margin-top: 0;
}

/* a sliver of the neighbouring level, fading out: "there's more" */
.level-row-peek {
    max-height: 11px;
    opacity: 0.75;
    cursor: pointer;
}

.level-row-peek:hover {
    opacity: 1;
}

.level-row-peek > .level-progression-bar-wrapper {
    pointer-events: none;
}

/* above the current level: show its bottom edge, fading upwards */
.level-row-peek-before {
    justify-content: flex-end;
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000);
    mask-image: linear-gradient(to bottom, transparent, #000);
}

/* below: its top edge, fading downwards */
.level-row-peek-after {
    -webkit-mask-image: linear-gradient(to top, transparent, #000);
    mask-image: linear-gradient(to top, transparent, #000);
}

@media (prefers-reduced-motion: reduce) {
    .level-row {
        transition: none;
    }
}

.level-wrapper {
    display: flex;
    flex-direction: column;
}
.level-progression-bar-wrapper {
    display: flex;
    width: 100%;
    gap: 5px;
    align-items: center;
}

.level-progression-bar-wrapper > :first-child {
    flex: 1;
}

.level-progression-bar-wrapper #progression-bar {
    padding-bottom: unset;
}

.level-progression-label {
    font-size: 12px;
    text-align: center;
    background-color: var(--default-color);
    width: 40px;
    padding: 5px;
    border-radius: 5px;
    color: white;
    text-decoration: none;
}
</style>
