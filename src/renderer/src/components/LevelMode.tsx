// @ts-expect-error – CSS import, doesn’t follow normal JS rules.
import '../assets/editor.scss';

import { ReactElement, useEffect, useState } from 'react';
import { testCharacters } from '../../../common/text';
import LevelEditor from './LevelEditor';
import LevelList from './LevelList';
import { Level, LevelModeProps } from '../../../common/types';

const LevelMode = ( props: LevelModeProps ): ReactElement => {
	const { exitMode, graphics, levels, palettes, setLevels } = props;
	const [ selectedLevel, setSelectedLevel ] = useState<number | null>( null );

	const closeLevel = () => setSelectedLevel( null );

	const generateLevelNameUpdater = ( selectedLevel: number ) => ( name: string ) => {
		const newName = name.toUpperCase();

		// If name contains invalid characters, do not update.
		if ( ! testCharacters( newName ) ) {
			return;
		}

		setLevels( levels.map( ( level, i ) => ( i === selectedLevel
			? level.updateName( newName )
			: level ) ) );
		window.electronAPI.enableSave();
	};

	const onNew = () => {
		setSelectedLevel( null );
	};

	const onClose = () => {
		setSelectedLevel( null );
	};

	const onOpen = () => {
		setSelectedLevel( null );
	};

	const setLevel = ( level: Level ) => setLevels( levels.map( ( l, i ) => ( i === selectedLevel
		? level
		: l ) ) );

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
			graphics={ graphics }
			level={ levels[ selectedLevel ] }
			palettes={ palettes }
			setLevel={ setLevel }
			updateLevelName={ generateLevelNameUpdater( selectedLevel ) }
		/> }
	</div>;
};

export default LevelMode;
