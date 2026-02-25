/**
 * Seed script for initial freeride lines.
 *
 * Run with: pnpm db:seed
 * Requires DATABASE_URL env var.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { lines } from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

const seedLines = [
	{
		name: 'Vallée Blanche',
		description: 'Classic off-piste descent from Aiguille du Midi to Chamonix. 20km, the longest off-piste run in Europe.',
		resort: 'Chamonix',
		area: 'Mont Blanc Massif',
		country: 'France',
		startLat: '45.87847200',
		startLng: '6.88724700',
		startElevation: 3842,
		endLat: '45.92355600',
		endLng: '6.86962500',
		endElevation: 1035,
		verticalDrop: 2807,
		distance: 20000,
		difficulty: 3,
		type: 'face',
		exposure: 'N'
	},
	{
		name: 'Bec des Rosses',
		description: 'Legendary steep face in Verbier. Host of the Freeride World Tour final.',
		resort: 'Verbier',
		area: 'Mont Fort',
		country: 'Switzerland',
		startLat: '46.08577800',
		startLng: '7.29680600',
		startElevation: 3223,
		endLat: '46.09266700',
		endLng: '7.29527800',
		endElevation: 2450,
		verticalDrop: 773,
		distance: 1200,
		difficulty: 5,
		type: 'face',
		exposure: 'N'
	},
	{
		name: 'Couloir des Cosmiques',
		description: 'Iconic steep couloir on the Aiguille du Midi. Technical 45-50 degree skiing.',
		resort: 'Chamonix',
		area: 'Mont Blanc Massif',
		country: 'France',
		startLat: '45.87847200',
		startLng: '6.88724700',
		startElevation: 3842,
		endLat: '45.87638900',
		endLng: '6.88416700',
		endElevation: 3400,
		verticalDrop: 442,
		distance: 500,
		difficulty: 5,
		type: 'couloir',
		exposure: 'NW'
	},
	{
		name: 'Tortin',
		description: 'Famous mogul field and off-piste area below Mont Fort in Verbier.',
		resort: 'Verbier',
		area: 'Mont Fort',
		country: 'Switzerland',
		startLat: '46.08083300',
		startLng: '7.30083300',
		startElevation: 2850,
		endLat: '46.07638900',
		endLng: '7.31333300',
		endElevation: 2050,
		verticalDrop: 800,
		distance: 2200,
		difficulty: 4,
		type: 'face',
		exposure: 'SE'
	},
	{
		name: 'Col de la Chal',
		description: 'Classic freeride bowl above La Grave. Wide open terrain with variable snow.',
		resort: 'La Grave',
		area: 'La Meije',
		country: 'France',
		startLat: '45.05361100',
		startLng: '6.30194400',
		startElevation: 3200,
		endLat: '45.04583300',
		endLng: '6.30833300',
		endElevation: 1800,
		verticalDrop: 1400,
		distance: 3500,
		difficulty: 4,
		type: 'bowl',
		exposure: 'NE'
	},
	{
		name: 'Pas de Chèvre',
		description: 'Steep chute access from Grand Montets leading to Argentière glacier.',
		resort: 'Chamonix',
		area: 'Grands Montets',
		country: 'France',
		startLat: '45.97638900',
		startLng: '6.96027800',
		startElevation: 3275,
		endLat: '45.97138900',
		endLng: '6.96361100',
		endElevation: 2800,
		verticalDrop: 475,
		distance: 800,
		difficulty: 4,
		type: 'couloir',
		exposure: 'NW'
	},
	{
		name: 'Nant Blanc Face',
		description: 'The steep north face of the Aiguille Verte. One of the most demanding descents in the Alps.',
		resort: 'Chamonix',
		area: 'Aiguille Verte',
		country: 'France',
		startLat: '45.93277800',
		startLng: '6.90138900',
		startElevation: 4122,
		endLat: '45.93916700',
		endLng: '6.91250000',
		endElevation: 2500,
		verticalDrop: 1622,
		distance: 2800,
		difficulty: 5,
		type: 'face',
		exposure: 'N'
	},
	{
		name: 'Olle Riksgränsen Bowl',
		description: 'Wide open bowl above the Arctic Circle. Spring skiing with midnight sun.',
		resort: 'Riksgränsen',
		area: 'Nordkalottleden',
		country: 'Sweden',
		startLat: '68.42694400',
		startLng: '18.12472200',
		startElevation: 1100,
		endLat: '68.42138900',
		endLng: '18.12916700',
		endElevation: 500,
		verticalDrop: 600,
		distance: 1800,
		difficulty: 3,
		type: 'bowl',
		exposure: 'E'
	}
];

const pendingLines = [
	{
		name: 'La Face de Bellevarde',
		description: 'The legendary Olympic downhill face in Val d\'Isère. Steep and exposed.',
		resort: 'Val d\'Isère',
		area: 'Bellevarde',
		country: 'France',
		startLat: '45.44777800',
		startLng: '6.98138900',
		startElevation: 2827,
		endLat: '45.44888900',
		endLng: '6.97722200',
		endElevation: 1850,
		verticalDrop: 977,
		distance: 3000,
		difficulty: 4,
		type: 'face' as const,
		exposure: 'W'
	},
	{
		name: 'Corbet\'s Couloir',
		description: 'Iconic steep chute at Jackson Hole. Mandatory air entry.',
		resort: 'Jackson Hole',
		area: 'Rendezvous Mountain',
		country: 'USA',
		startLat: '43.58777800',
		startLng: '-110.84888900',
		startElevation: 3185,
		endLat: '43.58638900',
		endLng: '-110.84694400',
		endElevation: 2950,
		verticalDrop: 235,
		distance: 400,
		difficulty: 5,
		type: 'couloir' as const,
		exposure: 'NE'
	}
];

async function seed() {
	console.log('Seeding approved lines...');

	for (const line of seedLines) {
		const slug = slugify(line.name);
		try {
			await db.insert(lines).values({
				...line,
				nameSlug: slug,
				status: 'approved'
			}).onConflictDoNothing({ target: lines.nameSlug });
			console.log(`  ✓ ${line.name}`);
		} catch (err) {
			console.error(`  ✗ ${line.name}:`, err instanceof Error ? err.message : err);
		}
	}

	console.log('Seeding pending lines...');

	for (const line of pendingLines) {
		const slug = slugify(line.name);
		try {
			await db.insert(lines).values({
				...line,
				nameSlug: slug,
				status: 'pending'
			}).onConflictDoNothing({ target: lines.nameSlug });
			console.log(`  ⏳ ${line.name}`);
		} catch (err) {
			console.error(`  ✗ ${line.name}:`, err instanceof Error ? err.message : err);
		}
	}

	console.log('Done.');
	await client.end();
}

seed();
