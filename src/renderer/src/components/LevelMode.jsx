import propTypes from 'prop-types';
import '../assets/editor.scss';
import { useEffect, useState } from 'react';
import { testCharacters } from '../../../common/text';
import LevelEditor from './LevelEditor';
import LevelList from './LevelList';
import { tilesetProp } from '../../../common/tileset';

const LevelMode = props => {
	const { exitMode, levels, setLevels, tileset } = props;
	const [ selectedLevel, setSelectedLevel ] = useState( null );

	const closeLevel = () => setSelectedLevel( null );

	// Set maps to maps list, but with selected level replaced by updated version.
	const setMaps = maps => setLevels( levels.map( ( level, i ) => ( i === selectedLevel
		? { ...level, maps }
		: level ) ) );

	const generateLevelNameUpdater = selectedLevel => name => {
		const newName = name.toUpperCase();

		// If name contains invalid characters, do not update.
		if ( ! testCharacters( newName ) ) {
			return;
		}

		setLevels( levels.map( ( level, i ) => ( i === selectedLevel
			? { ...level, name: newName }
			: level ) ) );
		window.electronAPI.enableSave();
	};

	const setSelectedGoal = goal => setLevels( levels.map( ( level, i ) => ( i === selectedLevel
		? { ...level, goal }
		: level ) ) );

	const onNew = () => {
		setSelectedLevel( null );
	};

	const onClose = () => {
		setSelectedLevel( null );
	};

	const onOpen = () => {
		setSelectedLevel( null );
	};

	useEffect( () => {
		window.electronAPI.on( `new__level-mode`, onNew );
		window.electronAPI.on( `open__level-mode`, onOpen );
		window.electronAPI.on( `close__level-mode`, onClose );

		return () => {
			window.electronAPI.remove( `new__level-mode` );
			window.electronAPI.remove( `open__level-mode` );
			window.electronAPI.remove( `close__level-mode` );
		};
	}, [] );

	return <div>
		{ selectedLevel === null && <LevelList
			exitMode={ exitMode }
			generateLevelNameUpdater={ generateLevelNameUpdater }
			levels={ levels }
			setLevels={ setLevels }
			setSelectedLevel={ setSelectedLevel }
		/> }
		{ selectedLevel !== null && <LevelEditor
			closeLevel={ closeLevel }
			maps={ levels[ selectedLevel ].maps }
			name={ levels[ selectedLevel ].name }
			setName={ generateLevelNameUpdater( selectedLevel ) }
			selectedGoal={ levels[ selectedLevel ].goal }
			setMaps={ setMaps }
			setSelectedGoal={ setSelectedGoal }
			tileset={ tileset }
		/> }
	</div>;
};

LevelMode.propTypes = {
	exitMode: propTypes.func.isRequired,
	levels: propTypes.array,
	setLevels: propTypes.func.isRequired,
	tileset: tilesetProp.isRequired,
};

export default LevelMode;
