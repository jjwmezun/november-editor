import { objectTypes } from './objects';
import { getDataTypeSize } from './bytes';
import { createGoal, goals } from './goals';
import { encode, decode } from './text';
import { tilesPerBlock, pixelsPerBlock } from "./constants";
import {
	ByteBlock,
	DecodedLevelData,
	Goal,
	Layer,
	LayerType,
	Level,
	LvMap,
	LvMapProps,
	MapObject,
	MapObjectArgs,
} from './types';

const layerTypeNames = Object.freeze( {
	[ LayerType.block ]: `Block`,
} );

const createLayer = (
	type: LayerType = LayerType.block,
	objects: MapObject[] = [],
	scrollX: number = 1.0,
): Layer => Object.freeze( {
	type,
	objects,
	scrollX,
} );

const createLevel = (
	name: string = `Unnamed Level`,
	goal: Goal = createGoal( 0 ),
	maps: ArrayBuffer[] = [],
): Level => {
	return Object.freeze( {
		getGoal: () => goal,
		getMaps: () => maps,
		getName: () => name,
		getProps: () => ( { name, goal, maps } ),
		updateGoal: newGoal => createLevel( name, newGoal, maps ),
		updateMaps: newMaps => createLevel( name, goal, newMaps ),
		updateName: newName => createLevel( newName, goal, maps ),
	} );
};

const createMap = (
	width: number = 20,
	height: number = 20,
	layers: Layer[] = [],
): LvMap => {
	return Object.freeze( {
		addLayer: (): LvMap => createMap( width, height, [ ...layers, createLayer() ] ),
		getProps: (): LvMapProps => ( {
			width,
			height,
			layers,
		} ),
		removeLayer: index => {
			const newLayers = [ ...layers ];
			newLayers.splice( index, 1 );
			return createMap( width, height, newLayers );
		},
		switchLayers: ( a: number, b: number ): LvMap => {
			const newLayers = [ ...layers ];
			const temp = newLayers[ a ];
			newLayers[ a ] = newLayers[ b ];
			newLayers[ b ] = temp;
			return createMap( width, height, newLayers );
		},
		updateLayer: index => {
			return {
				addObject: object => {
					const newLayers = [ ...layers ];
					newLayers[ index ].objects.push( createObject( object ) );
					return createMap( width, height, newLayers );
				},
				removeObject: objectIndex => {
					const newLayers = [ ...layers ];
					newLayers[ index ].objects.splice( objectIndex, 1 );
					return createMap( width, height, newLayers );
				},
				updateObject: ( objectIndex, newObject ) => {
					const newLayers = [ ...layers ];
					newLayers[ index ].objects[ objectIndex ] =
						newLayers[ index ].objects[ objectIndex ].update( newObject );
					return createMap( width, height, newLayers );
				},
				updateOption: ( key, value ) => {
					const newLayers = [ ...layers ];
					newLayers[ index ] = { ...newLayers[ index ], [ key ]: value };
					return createMap( width, height, newLayers );
				},
			};
		},
		updateHeight: newHeight => {
			return createMap( width, newHeight, layers );
		},
		updateWidth: newWidth => {
			return createMap( newWidth, height, layers );
		},
	} );
};

const createObject = ( object: MapObjectArgs ): MapObject => {
	const {
		type = 0,
		x = 0,
		y = 0,
		width = 1,
		height = 1,
	} = object;
	return Object.freeze( {
		getProp: ( key: string ) => {
			if ( !( key in object ) ) {
				throw new Error( `Key ${ key } not found in object.` );
			}
			return object[ key ];
		},
		type: () => type,
		xBlocks: () => x,
		xTiles: () => x * tilesPerBlock,
		xPixels: () => x * pixelsPerBlock,
		yBlocks: () => y,
		yTiles: () => y * tilesPerBlock,
		yPixels: () => y * pixelsPerBlock,
		widthBlocks: () => width,
		widthTiles: () => width * tilesPerBlock,
		widthPixels: () => width * pixelsPerBlock,
		heightBlocks: () => height,
		heightTiles: () => height * tilesPerBlock,
		heightPixels: () => height * pixelsPerBlock,
		rightBlocks: () => x + width,
		rightTiles: () => ( x + width ) * tilesPerBlock,
		rightPixels: () => ( x + width ) * pixelsPerBlock,
		bottomBlocks: () => y + height,
		bottomTiles: () => ( y + height ) * tilesPerBlock,
		bottomPixels: () => ( y + height ) * pixelsPerBlock,
		update: newObject => createObject( { ...object, ...newObject } ),
	} );
};

