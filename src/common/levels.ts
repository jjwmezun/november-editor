import { createObject, getBlockTypeFactory } from './objects';
import { getDataTypeSize } from './bytes';
import { createGoal, goals } from './goals';
import { encodeText, decodeText } from './text';
import {
	ByteBlock,
	DataType,
	DecodedLevelData,
	DecodedLevelHeader,
	Goal,
	Layer,
	LayerType,
	Level,
	LvMap,
	LvMapByteProps,
	LvMapProps,
	MapObject,
	MapObjectArgs,
	TileSetType,
} from './types';

const convertTileSetTypeToNumber = ( tileSetType: TileSetType ) : number => {
	switch ( tileSetType ) {
		case ( TileSetType.attic ):
			return 1;
		break;
	}
	return 0;
};

const convertNumberToTileSetType = ( n: number ) : TileSetType => {
	switch ( n ) {
		case ( 1 ):
			return TileSetType.attic;
		break;
	}
	return TileSetType.urban;
};

const generateDataList = (
	width: number = 0,
	height: number = 0,
	layerCount: number = 0,
	palette: number = 0,
	tileSetType: TileSetType = TileSetType.urban,
): ByteBlock[] => {
	return [
		{ type: DataType.Uint16, value: width },
		{ type: DataType.Uint16, value: height },
		{ type: DataType.Uint8, value: palette },
		{ type: DataType.Uint8, value: convertTileSetTypeToNumber( tileSetType ) },
		{ type: DataType.Uint8, value: layerCount },
	];
};

const getDataFromMapHeader = ( view: DataView ): LvMapByteProps => {
	const width = view.getUint16( 0 );
	const height = view.getUint16( 2 );
	const palette = view.getUint8( 4 );
	const tileSetType = view.getUint8( 5 );
	const layerCount = view.getUint8( 6 );
	return {
		width,
		height,
		palette,
		tileSetType,
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
	ptsScore: number = 0,
	timeScoreMinutes: number = 0,
	timeScoreSeconds: number = 0,
): Level => {
	return Object.freeze( {
		getGoal: () => goal,
		getPtsScore: () => ptsScore,
		getTimeScoreMinutes: () => timeScoreMinutes,
		getTimeScoreSeconds: () => timeScoreSeconds,
		getMaps: () => maps,
		getName: () => name,
		getProps: () => ( { name, goal, maps, ptsScore, timeScoreMinutes, timeScoreSeconds } ),
		toJSON: () => ( {
			name,
			goal: goal.toJSON(),
			maps: maps.map( map => transformMapDataToObject( map ).toJSON() ),
			ptsScore,
			timeScore: {
				minutes: timeScoreMinutes,
				seconds: timeScoreSeconds,
			},
		} ),
		updateGoal: ( newGoal: Goal ) => createLevel(
			name,
			newGoal,
			maps,
			ptsScore,
			timeScoreMinutes,
			timeScoreSeconds,
		),
		updateMaps: ( newMaps: ArrayBuffer[] ) => createLevel(
			name,
			goal,
			newMaps,
			ptsScore,
			timeScoreMinutes,
			timeScoreSeconds,
		),
		updateName: ( newName: string ) => createLevel( newName,
			goal,
			maps,
			ptsScore,
			timeScoreMinutes,
			timeScoreSeconds ),
		updatePtsScore: ( newPtsScore: number ) => createLevel(
			name,
			goal,
			maps,
			newPtsScore,
			timeScoreMinutes,
			timeScoreSeconds,
		),
		updateTimeScoreMinutes: ( newTimeScoreMinutes: number ) => createLevel(
			name,
			goal,
			maps,
			ptsScore,
			newTimeScoreMinutes,
			timeScoreSeconds,
		),
		updateTimeScoreSeconds: ( newTimeScoreSeconds: number ) => createLevel(
			name,
			goal,
			maps,
			ptsScore,
			timeScoreMinutes,
			newTimeScoreSeconds,
		),
	} );
};

const createMap = (
	width: number = 20,
	height: number = 20,
	layers: Layer[] = [],
	palette: number = 0,
	tileSetType: TileSetType = TileSetType.urban,
): LvMap => {
	return Object.freeze( {
		addLayer: ( type: LayerType ): LvMap => createMap(
			width,
			height,
			[ ...layers, createLayer( type ) ],
			palette,
			tileSetType,
		),
		getHeightBlocks: () => height,
		getHeightPixels: () => height * 16,
		getLayers: () => layers,
		getWidthBlocks: () => width,
		getWidthPixels: () => width * 16,
		getProps: (): LvMapProps => ( {
			width,
			height,
			layers,
			palette,
			tileSetType,
		} ),
		getTilesetType: () => tileSetType,
		removeLayer: ( index: number ) => {
			const newLayers = [ ...layers ];
			newLayers.splice( index, 1 );
			return createMap( width, height, newLayers, palette, tileSetType );
		},
		switchLayers: ( a: number, b: number ): LvMap => {
			const newLayers = [ ...layers ];
			const temp = newLayers[ a ];
			newLayers[ a ] = newLayers[ b ];
			newLayers[ b ] = temp;
			return createMap( width, height, newLayers, palette, tileSetType );
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
			tileSetType,
		} ),
		updateLayer: ( index: number ) => {
			return {
				addObject: ( object: MapObjectArgs ) => {
					const newLayers = [ ...layers ];
					newLayers[ index ].objects.push( createObject( object ) );
					return createMap( width, height, newLayers, palette, tileSetType );
				},
				removeObject: ( objectIndex: number ) => {
					const newLayers = [ ...layers ];
					newLayers[ index ].objects.splice( objectIndex, 1 );
					return createMap( width, height, newLayers, palette, tileSetType );
				},
				updateObject: ( objectIndex: number, newObject: MapObjectArgs ) => {
					const newLayers = [ ...layers ];
					newLayers[ index ].objects[ objectIndex ] =
						newLayers[ index ].objects[ objectIndex ].update( newObject );
					return createMap( width, height, newLayers, palette, tileSetType );
				},
				updateOption: ( key: string, value: unknown ) => {
					const newLayers = [ ...layers ];
					newLayers[ index ] = { ...newLayers[ index ], [ key ]: value };
					return createMap( width, height, newLayers, palette, tileSetType );
				},
			};
		},
		updateHeight: ( newHeight: number ) => {
			return createMap( width, newHeight, layers, palette, tileSetType );
		},
		updatePalette: ( newPalette: number ) => {
			return createMap( width, height, layers, newPalette, tileSetType );
		},
		updateTilesetType: ( newTileSetType: TileSetType ) => {
			const newLayers = [ ...layers ];

			// Clear block layers.
			for ( let i = 0; i < newLayers.length; ++i ) {
				if ( newLayers[ i ].type === LayerType.block ) {
					while ( newLayers[ i ].objects.length ) {
						newLayers[ i ].objects.pop();
					}
				}
			}

			return createMap( width, height, newLayers, palette, newTileSetType );
		},
		updateWidth: ( newWidth: number ) => {
			return createMap( newWidth, height, layers, palette, tileSetType );
		},
	} );
};

