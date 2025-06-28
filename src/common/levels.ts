import { createObject, getTypeFactory } from './objects';
import { getDataTypeSize } from './bytes';
import { createGoal, goals } from './goals';
import { encodeText, decodeText } from './text';
import {
	ByteBlock,
	DecodedLevelData,
	Goal,
	Layer,
	LayerType,
	Level,
	LvMap,
	LvMapByteProps,
	LvMapProps,
	MapObject,
	MapObjectArgs,
} from './types';

const generateDataList = (
	width: number = 0,
	height: number = 0,
	layerCount: number = 0,
	palette: number = 0,
): ByteBlock[] => {
	return [
		{ type: `Uint16`, value: width },
		{ type: `Uint16`, value: height },
		{ type: `Uint8`, value: palette },
		{ type: `Uint8`, value: layerCount },
	];
};

const getDataFromMapHeader = ( view: DataView ): LvMapByteProps => {
	const width = view.getUint16( 0 );
	const height = view.getUint16( 2 );
	const palette = view.getUint8( 4 );
	const layerCount = view.getUint8( 5 );
	return {
		width,
		height,
		palette,
		layerCount,
	};
};

const getMapHeaderSize = () => generateDataList().reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );

const layerTypeNames = Object.freeze( {
	[ LayerType.block ]: `Block`,
	[ LayerType.sprite ]: `Sprite`,
} );

const convertLayerTypeToByte = ( type: LayerType ): number => {
	switch ( type ) {
	case LayerType.block:
		return 0;
	case LayerType.sprite:
		return 1;
	default:
		throw new Error( `Invalid layer type: ${ type }` );
	}
};

const convertByteToLayerType = ( byte: number ): LayerType => {
	switch ( byte ) {
	case 0:
		return LayerType.block;
	case 1:
		return LayerType.sprite;
	default:
		throw new Error( `Invalid layer type byte: ${ byte }` );
	}
};

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
		toJSON: () => ( {
			name,
			goal: goal.toJSON(),
			maps: maps.map( map => transformMapDataToObject( map ).toJSON() ),
		} ),
		updateGoal: newGoal => createLevel( name, newGoal, maps ),
		updateMaps: newMaps => createLevel( name, goal, newMaps ),
		updateName: newName => createLevel( newName, goal, maps ),
	} );
};

const createMap = (
	width: number = 20,
	height: number = 20,
	layers: Layer[] = [],
	palette: number = 0,
): LvMap => {
	return Object.freeze( {
		addLayer: ( type: LayerType ): LvMap => createMap( width, height, [ ...layers, createLayer( type ) ], palette ),
		getProps: (): LvMapProps => ( {
			width,
			height,
			layers,
			palette,
		} ),
		removeLayer: index => {
			const newLayers = [ ...layers ];
			newLayers.splice( index, 1 );
			return createMap( width, height, newLayers, palette );
		},
		switchLayers: ( a: number, b: number ): LvMap => {
			const newLayers = [ ...layers ];
			const temp = newLayers[ a ];
			newLayers[ a ] = newLayers[ b ];
			newLayers[ b ] = temp;
			return createMap( width, height, newLayers, palette );
		},
		toJSON: () => ( {
			width,
			height,
			layers: layers.map( layer => ( {
				type: layer.type,
				objects: layer.objects.map( object => object.toJSON() ),
				scrollX: layer.scrollX,
			} ) ),
			palette,
		} ),
		updateLayer: index => {
			return {
				addObject: object => {
					const newLayers = [ ...layers ];
					newLayers[ index ].objects.push( createObject( object ) );
					return createMap( width, height, newLayers, palette );
				},
				removeObject: objectIndex => {
					const newLayers = [ ...layers ];
					newLayers[ index ].objects.splice( objectIndex, 1 );
					return createMap( width, height, newLayers, palette );
				},
				updateObject: ( objectIndex: number, newObject: MapObjectArgs ) => {
					const newLayers = [ ...layers ];
					newLayers[ index ].objects[ objectIndex ] =
						newLayers[ index ].objects[ objectIndex ].update( newObject );
					return createMap( width, height, newLayers, palette );
				},
				updateOption: ( key, value ) => {
					const newLayers = [ ...layers ];
					newLayers[ index ] = { ...newLayers[ index ], [ key ]: value };
					return createMap( width, height, newLayers, palette );
				},
			};
		},
		updateHeight: newHeight => {
			return createMap( width, newHeight, layers, palette );
		},
		updateWidth: newWidth => {
			return createMap( newWidth, height, layers, palette );
		},
		updatePalette: newPalette => {
			return createMap( width, height, layers, newPalette );
		},
	} );
};

