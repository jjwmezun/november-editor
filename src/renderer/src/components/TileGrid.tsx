import { ReactElement, useEffect, useRef, useState } from 'react';
import { getMousePosition } from '../../../common/utils';
import { TileGridProps } from '../../../common/types';

const transparencySquareSize: number = 4;
const zoom: number = 4;
const tileSize: number = 8 * zoom;

const TileGrid = ( props: TileGridProps ): ReactElement => {
	const canvasRef = useRef();
	const { selectedTile, setSelectedTile, tileset } = props;
	const [ gridImage, setGridImage ] = useState( null );
	const [ hovered, setHovered ] = useState( { x: 0, y: 0 } );
	const [ transparencyImage, setTransparencyImage ] = useState( null );
	const [ showGridLines, setShowGridLines ] = useState( true );
	const width = tileset.getWidthPixels() * zoom;
	const height = tileset.getHeightPixels() * zoom;

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

		// Render tileset.
		tileset.drawWhole( ctx, width, height );

		// Render highlight o’er selected grid box.
		const gridXPixels = hovered.x * tileSize;
		const gridYPixels = hovered.y * tileSize;
		ctx.fillStyle = `rgba( 0, 64, 128, 0.5 )`;
		ctx.fillRect( gridXPixels, gridYPixels, tileSize - 1, tileSize - 1 );

		// Render selector box.
		if ( selectedTile !== null ) {
			const x = ( selectedTile % tileset.getWidthTiles() ) * tileSize;
			const y = Math.floor( selectedTile / tileset.getWidthTiles() ) * tileSize;
			ctx.strokeStyle = `#88ff44`;
			ctx.lineWidth = 2;
			ctx.strokeRect( x, y, tileSize, tileSize );
		}

		// Render grid lines.
		if ( showGridLines && gridImage !== null ) {
			ctx.globalAlpha = 0.5;
			ctx.drawImage( gridImage, 0, 0 );
			ctx.globalAlpha = 1.0;
		}
	};

	// Update cursor visuals on mouse move.
	const onMouseMove = e => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / tileSize );
		const gridY = Math.floor( y / tileSize );

		if ( hovered.x === gridX && hovered.y === gridY ) {
			return;
		}

		setHovered( { x: gridX, y: gridY } );
	};

	// Update cursor visuals on mouse move.
	const onClick = e => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / tileSize );
		const gridY = Math.floor( y / tileSize );
		const selected = gridY * tileset.getWidthTiles() + gridX;

		if ( selectedTile === selected ) {
			return;
		}

		setSelectedTile( selected );
	};

	useEffect( () => {
		if ( canvasRef.current ) {
			// Init gridline image.
			const gridImage = document.createElement( `canvas` );
			gridImage.width = width;
			gridImage.height = height;
			const gridImageCtx: CanvasRenderingContext2D | null = gridImage.getContext( `2d` );

			if ( !gridImageCtx ) {
				throw new Error( `Could not get 2d context for gridImage` );
			}

			gridImageCtx.strokeStyle = `#4488ff`;
			gridImageCtx.lineWidth = 1;

			for ( let i = tileSize; i < height * tileSize; i += tileSize ) {
				gridImageCtx.moveTo( 0, i );
				gridImageCtx.lineTo( width, i );
				gridImageCtx.stroke();
			}

			for ( let i = tileSize; i < width; i += tileSize ) {
				gridImageCtx.moveTo( i, 0 );
				gridImageCtx.lineTo( i, height );
				gridImageCtx.stroke();
			}

			setGridImage( gridImage );

			// Init transparency checkerboard image.
			const transparencyImage = document.createElement( `canvas` );
			transparencyImage.width = width;
			transparencyImage.height = height;
			const transparencyImageCtx: CanvasRenderingContext2D | null = transparencyImage.getContext( `2d` );

			if ( !transparencyImageCtx ) {
				throw new Error( `Could not get 2d context for gridImage` );
			}

			transparencyImageCtx.fillStyle = `rgb( 64, 64, 64 )`;
			transparencyImageCtx.fillRect( 0, 0, transparencyImage.width, transparencyImage.height );
			transparencyImageCtx.fillStyle = `rgb( 192, 192, 192 )`;
			for ( let y = 0; y < transparencyImage.height; y += transparencySquareSize ) {
				for ( let x = 0; x < transparencyImage.width; x += ( transparencySquareSize * 2 ) ) {
					transparencyImageCtx.fillRect(
						x + ( y % ( transparencySquareSize * 2 ) ),
						y,
						transparencySquareSize,
						transparencySquareSize,
					);
				}
			}

			setTransparencyImage( transparencyImage );
		}
	}, [] );

	// Render on canvas ref or whene’er there is a state change.
	useEffect( render, [ canvasRef, selectedTile ] );
	useEffect( render );

	return <div>
		<div>
			<label>
				<span>Show grid lines</span>
				<input
					checked={ showGridLines }
					type="checkbox"
					onChange={ e => setShowGridLines( e.target.checked ) }
				/>
			</label>
		</div>
		<div className="graphics__canvas" style={ { width, height } }>
			<canvas
				ref={ canvasRef }
				width={ width }
				height={ height }
				style={ { width, height } }
				onClick={ onClick }
				onMouseMove={ onMouseMove }
			/>
		</div>
	</div>;
};

export default TileGrid;
