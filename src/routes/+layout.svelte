<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="pb-15">
	{@render children()}
</div>
<BottomNav />
