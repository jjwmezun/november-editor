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

const loadSaveData = data => {
	const levels = [];
	let remainingBytes = data;
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
	return levels;
};

const generateSaveData = levels => {
	let size = 0;
	let levelData = [];

	// For each level, generate data mo’ useful for deriving bytes & add its size to total.
	levels.map( level => {
		const nameBytes = encode( level.name );
		size += level.maps.reduce(
			( acc, map ) => acc + map.byteLength,
			nameBytes.length
			+ goals[ level.goal.id ].exportData.reduce(
				( acc, data ) => acc + getDataTypeSize( data.type ),
				1,
			) + 1,
		);
		levelData.push( {
			name: nameBytes,
			goal: level.goal,
			maps: level.maps,
		} );
	} );

	// Generate buffer to save data.
	const buffer = new ArrayBuffer( size );
	const view = new DataView( buffer );
	let i = 0;

	// Add bytes from each level’s data to buffer.
	levelData.forEach( ( { name, goal, maps } ) => {
		name.forEach( byte => view.setUint8( i++, byte ) );
		view.setUint8( i++, goal.id );
		goals[ goal.id ].exportData.forEach( data => {
			view[ `set${ data.type }` ]( i, goal[ data.data ] );
			i += getDataTypeSize( data.type );
		} );
		view.setUint8( i++, maps.length );
		maps.forEach( map => {
			new Uint8Array( map ).forEach( byte => view.setUint8( i++, byte ) );
		} );
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
	const [ mode, setMode ] = useState( modeKeys.select );

	const onOpen = data => setLevels( loadSaveData( data ) );

	const onSave = () => window.electronAPI.save( generateSaveData( levels ) );

	const resetMode = () => setMode( modeKeys.select );

	const onNew = () => {
		setLevels( Array.from( { length: levelCount } ).map( generateNewLevel ) );
		resetMode();
	};

	const onClose = () => {
		setLevels( null );
		resetMode();
	};

	useEffect( () => {
		window.electronAPI.onOpen( onOpen );
		window.electronAPI.onNew( onNew );
		window.electronAPI.onClose( onClose );

		return () => {
			window.electronAPI.removeNewListener( onNew );
			window.electronAPI.removeCloseListener( onClose );
			window.electronAPI.removeOpenListener( onOpen );
		};
	}, [] );

	useEffect( () => {
		window.electronAPI.onSave( onSave );

		return () => {
			window.electronAPI.removeSaveListener( onSave );
		};
	}, [ levels ] ); // Update whene’er levels change so they always reflect latest data.

	return <div>
		{ levels !== null && <div>
			{ mode === modeKeys.select && <SelectMode setMode={ setMode } /> }
			{ mode === modeKeys.levelList && <LevelMode
				exitMode={ resetMode }
				levels={ levels }
				setLevels={ setLevels }
			/> }
			{ mode === modeKeys.graphics && <GraphicsMode
				exitMode={ resetMode }
			/> }
		</div> }
	</div>;
};

export default Editor;
