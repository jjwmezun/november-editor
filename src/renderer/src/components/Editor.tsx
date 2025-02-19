import '../assets/editor.scss';
import { ReactElement, useEffect, useState } from 'react';
import { getDataTypeSize } from '../../../common/bytes';
import { levelCount } from '../../../common/constants';
import { modeKeys } from '../../../common/modes';
import LevelMode from './LevelMode';
import SelectMode from './SelectMode';
import GraphicsMode from './GraphicsMode';
import { createBlankTileset } from '../../../common/tileset';
import {
	createLevel,
	encodeLevels,
	loadLevelFromData,
}	from '../../../common/levels';
import {
	ByteBlock,
	DecodedTilesetData,
	Level,
	Tileset,
} from '../../../common/types';

const loadGraphicsFromData = ( data: Uint8Array ): DecodedTilesetData => {
	let tileset = createBlankTileset( 64, 64 );

	// Load tileset pixels from bits.
	const pixels: number[] = [];
	const dataSize = Math.ceil( tileset.getPixels().length * ( 3 / 8 ) );

	const bits: number[] = [];
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
const getColorFromBits = ( bits: number[] ): number => {
	const color = parseInt( bits.join( `` ), 2 );
	if ( color < 0 || color > 7 ) {
		throw new Error( `Invalid color: ${ color }` );
	}
	return color;
};

// Convert color index into list o’ 3 bits.
const getBitsFromColor = ( color: number ): number[] => {
	if ( color < 0 || color > 7 ) {
		throw new Error( `Invalid color: ${ color }` );
	}
	return [ ...color.toString( 2 ).padStart( 3, `0` ) ].map( bit => parseInt( bit ) );
};

const generateSaveData = ( levels: Level[], tileset: Tileset ): DataView => {
	let saveData: ByteBlock[] = [];

	// Add tileset data to save data.
	let bits: number[] = [];
	const pixels: number[] = tileset.getPixels();
	pixels.forEach( pixel => {
		const pixelBits: number[] = getBitsFromColor( pixel );
		while ( pixelBits.length > 0 ) {
			// Shift can’t return undefined, as loop stops before list reaches 0 length.
			bits.push( pixelBits.shift()! );
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
	saveData = saveData.concat( encodeLevels( levels ) );

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

const Editor = (): ReactElement => {
	const [ levels, setLevels ] = useState( null );
	const [ tileset, setTileset ] = useState( null );
	const [ mode, setMode ] = useState( modeKeys.select );

	const onOpen = ( _event, data: Uint8Array ) => {
		resetMode();

		// Load tileset data.
		const tilesetData = loadGraphicsFromData( data );
		setTileset( tilesetData.tileset );

		// Load level data.
		const levels: Level[] = [];
		let remainingBytes = tilesetData.remainingBytes;
		while ( remainingBytes.length > 0 ) {
			const levelData = loadLevelFromData( remainingBytes );
			levels.push( levelData.level );
			remainingBytes = levelData.remainingBytes;
		}

		// If there are fewer levels than expected,
		// add new levels to fill the gap.
		while ( levels.length < levelCount ) {
			levels.push( createLevel() );
		}
		setLevels( levels );
	};

	const resetMode = () => setMode( modeKeys.select );

	const onNew = () => {
		setLevels( Array.from( { length: levelCount } ).map( () => createLevel() ) );
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
