import propTypes from 'prop-types';
import { useEffect, useState } from 'react';
import TileGrid from './TileGrid';
import TileEditor from './TileEditor';
import ColorSelector from './ColorSelector';
import { tilesetProp, tileSize } from '../../../common/tileset';

const colors = Object.freeze( [
	`rgba( 0, 0, 0, 0)`,
	`rgba( 0, 0, 0, 1)`,
	`rgba( 43, 43, 43, 1)`,
	`rgba( 85, 85, 85, 1)`,
	`rgba( 128, 128, 128, 1)`,
	`rgba( 170, 170, 170, 1)`,
	`rgba( 213, 213, 213, 1)`,
	`rgba( 255, 255, 255, 1)`,
] );

const GraphicsMode = props => {
	const { exitMode, setTileset, tileset } = props;

	const [ selectedTile, setSelectedTile ] = useState( 0 );
	const [ selectedColor, setSelectedColor ] = useState( 0 );

	const drawPixel = ( x, y ) => {
		const tileY = Math.floor( selectedTile / tileset.getWidthTiles() );
		const tileX = selectedTile % tileset.getWidthTiles();
		const pixelY = tileY * tileSize + y;
		const pixelX = tileX * tileSize + x;
		tileset.updatePixel( selectedColor, pixelX, pixelY );
		setTileset( { ...tileset } );
	};

	const clearTile = () => {
		tileset.clearTile( selectedTile );
		setTileset( { ...tileset } );
	};

	useEffect( () => {
		const handleImportTiles = ( _event, data ) => {
			const { pixels, width, height } = data;
			tileset.importPixels( pixels, width, height, selectedTile );
			setTileset( { ...tileset } );
		};

		window.electronAPI.on( `import-tiles__graphics-mode`, handleImportTiles );

		return () => {
			window.electronAPI.remove( `import-tiles__graphics-mode` );
		};
	}, [ selectedTile, tileset ] );

	return <div>
		<h1>Graphics Editor</h1>
		<div>
			<TileGrid
				selectedTile={ selectedTile }
				setSelectedTile={ setSelectedTile }
				tileset={ tileset }
			/>
			<TileEditor
				clearTile={ clearTile }
				colors={ colors }
				drawPixel={ drawPixel }
				selectedColor={ selectedColor }
				tileset={ tileset }
				tileX={ selectedTile % tileset.getWidthTiles() }
				tileY={ Math.floor( selectedTile / tileset.getWidthTiles() ) }
			/>
			<ColorSelector
				colors={ colors }
				selectedColor={ selectedColor }
				setSelectedColor={ setSelectedColor }
			/>
			<div>
				<button onClick={ window.electronAPI.openTileImportWindow }>Import tiles</button>
			</div>
			<div>
				<button onClick={ exitMode }>← Back</button>
			</div>
		</div>
	</div>;
};

GraphicsMode.propTypes = {
	exitMode: propTypes.func.isRequired,
	setTileset: propTypes.func.isRequired,
	tileset: tilesetProp.isRequired,
};

export default GraphicsMode;
