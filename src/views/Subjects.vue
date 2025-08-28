<template>
	<div class="container">
		<SubjectsList :values="values" :colors="colors" :sorting="sorting" :id="id" :type="type" />
	</div>
</template>

<script>
import { getWKManager } from '@/lib/apiClient';
import { useWKStore } from '@/stores';

import SubjectsList from '@/components/Subjects/SubjectsList.vue';

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

			values: [],
			colors: [],
			sorting: {}
		}
	},

	computed: {
		wk() {
			return useWKStore();
		}
	},

	async created() {
		this.wkManager = getWKManager();
		await this.setMetadata();
		if (this.functionName) {
			this.wkManager[this.functionName](this.id)
			this.fetchInterval = setInterval(() => this.wkManager[this.functionName](this.id), 3000);
		}

		this.wkManager.events.on('get:subjects', async ({ state, data }) => {
			console.log("Fetched:", state, data.length);
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
					return {
						"radical": "#00a1f1",
						"kanji": "#f100a1",
						"vocabulary": "#a100f1",
					};
			}
			return [];
		},
	}
}
</script>

<style scoped></style>