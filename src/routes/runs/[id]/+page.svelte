<script lang="ts">
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { api } from '$lib/api/client';
	import type { Run } from '$lib/types';
	import maplibregl from 'maplibre-gl';
	import { topoStyle } from '$lib/utils/map-style';

	interface RunPoint {
		sequence: number;
		lat: string;
		lng: string;
		elevation: number | null;
		accuracy: string | null;
		speedKmh: string | null;
		recordedAt: string;
	}

	let run = $state<(Run & { lineName?: string | null }) | null>(null);
	let points = $state<RunPoint[]>([]);
	let loading = $state(true);
	let error = $state('');
	let mapContainer = $state<HTMLDivElement>(undefined!);
	let map: maplibregl.Map | null = null;

	onMount(async () => {
		try {
			const data = await api.get<{ run: Run; points: RunPoint[] }>(
				`/runs/${page.params.id}`
			);
			run = data.run;
			points = data.points;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load run';
		} finally {
			loading = false;
		}
	});

	// Initialize map once we have points and the container
	$effect(() => {
		if (!mapContainer || points.length === 0 || map) return;

		const coords: [number, number][] = points.map((p) => [Number(p.lng), Number(p.lat)]);

		// Calculate bounds
		const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
		for (const c of coords) {
			bounds.extend(c);
		}

		map = new maplibregl.Map({
			container: mapContainer,
			style: topoStyle,
			bounds,
			fitBoundsOptions: { padding: 50 }
		});

		map.on('load', () => {
			if (!map) return;

			// GPS track line
			map.addSource('track', {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: coords
					}
				}
			});

			map.addLayer({
				id: 'track-line',
				type: 'line',
				source: 'track',
				layout: {
					'line-join': 'round',
					'line-cap': 'round'
				},
				paint: {
					'line-color': '#facc15',
					'line-width': 4,
					'line-opacity': 0.95
				}
			});

			// Start marker (green)
			new maplibregl.Marker({ color: '#22c55e' })
				.setLngLat(coords[0])
				.setPopup(
					new maplibregl.Popup({ offset: 25 }).setHTML(
						`<strong>Start</strong><br>${run?.startElevation ? run.startElevation + ' m' : ''}`
					)
				)
				.addTo(map);

			// End marker (red)
			new maplibregl.Marker({ color: '#ef4444' })
				.setLngLat(coords[coords.length - 1])
				.setPopup(
					new maplibregl.Popup({ offset: 25 }).setHTML(
						`<strong>Finish</strong><br>${run?.endElevation ? run.endElevation + ' m' : ''}`
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

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDuration(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) return `${h}h ${m}m ${s}s`;
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	}

	function formatDistance(meters: number): string {
		if (meters < 1000) return `${Math.round(meters)} m`;
		return `${(meters / 1000).toFixed(2)} km`;
	}
</script>

<svelte:head>
	<title>{run?.lineName || 'Run Detail'} - Freelines</title>
	<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.18.0/dist/maplibre-gl.css" />
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-950 text-white">
	<!-- Header -->
	<header class="flex items-center justify-between px-4 py-3">
		<a href="/runs" class="text-sm text-gray-400">Back</a>
		<h1 class="text-lg font-semibold">
			{#if run?.lineName}
				{run.lineName}
			{:else}
				Run Detail
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
	{:else if run}
		<!-- Match badge -->
		{#if run.lineName && run.matchConfidence}
			<div class="mx-4 mb-3 rounded-lg bg-green-900/30 p-3">
				<p class="text-sm font-medium text-green-300">
					Matched to {run.lineName} — {Math.round(Number(run.matchConfidence) * 100)}% confidence
				</p>
			</div>
		{/if}

		<!-- Date -->
		<p class="mb-3 px-4 text-sm text-gray-400">
			{formatDate(run.recordedAt)}
		</p>

		<!-- Map -->
		<div class="mx-4 mb-4 overflow-hidden rounded-xl">
			<div bind:this={mapContainer} class="h-64 w-full"></div>
		</div>

		<!-- Stats grid -->
		<div class="grid grid-cols-3 gap-3 px-4">
			<div class="rounded-xl bg-gray-900 p-3 text-center">
				<p class="text-lg font-bold">{run.verticalDropMeters} m</p>
				<p class="text-xs text-gray-500">Vertical Drop</p>
			</div>
			<div class="rounded-xl bg-gray-900 p-3 text-center">
				<p class="text-lg font-bold">{formatDistance(run.distanceMeters)}</p>
				<p class="text-xs text-gray-500">Distance</p>
			</div>
			<div class="rounded-xl bg-gray-900 p-3 text-center">
				<p class="text-lg font-bold">{formatDuration(run.durationSeconds)}</p>
				<p class="text-xs text-gray-500">Duration</p>
			</div>
		</div>

		<!-- Speed stats -->
		<div class="mt-3 grid grid-cols-2 gap-3 px-4">
			<div class="rounded-xl bg-gray-900 p-3 text-center">
				<p class="text-lg font-bold">{run.maxSpeedKmh} km/h</p>
				<p class="text-xs text-gray-500">Max Speed</p>
			</div>
			<div class="rounded-xl bg-gray-900 p-3 text-center">
				<p class="text-lg font-bold">{run.avgSpeedKmh} km/h</p>
				<p class="text-xs text-gray-500">Avg Speed</p>
			</div>
		</div>

		<!-- Elevation details -->
		{#if run.startElevation || run.endElevation}
			<div class="mx-4 mt-3 rounded-xl bg-gray-900 p-4">
				<div class="flex justify-between text-sm">
					<span class="text-gray-400">
						Start: {run.startElevation ?? '—'} m
					</span>
					<span class="text-gray-400">
						End: {run.endElevation ?? '—'} m
					</span>
				</div>
			</div>
		{/if}

		<!-- GPS points info -->
		<div class="mx-4 mt-3 rounded-xl bg-gray-900 p-4">
			<div class="flex justify-between text-sm text-gray-400">
				<span>{points.length} GPS points recorded</span>
				{#if run.conditions}
					<span class="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
						{run.conditions}
					</span>
				{/if}
			</div>
		</div>

		<!-- Notes -->
		{#if run.notes}
			<div class="mx-4 mt-3 rounded-xl bg-gray-900 p-4">
				<p class="mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">Notes</p>
				<p class="text-sm text-gray-300">{run.notes}</p>
			</div>
		{/if}

		<!-- Spacer -->
		<div class="h-6"></div>
	{/if}
</div>
