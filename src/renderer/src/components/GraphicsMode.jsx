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
	const [ canvas, setCanvas ] = useState( null );

	const drawPixel = ( x, y ) => {
		if ( canvas === null ) {
			return;
		}
		const tileY = Math.floor( selectedTile / tileset.getWidthTiles() );
		const tileX = selectedTile % tileset.getWidthTiles();
		const pixelY = tileY * tileSize + y;
		const pixelX = tileX * tileSize + x;
		const ctx = canvas.getContext( `2d` );
		ctx.fillStyle = colors[ selectedColor ];
		ctx.fillRect( pixelX, pixelY, 1, 1 );
		setTileset( tileset.updatePixel( selectedColor, pixelX, pixelY ) );
	};

	useEffect( () => {
		// Setup canvas.
		const canvas = document.createElement( `canvas` );
		canvas.style.imageRendering = `pixelated`;
		canvas.width = tileset.getWidthPixels();
		canvas.height = tileset.getHeightPixels();
		const ctx = canvas.getContext( `2d` );
		ctx.imageSmoothingEnabled = false;
		ctx.clearRect( 0, 0, canvas.width, canvas.height );

		// Render tileset pixels to canvas.
		const pixels = tileset.getPixels();
		pixels.forEach( ( color, i ) => {
			const x = i % tileset.getWidthPixels();
			const y = Math.floor( i / tileset.getWidthPixels() );
			ctx.fillStyle = colors[ color ];
			ctx.fillRect( x, y, 1, 1 );
		} );

		setCanvas( canvas );
	}, [] );

	return <div>
		<h1>Graphics Editor</h1>
		<div>
			<TileGrid
				canvas={ canvas }
				selectedTile={ selectedTile }
				setSelectedTile={ setSelectedTile }
				tileset={ tileset }
			/>
			<TileEditor
				canvas={ canvas }
				drawPixel={ drawPixel }
				tileX={ selectedTile % tileset.getWidthTiles() }
				tileY={ Math.floor( selectedTile / tileset.getWidthTiles() ) }
			/>
			<ColorSelector
				colors={ colors }
				selectedColor={ selectedColor }
				setSelectedColor={ setSelectedColor }
			/>
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
