import {
	MapObject,
	MapObjectArgs,
	Overworld,
	OverworldLayer,
	OverworldLayerData,
	OverworldLayerType,
	OverworldMap,
	OverworldMapData,
} from './types';
import { createObject } from './objects';

function createBlankOverworld(): Overworld {
	return createOverworld( [ createBlankOverworldMapData() ] );
}

function createBlankOverworldLayerData( atts: object = {} ): OverworldLayerData {
	return Object.freeze( {
		objects: [],
		...atts,
	} );
}

function createBlankOverworldMapData( atts: object = {} ): OverworldMapData {
	return Object.freeze( {
		height: 20,
		layers: [ createBlankOverworldLayerData() ],
		width: 20,
		...atts,
	} );
}

function createOverworld( maps: readonly OverworldMapData[] ): Overworld {
	const updateMap = ( index: number, map: OverworldMapData ): Overworld => {
		const newMaps = [ ...maps ];
		newMaps[ index ] = map;
		return createOverworld( newMaps );
	};
	const maps_ = maps.map( ( map: OverworldMapData, index: number ) => createOverworldMap( map, index, updateMap ) );
	return Object.freeze( {
		addMap: () => createOverworld( [ ...maps, createBlankOverworldMapData() ] ),
		getMapsList: () => maps_,
		moveMapDown: ( index: number ) => {
			if ( index >= maps.length - 1 ) {
				throw new Error( `Cannot move map down: index out of bounds.` );
			}
			const newMaps = [ ...maps ];
			[ newMaps[ index ], newMaps[ index + 1 ] ] = [
				newMaps[ index + 1 ],
				newMaps[ index ],
			];
			return createOverworld( newMaps );
		},
		moveMapUp: ( index: number ) => {
			if ( index <= 0 ) {
				throw new Error( `Cannot move map up: index out of bounds.` );
			}
			const newMaps = [ ...maps ];
			[ newMaps[ index ], newMaps[ index - 1 ] ] = [
				newMaps[ index - 1 ],
				newMaps[ index ],
			];
			return createOverworld( newMaps );
		},
		removeMap: ( index: number ) => {
			if ( maps.length <= 1 ) {
				throw new Error( `Cannot remove the last map.` );
			}
			const newMaps = [ ...maps ];
			newMaps.splice( index, 1 );
			return createOverworld( newMaps );
		},
		updateMap,
	} );
}

function createOverworldLayer(
	updateLayer: ( index: number, layer: OverworldLayerData ) => Overworld,
	layerIndex: number,
	layer: OverworldLayerData,
): OverworldLayer {
	const { objects } = layer;
	return Object.freeze( {
		addObject: ( object: MapObject ) => updateLayer(
			layerIndex,
			{
				...layer,
				objects: [ ...objects, object ],
			},
		),
		getObject: ( index: number ): MapObject => {
			if ( index < 0 || index >= objects.length ) {
				throw new Error( `Object index out of bounds: ${ index }` );
			}
			return objects[ index ];
		},
		getObjectsList: () => objects,
		removeObject: ( index: number ) => {
			const newObjects = [ ...objects ];
			newObjects.splice( index, 1 );
			const newLayer = {
				...layer,
				objects: newObjects,
			};
			return updateLayer(
				layerIndex,
				newLayer,
			);
		},
		updateObject: ( index: number, object: MapObjectArgs ) => {
			const newObjects = [ ...objects ];
			newObjects[ index ] = createObject( { ...newObjects[ index ].toJSON(), ...object } );
			const newLayer = {
				...layer,
				objects: newObjects,
			};
			return updateLayer(
				layerIndex,
				newLayer,
			);
		},
	} );
}

function createOverworldMap(
	data: OverworldMapData,
	mapIndex: number,
	updateMap: ( index: number, map: OverworldMapData ) => Overworld,
): OverworldMap {
	const { height, layers, width } = data;
	const updateThisMap = ( atts: object = {} ) => updateMap(
		mapIndex,
		{
			height,
			layers,
			width,
			...atts,
		},
	);
	const updateLayer = ( index: number, layer: OverworldLayerData ): Overworld => {
		const newLayers = [ ...layers ];
		newLayers[ index ] = layer;
		return updateThisMap( { layers: newLayers } );
	};
	const layers_ = layers.map( ( layer, index ) => createOverworldLayer(
		updateLayer,
		index,
		layer,
	) );
	return Object.freeze( {
		addLayer: ( type: OverworldLayerType ) => updateThisMap( {
			layers: [
				...layers,
				createBlankOverworldLayerData( { type } ),
			],
		} ),
		getHeightBlocks: () => height,
		getHeightPixels: () => height * 16,
		getHeightTiles: () => height * 2,
		getLayersList: () => layers_,
		getWidthBlocks: () => width,
		getWidthPixels: () => width * 16,
		getWidthTiles: () => width * 2,
		moveLayerDown: ( index: number ) => {
			if ( index >= layers.length - 1 ) {
				throw new Error( `Cannot move layer down: index out of bounds.` );
			}
			const newLayers = [ ...layers ];
			[ newLayers[ index ], newLayers[ index + 1 ] ] = [
				newLayers[ index + 1 ],
				newLayers[ index ],
			];
			return updateThisMap( { layers: newLayers } );
		},
		moveLayerUp: ( index: number ) => {
			if ( index <= 0 ) {
				throw new Error( `Cannot move layer up: index out of bounds.` );
			}
			const newLayers = [ ...layers ];
			[ newLayers[ index ], newLayers[ index - 1 ] ] = [
				newLayers[ index - 1 ],
				newLayers[ index ],
			];
			return updateThisMap( { layers: newLayers } );
		},
		removeLayer: ( index: number ) => {
			if ( layers.length <= 1 ) {
				throw new Error( `Cannot remove the last layer.` );
			}
			const newLayers = [ ...layers ];
			newLayers.splice( index, 1 );
			return updateThisMap( { layers: newLayers } );
		},
		updateHeight: ( newHeight: number ) => updateThisMap( { height: newHeight } ),
		updateLayer,
		updateWidth: ( newWidth: number ) => updateThisMap( { width: newWidth } ),
	} );
}

export { createOverworld, createBlankOverworld };
