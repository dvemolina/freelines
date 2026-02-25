<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';
	import type { Line } from '$lib/types';

	let lines = $state<Line[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const data = await api.get<{ lines: Line[] }>('/lines');
			lines = data.lines;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load lines';
		} finally {
			loading = false;
		}
	});

	const typeLabels: Record<string, string> = {
		couloir: 'Couloir',
		face: 'Face',
		bowl: 'Bowl',
		tree_run: 'Tree Run',
		ridge: 'Ridge'
	};

	function difficultyLabel(d: number): string {
		return ['', 'Easy', 'Moderate', 'Challenging', 'Expert', 'Extreme'][d] ?? `${d}`;
	}

	function difficultyColor(d: number): string {
		return [
			'',
			'text-green-400',
			'text-blue-400',
			'text-yellow-400',
			'text-orange-400',
			'text-red-400'
		][d] ?? 'text-gray-400';
	}

	function formatDistance(meters: number): string {
		if (meters < 1000) return `${meters} m`;
		return `${(meters / 1000).toFixed(1)} km`;
	}
</script>

<svelte:head>
	<title>Lines - Freelines</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-950 text-white">
	<header class="flex items-center justify-center px-4 py-3">
		<h1 class="text-lg font-semibold">Freeride Lines</h1>
	</header>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if error}
		<div class="mx-4 rounded-lg bg-red-900/50 p-3">
			<p class="text-sm text-red-200">{error}</p>
		</div>
	{:else if lines.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 px-4">
			<p class="text-gray-500">No lines available yet</p>
		</div>
	{:else}
		<div class="flex flex-col gap-3 px-4 pb-6">
			{#each lines as line (line.id)}
				<a
					href="/lines/{line.nameSlug}"
					class="block rounded-xl bg-gray-900 p-4 active:bg-gray-800"
				>
					<div class="mb-2 flex items-center justify-between">
						<h2 class="text-base font-semibold">{line.name}</h2>
						<span class="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
							{typeLabels[line.type] ?? line.type}
						</span>
					</div>

					{#if line.description}
						<p class="mb-3 line-clamp-2 text-sm text-gray-400">{line.description}</p>
					{/if}

					<div class="mb-2 flex items-center gap-2 text-xs text-gray-500">
						{#if line.resort}
							<span>{line.resort}</span>
							<span>·</span>
						{/if}
						<span>{line.country}</span>
						<span>·</span>
						<span>{line.exposure}</span>
					</div>

					<div class="grid grid-cols-3 gap-3 text-center">
						<div>
							<p class="text-lg font-bold">{line.verticalDrop} m</p>
							<p class="text-xs text-gray-500">Vertical</p>
						</div>
						<div>
							<p class="text-lg font-bold">{formatDistance(line.distance)}</p>
							<p class="text-xs text-gray-500">Distance</p>
						</div>
						<div>
							<p class="text-lg font-bold {difficultyColor(line.difficulty)}">
								{difficultyLabel(line.difficulty)}
							</p>
							<p class="text-xs text-gray-500">Difficulty</p>
						</div>
					</div>

					{#if line.runCount > 0}
						<div class="mt-2 text-right text-xs text-gray-500">
							{line.runCount} {line.runCount === 1 ? 'run' : 'runs'} recorded
						</div>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>
