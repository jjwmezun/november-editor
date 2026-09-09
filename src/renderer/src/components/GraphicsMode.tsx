import { ReactElement, SyntheticEvent, useEffect, useState } from 'react';
import TileGrid from './TileGrid';
import TileEditor from './TileEditor';
import ColorSelector from './ColorSelector';
import { tileSize } from '../../../common/constants';
import { Graphics, GraphicsEntryRaw, GraphicsType, PaletteSystem } from '../../../common/types';
import { getGraphicsTypeInfo } from '../../../common/graphics';

type GraphicsProps = {
	exitMode: () => void,
	graphics: Graphics,
	palettes: PaletteSystem,
	setGraphics: ( graphics: Graphics ) => void,
};

const GraphicsMode = ( props: GraphicsProps ): ReactElement => {
	const { exitMode, graphics, palettes, setGraphics } = props;

	const [ selectedGraphicType, setSelectedGraphicType ] = useState( GraphicsType.urbanBlocks );
	const [ selectedTile, setSelectedTile ] = useState( 0 );
	const [ selectedColor, setSelectedColor ] = useState( 0 );
	const [ selectedPaletteType, setSelectedPaletteType ] = useState( `main` );
	const [ selectedPalette, setSelectedPalette ] = useState( 0 );

	const selectedGraphicsEntry = graphics[ selectedGraphicType ];
	const selectedPaletteList = palettes[ selectedPaletteType as keyof PaletteSystem ];

	const drawPixel = ( x: number, y: number ) => {
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

	const clearAllTiles = () => {
		setGraphics( {
			...graphics,
			[ selectedGraphicType ]: selectedGraphicsEntry.clearAllTiles(),
		} );
	};

	const updatePalette = ( e: SyntheticEvent ) => {
		const target = e.target as HTMLSelectElement;
		const paletteIndex = parseInt( target.value );
		setSelectedPalette( paletteIndex );
	};

	const updatePaletteType = ( e: SyntheticEvent ) => {
		const target = e.target as HTMLSelectElement;
		const paletteType = target.value;
		setSelectedPaletteType( paletteType );
		setSelectedPalette( 0 );
	};

	const changeGraphicEntry = ( e: SyntheticEvent ) => {
		const target = e.target as HTMLSelectElement;
		const graphicType = target.value as GraphicsType;
		setSelectedGraphicType( graphicType );
		setSelectedTile( 0 );
	};

	const exportTiles = () => window.electronAPI.openTileExportWindow( selectedGraphicsEntry.getData() );

	useEffect( () => {
		const handleImportTiles = ( _event: SyntheticEvent, data: GraphicsEntryRaw ) => {
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
			<select onChange={ updatePaletteType } value={ selectedPaletteType }>
				{ Object.keys( palettes ).map( ( key: string, index: number ) => {
					return <option
						key={ index }
						value={ key }
					>
						{ key }
					</option>;
				} ) }
			</select>
			<select onChange={ updatePalette } value={ selectedPalette }>
				{ selectedPaletteList.map( ( palette, index ) => {
					return <option
						key={ index }
						value={ index }
					>
						{ palette.getName() }
					</option>;
				} ) }
			</select>
			<select onChange={ changeGraphicEntry } value={ selectedGraphicType }>
				{ Object.values( GraphicsType ).map( ( graphicType, index ) => {
					return <option
						key={ index }
						value={ graphicType }
					>
						{ getGraphicsTypeInfo( graphicType ).name }
					</option>;
				} ) }
			</select>
			<TileGrid
				graphics={ selectedGraphicsEntry }
				palettes={ palettes }
				selectedPalette={
					selectedPaletteType === `overworld` ? selectedPalette + palettes.main.getLength() : selectedPalette
				}
				selectedTile={ selectedTile }
				setSelectedTile={ setSelectedTile }
			/>
			<TileEditor
				clearAllTiles={ clearAllTiles }
				clearTile={ clearTile }
				drawPixel={ drawPixel }
				graphics={ selectedGraphicsEntry }
				palettes={ palettes }
				selectedColor={ selectedColor }
				selectedPalette={
					selectedPaletteType === `overworld` ? selectedPalette + palettes.main.getLength() : selectedPalette
				}
				tileX={ selectedTile % selectedGraphicsEntry.getWidthTiles() }
				tileY={ Math.floor( selectedTile / selectedGraphicsEntry.getWidthTiles() ) }
			/>
			<ColorSelector
				palettes={ selectedPaletteList }
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
