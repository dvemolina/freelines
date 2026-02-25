/**
 * Seed script for test runs with GPS points.
 *
 * Run with: pnpm db:seed:runs
 * Requires DATABASE_URL env var and at least one user + seeded lines.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, sql } from 'drizzle-orm';
import { runs, runPoints, lines } from './schema';
import { user } from './auth.schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

/**
 * Generate GPS waypoints along a path between two points.
 * Adds slight random jitter for realism.
 */
function generateWaypoints(
	startLat: number,
	startLng: number,
	startElev: number,
	endLat: number,
	endLng: number,
	endElev: number,
	count: number
): { lat: number; lng: number; elevation: number }[] {
	const points: { lat: number; lng: number; elevation: number }[] = [];
	for (let i = 0; i < count; i++) {
		const t = i / (count - 1);
		// Add slight jitter for realism (±0.0001 degrees ≈ ±11m)
		const jitterLat = (Math.random() - 0.5) * 0.0002;
		const jitterLng = (Math.random() - 0.5) * 0.0002;
		points.push({
			lat: parseFloat((startLat + (endLat - startLat) * t + jitterLat).toFixed(8)),
			lng: parseFloat((startLng + (endLng - startLng) * t + jitterLng).toFixed(8)),
			elevation: Math.round(startElev + (endElev - startElev) * t)
		});
	}
	return points;
}

/**
 * Haversine distance in meters.
 */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6_371_000;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}

interface SeedRun {
	lineNameSlug: string;
	pointCount: number;
	durationMinutes: number;
	conditions: string;
	notes: string;
	hoursAgo: number;
}

const seedRuns: SeedRun[] = [
	{
		lineNameSlug: 'vall-e-blanche',
		pointCount: 150,
		durationMinutes: 120,
		conditions: 'powder',
		notes: 'Amazing powder day! Visibility was perfect, fresh 30cm overnight.',
		hoursAgo: 2
	},
	{
		lineNameSlug: 'bec-des-rosses',
		pointCount: 60,
		durationMinutes: 8,
		conditions: 'crud',
		notes: 'Steep and intense. Wind-affected snow on the upper section.',
		hoursAgo: 26
	},
	{
		lineNameSlug: 'tortin',
		pointCount: 80,
		durationMinutes: 15,
		conditions: 'spring',
		notes: 'Late season corn snow. Soft and fast.',
		hoursAgo: 50
	}
];

async function seed() {
	// Find first user
	const [firstUser] = await db.select().from(user).limit(1);
	if (!firstUser) {
		console.error('No users found. Register an account first, then run this script.');
		await client.end();
		process.exit(1);
	}
	console.log(`Using user: ${firstUser.name} (${firstUser.email})`);

	for (const seedRun of seedRuns) {
		// Find the line
		const [line] = await db
			.select()
			.from(lines)
			.where(eq(lines.nameSlug, seedRun.lineNameSlug));

		if (!line) {
			console.error(`  ✗ Line not found: ${seedRun.lineNameSlug} — run pnpm db:seed first`);
			continue;
		}

		const startLat = Number(line.startLat);
		const startLng = Number(line.startLng);
		const endLat = Number(line.endLat);
		const endLng = Number(line.endLng);

		// Generate waypoints
		const waypoints = generateWaypoints(
			startLat,
			startLng,
			line.startElevation,
			endLat,
			endLng,
			line.endElevation,
			seedRun.pointCount
		);

		// Calculate total distance from waypoints
		let totalDistance = 0;
		for (let i = 1; i < waypoints.length; i++) {
			totalDistance += haversine(
				waypoints[i - 1].lat,
				waypoints[i - 1].lng,
				waypoints[i].lat,
				waypoints[i].lng
			);
		}

		const durationSeconds = seedRun.durationMinutes * 60;
		const avgSpeedKmh = (totalDistance / 1000) / (durationSeconds / 3600);
		const maxSpeedKmh = avgSpeedKmh * 1.8; // realistic max ≈ 1.8x average

		const now = new Date();
		const startedAt = new Date(now.getTime() - seedRun.hoursAgo * 60 * 60 * 1000);
		const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);

		// Insert run
		const [run] = await db
			.insert(runs)
			.values({
				userId: firstUser.id,
				lineId: line.id,
				startedAt,
				endedAt,
				durationSeconds,
				distanceMeters: Math.round(totalDistance),
				verticalDropMeters: line.verticalDrop,
				maxSpeedKmh: String(Math.round(maxSpeedKmh * 10) / 10),
				avgSpeedKmh: String(Math.round(avgSpeedKmh * 10) / 10),
				startLat: String(waypoints[0].lat),
				startLng: String(waypoints[0].lng),
				startElevation: waypoints[0].elevation,
				endLat: String(waypoints[waypoints.length - 1].lat),
				endLng: String(waypoints[waypoints.length - 1].lng),
				endElevation: waypoints[waypoints.length - 1].elevation,
				matchConfidence: '0.95',
				pathDeviation: 12,
				notes: seedRun.notes,
				conditions: seedRun.conditions
			})
			.returning();

		// Insert GPS points
		const timePerPoint = durationSeconds / (waypoints.length - 1);
		const pointRows = waypoints.map((wp, i) => {
			const pointTime = new Date(startedAt.getTime() + i * timePerPoint * 1000);
			const speed =
				i > 0
					? haversine(waypoints[i - 1].lat, waypoints[i - 1].lng, wp.lat, wp.lng) / timePerPoint
					: 0;
			return {
				runId: run.id,
				sequence: i,
				lat: String(wp.lat),
				lng: String(wp.lng),
				elevation: wp.elevation,
				accuracy: String(Math.round((3 + Math.random() * 8) * 10) / 10),
				speedKmh: String(Math.round(speed * 3.6 * 10) / 10),
				recordedAt: pointTime
			};
		});

		for (let i = 0; i < pointRows.length; i += 500) {
			await db.insert(runPoints).values(pointRows.slice(i, i + 500));
		}

		// Increment line run count
		await db
			.update(lines)
			.set({
				runCount: sql`COALESCE(${lines.runCount}, 0) + 1`,
				updatedAt: new Date()
			})
			.where(eq(lines.id, line.id));

		console.log(
			`  ✓ ${line.name}: ${waypoints.length} points, ${Math.round(totalDistance)}m, ${seedRun.durationMinutes}min`
		);
	}

	console.log('Done.');
	await client.end();
}

seed();
