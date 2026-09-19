import { useState } from 'react';
import BackgroundGraphicsTileGrid from './Backgrounds/BackgroundGraphicsTileGrid';
import { Graphics, PaletteSystem, Rect } from '../../../common/types';

interface BackgroundModeProps {
	graphics: Graphics,
	exitMode: () => void,
	palettes: PaletteSystem,
}

const BackgroundMode = ( props: BackgroundModeProps ) => {
	const {
		exitMode,
		graphics,
		palettes,
	} = props;

	const [ selectedTiles, setSelectedTiles ] = useState<Rect>( { x: 0, y: 0, width: 1, height: 1 } );
	const [ selectedPalette, setSelectedPalette ] = useState( 0 );

	return <div>
		<h1>Background Editor</h1>
		<BackgroundGraphicsTileGrid
			graphics={ graphics.backgrounds[ 0 ] }
			palettes={ palettes }
			selectedPalette={ selectedPalette }
			selectedTiles={ selectedTiles }
			setSelectedTiles={ setSelectedTiles }
		/>
		<button onClick={ exitMode }>Exit</button>
	</div>;
};

export default BackgroundMode;