const transformMapDataToObject = ( data: ArrayBuffer ): LvMap => {
	const view = new DataView( data );

	// Read width and height from buffer.
	const width = view.getUint16( 0 );
	const height = view.getUint16( 2 );

	// Read layer data from buffer.
	const layers: Layer[] = [];
	const layerCount = view.getUint8( 4 );
	let currentLayer = 0;
	let state = `readingLayerOptions`;
	let type = 0;
	let i = 5; // Initialize to bytes after width, height, & layer count.
	let scrollX: number = 0;
	const objects: MapObject[] = [];
	while ( currentLayer < layerCount ) {
		if ( state === `readingLayerOptions` ) {
			scrollX = view.getFloat32( i );
			i += 4; // Move to bytes after layer options.
			state = `readingType`;
		} else if ( state === `readingType` ) {
			type = view.getUint16( i );

			// If type is terminator, move to next layer.
			if ( type === 0xFFFF ) {
				layers.push( createLayer( LayerType.block, objects, scrollX ) );
				++currentLayer;
				i += 2; // Move to bytes after type.
				state = `readingLayerOptions`;
			} else { // Otherwise, interpret bytes as type for next object.
				state = `readingObjectData`;
				i += 2; // Move to bytes after type.
			}
		} else {
			// Initialize object with type’s default.
			const object = objectTypes[ type ].create( 0, 0 );

			// Go thru each object data type, read from buffer, then move forward bytes read.
			const data = objectTypes[ type ].exportData;
			data.forEach( ( { type, key } ) => {
				object[ key ] = view[ `get${ type }` ]( i );
				i += getDataTypeSize( type );
			} );
			objects.push( createObject( { ...object, type } ) );

			// Since object has been fully read, try reading the next object’s type.
			state = `readingType`;
		}
	}
	return createMap( width, height, layers );
};

const generateDataBytes = ( map: LvMap ): ArrayBuffer => {
	const { width, height, layers } = map.getProps();

	// Initialize data list with width, height, & layers count.
	const dataList = [
		{ type: `Uint16`, data: width },
		{ type: `Uint16`, data: height },
		{ type: `Uint8`, data: layers.length },
	];

	layers.forEach( layer => {
		// Add layer options.
		dataList.push( { type: `Float32`, data: layer.scrollX } );

		// For each object, add 2 bytes for type, then add bytes for each object data type
		// & add each datum to data list.
		layer.objects.forEach( object => {
			dataList.push( { type: `Uint16`, data: object.type() } );
			const data = objectTypes[ object.type() ].exportData;
			dataList.push( ...data.map( ( { type, key } ) => ( { type, data: object.getProp( key ) } ) ) );
		} );

		// Add terminator for layer.
		dataList.push( { type: `Uint16`, data: 0xFFFF } );
	} );

	// Having calculated the total size, create a buffer, view, & iterate through data list
	// to set each datum in the buffer.
	const size = dataList.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );
	const buffer = new ArrayBuffer( size );
	const view = new DataView( buffer );
	let i = 0;
	dataList.forEach( ( { type, data } ) => {
		view[ `set${ type }` ]( i, data );
		i += getDataTypeSize( type );
	} );
	return buffer;
};

