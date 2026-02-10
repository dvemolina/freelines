export interface GPSPoint {
	latitude: number;
	longitude: number;
	elevation: number;
	accuracy: number;
	speed: number | null;
	timestamp: number;
}

export interface TrackingStats {
	duration: number;
	distance: number;
	verticalDrop: number;
	maxSpeed: number;
	currentSpeed: number;
	pointCount: number;
	maxElevation: number;
	minElevation: number;
}

export interface TrackingSession {
	id: string;
	startedAt: number;
	points: GPSPoint[];
	stats: TrackingStats;
}

export interface Run {
	id: string;
	userId: string;
	lineId?: string;
	startedAt: string;
	endedAt: string;
	recordedAt: string;
	durationSeconds: number;
	distanceMeters: number;
	verticalDropMeters: number;
	maxSpeedKmh: number;
	avgSpeedKmh: number;
	startLatitude: number;
	startLongitude: number;
	startElevation?: number;
	endLatitude: number;
	endLongitude: number;
	endElevation?: number;
	matchConfidence?: number;
	notes?: string;
	conditions?: string;
	createdAt: string;
}

export interface Line {
	id: string;
	name: string;
	nameSlug: string;
	description?: string;
	resort?: string;
	area?: string;
	country: string;
	startLatitude: number;
	startLongitude: number;
	startElevation: number;
	endLatitude: number;
	endLongitude: number;
	endElevation: number;
	verticalDrop: number;
	distance: number;
	difficulty: number;
	type: string;
	exposure: string;
	status: string;
	runCount: number;
}
