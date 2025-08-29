<template>
	<div class="subjects-list-wrapper">
		<div v-if="showTitle" class="subjects-list-header"><b>{{ values.length }}</b> Subjects on <b>{{ titleId }}</b>
		</div>
		<div v-if="showProgressionBar" class="subjects-list-content">
			<ProgressionBar :values="groupedValues" :colors="colors" :sorting="sorting" />
			<div class="subjects-list" :style="{ maxHeight: height + 'px' }" @scrollend="saveScroll"
				ref="scrollContainer">
				<div v-for="{ id, items } in groupedValues" :key="id" class="subjects-list-section">
					<div>
						<span><b></b></span>
						<span>{{ id.charAt(0).toUpperCase() + id.slice(1) }} ({{ items.length }})</span>
						<div><i class="up subjects-list-section-arrow"
								:style="{ borderColor: colors ? colors[id] : '' }"></i></div>
					</div>
					<TilesList :values="values.filter(item => subjectDisplay.filterByType(item, id))"
						:colors="colors" />
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import TilesList from '@/components/Subjects/TilesList.vue';

import { useWKStore } from '@/stores/index';

import { subjectDisplay } from '@/utils/scripts/wanikani';

export default {
	name: 'SubjectsList',

	components: {
		ProgressionBar,
		TilesList
	},

	props: {
		values: {
			type: Object,
		},
		colors: {
			type: Object,
		},
		sorting: {
			type: Object,
		},
		id: {
			type: Number,
		},
		type: {
			type: String,
		},
		showTitle: {
			type: Boolean,
			default: true
		},
		showProgressionBar: {
			type: Boolean,
			default: true
		},
		height: {
			type: Number,
			default: 475
		}
	},

	data() {
		return {
			groupedValues: [],
			titleId: null
		}
	},

	computed: {
		wk() {
			return useWKStore();
		},
		subjectDisplay() {
			return subjectDisplay;
		}
	},

	async created() {
		this.groupedValues = await this.groupValues();
		if (this.showTitle)
			this.titleId = await this.getTitleId();
	},

	mounted() {
		console.log(this.$refs.scrollContainer, this.wk.subjectsListScroll);
		setTimeout(() => {
			this.$refs.scrollContainer.scrollTop = this.wk.subjectsListScroll;
		});
	},

	watch: {
		values: {
			async handler() {
				this.groupedValues = await this.groupValues();
			},
			deep: true
		},
	},

	methods: {
		async getTitleId() {
			switch (this.type) {
				case 'srs':
					const { srsStages } = await import('@/utils/scripts/wanikani');
					return srsStages[this.id].name;
			}
			return null;
		},
		async groupValues() {
			switch (this.type) {
				case 'srs':
					const { groupByType } = await import('@/utils/scripts/common');
					const grouped = groupByType(this.values.map(item => ({ id: item.id, subject_type: item.type })));
					return grouped;
			}
			return this.values;
		},
		saveScroll() {
			this.wk.subjectsListScroll = this.$refs.scrollContainer.scrollTop;
		}
	}
}
</script>

<style scoped>
.subjects-list-header {
	text-align: center;
	background-color: var(--default-color);
	color: white;
	padding: 15px 5px;
	font-size: 15px;
}

.subjects-list-content {
	overflow: hidden;
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;
	padding: 5px;
	background-color: white;
}

.subjects-list-bar {
	height: 20px;
}

.subjects-list-bar>ul {
	height: 100%;
	display: flex;
}

.subjects-list-bar>ul>li {
	position: relative;
}

.subjects-list-bar>ul>li>a {
	height: 100%;
	display: block;
}

.subjects-list-bar-label {
	position: absolute;
	width: 60px;
	height: 24px;
	border-radius: 5px;
	background-color: var(--default-color);
	top: 25px;
	color: white;
	left: 0;
	right: 0;
	margin: auto;
	font-size: 20px;
	text-align: center;
	z-index: 1;
	border: 2px solid white;
	box-shadow: 0px 0px 5px black;
}

.subjects-list {
	overflow: auto;
	scroll-behavior: smooth;
}

.subjects-list-section {
	padding: 5px;
}

.subjects-list-section>div {
	font-size: 18px;
	padding: 7px;
	background-color: var(--default-color);
	color: white;
	display: flex;
	align-items: center;
	column-gap: 10px;
}

.subjects-list-section>div {
	display: flex;
}

.subjects-list-section-arrow {
	padding: 4px;
	border-color: white;
	margin-bottom: -7px;
}
</style>