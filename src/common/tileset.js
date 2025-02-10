import propTypes from "prop-types";

const tileSize = 8;

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

const createTileset = ( widthTiles, heightTiles, pixels, canvas ) => {
	const getWidthPixels = () => widthTiles * tileSize;
	const getHeightPixels = () => heightTiles * tileSize;
	const ctx = canvas.getContext( `2d` );

	return {
		clearTile: tileIndex => {
			const tileX = tileIndex % widthTiles;
			const tileY = Math.floor( tileIndex / widthTiles );
			const x = tileX * tileSize;
			const y = tileY * tileSize;
			ctx.clearRect( x, y, tileSize, tileSize );
			for ( let pixelY = y; pixelY < y + tileSize; pixelY++ ) {
				const start = pixelY * getWidthPixels() + x;
				pixels.fill( 0, start, start + tileSize );
			}
		},
		drawPiece: ( ctx, srcX, srcY, srcW, srcH, destX, destY, destW, destH ) => {
			ctx.drawImage( canvas, srcX, srcY, srcW, srcH, destX, destY, destW, destH );
		},
		drawWhole: ( ctx, ctxWidth, ctxHeight ) => {
			ctx.drawImage( canvas, 0, 0, getWidthPixels(), getHeightPixels(), 0, 0, ctxWidth, ctxHeight );
		},
		getWidthTiles: () => widthTiles,
		getHeightTiles: () => heightTiles,
		getWidthPixels,
		getHeightPixels,
		getPixels: () => pixels,
		updatePixels: newPixels => createNewTileset( widthTiles, heightTiles, newPixels ),
		updatePixel: ( color, x, y ) => {
			const index = y * getWidthPixels() + x;
			pixels[ index ] = color;
			ctx.fillStyle = colors[ color ];
			ctx.fillRect( x, y, 1, 1 );
		},
	};
};

const createNewTileset = ( widthTiles, heightTiles, pixels ) => {
	const getWidthPixels = () => widthTiles * tileSize;
	const getHeightPixels = () => heightTiles * tileSize;
	const canvas = document.createElement( `canvas` );
	canvas.style.imageRendering = `pixelated`;
	canvas.width = getWidthPixels();
	canvas.height = getHeightPixels();
	const ctx = canvas.getContext( `2d` );
	ctx.imageSmoothingEnabled = false;

	ctx.clearRect( 0, 0, canvas.width, canvas.height );
	pixels.forEach( ( color, i ) => {
		const x = i % getWidthPixels();
		const y = Math.floor( i / getWidthPixels() );
		ctx.fillStyle = colors[ color ];
		ctx.fillRect( x, y, 1, 1 );
	} );

	return createTileset( widthTiles, heightTiles, pixels, canvas );
};

const createBlankTileset = ( widthTiles, heightTiles ) => createNewTileset(
	widthTiles,
	heightTiles,
	new Array( widthTiles * tileSize * heightTiles * tileSize ).fill( 0 ),
);

const tilesetProp = propTypes.shape( {
	drawPiece: propTypes.func.isRequired,
	drawWhole: propTypes.func.isRequired,
	getWidthTiles: propTypes.func.isRequired,
	getHeightTiles: propTypes.func.isRequired,
	getWidthPixels: propTypes.func.isRequired,
	getHeightPixels: propTypes.func.isRequired,
	getPixels: propTypes.func.isRequired,
	updatePixels: propTypes.func.isRequired,
	updatePixel: propTypes.func.isRequired,
} );

export {
	createBlankTileset,
	tilesetProp,
	tileSize,
};
