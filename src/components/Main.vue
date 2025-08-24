<template>

</template>

<script>
import { getWKManager } from '@/lib/apiClient';

export default {
	name: 'Main',

	mounted() {
		const wkManager = getWKManager();
		console.log(wkManager);
	}
}
</script>

<style scoped></style>