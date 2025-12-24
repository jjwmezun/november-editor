import {
	ByteBlock,
	MapObject,
	MapObjectArgs,
	Overworld,
	OverworldLayer,
	OverworldLayerData,
	OverworldLayerType,
	OverworldMap,
	OverworldMapData,
} from './types';
import { createObject, getOverworldTypeFactory } from './objects';

function convertLayerTypeToByte( type: OverworldLayerType ): number {
	switch ( type ) {
	case OverworldLayerType.block:
		return 0;
	case OverworldLayerType.sprite:
		return 1;
	default:
		throw new Error( `Invalid layer type: ${ type }` );
	}
}

function createBlankOverworld(): Overworld {
	return createOverworld( [ createBlankOverworldMapData() ] );
}

function createBlankOverworldLayerData( atts: object = {} ): OverworldLayerData {
	return Object.freeze( {
		objects: [],
		type: OverworldLayerType.block,
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
		encode: () => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Write maps count to data list.
			data.push( { type: `Uint8`, value: maps_.length } );

			// Write each map to data list.
			maps_.forEach( map => {
				data.push( ...map.encode() );
			} );

			return data;
		},
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
		toJSON: () => {
			return {
				maps: maps_.map( map => map.toJSON() ),
			};
		},
		updateMap,
	} );
}

function createOverworldFromJSON( data: object ): Overworld {
	if ( ! ( `maps` in data ) || ! Array.isArray( data[ `maps` ] ) ) {
		throw new Error( `Invalid overworld data` );
	}
	const mapsData: object[] = data[ `maps` ];
	const maps: OverworldMapData[] = mapsData.map( mapData => {
		if ( ! ( `height` in mapData )
			|| ! ( `layers` in mapData )
			|| ! ( `width` in mapData )
			|| ! Array.isArray( mapData[ `layers` ] )
			|| typeof mapData[ `height` ] !== `number`
			|| typeof mapData[ `width` ] !== `number` ) {
			throw new Error( `Invalid overworld map data` );
		}
		const layersData: object[] = mapData[ `layers` ];
		const layers: OverworldLayerData[] = layersData.map( layerData => {
			if ( ! ( `objects` in layerData )
				|| ! ( `type` in layerData )
				|| ! Array.isArray( layerData[ `objects` ] )
				|| typeof layerData[ `type` ] !== `string` ) {
				throw new Error( `Invalid overworld layer data` );
			}
			const objectsData: object[] = layerData[ `objects` ];
			const objects: MapObject[] = objectsData.map( objData => createObject( objData ) );
			return Object.freeze( {
				objects,
				type: layerData[ `type` ] as OverworldLayerType,
			} );
		} );
		return Object.freeze( {
			height: mapData[ `height` ] as number,
			layers,
			width: mapData[ `width` ] as number,
		} );
	} );

	return createOverworld( maps );
}

function createOverworldLayer(
	updateLayer: ( index: number, layer: OverworldLayerData ) => Overworld,
	layerIndex: number,
	layer: OverworldLayerData,
): OverworldLayer {
	const { objects, type } = layer;
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
		getType: () => type,
		encode: () => {
			// Init data list.
			const dataList: ByteBlock[] = [];

			const typeFactory = getOverworldTypeFactory( layer.type );

			// Add layer options.
			dataList.push( { type: `Uint8`, value: convertLayerTypeToByte( layer.type ) } );

			// For each object, add 2 bytes for type, then add bytes for each object data type
			// & add each datum to data list.
			layer.objects.forEach( object => {
				dataList.push( { type: `Uint16`, value: object.type() } );
				const data = typeFactory[ object.type() ].exportData;
				dataList.push( ...data.map( ( { type, key } ) => ( { type, value: object.getProp( key ) } ) ) );
			} );

			// Add terminator for layer.
			dataList.push( { type: `Uint16`, value: 0xFFFF } );

			return dataList;
		},
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
		toJSON: () => ( {
			objects: objects.map( obj => obj.toJSON() ),
			type: OverworldLayerType[ type ],
		} ),
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
		encode: () => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Write width and height to data list.
			data.push( { type: `Uint8`, value: width } );
			data.push( { type: `Uint8`, value: height } );

			// Write layers count to data list.
			data.push( { type: `Uint8`, value: layers_.length } );

			// Write each layer to data list.
			layers_.forEach( layer => {
				data.push( ...layer.encode() );
			} );

			return data;
		},
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
		toJSON: () => ( {
			height,
			layers: layers_.map( layer => layer.toJSON() ),
			width,
		} ),
		updateHeight: ( newHeight: number ) => updateThisMap( { height: newHeight } ),
		updateLayer,
		updateWidth: ( newWidth: number ) => updateThisMap( { width: newWidth } ),
	} );
}

function loadOverworldFromData( data: Uint8Array ): Overworld {
	const content: object = { maps: [] };
	let i = 0;
	const mapCount = data[ i++ ];
	for ( let m = 0; m < mapCount; m++ ) {
		const mapData: object = {};
		mapData[ `width` ] = data[ i++ ];
		mapData[ `height` ] = data[ i++ ];
		const layerCount = data[ i++ ];
		mapData[ `layers` ] = [];
		for ( let l = 0; l < layerCount; l++ ) {
			const layerData: object = {};
			const layerTypeByte = data[ i++ ];
			layerData[ `type` ] = layerTypeByte === 0 ? OverworldLayerType.block : OverworldLayerType.sprite;
			layerData[ `objects` ] = [];
			const typeFactory = getOverworldTypeFactory( layerData[ `type` ] as OverworldLayerType );

			// eslint-disable-next-line no-constant-condition
			while ( true ) {
				const objectType = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;
				if ( objectType === 0xFFFF ) {
					break;
				}
				const objData: object = { type: objectType };
				const exportData = typeFactory[ objectType ].exportData;
				for ( let d = 0; d < exportData.length; d++ ) {
					const { type, key } = exportData[ d ];
					switch ( type ) {
					case `Uint8`:
						objData[ key ] = data[ i++ ];
						break;
					case `Uint16`:
						objData[ key ] = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;
						break;
					case `Int8`:
						objData[ key ] = ( data[ i++ ] << 24 ) >> 24;
						break;
					case `Int16`:
						objData[ key ] = ( ( ( data[ i++ ] << 8 ) | data[ i++ ] ) << 16 ) >> 16;
						break;
					default:
						throw new Error( `Unsupported data type: ${ type }` );
					}
				}
				layerData[ `objects` ].push( objData );
			}
			( mapData[ `layers` ] as object[] ).push( layerData );
		}
		content.maps.push( mapData );
	}
	return createOverworldFromJSON( content );
}

export { createBlankOverworld, createOverworld, createOverworldFromJSON, loadOverworldFromData };
