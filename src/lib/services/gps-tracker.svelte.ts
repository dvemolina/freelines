import { Capacitor, registerPlugin } from '@capacitor/core';
import type {
	BackgroundGeolocationPlugin,
	Location as BgLocation,
	CallbackError as BgCallbackError
} from '@capacitor-community/background-geolocation';
import type { GPSPoint, TrackingStats, TrackingSession, Run, LineMatchResult } from '$lib/types';
import { computeStats, haversineDistance, msToKmh } from '$lib/utils/geo';
import {
	saveTrackingSession,
	clearTrackingSession,
	loadTrackingSession,
	addToRunQueue,
	getRunQueue,
	removeFromRunQueue
} from './storage';
import { api } from '$lib/api/client';

const BackgroundGeolocation =
	registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

const MIN_ACCURACY_M = 50;
const MIN_DISTANCE_M = 5;
const SAVE_EVERY_N_POINTS = 10;

type PointCallback = (point: GPSPoint) => void;

function createSessionId(): string {
	if (typeof globalThis.crypto?.randomUUID === 'function') {
		return globalThis.crypto.randomUUID();
	}

	if (typeof globalThis.crypto?.getRandomValues === 'function') {
		const bytes = new Uint8Array(16);
		globalThis.crypto.getRandomValues(bytes);
		// RFC 4122 v4
		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;

		const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
		return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
			.slice(6, 8)
			.join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
	}

	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createTracker() {
	let points = $state<GPSPoint[]>([]);
	let isTracking = $state(false);
	let startedAt = $state(0);
	let watcherId: string | null = null;
	let webWatchId: number | null = null;
	let onPointCallback: PointCallback | null = null;
	let unsavedCount = 0;
	let sessionId = '';

	const stats: TrackingStats = $derived(computeStats(points, startedAt));

	function isNative(): boolean {
		return Capacitor.isNativePlatform();
	}

	function processLocation(
		latitude: number,
		longitude: number,
		elevation: number,
		accuracy: number,
		speed: number | null,
		timestamp: number
	) {
		if (accuracy > MIN_ACCURACY_M) return;

		const point: GPSPoint = {
			latitude: parseFloat(latitude.toFixed(8)),
			longitude: parseFloat(longitude.toFixed(8)),
			elevation: Math.round(elevation * 10) / 10,
			accuracy: Math.round(accuracy * 10) / 10,
			speed,
			timestamp
		};

		// Filter by minimum distance from last point
		if (points.length > 0) {
			const last = points[points.length - 1];
			const dist = haversineDistance(last, point);
			if (dist < MIN_DISTANCE_M) return;
		}

		points.push(point);
		unsavedCount++;
		onPointCallback?.(point);

		// Crash recovery: save every N points
		if (unsavedCount >= SAVE_EVERY_N_POINTS) {
			unsavedCount = 0;
			saveTrackingSession({
				id: sessionId,
				startedAt,
				points: points,
				stats
			});
		}
	}

	async function startNative() {
		watcherId = await BackgroundGeolocation.addWatcher(
			{
				backgroundMessage: 'Freelines is tracking your ski line',
				backgroundTitle: 'Tracking active',
				requestPermissions: true,
				stale: false,
				distanceFilter: MIN_DISTANCE_M
			},
				(location?: BgLocation, error?: BgCallbackError) => {
				if (error) {
					console.error('[GPS]', error.message);
					return;
				}
				if (!location) return;

				processLocation(
					location.latitude,
					location.longitude,
					location.altitude ?? 0,
					location.accuracy,
					location.speed,
					location.time ?? Date.now()
				);
			}
		);
	}

	function startWeb() {
		if (!('geolocation' in navigator)) {
			throw new Error('Geolocation not supported in this browser');
		}

		webWatchId = navigator.geolocation.watchPosition(
			(pos) => {
				processLocation(
					pos.coords.latitude,
					pos.coords.longitude,
					pos.coords.altitude ?? 0,
					pos.coords.accuracy,
					pos.coords.speed,
					pos.timestamp
				);
			},
			(err) => {
				console.error('[GPS Web]', err.message);
			},
			{
				enableHighAccuracy: true,
				maximumAge: 0,
				timeout: 10_000
			}
		);
	}

	async function requestPermissions(): Promise<boolean> {
		if (isNative()) {
			// Background geolocation plugin requests permissions via addWatcher
			// We do a quick check using the standard Capacitor Geolocation plugin
			try {
				const { Geolocation } = await import('@capacitor/geolocation');
				const status = await Geolocation.requestPermissions();
				return status.location === 'granted';
			} catch {
				// If plugin not available, permissions will be requested on start
				return true;
			}
		}

		// Web: check via Permissions API
		try {
			const result = await navigator.permissions.query({ name: 'geolocation' });
			if (result.state === 'granted') return true;
			if (result.state === 'prompt') {
				return new Promise((resolve) => {
					navigator.geolocation.getCurrentPosition(
						() => resolve(true),
						() => resolve(false),
						{ enableHighAccuracy: true, timeout: 10_000 }
					);
				});
			}
			return false;
		} catch {
			return true;
		}
	}

	async function start(onPoint?: PointCallback): Promise<void> {
		if (isTracking) return;

		sessionId = createSessionId();
		startedAt = Date.now();
		points = [];
		unsavedCount = 0;
		onPointCallback = onPoint ?? null;
		isTracking = true;

		if (isNative()) {
			await startNative();
		} else {
			startWeb();
		}
	}

	async function stop(): Promise<TrackingSession> {
		if (!isTracking) {
			return { id: sessionId, startedAt, points, stats };
		}

		if (isNative() && watcherId) {
			await BackgroundGeolocation.removeWatcher({ id: watcherId });
			watcherId = null;
		}

		if (!isNative() && webWatchId !== null) {
			navigator.geolocation.clearWatch(webWatchId);
			webWatchId = null;
		}

		isTracking = false;
		onPointCallback = null;

		const session: TrackingSession = {
			id: sessionId,
			startedAt,
			points: [...points],
			stats: computeStats(points, startedAt)
		};

		await clearTrackingSession();

		return session;
	}

	async function restoreSession(): Promise<TrackingSession | null> {
		const saved = await loadTrackingSession();
		if (!saved) return null;

		sessionId = saved.id;
		startedAt = saved.startedAt;
		points = saved.points;

		return saved;
	}

	function buildRunPayload() {
		const currentStats = computeStats(points, startedAt);
		const first = points[0];
		const last = points[points.length - 1];
		const durationSec = currentStats.duration / 1000;
		const avgSpeed = durationSec > 0 ? msToKmh(currentStats.distance / durationSec) : 0;

		return {
			points: [...points],
			startedAt: new Date(first.timestamp).toISOString(),
			endedAt: new Date(last.timestamp).toISOString(),
			durationSeconds: Math.round(durationSec),
			distanceMeters: Math.round(currentStats.distance),
			verticalDropMeters: Math.round(currentStats.verticalDrop),
			maxSpeedKmh: Math.round(currentStats.maxSpeed * 10) / 10,
			avgSpeedKmh: Math.round(avgSpeed * 10) / 10,
			startLatitude: first.latitude,
			startLongitude: first.longitude,
			startElevation: first.elevation,
			endLatitude: last.latitude,
			endLongitude: last.longitude,
			endElevation: last.elevation
		};
	}

	async function saveRun(): Promise<{ run: Run; match: LineMatchResult | null; queued?: boolean }> {
		if (points.length < 10) {
			throw new Error('Not enough GPS points recorded');
		}

		const payload = buildRunPayload();

		try {
			const result = await api.post<{ run: Run; match: LineMatchResult | null }>('/runs', payload);
			return result;
		} catch (err) {
			// Network error — queue for later
			const isNetworkError =
				err instanceof TypeError ||
				(err instanceof Error && err.message.includes('fetch'));

			if (isNetworkError) {
				await addToRunQueue({
					id: createSessionId(),
					queuedAt: Date.now(),
					payload
				});
				return {
					run: { id: 'queued', ...payload } as unknown as Run,
					match: null,
					queued: true
				};
			}
			throw err;
		}
	}

	async function syncQueue(): Promise<{ synced: number; failed: number }> {
		const queue = await getRunQueue();
		if (queue.length === 0) return { synced: 0, failed: 0 };

		let synced = 0;
		let failed = 0;

		for (const item of queue) {
			try {
				await api.post('/runs', item.payload);
				await removeFromRunQueue(item.id);
				synced++;
			} catch {
				failed++;
			}
		}

		return { synced, failed };
	}

	async function getQueueCount(): Promise<number> {
		const queue = await getRunQueue();
		return queue.length;
	}

	return {
		get points() {
			return points;
		},
		get isTracking() {
			return isTracking;
		},
		get startedAt() {
			return startedAt;
		},
		get stats() {
			return stats;
		},
		isNative,
		requestPermissions,
		start,
		stop,
		restoreSession,
		saveRun,
		syncQueue,
		getQueueCount,
		reset() {
			points = [];
			startedAt = 0;
			sessionId = '';
			unsavedCount = 0;
			clearTrackingSession();
		}
	};
}

export const tracker = createTracker();
