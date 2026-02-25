import type { StyleSpecification } from 'maplibre-gl';

/**
 * OpenTopoMap raster style for MapLibre GL.
 * Free, no API key. Shows contour lines, terrain shading, and elevation coloring.
 */
export const topoStyle: StyleSpecification = {
	version: 8,
	sources: {
		'esri-satellite': {
			type: 'raster',
			tiles: [
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
			],
			tileSize: 256,
			attribution: '&copy; Esri, Maxar, Earthstar Geographics'
		},
		opentopomap: {
			type: 'raster',
			tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
			tileSize: 256,
			maxzoom: 17,
			attribution:
				'&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
		}
	},
	layers: [
		{
			id: 'satellite',
			type: 'raster',
			source: 'esri-satellite'
		},
		{
			id: 'topo-overlay',
			type: 'raster',
			source: 'opentopomap',
			paint: {
				'raster-opacity': 0.45
			}
		}
	]
};
