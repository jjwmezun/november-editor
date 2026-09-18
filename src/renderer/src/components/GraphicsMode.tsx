import { ReactElement, SyntheticEvent, useEffect, useState } from 'react';
import TileGrid from './TileGrid';
import TileEditor from './TileEditor';
import ColorSelector from './ColorSelector';
import { tileSize } from '../../../common/constants';
import { Graphics, GraphicsEntryRaw, GraphicsType, PaletteSystem } from '../../../common/types';
import { createBlankGraphicsEntry, getGraphicsTypeName } from '../../../common/graphics';

type GraphicsProps = {
	exitMode: () => void,
	graphics: Graphics,
	palettes: PaletteSystem,
	setGraphics: ( graphics: Graphics ) => void,
};

const GraphicsMode = ( props: GraphicsProps ): ReactElement => {
	const { exitMode, graphics, palettes, setGraphics } = props;

	const [ selectedGraphicType, setSelectedGraphicType ] = useState( GraphicsType.general );
	const [ selectedGraphicsEntry, setSelectedGraphicsEntry ] = useState( 0 );
	const [ selectedTile, setSelectedTile ] = useState( 0 );
	const [ selectedColor, setSelectedColor ] = useState( 0 );
	const [ selectedPaletteType, setSelectedPaletteType ] = useState( `main` );
	const [ selectedPalette, setSelectedPalette ] = useState( 0 );

	const graphicsType = graphics[ selectedGraphicType ];
	const graphicsEntry = graphicsType[ selectedGraphicsEntry ];

	const selectedPaletteList = palettes[ selectedPaletteType as keyof PaletteSystem ];

	const drawPixel = ( x: number, y: number ) => {
		const tileY = Math.floor( selectedTile / graphicsEntry.getWidthTiles() );
		const tileX = selectedTile % graphicsEntry.getWidthTiles();
		const pixelY = tileY * tileSize + y;
		const pixelX = tileX * tileSize + x;
		setGraphics( {
			...graphics,
			[ selectedGraphicType ]: graphicsEntry.updatePixel(
				selectedColor,
				pixelX,
				pixelY,
			),
		} );
	};

	const clearTile = () => {
		setGraphics( {
			...graphics,
			[ selectedGraphicType ]: graphicsEntry.clearTile( selectedTile ),
		} );
	};

	const clearAllTiles = () => {
		setGraphics( {
			...graphics,
			[ selectedGraphicType ]: graphicsEntry.clearAllTiles(),
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

	const changeGraphicsType = ( e: SyntheticEvent ) => {
		const target = e.target as HTMLSelectElement;
		const graphicType = target.value as GraphicsType;
		setSelectedGraphicType( graphicType );
		setSelectedGraphicsEntry( 0 );
		setSelectedTile( 0 );
	};

	const changeGraphicsEntry = ( e: SyntheticEvent ) => {
		const target = e.target as HTMLSelectElement;
		const graphicsEntry = parseInt( target.value );
		setSelectedGraphicsEntry( graphicsEntry );
		setSelectedTile( 0 );
	};

	const addBackground = () => {
		setGraphics( {
			...graphics,
			backgrounds: [
				...graphics.backgrounds,
				createBlankGraphicsEntry( `unnamedBackground`, GraphicsType.backgrounds, 0 ),
			],
		} );
	};

	const removeBackground = () => {
		if ( graphics.backgrounds.length < 2 ) {
			return;
		}

		setGraphics( {
			...graphics,
			backgrounds: graphics.backgrounds.filter( ( _entry, index ) => index !== selectedGraphicsEntry ),
		} );
	};

	const updateBackgroundTitle = ( e: SyntheticEvent ) => {
		const target = e.target as HTMLInputElement;
		const newTitle = target.value;
		const newGraphics = { ...graphics };
		const entry = graphics[ selectedGraphicType ][ selectedGraphicsEntry ];
		newGraphics[ selectedGraphicType ][ selectedGraphicsEntry ] = entry.updateTitle( newTitle );
		setGraphics( newGraphics );
	};

	const exportTiles = () => window.electronAPI.openTileExportWindow( graphicsEntry.getData() );

	useEffect( () => {
		const handleImportTiles = ( _event: SyntheticEvent, data: GraphicsEntryRaw ) => {
			const { pixels, width, height } = data;
			const newGraphics = { ...graphics };
			const newGraphicsEntry = { ...newGraphics[ selectedGraphicType ][ selectedGraphicsEntry ] };
			newGraphicsEntry.importPixels(
				pixels,
				width,
				height,
				selectedTile,
			);
			newGraphics[ selectedGraphicType ][ selectedGraphicsEntry ] = newGraphicsEntry;
			setGraphics( newGraphics );
		};

		window.electronAPI.on( `import-tiles__graphics-mode`, handleImportTiles );

		return () => window.electronAPI.remove( `import-tiles__graphics-mode` );
	}, [ selectedTile, graphics, selectedGraphicType, selectedGraphicsEntry ] );

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
			<select onChange={ changeGraphicsType } value={ selectedGraphicType }>
				{ Object.values( GraphicsType ).map( ( graphicType, index ) => {
					return <option
						key={ index }
						value={ graphicType }
					>
						{ getGraphicsTypeName( graphicType ) }
					</option>;
				} ) }
			</select>
			<select onChange={ changeGraphicsEntry } value={ selectedGraphicsEntry }>
				{ graphicsType.map( ( entry, index ) => {
					return <option
						key={ index }
						value={ index }
					>
						{ entry.title() }
					</option>;
				} ) }
			</select>
			{ selectedGraphicType === GraphicsType.backgrounds && <div>
				<label>
					<span>Name:</span>
					<input
						type="text"
						value={ graphicsEntry.title() }
						onChange={ updateBackgroundTitle }
					/>
				</label>
				<button onClick={ addBackground }>Add Background</button>
				<button
					disabled={ graphics.backgrounds.length < 2 }
					onClick={ removeBackground }
				>
					Remove Background
				</button>
			</div> }
			<TileGrid
				graphics={ graphicsEntry }
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
				graphics={ graphicsEntry }
				palettes={ palettes }
				selectedColor={ selectedColor }
				selectedPalette={
					selectedPaletteType === `overworld` ? selectedPalette + palettes.main.getLength() : selectedPalette
				}
				tileX={ selectedTile % graphicsEntry.getWidthTiles() }
				tileY={ Math.floor( selectedTile / graphicsEntry.getWidthTiles() ) }
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