const splitMapBytes = ( data: ArrayBuffer, count: number ) => {
	const buffer = new ArrayBuffer( data.byteLength );
	const maps: ArrayBuffer[] = [];
	const view = new DataView( buffer );
	new Uint8Array( data ).forEach( ( byte, i ) => view.setUint8( i, byte ) );
	let i = 0;
	let start = i;
	let currentMap = 0;
	while ( currentMap < count ) {
		const layerCount = view.getUint8( i + 4 );
		let currentLayer = 0;
		let state = `readingLayerOptions`;
		let type = 0;
		i += 5; // Move to bytes after width, height, & layer count.
		while ( currentLayer < layerCount ) {
			if ( state === `readingLayerOptions` ) {
				i += 4; // Move to bytes after layer options.
				state = `readingType`;
			} else if ( state === `readingType` ) {
				type = view.getUint16( i );

				// If type is terminator, move to next layer.
				if ( type === 0xFFFF ) {
					++currentLayer;
					i += 2; // Move to bytes after type.
					state = `readingLayerOptions`;
				} else { // Otherwise, interpret bytes as type for next object.
					state = `readingObjectData`;
					i += 2; // Move to bytes after type.
				}
			} else {
				// Go thru each object data type, read from buffer, then move forward bytes read.
				const data = objectTypes[ type ].exportData;
				data.forEach( ( { type } ) => {
					i += getDataTypeSize( type );
				} );

				// Since object has been fully read, try reading the next object’s type.
				state = `readingType`;
			}
		}
		const mapBuffer = new ArrayBuffer( i - start );
		const mapView = new DataView( mapBuffer );
		for ( let j = start; j < i; j++ ) {
			mapView.setUint8( j - start, view.getUint8( j ) );
		}
		maps.push( mapBuffer );
		++currentMap;
		start = i;
	}
	return {
		maps,
		remainingBytes: new Uint8Array( buffer ).slice( i ),
	};
};

const loadLevelFromData = ( data: Uint8Array ): DecodedLevelData => {
	// Gather name.
	const nameData = decode( data );
	const name = nameData.text;

	// Gather goal.
	const remainingBytes = nameData.remainingBytes;
	const buffer = new ArrayBuffer( 1 );
	const view = new DataView( buffer );
	view.setUint8( 0, remainingBytes[ 0 ] );
	const goalId = view.getUint8( 0 );
	const goalData = goals[ goalId ].exportData ?? [];
	const goalDataSize = goalData.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );
	const goalBuffer = new ArrayBuffer( goalDataSize );
	const goalView = new DataView( goalBuffer );
	for ( let i = 0; i < goalDataSize; i++ ) {
		goalView.setUint8( i, remainingBytes[ i + 1 ] );
	}
	let i = 0;
	const goalOptions: { [key: string]: string } = {};
	goalData.forEach( ( { key, type } ) => {
		goalOptions[ key ] = goalView[ `get${ type }` ]( i ).toString();
		i += getDataTypeSize( type );
	} );
	const goal = createGoal( goalId, goalOptions );

	// Gather maps.
	const mapCount = remainingBytes[ goalDataSize + 1 ];
	const mapsBuffer = new ArrayBuffer( remainingBytes.length - goalDataSize - 2 );
	const mapsView = new DataView( mapsBuffer );
	for ( let i = 0; i < mapsBuffer.byteLength; i++ ) {
		mapsView.setUint8( i, remainingBytes[ i + goalDataSize + 2 ] );
	}
	const mapData = splitMapBytes( mapsBuffer, mapCount );
	const maps = mapData.maps;

	return {
		level: createLevel( name, goal, maps ),
		remainingBytes: mapData.remainingBytes,
	};
};

const encodeLevels = ( levels: Level[] ): ByteBlock[] => {
	return levels.map( ( level: Level ): ByteBlock[] => {
		const { goal, maps, name } = level.getProps();
		const data: ByteBlock[] = [];
		const nameBytes = encode( name );
		nameBytes.forEach( byte => data.push( { type: `Uint8`, value: byte } ) );
		data.push( { type: `Uint8`, value: goal.getId() } );
		const goalExportData = goals[ goal.getId() ].exportData ?? [];
		goalExportData.forEach( ( { key, type } ) => {
			data.push( { type, value: parseInt( goal.getOption( key ) ) } );
		} );
		data.push( { type: `Uint8`, value: maps.length } );
		maps.forEach( map => {
			new Uint8Array( map ).forEach( byte => data.push( { type: `Uint8`, value: byte } ) );
		} );
		return data;
	} ).flat( 1 );
};

export {
	createLayer,
	createLevel,
	createMap,
	createObject,
	encodeLevels,
	generateDataBytes,
	layerTypeNames,
	loadLevelFromData,
	transformMapDataToObject,
};
