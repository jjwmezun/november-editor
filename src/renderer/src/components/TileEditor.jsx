import propTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { getMousePosition } from '../../../common/utils';

const pixelZoom = 16;
const halfPixel = pixelZoom / 2;
const tileSize = 8;
const width = tileSize * pixelZoom;
const height = tileSize * pixelZoom;

const TileEditor = props => {
	const canvasRef = useRef();
	const { canvas, drawPixel, tileX, tileY } = props;
	const [ gridImage, setGridImage ] = useState( null );
	const [ transparencyImage, setTransparencyImage ] = useState( null );
	const [ selected, setSelected ] = useState( { x: 0, y: 0 } );
	const [ mouseDown, setMouseDown ] = useState( false );

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

		if ( canvas !== null ) {
			const srcX = tileX * tileSize;
			const srcY = tileY * tileSize;
			ctx.drawImage( canvas, srcX, srcY, tileSize, tileSize, 0, 0, width, height );
		}

		// Render highlight o’er selected grid box.
		const gridXPixels = selected.x * pixelZoom;
		const gridYPixels = selected.y * pixelZoom;
		ctx.fillStyle = `rgba( 0, 64, 128, 0.5 )`;
		ctx.fillRect( gridXPixels, gridYPixels, 15, 15 );

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
		drawPixel( selected.x, selected.y );
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

		document.body.style.cursor = `pointer`;
		if ( mouseDown ) {
			drawPixel( selected.x, selected.y );
		}
	};

	// Init gridline image.
	useEffect( () => {
		if ( canvasRef.current ) {
			const gridImage = document.createElement( `canvas` );
			gridImage.width = width;
			gridImage.height = height;
			const gridImageCtx = gridImage.getContext( `2d` );

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
	useEffect( render, [ canvasRef, canvas ] );
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
	</div>;
};

TileEditor.propTypes = {
	canvas: propTypes.object,
	drawPixel: propTypes.func.isRequired,
	tileX: propTypes.number.isRequired,
	tileY: propTypes.number.isRequired,
};

export default TileEditor;
