import propTypes from 'prop-types';
import types from './types';
import { getDataTypeSize } from './utils';
import { createGoal, goals } from './goals';
import { encode, decode } from './text';
import { tilesPerBlock, pixelsPerBlock } from "./constants.js";

const layerTypes = Object.freeze( {
	block: {
		slug: `block`,
		title: `Block`,
	},
} );

const createLayer = (
	type = layerTypes.block,
	objects = [],
	scrollX = 1.0,
) => Object.freeze( {
	type,
	objects,
	scrollX,
} );

const createLevel = (
	name = `Unnamed Level`,
	goal = createGoal( 0 ),
	maps = [],
) => {
	return Object.freeze( {
		getGoal: () => goal,
		getMaps: () => maps,
		getName: () => name,
		getProps: () => ( { name, goal, maps } ),
		updateGoal: newGoal => createLevel( name, createGoal( newGoal ), maps ),
		updateMaps: newMaps => createLevel( name, goal, newMaps ),
		updateName: newName => createLevel( newName, goal, maps ),
	} );
};

const createMap = (
	width = 20,
	height = 20,
	layers = [],
) => {
	return Object.freeze( {
		addLayer: () => {
			return createMap( width, height, [ ...layers, createLayer() ] );
		},
		getProps: () => {
			return {
				width,
				height,
				layers,
			};
		},
		removeLayer: index => {
			const newLayers = [ ...layers ];
			newLayers.splice( index, 1 );
			return createMap( width, height, newLayers );
		},
		switchLayers: ( a, b ) => {
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

const layerPropType = propTypes.shape( {
	type: propTypes.shape( {
		slug: propTypes.string,
		title: propTypes.string,
	} ),
	objects: propTypes.arrayOf( propTypes.object ),
	scrollX: propTypes.number,
} );

const mapPropType = propTypes.shape( {
	addLayer: propTypes.func,
	getProps: propTypes.func,
	removeLayer: propTypes.func,
	switchLayers: propTypes.func,
	updateLayer: propTypes.func,
	updateHeight: propTypes.func,
	updateWidth: propTypes.func,
} );

const levelPropType = propTypes.shape( {
	getGoal: propTypes.func,
	getMaps: propTypes.func,
	getName: propTypes.func,
	updateGoal: propTypes.func,
	updateMaps: propTypes.func,
	updateName: propTypes.func,
} );

const createObject = object => {
	const {
		type,
		x,
		y,
		width,
		height,
	} = object;
	return Object.freeze( {
		getProp: key => {
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

const transformMapDataToObject = data => {
	const view = new DataView( data );

	// Read width and height from buffer.
	const width = view.getUint16( 0 );
	const height = view.getUint16( 2 );

	// Read layer data from buffer.
	const layers = [];
	const layerCount = view.getUint8( 4 );
	let currentLayer = 0;
	let state = `readingLayerOptions`;
	let type = 0;
	let i = 5; // Initialize to bytes after width, height, & layer count.
	let scrollX;
	let objects = [];
	while ( currentLayer < layerCount ) {
		if ( state === `readingLayerOptions` ) {
			scrollX = view.getFloat32( i );
			i += 4; // Move to bytes after layer options.
			state = `readingType`;
		} else if ( state === `readingType` ) {
			type = view.getUint16( i );

			// If type is terminator, move to next layer.
			if ( type === 0xFFFF ) {
				layers.push( createLayer( layerTypes.block, objects, scrollX ) );
				++currentLayer;
				i += 2; // Move to bytes after type.
				state = `readingLayerOptions`;
			} else { // Otherwise, interpret bytes as type for next object.
				state = `readingObjectData`;
				i += 2; // Move to bytes after type.
			}
		} else {
			// Initialize object with type’s default.
			const object = types[ type ].create( 0, 0 );

			// Go thru each object data type, read from buffer, then move forward bytes read.
			const data = types[ type ].exportData;
			data.forEach( ( { type, data } ) => {
				object[ data ] = view[ `get${ type }` ]( i );
				i += getDataTypeSize( type );
			} );
			objects.push( createObject( { ...object, type } ) );

			// Since object has been fully read, try reading the next object’s type.
			state = `readingType`;
		}
	}
	return createMap( width, height, layers );
};

const generateDataBytes = map => {
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
			const data = types[ object.type() ].exportData;
			dataList.push( ...data.map( ( { type, data } ) => ( { type, data: object.getProp( data ) } ) ) );
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

const splitMapBytes = ( data, count ) => {
	const buffer = new ArrayBuffer( data.byteLength );
	const maps = [];
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
				const data = types[ type ].exportData;
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

const loadLevelFromData = data => {
	// Gather name.
	const nameData = decode( data );
	const name = nameData.text;

	// Gather goal.
	const remainingBytes = nameData.remainingBytes;
	const buffer = new ArrayBuffer( 1 );
	const view = new DataView( buffer );
	view.setUint8( 0, remainingBytes[ 0 ] );
	const goalId = view.getUint8( 0 );
	const goalData = goals[ goalId ].exportData;
	const goalDataSize = goalData.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );
	const goalBuffer = new ArrayBuffer( goalDataSize );
	const goalView = new DataView( goalBuffer );
	for ( let i = 0; i < goalDataSize; i++ ) {
		goalView.setUint8( i, remainingBytes[ i + 1 ] );
	}
	let i = 0;
	const goalOptions = [];
	goalData.forEach( ( { data, type } ) => {
		goalOptions[ data ] = goalView[ `get${ type }` ]( i );
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

const encodeLevels = levels => {
	return levels.map( level => {
		const { goal, maps, name } = level.getProps();
		const data = [];
		const nameBytes = encode( name );
		nameBytes.forEach( byte => data.push( { type: `Uint8`, value: byte } ) );
		data.push( { type: `Uint8`, value: goal.getId() } );
		goals[ goal.getId() ].exportData.forEach( item => {
			data.push( { type: item.type, value: goal.getOption( item.data ) } );
		} );
		data.push( { type: `Uint8`, value: maps.length } );
		maps.forEach( map => {
			new Uint8Array( map ).forEach( byte => data.push( { type: `Uint8`, value: byte } ) );
		} );
		return data;
	} ).flat( Infinity );
};

export {
	createLayer,
	createLevel,
	createMap,
	createObject,
	encodeLevels,
	generateDataBytes,
	layerPropType,
	levelPropType,
	loadLevelFromData,
	mapPropType,
	transformMapDataToObject,
};
