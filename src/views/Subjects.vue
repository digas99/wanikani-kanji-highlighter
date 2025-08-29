<template>
	<div class="container subjects">
		<SubjectsList :values="values" :colors="colors" :sorting="sorting" :id="id" :type="type" :height="455" />
	</div>
</template>

<script>
import { getWKManager } from '@/lib/apiClient';
import { useWKStore } from '@/stores';

import SubjectsList from '@/components/Subjects/SubjectsList.vue';

import { typeColors } from '@/utils/scripts/wanikani';

export default {
	name: 'Subjects',
	components: {
		SubjectsList
	},

	data() {
		return {
			type: this.$route.query.type,
			id: parseInt(this.$route.query.id),
			functionName: null,
			wkManager: null,
			fetchInterval: null,
			fetchId: null,

			values: [],
			colors: [],
			sorting: {}
		}
	},

	computed: {
		wk() {
			return useWKStore();
		},
		typeColors() {
			return typeColors;
		}
	},

	async created() {
		this.wkManager = getWKManager();
		await this.setMetadata();
		if (this.functionName) {
			this.fetchId = this.id;
			this.wkManager[this.functionName](this.id)
		}

		this.wkManager.events.on('get:subjects', async ({ state, data, context: { caller } }) => {
			if (state === "updated" && this.fetchId !== caller) return;

			this.values = data;
		});
	},

	beforeUnmount() {
		this.wkManager.events.removeListener('get:subjects');
		clearInterval(this.fetchInterval);
	},

	methods: {
		async setMetadata() {
			this.values = this.fetchLocalCache();
			console.log("Fetched: local", this.values.length);
			this.functionName = this.getFunctionName();
			this.colors = await this.getColors();
		},
		fetchLocalCache() {
			if (this.wk.allSubjects.length > 0) {
				switch (this.type) {
					case 'srs':
						return this.wk.allSubjects.filter(item => item.assignment && item.assignment.srs_stage == this.id);
				}
			}
			return [];
		},
		getFunctionName() {
			switch (this.type) {
				case 'srs':
					return 'getSubjectsBySRSStage';
			}
			return null;
		},
		async getColors() {
			switch (this.type) {
				case 'srs':
					return this.typeColors;
			}
			return [];
		},
	}
}
</script>

<style scoped>
.container {
	background-color: var(--default-color);
}
</style>

<style>
.subjects .subjects-list-content {
	min-height: 500px;
}
</style>