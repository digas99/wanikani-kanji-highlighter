<template>
    <div>
        <div class="levels-in-progress">
            <template v-for="level in filteredLevels" :key="level.level">
                <template v-for="entry in level.types" :key="entry.type">
                    <div class="level-progression-bar-wrapper">
                        <ProgressionBar
                            :values="entry.bars"
                            :colors="srsStageColors"
                            :sorting="srsStageSorting"
                            type="level"
                            :link-query="entry => levelSubjectsLink(level.level, entry.type, entry.id)"
                        />
                        <RouterLink
                            class="level-progression-label clickable"
                            :to="levelSubjectsLink(level.level, entry.type)"
                        >
                            {{ level.level }} {{ typeLabel(entry.type) }}
                        </RouterLink>
                    </div>
                </template>
            </template>
        </div>
    </div>
</template>

<script>
import { RouterLink } from 'vue-router';
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import { srsStages } from '@/utils/scripts/wanikani';
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
        }
    },

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
                    .filter(typeGroup => typeGroup.items.some(
                        item => !item.assignment || item.assignment?.passed_at === null
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
            }));
        },
    },

    methods: {
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
        this.srsStageColors['-1'] = '#ffffff';
        this.srsStageSorting = { '5': 0, '4': 1, '3': 2, '2': 3, '1': 4, '0': 5, '-1': 6 };
    }
}
</script>

<style scoped>
.levels-in-progress {
    margin: 5px;
    display: flex;
    flex-direction: column;
    row-gap: 2px;
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
