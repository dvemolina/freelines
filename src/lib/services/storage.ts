import { get, set, del } from 'idb-keyval';
import type { TrackingSession } from '$lib/types';

const TRACKING_SESSION_KEY = 'freelines_active_session';

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
