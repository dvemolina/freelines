<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';
	import type { Run } from '$lib/types';

	let runs = $state<Run[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const data = await api.get<{ runs: Run[] }>('/runs');
			runs = data.runs;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load runs';
		} finally {
			loading = false;
		}
	});

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDuration(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) return `${h}h ${m}m`;
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	}
</script>

<svelte:head>
	<title>Runs - Freelines</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-950 text-white">
	<header class="flex items-center justify-between px-4 py-3">
		<a href="/" class="text-sm text-gray-400">Back</a>
		<h1 class="text-lg font-semibold">My Runs</h1>
		<a href="/track" class="text-sm text-green-400">Track</a>
	</header>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if error}
		<div class="mx-4 rounded-lg bg-red-900/50 p-3">
			<p class="text-sm text-red-200">{error}</p>
		</div>
	{:else if runs.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 px-4">
			<p class="text-gray-500">No runs yet</p>
			<a
				href="/track"
				class="rounded-2xl bg-green-600 px-6 py-3 font-bold text-white active:bg-green-700"
			>
				Record your first run
			</a>
		</div>
	{:else}
		<div class="flex flex-col gap-3 px-4 pb-6">
			{#each runs as run (run.id)}
				<div class="rounded-xl bg-gray-900 p-4">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm text-gray-400">{formatDate(run.recordedAt)}</span>
						{#if run.conditions}
							<span class="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
								{run.conditions}
							</span>
						{/if}
					</div>
					<div class="grid grid-cols-3 gap-3 text-center">
						<div>
							<p class="text-lg font-bold">{run.verticalDropMeters} m</p>
							<p class="text-xs text-gray-500">Vertical</p>
						</div>
						<div>
							<p class="text-lg font-bold">
								{run.distanceMeters >= 1000
									? `${(run.distanceMeters / 1000).toFixed(1)} km`
									: `${run.distanceMeters} m`}
							</p>
							<p class="text-xs text-gray-500">Distance</p>
						</div>
						<div>
							<p class="text-lg font-bold">{formatDuration(run.durationSeconds)}</p>
							<p class="text-xs text-gray-500">Duration</p>
						</div>
					</div>
					<div class="mt-2 flex justify-between text-xs text-gray-500">
						<span>Max {run.maxSpeedKmh} km/h</span>
						<span>Avg {run.avgSpeedKmh} km/h</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
