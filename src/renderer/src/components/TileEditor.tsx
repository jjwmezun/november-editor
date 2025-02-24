import { ReactElement, useEffect, useRef, useState } from 'react';
import { getMousePosition } from '../../../common/utils';
import { tileSize } from '../../../common/constants';
import { Coordinates, TileEditorProps } from '../../../common/types';

const pixelZoom: number = 16;
const halfPixel: number = pixelZoom / 2;
const width: number = tileSize * pixelZoom;
const height: number = tileSize * pixelZoom;

const brushLayouts: readonly Coordinates[][] = Object.freeze( [
	[ { x: 0, y: 0 } ],
	[
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
	],
	[
		{ x: 0, y: 0 },
		{ x: -1, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: -1 },
		{ x: 0, y: 1 },
	],
	[
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: -1, y: 0 },
		{ x: -1, y: 1 },
		{ x: 2, y: 0 },
		{ x: 2, y: 1 },
		{ x: 0, y: -1 },
		{ x: 1, y: -1 },
		{ x: 0, y: 2 },
		{ x: 1, y: 2 },
	],
	[
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: -1, y: -1 },
		{ x: 0, y: -1 },
		{ x: 1, y: -1 },
		{ x: -1, y: 1 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: -2, y: -1 },
		{ x: -2, y: 0 },
		{ x: -2, y: 1 },
		{ x: 2, y: -1 },
		{ x: 2, y: 0 },
		{ x: 2, y: 1 },
		{ x: -1, y: -2 },
		{ x: 0, y: -2 },
		{ x: 1, y: -2 },
		{ x: -1, y: 2 },
		{ x: 0, y: 2 },
		{ x: 1, y: 2 },
	],
	[
		{ x: 0, y: 0 },
		{ x: -1, y: 0 },
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
		{ x: 0, y: -1 },
		{ x: -1, y: -1 },
		{ x: 1, y: -1 },
		{ x: 2, y: -1 },
		{ x: 0, y: 1 },
		{ x: -1, y: 1 },
		{ x: 1, y: 1 },
		{ x: 2, y: 1 },
		{ x: 0, y: 2 },
		{ x: -1, y: 2 },
		{ x: 1, y: 2 },
		{ x: 2, y: 2 },
		{ x: 0, y: -2 },
		{ x: 1, y: -2 },
		{ x: 0, y: 3 },
		{ x: 1, y: 3 },
		{ x: -2, y: 0 },
		{ x: -2, y: 1 },
		{ x: 3, y: 0 },
		{ x: 3, y: 1 },
	],
	[
		{ x: -2, y: -2 },
		{ x: -1, y: -2 },
		{ x: 0, y: -2 },
		{ x: 1, y: -2 },
		{ x: 2, y: -2 },
		{ x: -2, y: -1 },
		{ x: -1, y: -1 },
		{ x: 0, y: -1 },
		{ x: 1, y: -1 },
		{ x: 2, y: -1 },
		{ x: -2, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
		{ x: -2, y: 1 },
		{ x: -1, y: 1 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: 2, y: 1 },
		{ x: -2, y: 2 },
		{ x: -1, y: 2 },
		{ x: 0, y: 2 },
		{ x: 1, y: 2 },
		{ x: 2, y: 2 },
		{ x: -1, y: -3 },
		{ x: 0, y: -3 },
		{ x: 1, y: -3 },
		{ x: -1, y: 3 },
		{ x: 0, y: 3 },
		{ x: 1, y: 3 },
		{ x: -3, y: -1 },
		{ x: -3, y: 0 },
		{ x: -3, y: 1 },
		{ x: 3, y: -1 },
		{ x: 3, y: 0 },
		{ x: 3, y: 1 },
	],
	[
		{ x: -2, y: -2 },
		{ x: -1, y: -2 },
		{ x: 0, y: -2 },
		{ x: 1, y: -2 },
		{ x: 2, y: -2 },
		{ x: 3, y: -2 },
		{ x: -2, y: -1 },
		{ x: -1, y: -1 },
		{ x: 0, y: -1 },
		{ x: 1, y: -1 },
		{ x: 2, y: -1 },
		{ x: 3, y: -1 },
		{ x: -2, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
		{ x: 3, y: 0 },
		{ x: -2, y: 1 },
		{ x: -1, y: 1 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: 2, y: 1 },
		{ x: 3, y: 1 },
		{ x: -2, y: 2 },
		{ x: -1, y: 2 },
		{ x: 0, y: 2 },
		{ x: 1, y: 2 },
		{ x: 2, y: 2 },
		{ x: 3, y: 2 },
		{ x: -2, y: 3 },
		{ x: -1, y: 3 },
		{ x: 0, y: 3 },
		{ x: 1, y: 3 },
		{ x: 2, y: 3 },
		{ x: 3, y: 3 },
		{ x: -1, y: -3 },
		{ x: 0, y: -3 },
		{ x: 1, y: -3 },
		{ x: 2, y: -3 },
		{ x: -1, y: 4 },
		{ x: 0, y: 4 },
		{ x: 1, y: 4 },
		{ x: 2, y: 4 },
		{ x: -3, y: -1 },
		{ x: -3, y: 0 },
		{ x: -3, y: 1 },
		{ x: -3, y: 2 },
		{ x: 4, y: -1 },
		{ x: 4, y: 0 },
		{ x: 4, y: 1 },
		{ x: 4, y: 2 },
	],
] );

