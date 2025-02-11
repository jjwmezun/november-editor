import '../assets/editor.scss';
import { useEffect, useState } from 'react';
import { encode, decode } from '../../../common/text';
import goals from '../../../common/goals';
import types from '../../../common/types';
import { getDataTypeSize } from '../../../common/utils';
import { levelCount } from '../../../common/constants';
import { modeKeys } from '../../../common/modes';
import LevelMode from './LevelMode';
import SelectMode from './SelectMode';
import GraphicsMode from './GraphicsMode';
import { createBlankTileset } from '../../../common/tileset';

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
	const level = {};

	// Gather name.
	const nameData = decode( data );
	level.name = nameData.text;

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
	const goal = { id: goalId };
	let i = 0;
	goalData.forEach( ( { data, type } ) => {
		goal[ data ] = goalView[ `get${ type }` ]( i );
		i += getDataTypeSize( type );
	} );
	level.goal = goal;

	// Gather maps.
	const mapCount = remainingBytes[ goalDataSize + 1 ];
	const mapsBuffer = new ArrayBuffer( remainingBytes.length - goalDataSize - 2 );
	const mapsView = new DataView( mapsBuffer );
	for ( let i = 0; i < mapsBuffer.byteLength; i++ ) {
		mapsView.setUint8( i, remainingBytes[ i + goalDataSize + 2 ] );
	}
	const mapData = splitMapBytes( mapsBuffer, mapCount );
	level.maps = mapData.maps;

	return {
		level,
		remainingBytes: mapData.remainingBytes,
	};
};

const loadGraphicsFromData = data => {
	let tileset = createBlankTileset( 64, 64 );

	// Load tileset pixels from bits.
	const pixels = [];
	const dataSize = Math.ceil( tileset.getPixels().length * ( 3 / 8 ) );

	const bits = [];
	for ( let i = 0; i < dataSize; i++ ) {
		// Get bits from byte.
		const byte = data[ i ];
		for ( let j = 7; j >= 0; j-- ) {
			bits.push( ( byte & ( 1 << j ) ) >> j );
		}

		// If there are ’nough bits to make a color, add it to pixels.
		while ( bits.length >= 3 ) {
			const v = bits.splice( 0, 3 );
			const color = getColorFromBits( v );
			pixels.push( color );
		}
	}

	if ( bits.length > 0 ) {
		throw new Error( `Invalid tileset data` );
	}

	// Update tileset with new pixels.
	tileset = tileset.updatePixels( pixels );

	return {
		tileset,
		remainingBytes: data.slice( dataSize ),
	};
};

// Convert list o’ 3 bits into color index.
const getColorFromBits = bits => {
	const color = parseInt( bits.join( `` ), 2 );
	if ( color < 0 || color > 7 ) {
		throw new Error( `Invalid color: ${ color }` );
	}
	return color;
};

// Convert color index into list o’ 3 bits.
const getBitsFromColor = color => {
	if ( color < 0 || color > 7 ) {
		throw new Error( `Invalid color: ${ color }` );
	}
	return [ ...color.toString( 2 ).padStart( 3, `0` ) ].map( bit => parseInt( bit ) );
};