const transformMapDataToObject = ( data: ArrayBuffer ): LvMap => {
	const view = new DataView( data );

	// Read width and height from buffer.
	const { height, layerCount, palette, tileSetType, width } = getDataFromMapHeader( view );
	const tileSetTypeValue = convertNumberToTileSetType( tileSetType );

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
			const typeFactory = getBlockTypeFactory( convertByteToLayerType( layerType ), tileSetTypeValue );
			const object = typeFactory[ objectType ].create( 0, 0, 0 );

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
	return createMap( width, height, layers, palette, tileSetTypeValue );
};

const generateDataBytes = ( map: LvMap ): ArrayBuffer => {
	const { height, layers, palette, tileSetType, width } = map.getProps();

	// Initialize data list with width, height, palette, & layers count.
	const dataList = generateDataList( width, height, layers.length, palette, tileSetType );

	layers.forEach( layer => {
		const typeFactory = getBlockTypeFactory( layer.type, map.getTilesetType() );

		// Add layer options.
		dataList.push( { type: DataType.Uint8, value: convertLayerTypeToByte( layer.type ) } );
		dataList.push( { type: DataType.Float32, value: layer.scrollX } );

		// For each object, add 2 bytes for type, then add bytes for each object data type
		// & add each datum to data list.
		layer.objects.forEach( object => {
			dataList.push( { type: DataType.Uint16, value: object.type() } );
			const data = typeFactory[ object.type() ].exportData;
			dataList.push( ...data.map( ( { type, key } ) => ( { type, value: object.getProp( key ) } ) ) );
		} );

		// Add terminator for layer.
		dataList.push( { type: DataType.Uint16, value: 0xFFFF } );
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
		const tileSetType = convertNumberToTileSetType( view.getUint8( i + 5 ) );
		const layerCount = view.getUint8( i + 6 );
		let currentLayer = 0;
		let currentLayerType = 0;
		let state = `readingLayerOptions`;
		let type = 0;
		i += getMapHeaderSize(); // Move to bytes after width, height, palette, tileset type, & layer count.
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
				const typeFactory = getBlockTypeFactory(
					convertByteToLayerType( currentLayerType ), tileSetType,
				);
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

const decodeLevelData = ( data: Uint8Array ): DecodedLevelData => {
	// Gather goal.
	const goalIdBuffer = new ArrayBuffer( 1 );
	const goalIdView = new DataView( goalIdBuffer );
	goalIdView.setUint8( 0, data[ 0 ] );
	const goalId = goalIdView.getUint8( 0 );
	const goalData = goals[ goalId ].exportData ?? [];
	const goalDataSize = goalData.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );
	const goalBuffer = new ArrayBuffer( goalDataSize );
	const goalView = new DataView( goalBuffer );
	for ( let i = 0; i < goalDataSize; i++ ) {
		goalView.setUint8( i, data[ i + 1 ] );
	}
	let i = 0;
	const goalOptions: { [key: string]: string } = {};
	goalData.forEach( ( { key, type } ) => {
		goalOptions[ key ] = goalView[ `get${ type }` ]( i ).toString();
		i += getDataTypeSize( type );
	} );
	const goal = createGoal( goalId, goalOptions );

	// Gather maps.
	const mapCount = data[ goalDataSize + 1 ];
	const mapsBuffer = new ArrayBuffer( data.length - goalDataSize - 2 );
	const mapsView = new DataView( mapsBuffer );
	for ( let i = 0; i < mapsBuffer.byteLength; i++ ) {
		mapsView.setUint8( i, data[ i + goalDataSize + 2 ] );
	}
	const mapData = splitMapBytes( mapsBuffer, mapCount );
	const maps = mapData.maps;

	return {
		data: {
			goal,
			maps,
		},
		remainingBytes: mapData.remainingBytes,
	};
};

const decodeLevelHeaders = ( data: Uint8Array ): DecodedLevelHeader => {
	// Gather name.
	const nameData = decodeText( data );
	const name = nameData.text;
	const remainingBytes = nameData.remainingBytes;

	// Gather ₧ score.
	const ptsBuffer = new ArrayBuffer( 4 );
	const ptsView = new DataView( ptsBuffer );
	ptsView.setUint8( 0, remainingBytes[ 0 ] );
	ptsView.setUint8( 1, remainingBytes[ 1 ] );
	ptsView.setUint8( 2, remainingBytes[ 2 ] );
	ptsView.setUint8( 3, remainingBytes[ 3 ] );
	const ptsScore = ptsView.getUint32( 0 );

	// Gather time score.
	const timeBuffer = new ArrayBuffer( 2 );
	const timeView = new DataView( timeBuffer );
	timeView.setUint8( 0, remainingBytes[ 4 ] );
	timeView.setUint8( 1, remainingBytes[ 5 ] );
	const totalSeconds = timeView.getUint16( 0 );
	const timeScoreMinutes = getMinutesFromTotalSeconds( totalSeconds );
	const timeScoreSeconds = getSecondsFromTotalSeconds( totalSeconds );

	return {
		header: {
			name,
			ptsScore,
			timeScoreMinutes,
			timeScoreSeconds,
		},
		remainingBytes: remainingBytes.slice( 6 ),
	};
};

const encodeLevelHeader = ( level: Level ): ByteBlock[] => {
	const data: ByteBlock[] = encodeText( level.getName() );
	data.push( { type: DataType.Uint32, value: level.getPtsScore() } );
	data.push( {
		type: DataType.Uint16,
		value: getTotalSecondsFromMinutesAndSeconds( level.getTimeScoreMinutes(), level.getTimeScoreSeconds() ),
	} );
	return data;
};

const encodeLevelData = ( level: Level ): ByteBlock[] => {
	const { goal, maps } = level.getProps();
	const data: ByteBlock[] = [ { type: DataType.Uint8, value: goal.getId() } ];
	const goalExportData = goals[ goal.getId() ].exportData ?? [];
	goalExportData.forEach( ( { key, type } ) => {
		data.push( { type, value: goal.getOptionData( key ) } );
	} );
	data.push( { type: DataType.Uint8, value: maps.length } );
	maps.forEach( map => {
		new Uint8Array( map ).forEach( byte => data.push( { type: DataType.Uint8, value: byte } ) );
	} );
	return data;
};

const getMinutesFromTotalSeconds = ( totalSeconds: number ): number => {
	return Math.floor( totalSeconds / 60 );
};

const getSecondsFromTotalSeconds = ( totalSeconds: number ): number => {
	return totalSeconds % 60;
};

const getTotalSecondsFromMinutesAndSeconds = ( minutes: number, seconds: number ): number => {
	return ( minutes * 60 ) + seconds;
};

export {
	createLayer,
	createLevel,
	createMap,
	decodeLevelData,
	decodeLevelHeaders,
	encodeLevelData,
	encodeLevelHeader,
	generateDataBytes,
	layerTypeNames,
	transformMapDataToObject,
};
