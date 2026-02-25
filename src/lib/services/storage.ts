import { get, set, del } from 'idb-keyval';
import type { TrackingSession } from '$lib/types';

const TRACKING_SESSION_KEY = 'freelines_active_session';
const RUN_QUEUE_KEY = 'freelines_run_queue';

// ── Run Queue (offline support) ─────────────────────────────────────────────

export interface QueuedRun {
	id: string;
	queuedAt: number;
	payload: Record<string, unknown>;
}

export async function getRunQueue(): Promise<QueuedRun[]> {
	try {
		return (await get<QueuedRun[]>(RUN_QUEUE_KEY)) ?? [];
	} catch (err) {
		console.error('[Storage] Failed to load run queue:', err);
		return [];
	}
}

export async function addToRunQueue(run: QueuedRun): Promise<void> {
	try {
		const queue = await getRunQueue();
		queue.push(run);
		await set(RUN_QUEUE_KEY, queue);
	} catch (err) {
		console.error('[Storage] Failed to add to run queue:', err);
	}
}

export async function removeFromRunQueue(id: string): Promise<void> {
	try {
		const queue = await getRunQueue();
		await set(
			RUN_QUEUE_KEY,
			queue.filter((r) => r.id !== id)
		);
	} catch (err) {
		console.error('[Storage] Failed to remove from run queue:', err);
	}
}

export async function clearRunQueue(): Promise<void> {
	try {
		await del(RUN_QUEUE_KEY);
	} catch (err) {
		console.error('[Storage] Failed to clear run queue:', err);
	}
}

export async function saveTrackingSession(session: TrackingSession): Promise<void> {
	try {
		await set(TRACKING_SESSION_KEY, session);
	} catch (err) {
		console.error('[Storage] Failed to save session:', err);
	}
}

export async function loadTrackingSession(): Promise<TrackingSession | null> {
	try {
		const session = await get<TrackingSession>(TRACKING_SESSION_KEY);
		return session ?? null;
	} catch (err) {
		console.error('[Storage] Failed to load session:', err);
		return null;
	}
}

export async function clearTrackingSession(): Promise<void> {
	try {
		await del(TRACKING_SESSION_KEY);
	} catch (err) {
		console.error('[Storage] Failed to clear session:', err);
	}
}