const generateSaveData = ( levels, tileset ) => {
	const saveData = [];

	// Add tileset data to save data.
	let bits = [];
	const pixels = tileset.getPixels();
	pixels.forEach( pixel => {
		const pixelBits = getBitsFromColor( pixel );
		while ( pixelBits.length > 0 ) {
			bits.push( pixelBits.shift() );
			if ( bits.length === 8 ) {
				saveData.push( { type: `Uint8`, value: parseInt( bits.join( `` ), 2 ) } );
				bits = [];
			}
		}
	} );

	// If there are any remaining bits, add them to save data & fill out rest o’ byte with 0s.
	if ( bits.length > 0 ) {
		while ( bits.length < 8 ) {
			bits.push( 0 );
		}
		saveData.push( { type: `Uint8`, value: parseInt( bits.join( `` ), 2 ) } );
	}

	// For each level, generate bytes for name, goal, and maps.
	levels.map( level => {
		const nameBytes = encode( level.name );
		nameBytes.forEach( byte => saveData.push( { type: `Uint8`, value: byte } ) );
		saveData.push( { type: `Uint8`, value: level.goal.id } );
		goals[ level.goal.id ].exportData.forEach( data => {
			saveData.push( { type: data.type, value: level.goal[ data.data ] } );
		} );
		saveData.push( { type: `Uint8`, value: level.maps.length } );
		level.maps.forEach( map => {
			new Uint8Array( map ).forEach( byte => saveData.push( { type: `Uint8`, value: byte } ) );
		} );
	} );

	// Calculate total size o’ save data.
	const size = saveData.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );

	// Generate buffer to save data.
	const buffer = new ArrayBuffer( size );
	const view = new DataView( buffer );
	let i = 0;

	// Add all bytes to buffer.
	saveData.forEach( ( { type, value } ) => {
		view[ `set${ type }` ]( i, value );
		i += getDataTypeSize( type );
	} );
	return view;
};

const generateNewLevel = () => ( {
	name: `Unnamed Level`,
	goal: { id: 0 },
	maps: [],
} );

const Editor = () => {
	const [ levels, setLevels ] = useState( null );
	const [ tileset, setTileset ] = useState( null );
	const [ mode, setMode ] = useState( modeKeys.select );

	const onOpen = ( _event, data ) => {
		resetMode();

		// Load tileset data.
		const tilesetData = loadGraphicsFromData( data );
		setTileset( tilesetData.tileset );

		// Load level data.
		const levels = [];
		let remainingBytes = tilesetData.remainingBytes;
		while ( remainingBytes.length > 0 ) {
			const levelData = loadLevelFromData( remainingBytes );
			levels.push( levelData.level );
			remainingBytes = levelData.remainingBytes;
		}

		// If there are fewer levels than expected,
		// add new levels to fill the gap.
		while ( levels.length < levelCount ) {
			levels.push( generateNewLevel() );
		}
		setLevels( levels );
	};

	const resetMode = () => setMode( modeKeys.select );

	const onNew = () => {
		setLevels( Array.from( { length: levelCount } ).map( generateNewLevel ) );
		setTileset( createBlankTileset( 64, 64 ) );
		resetMode();
	};

	const onClose = () => {
		setLevels( null );
		setTileset( null );
		resetMode();
	};

	useEffect( () => {
		window.electronAPI.on( `new__editor`, onNew );
		window.electronAPI.on( `open__editor`, onOpen );
		window.electronAPI.on( `close__editor`, onClose );

		return () => {
			window.electronAPI.remove( `new__editor` );
			window.electronAPI.remove( `open__editor` );
			window.electronAPI.remove( `close__editor` );
		};
	}, [] );

	useEffect( () => {
		const onSave = () => {
			if ( levels === null || tileset === null ) {
				return;
			}
			window.electronAPI.save( generateSaveData( levels, tileset ) );
		};
		window.electronAPI.on( `save__editor`, onSave );

		return () => {
			window.electronAPI.remove( `save__editor` );
		};
	}, [ levels, tileset ] ); // Update whene’er levels change so they always reflect latest data.

	return <div>
		{ levels !== null && tileset !== null && <div>
			{ mode === modeKeys.select && <SelectMode setMode={ setMode } /> }
			{ mode === modeKeys.levelList && <LevelMode
				exitMode={ resetMode }
				levels={ levels }
				setLevels={ setLevels }
				tileset={ tileset }
			/> }
			{ mode === modeKeys.graphics && <GraphicsMode
				exitMode={ resetMode }
				setTileset={ setTileset }
				tileset={ tileset }
			/> }
		</div> }
	</div>;
};

export default Editor;
