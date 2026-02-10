import type { GPSPoint, TrackingStats } from '$lib/types';

const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance between two points in meters */
export function haversineDistance(a: GPSPoint, b: GPSPoint): number {
	const dLat = toRad(b.latitude - a.latitude);
	const dLon = toRad(b.longitude - a.longitude);
	const lat1 = toRad(a.latitude);
	const lat2 = toRad(b.latitude);

	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

	return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

/** Calculate total 2D distance of a track in meters */
export function totalDistance(points: GPSPoint[]): number {
	let dist = 0;
	for (let i = 1; i < points.length; i++) {
		dist += haversineDistance(points[i - 1], points[i]);
	}
	return dist;
}

/** Calculate vertical drop (highest point minus lowest point) in meters */
export function verticalDrop(points: GPSPoint[]): number {
	if (points.length === 0) return 0;
	let max = -Infinity;
	let min = Infinity;
	for (const p of points) {
		if (p.elevation > max) max = p.elevation;
		if (p.elevation < min) min = p.elevation;
	}
	return max - min;
}

/** Convert m/s to km/h */
export function msToKmh(ms: number): number {
	return ms * 3.6;
}

/** Compute full stats from a set of points and a start time */
export function computeStats(points: GPSPoint[], startedAt: number): TrackingStats {
	const now = Date.now();
	if (points.length === 0) {
		return {
			duration: now - startedAt,
			distance: 0,
			verticalDrop: 0,
			maxSpeed: 0,
			currentSpeed: 0,
			pointCount: 0,
			maxElevation: 0,
			minElevation: 0
		};
	}

	let dist = 0;
	let maxSpeed = 0;
	let maxElev = -Infinity;
	let minElev = Infinity;

	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		if (i > 0) dist += haversineDistance(points[i - 1], p);
		if (p.speed !== null && p.speed > maxSpeed) maxSpeed = p.speed;
		if (p.elevation > maxElev) maxElev = p.elevation;
		if (p.elevation < minElev) minElev = p.elevation;
	}

	const last = points[points.length - 1];

	return {
		duration: now - startedAt,
		distance: dist,
		verticalDrop: maxElev - minElev,
		maxSpeed: msToKmh(maxSpeed),
		currentSpeed: msToKmh(last.speed ?? 0),
		pointCount: points.length,
		maxElevation: maxElev,
		minElevation: minElev
	};
}
