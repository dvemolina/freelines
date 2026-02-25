<script lang="ts">
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { api } from '$lib/api/client';
	import type { Line } from '$lib/types';
	import maplibregl from 'maplibre-gl';
	import { topoStyle } from '$lib/utils/map-style';

	interface LineRun {
		id: string;
		recordedAt: string;
		durationSeconds: number;
		maxSpeedKmh: string | null;
		avgSpeedKmh: string | null;
		conditions: string | null;
	}

	let line = $state<Line | null>(null);
	let lineRuns = $state<LineRun[]>([]);
	let loading = $state(true);
	let error = $state('');
	let mapContainer = $state<HTMLDivElement>(undefined!);
	let map: maplibregl.Map | null = null;

	onMount(async () => {
		try {
			const data = await api.get<{ line: Line; runs: LineRun[] }>(
				`/lines/${page.params.slug}`
			);
			line = data.line;
			lineRuns = data.runs;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load line';
		} finally {
			loading = false;
		}
	});

	$effect(() => {
		if (!mapContainer || !line || map) return;

		const startCoord: [number, number] = [Number(line.startLng), Number(line.startLat)];
		const endCoord: [number, number] = [Number(line.endLng), Number(line.endLat)];

		const bounds = new maplibregl.LngLatBounds(startCoord, startCoord);
		bounds.extend(endCoord);

		map = new maplibregl.Map({
			container: mapContainer,
			style: topoStyle,
			bounds,
			fitBoundsOptions: { padding: 60 }
		});

		map.on('load', () => {
			if (!map) return;

			// Line connecting start to end
			map.addSource('line-path', {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: [startCoord, endCoord]
					}
				}
			});

			map.addLayer({
				id: 'line-path-layer',
				type: 'line',
				source: 'line-path',
				layout: {
					'line-join': 'round',
					'line-cap': 'round'
				},
				paint: {
					'line-color': '#facc15',
					'line-width': 4,
					'line-opacity': 0.9,
					'line-dasharray': [2, 2]
				}
			});

			// Start marker (green)
			new maplibregl.Marker({ color: '#22c55e' })
				.setLngLat(startCoord)
				.setPopup(
					new maplibregl.Popup({ offset: 25 }).setHTML(
						`<strong>Start</strong><br>${line!.startElevation} m`
					)
				)
				.addTo(map);

			// End marker (red)
			new maplibregl.Marker({ color: '#ef4444' })
				.setLngLat(endCoord)
				.setPopup(
					new maplibregl.Popup({ offset: 25 }).setHTML(
						`<strong>Finish</strong><br>${line!.endElevation} m`
					)
				)
				.addTo(map);
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
	});

	onDestroy(() => {
		map?.remove();
		map = null;
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
			'bg-green-900/50 text-green-300',
			'bg-blue-900/50 text-blue-300',
			'bg-yellow-900/50 text-yellow-300',
			'bg-orange-900/50 text-orange-300',
			'bg-red-900/50 text-red-300'
		][d] ?? 'bg-gray-800 text-gray-300';
	}

	function formatDistance(meters: number): string {
		if (meters < 1000) return `${meters} m`;
		return `${(meters / 1000).toFixed(1)} km`;
	}

	function formatDuration(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) return `${h}h ${m}m ${s}s`;
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{line?.name ?? 'Line'} - Freelines</title>
	<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.18.0/dist/maplibre-gl.css" />
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-950 text-white">
	<header class="flex items-center justify-between px-4 py-3">
		<a href="/lines" class="text-sm text-gray-400">Back</a>
		<h1 class="text-lg font-semibold">
			{#if line}
				{line.name}
			{:else}
				Line Detail
			{/if}
		</h1>
		<span class="w-10"></span>
	</header>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if error}
		<div class="mx-4 rounded-lg bg-red-900/50 p-3">
			<p class="text-sm text-red-200">{error}</p>
		</div>
	{:else if line}
		<!-- Difficulty + Type badges -->
		<div class="mx-4 mb-3 flex items-center gap-2">
			<span class="rounded-full px-3 py-1 text-xs font-medium {difficultyColor(line.difficulty)}">
				{difficultyLabel(line.difficulty)}
			</span>
			<span class="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
				{typeLabels[line.type] ?? line.type}
			</span>
			<span class="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
				{line.exposure}
			</span>
		</div>

		<!-- Description -->
		{#if line.description}
			<p class="mx-4 mb-3 text-sm text-gray-400">{line.description}</p>
		{/if}

		<!-- Location -->
		<div class="mx-4 mb-3 flex items-center gap-1 text-sm text-gray-500">
			{#if line.resort}
				<span>{line.resort}</span>
				<span>·</span>
			{/if}
			{#if line.area}
				<span>{line.area}</span>
				<span>·</span>
			{/if}
			<span>{line.country}</span>
		</div>

		<!-- Map -->
		<div class="mx-4 mb-4 overflow-hidden rounded-xl">
			<div bind:this={mapContainer} class="h-64 w-full"></div>
		</div>

		<!-- Stats grid -->
		<div class="grid grid-cols-3 gap-3 px-4">
			<div class="rounded-xl bg-gray-900 p-3 text-center">
				<p class="text-lg font-bold">{line.verticalDrop} m</p>
				<p class="text-xs text-gray-500">Vertical Drop</p>
			</div>
			<div class="rounded-xl bg-gray-900 p-3 text-center">
				<p class="text-lg font-bold">{formatDistance(line.distance)}</p>
				<p class="text-xs text-gray-500">Distance</p>
			</div>
			<div class="rounded-xl bg-gray-900 p-3 text-center">
				<p class="text-lg font-bold">{line.runCount}</p>
				<p class="text-xs text-gray-500">{line.runCount === 1 ? 'Run' : 'Runs'}</p>
			</div>
		</div>

		<!-- Elevation details -->
		<div class="mx-4 mt-3 rounded-xl bg-gray-900 p-4">
			<div class="flex justify-between text-sm">
				<span class="text-gray-400">Start: {line.startElevation} m</span>
				<span class="text-gray-400">End: {line.endElevation} m</span>
			</div>
		</div>

		<!-- Recent Runs -->
		{#if lineRuns.length > 0}
			<div class="mx-4 mt-4">
				<h2 class="mb-2 text-sm font-medium tracking-wider text-gray-500 uppercase">
					Recent Runs
				</h2>
				<div class="flex flex-col gap-2">
					{#each lineRuns as run (run.id)}
						<a
							href="/runs/{run.id}"
							class="flex items-center justify-between rounded-lg bg-gray-900 p-3 active:bg-gray-800"
						>
							<div>
								<p class="text-sm text-white">{formatDate(run.recordedAt)}</p>
								<p class="text-xs text-gray-500">
									{formatDuration(run.durationSeconds)}
									{#if run.maxSpeedKmh}
										· Max {run.maxSpeedKmh} km/h
									{/if}
								</p>
							</div>
							{#if run.conditions}
								<span class="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
									{run.conditions}
								</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<div class="h-6"></div>
	{/if}
</div>