const generateBrushLayout = (
	size: number,
	x: number,
	y: number,
): Coordinates[] => brushLayouts[ size - 1 ].map( o => ( {
	x: ( o.x + x ),
	y: ( o.y + y ),
} ) );

const generateBrushLayoutForRender = (
	size: number,
	x: number,
	y: number,
): Coordinates[] => generateBrushLayout( size, x, y ).map( o => ( {
	x: o.x * pixelZoom,
	y: o.y * pixelZoom,
} ) );

const TileEditor = ( props: TileEditorProps ): ReactElement => {
	const canvasRef = useRef();
	const { clearTile, colors, drawPixel, selectedColor, tileset, tileX, tileY } = props;
	const [ gridImage, setGridImage ] = useState( null );
	const [ transparencyImage, setTransparencyImage ] = useState( null );
	const [ selected, setSelected ] = useState( { x: 0, y: 0 } );
	const [ mouseDown, setMouseDown ] = useState( false );
	const [ brushSize, setBrushSize ] = useState( 1 );

	const drawBrush = () => {
		const brushPixels = generateBrushLayout( brushSize, selected.x, selected.y );
		brushPixels.forEach( ( { x, y } ) => {
			// Make sure to cut off edges o’ brush that’re out o’ bounds.
			if ( x < 0 || x >= tileSize || y < 0 || y >= tileSize ) {
				return;
			}
			drawPixel( x, y );
		} );
	};

	const render = () => {
		if ( ! canvasRef.current ) {
			return;
		}
		const ctx = canvasRef.current.getContext( `2d` );
		ctx.imageSmoothingEnabled = false;

		ctx.clearRect( 0, 0, width, height );

		// Render transparency checkerboard.
		if ( transparencyImage !== null ) {
			ctx.globalAlpha = 0.5;
			ctx.drawImage( transparencyImage, 0, 0 );
			ctx.globalAlpha = 1.0;
		}

		const srcX = tileX * tileSize;
		const srcY = tileY * tileSize;
		tileset.drawPiece( ctx, srcX, srcY, tileSize, tileSize, 0, 0, width, height );

		const brushPixels = generateBrushLayoutForRender( brushSize, selected.x, selected.y );

		// Only clear brush & render transparency if transparent color is selected.
		if ( selectedColor === 0 ) {
			brushPixels.forEach( ( { x, y } ) => {
				ctx.clearRect( x, y, pixelZoom, pixelZoom );
			} );

			// Render transparency checkerboard.
			if ( transparencyImage !== null ) {
				ctx.globalAlpha = 0.5;
				brushPixels.forEach( ( { x, y } ) => {
					ctx.drawImage(
						transparencyImage,
						0,
						0,
						pixelZoom,
						pixelZoom,
						x,
						y,
						pixelZoom,
						pixelZoom,
					);
				} );
				ctx.globalAlpha = 1.0;
			}
		} else {
			// Render selected color brush.
			ctx.fillStyle = colors[ selectedColor ];
			brushPixels.forEach( ( { x, y } ) => {
				ctx.fillRect( x, y, pixelZoom, pixelZoom );
			} );
		}

		// Render grid lines.
		if ( gridImage !== null ) {
			ctx.globalAlpha = 0.5;
			ctx.drawImage( gridImage, 0, 0 );
			ctx.globalAlpha = 1.0;
		}
	};

	// Select object on left click.
	const onClick = () => {
		setMouseDown( true );
		drawBrush();
	};

	const onMouseUp = () => setMouseDown( false );

	// Update cursor visuals on mouse move.
	const onMouseMove = e => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / pixelZoom );
		const gridY = Math.floor( y / pixelZoom );

		if ( selected.x === gridX && selected.y === gridY ) {
			return;
		}

		setSelected( { x: gridX, y: gridY } );

		if ( mouseDown ) {
			drawBrush();
		}
	};

	// Init gridline image.
	useEffect( () => {
		if ( canvasRef.current ) {
			const gridImage = document.createElement( `canvas` );
			gridImage.width = width;
			gridImage.height = height;
			const gridImageCtx = gridImage.getContext( `2d` );

			if ( !gridImageCtx ) {
				throw new Error( `Could not get 2D context for grid image.` );
			}

			gridImageCtx.strokeStyle = `#4488ff`;
			gridImageCtx.lineWidth = 1;

			for ( let i = pixelZoom; i < width; i += pixelZoom ) {
				gridImageCtx.moveTo( 0, i );
				gridImageCtx.lineTo( width, i );
				gridImageCtx.stroke();
			}

			for ( let i = pixelZoom; i < height; i += pixelZoom ) {
				gridImageCtx.moveTo( i, 0 );
				gridImageCtx.lineTo( i, height );
				gridImageCtx.stroke();
			}

			setGridImage( gridImage );

			const transparencyImage = document.createElement( `canvas` );
			transparencyImage.width = tileSize * pixelZoom;
			transparencyImage.height = tileSize * pixelZoom;
			const transparencyImageCtx = transparencyImage.getContext( `2d` );

			if ( !transparencyImageCtx ) {
				throw new Error( `Could not get 2D context for grid image.` );
			}

			transparencyImageCtx.fillStyle = `rgb( 64, 64, 64 )`;
			transparencyImageCtx.fillRect( 0, 0, transparencyImage.width, transparencyImage.height );
			transparencyImageCtx.fillStyle = `rgb( 192, 192, 192 )`;
			for ( let y = 0; y < transparencyImage.height; y += halfPixel ) {
				for ( let x = 0; x < transparencyImage.width; x += pixelZoom ) {
					transparencyImageCtx.fillRect( x + ( y % pixelZoom ), y, halfPixel, halfPixel );
				}
			}

			setTransparencyImage( transparencyImage );
		}
	}, [] );

	// Render on canvas ref or whene’er there is a state change.
	useEffect( render, [ canvasRef, tileset ] );
	useEffect( render );

	return <div className="graphics__tile-grid-canvas">
		<canvas
			ref={ canvasRef }
			width={ width }
			height={ height }
			onMouseDown={ onClick }
			onMouseUp={ onMouseUp }
			onMouseMove={ onMouseMove }
		/>
		<div>
			<label>
				<span>Brush size:</span>
				<input
					type="number"
					min={ 1 }
					max={ 8 }
					value={ brushSize }
					onChange={ e => {
						// Make sure brush doesn’t go below 1 or above 8 or app will break.
						const brushSize = Math.max( 1, Math.min( 8, parseInt( e.target.value ) ) );
						setBrushSize( brushSize );
					} }
				/>
			</label>
		</div>
		<button onClick={ clearTile }>Clear Tile</button>
	</div>;
};

export default TileEditor;
