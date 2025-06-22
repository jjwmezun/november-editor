import { ReactElement, useEffect, useState } from 'react';
import {
	createMap,
	generateDataBytes,
	transformMapDataToObject,
} from '../../../common/levels';
import {
	LevelEditorProps,
} from '../../../common/types';

import MapEditor from './LevelEditor/MapEditor';
import { LevelOptions } from './LevelEditor/LevelOptions';
import { MapSelectorList } from './LevelEditor/MapSelectorList';

const LevelEditor = ( props: LevelEditorProps ): ReactElement => {
	const [ selectedMap, setSelectedMap ] = useState( null );
	const [ selectedMapIndex, setSelectedMapIndex ] = useState( null );

	const { closeLevel, goal, graphics, maps, name, palettes, setGoal, setMaps, setName } = props;

	const addMap = () => {
		setSelectedMapIndex( maps.length );
		const map = createMap();
		setSelectedMap( map );
		setMaps( [ ...maps, generateDataBytes( map ) ] );
	};

	const deleteMap = () => {
		setMaps( maps.filter( ( _, i ) => i !== selectedMapIndex ) );
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const exit = () => {
		closeLevel();
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const exportMap = () => {
		window.electronAPI.exportMap( maps[ selectedMapIndex ] );
	};

	const generateMapSelector = ( i: number ) => () => {
		const mapobj = transformMapDataToObject( maps[ i ] );
		setSelectedMapIndex( i );
		setSelectedMap( mapobj );
	};

	const importMap = () => {
		window.electronAPI.importMap();
	};

	const importMapData = ( _event, data ) => {
		const map = transformMapDataToObject( data.buffer );
		setSelectedMap( map );
		setSelectedMapIndex( maps.length );
		setMaps( [ ...maps, data.buffer ] );
	};

	const moveMapDown = () => {
		setMaps( ( () => {
			const newMaps = [ ...maps ];
			const temp = newMaps[ selectedMapIndex ];
			newMaps[ selectedMapIndex ] = newMaps[ selectedMapIndex + 1 ];
			newMaps[ selectedMapIndex + 1 ] = temp;
			return newMaps;
		} )() );
		setSelectedMapIndex( selectedMapIndex + 1 );
	};

	const moveMapUp = () => {
		setMaps( ( () => {
			const newMaps = [ ...maps ];
			const temp = newMaps[ selectedMapIndex ];
			newMaps[ selectedMapIndex ] = newMaps[ selectedMapIndex - 1 ];
			newMaps[ selectedMapIndex - 1 ] = temp;
			return newMaps;
		} )() );
		setSelectedMapIndex( selectedMapIndex - 1 );
	};

	const onClose = () => {
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const onNew = () => {
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const onOpen = () => {
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	useEffect( () => {
		window.electronAPI.on( `import-map__level-editor`, importMapData );
		window.electronAPI.on( `open__level-editor`, onOpen );
		window.electronAPI.on( `close__level-editor`, onClose );
		window.electronAPI.on( `new__level-editor`, onNew );

		return () => {
			window.electronAPI.remove( `import-map__level-editor` );
			window.electronAPI.remove( `open__level-editor` );
			window.electronAPI.remove( `close__level-editor` );
			window.electronAPI.remove( `new__level-editor` );
		};
	}, [ maps ] );

	return <div>
		<h1>Level editor</h1>
		<LevelOptions
			goal={ goal }
			name={ name }
			setGoal={ setGoal }
			setName={ setName }
		/>
		{ maps.length > 0 && <MapSelectorList
			generateMapSelector={ generateMapSelector }
			maps={ maps }
			selectedMapIndex={ selectedMapIndex }
		/> }
		<div>
			<h2>Map controls</h2>
			<div>
				<button disabled={ maps.length >= 255 } onClick={ addMap }>Add Map</button>
				<button disabled={ selectedMap === null } onClick={ deleteMap }>Delete Map</button>
				<button
					disabled={ selectedMapIndex === null || selectedMapIndex === 0 }
					onClick={ moveMapUp }
				>
					↑
				</button>
				<button
					disabled={ selectedMapIndex === null || selectedMapIndex === maps.length - 1 }
					onClick={ moveMapDown }
				>
					↓
				</button>
				<button disabled={ selectedMap === null } onClick={ exportMap }>Export Map</button>
				<button disabled={ maps.length >= 255 } onClick={ importMap }>Import Map</button>
			</div>
		</div>
		<MapEditor
			graphics={ graphics }
			maps={ maps }
			palettes={ palettes }
			selectedMap={ selectedMap }
			selectedMapIndex={ selectedMapIndex }
			setMaps={ setMaps }
			setSelectedMap={ setSelectedMap }
		/>
		<div>
			<button onClick={ exit }>Back to Level List</button>
		</div>
	</div>;
};

export default LevelEditor;