const transformMapDataToObject = ( data: ArrayBuffer ): LvMap => {
	const view = new DataView( data );

	// Read width and height from buffer.
	const { height, layerCount, palette, width } = getDataFromMapHeader( view );

	// Read layer data from buffer.
	const layers: Layer[] = [];
	let currentLayer = 0;
	let state = `readingLayerOptions`;
	let objectType = 0;
	let i = getMapHeaderSize(); // Initialize to bytes after width, height, palette, & layer count.
	let scrollX: number = 0;
	let layerType: number = 0;
	let objects: MapObject[] = [];
	while ( currentLayer < layerCount ) {
		if ( state === `readingLayerOptions` ) {
			layerType = view.getUint8( i );
			scrollX = view.getFloat32( i + 1 );
			i += 5; // Move to bytes after layer options.
			state = `readingType`;
		} else if ( state === `readingType` ) {
			objectType = view.getUint16( i );

			// If objectType is terminator, move to next layer.
			if ( objectType === 0xFFFF ) {
				layers.push( createLayer( layerType === 1 ? LayerType.sprite : LayerType.block, objects, scrollX ) );
				objects = [];
				++currentLayer;
				i += 2; // Move to bytes after objectType.
				state = `readingLayerOptions`;
			} else { // Otherwise, interpret bytes as objectType for next object.
				state = `readingObjectData`;
				i += 2; // Move to bytes after objectType.
			}
		} else {
			// Initialize object with type’s default.
			const typeFactory = getTypeFactory( convertByteToLayerType( layerType ) );
			const object = typeFactory[ objectType ].create( 0, 0 );

			// Go thru each object data type, read from buffer, then move forward bytes read.
			const data = typeFactory[ objectType ].exportData;
			data.forEach( ( { type, key } ) => {
				object[ key ] = view[ `get${ type }` ]( i );
				i += getDataTypeSize( type );
			} );
			objects.push( createObject( { ...object, type: objectType } ) );

			// Since object has been fully read, try reading the next object’s type.
			state = `readingType`;
		}
	}
	return createMap( width, height, layers, palette );
};

const generateDataBytes = ( map: LvMap ): ArrayBuffer => {
	const { height, layers, palette, width } = map.getProps();

	// Initialize data list with width, height, palette, & layers count.
	const dataList = generateDataList( width, height, layers.length, palette );

	layers.forEach( layer => {
		const typeFactory = getTypeFactory( layer.type );

		// Add layer options.
		dataList.push( { type: `Uint8`, value: convertLayerTypeToByte( layer.type ) } );
		dataList.push( { type: `Float32`, value: layer.scrollX } );

		// For each object, add 2 bytes for type, then add bytes for each object data type
		// & add each datum to data list.
		layer.objects.forEach( object => {
			dataList.push( { type: `Uint16`, value: object.type() } );
			const data = typeFactory[ object.type() ].exportData;
			dataList.push( ...data.map( ( { type, key } ) => ( { type, value: object.getProp( key ) } ) ) );
		} );

		// Add terminator for layer.
		dataList.push( { type: `Uint16`, value: 0xFFFF } );
	} );

	// Having calculated the total size, create a buffer, view, & iterate through data list
	// to set each datum in the buffer.
	const size = dataList.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );
	const buffer = new ArrayBuffer( size );
	const view = new DataView( buffer );
	let i = 0;
	dataList.forEach( ( { type, value } ) => {
		view[ `set${ type }` ]( i, value );
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
		const layerCount = view.getUint8( i + 5 );
		let currentLayer = 0;
		let currentLayerType = 0;
		let state = `readingLayerOptions`;
		let type = 0;
		i += getMapHeaderSize(); // Move to bytes after width, height, palette, & layer count.
		while ( currentLayer < layerCount ) {
			if ( state === `readingLayerOptions` ) {
				currentLayerType = view.getUint8( i );
				i += 5; // Move to bytes after layer options.
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
				const typeFactory = getTypeFactory( convertByteToLayerType( currentLayerType ) );
				const data = typeFactory[ type ].exportData;
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
	const nameData = decodeText( data );
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
		const data: ByteBlock[] = encodeText( name );
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
	encodeLevels,
	generateDataBytes,
	layerTypeNames,
	loadLevelFromData,
	transformMapDataToObject,
};
