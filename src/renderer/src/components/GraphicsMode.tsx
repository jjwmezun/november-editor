import { ReactElement, SyntheticBaseEvent, useEffect, useState } from 'react';
import TileGrid from './TileGrid';
import TileEditor from './TileEditor';
import ColorSelector from './ColorSelector';
import { tileSize } from '../../../common/constants';
import { Graphics, PaletteList } from '../../../common/types';

type GraphicsProps = {
	exitMode: () => void,
	graphics: Graphics,
	palettes: PaletteList,
	setGraphics: ( graphics: Graphics ) => void,
};

const GraphicsMode = ( props: GraphicsProps ): ReactElement => {
	const { exitMode, graphics, palettes, setGraphics } = props;

	const [ selectedGraphicType, setSelectedGraphicType ] = useState( `blocks` );
	const [ selectedTile, setSelectedTile ] = useState( 0 );
	const [ selectedColor, setSelectedColor ] = useState( 0 );
	const [ selectedPalette, setSelectedPalette ] = useState( 0 );

	const selectedGraphicsEntry = graphics[ selectedGraphicType ];

	const drawPixel = ( x, y ) => {
		const tileY = Math.floor( selectedTile / selectedGraphicsEntry.getWidthTiles() );
		const tileX = selectedTile % selectedGraphicsEntry.getWidthTiles();
		const pixelY = tileY * tileSize + y;
		const pixelX = tileX * tileSize + x;
		setGraphics( {
			...graphics,
			[ selectedGraphicType ]: selectedGraphicsEntry.updatePixel(
				selectedColor,
				pixelX,
				pixelY,
			),
		} );
	};

	const clearTile = () => {
		setGraphics( {
			...graphics,
			[ selectedGraphicType ]: selectedGraphicsEntry.clearTile( selectedTile ),
		} );
	};

	const updatePalette = ( e: SyntheticBaseEvent ) => {
		const target: HTMLSelectElement = e.target;
		const paletteIndex = parseInt( target.value );
		setSelectedPalette( paletteIndex );
	};

	const changeGraphicEntry = ( e: SyntheticBaseEvent ) => {
		const target: HTMLSelectElement = e.target;
		const graphicType = target.value as keyof Graphics;
		setSelectedGraphicType( graphicType );
		setSelectedTile( 0 );
	};

	const exportTiles = () => window.electronAPI.openTileExportWindow( selectedGraphicsEntry.getData() );

	useEffect( () => {
		const handleImportTiles = ( _event, data ) => {
			const { pixels, width, height } = data;
			setGraphics( {
				...graphics,
				[ selectedGraphicType ]: selectedGraphicsEntry.importPixels( pixels, width, height, selectedTile ),
			} );
		};

		window.electronAPI.on( `import-tiles__graphics-mode`, handleImportTiles );

		return () => window.electronAPI.remove( `import-tiles__graphics-mode` );
	}, [ selectedTile, graphics, selectedGraphicType ] );

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
			<select onChange={ changeGraphicEntry }>
				<option value="blocks">Blocks</option>
				<option value="sprites">Sprites</option>
			</select>
			<TileGrid
				graphics={ selectedGraphicsEntry }
				palettes={ palettes }
				selectedPalette={ selectedPalette }
				selectedTile={ selectedTile }
				setSelectedTile={ setSelectedTile }
			/>
			<TileEditor
				clearTile={ clearTile }
				drawPixel={ drawPixel }
				graphics={ selectedGraphicsEntry }
				palettes={ palettes }
				selectedColor={ selectedColor }
				selectedPalette={ selectedPalette }
				tileX={ selectedTile % selectedGraphicsEntry.getWidthTiles() }
				tileY={ Math.floor( selectedTile / selectedGraphicsEntry.getWidthTiles() ) }
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
				<button onClick={ exportTiles }>Export tiles</button>
			</div>
			<div>
				<button onClick={ exitMode }>← Back</button>
			</div>
		</div>
	</div>;
};

export default GraphicsMode;
