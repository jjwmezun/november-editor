import { ReactElement, SyntheticBaseEvent, useEffect, useState } from 'react';
import TileGrid from './TileGrid';
import TileEditor from './TileEditor';
import ColorSelector from './ColorSelector';
import { tileSize } from '../../../common/constants';
import { PaletteList, Tileset } from '../../../common/types';

type GraphicsProps = {
	palettes: PaletteList,
	exitMode: () => void,
	setTileset: ( tileset: Tileset ) => void,
	tileset: Tileset,
};

const GraphicsMode = ( props: GraphicsProps ): ReactElement => {
	const { exitMode, palettes, setTileset, tileset } = props;

	const [ selectedTile, setSelectedTile ] = useState( 0 );
	const [ selectedColor, setSelectedColor ] = useState( 0 );
	const [ selectedPalette, setSelectedPalette ] = useState( 0 );

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

	const updatePalette = ( e: SyntheticBaseEvent ) => {
		const target: HTMLSelectElement = e.target;
		const paletteIndex = parseInt( target.value );
		setSelectedPalette( paletteIndex );
	};

	useEffect( () => {
		const handleImportTiles = ( _event, data ) => {
			const { pixels, width, height } = data;
			tileset.importPixels( pixels, width, height, selectedTile );
			setTileset( { ...tileset } );
		};

		window.electronAPI.on( `import-tiles__graphics-mode`, handleImportTiles );

		return () => window.electronAPI.remove( `import-tiles__graphics-mode` );
	}, [ selectedTile, tileset ] );

	return <div>
		<h1>Graphics Editor</h1>
		<div>
			<select onChange={ updatePalette }>
				{ palettes.map( ( palette, index ) => {
					return <option
						key={ index }
						value={ index }
					>
						{ palette.getName() }
					</option>;
				} ) }
			</select>
			<TileGrid
				palettes={ palettes }
				selectedPalette={ selectedPalette }
				selectedTile={ selectedTile }
				setSelectedTile={ setSelectedTile }
				tileset={ tileset }
			/>
			<TileEditor
				clearTile={ clearTile }
				drawPixel={ drawPixel }
				palettes={ palettes }
				selectedColor={ selectedColor }
				selectedPalette={ selectedPalette }
				tileset={ tileset }
				tileX={ selectedTile % tileset.getWidthTiles() }
				tileY={ Math.floor( selectedTile / tileset.getWidthTiles() ) }
			/>
			<ColorSelector
				palettes={ palettes }
				selectedColor={ selectedColor }
				selectedPalette={ selectedPalette }
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

export default GraphicsMode;
