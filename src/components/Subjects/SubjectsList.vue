<template>
	<div class="subjects-list-wrapper">
		<div class="subjects-list-header"><b>{{ values.length }}</b> Subjects on <b>{{ titleId }}</b></div>
		<div class="subjects-list-content">
			<ProgressionBar :values="groupedValues" :colors="colors" :sorting="sorting" />
			<div class="subjects-list" :style="{ maxHeight: height + 'px' }">
				<div v-for="{ id, items } in groupedValues" class="subjects-list-section">
					<div>
						<span><b></b></span>
						<span>{{ id.charAt(0).toUpperCase() + id.slice(1) }} ({{ items.length }})</span>
						<div><i class="up subjects-list-section-arrow"
								:style="{ borderColor: colors ? colors[id] : '' }"></i></div>
					</div>
					<TilesList :values="values.filter(i => i.type === id)" :colors="colors" />
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import TilesList from '@/components/Subjects/TilesList.vue';

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

	async created() {
		this.groupedValues = await this.groupValues();
		this.titleId = await this.getTitleId();
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
					return groupByType(this.values.map(item => ({ id: item.id, subject_type: item.type })));
			}
			return this.values;
		},
	}
}
</script>

<style scoped>
.subjects-list-wrapper {
	background-color: white;
}

.subjects-list-header {
	text-align: center;
	background-color: var(--default-color);
	color: white;
	padding: 15px 5px;
	font-size: 15px;
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