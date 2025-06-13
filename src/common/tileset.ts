import { Tileset } from "./types";
import { tileSize } from "./constants";
import { getBitsFromByte } from "./bytes";

const colors: readonly string[] = Object.freeze( [
	`rgba( 0, 0, 0, 0)`,
	`rgba( 0, 0, 0, 1)`,
	`rgba( 43, 43, 43, 1)`,
	`rgba( 85, 85, 85, 1)`,
	`rgba( 128, 128, 128, 1)`,
	`rgba( 170, 170, 170, 1)`,
	`rgba( 213, 213, 213, 1)`,
	`rgba( 255, 255, 255, 1)`,
] );

// Convert color index into list o’ 3 bits.
const getBitsFromColor = ( color: number ): number[] => {
	if ( color < 0 || color > 7 ) {
		throw new Error( `Invalid color: ${ color }` );
	}
	return [ ...color.toString( 2 ).padStart( 3, `0` ) ].map( bit => parseInt( bit ) );
};

// Convert list o’ 3 bits into color index.
const getColorFromBits = ( bits: number[] ): number => {
	const color = parseInt( bits.join( `` ), 2 );
	if ( color < 0 || color > 7 ) {
		throw new Error( `Invalid color: ${ color }` );
	}
	return color;
};

const compressPixels = ( pixels: number[] ): number[] => {
	let bits: number[] = [];
	const compressedPixels: number[] = [];
	pixels.forEach( pixel => {
		const pixelBits: number[] = getBitsFromColor( pixel );
		while ( pixelBits.length > 0 ) {
			// Shift can’t return undefined, as loop stops before list reaches 0 length.
			bits.push( pixelBits.shift()! );
			if ( bits.length === 8 ) {
				compressedPixels.push( parseInt( bits.join( `` ), 2 ) );
				bits = [];
			}
		}
	} );

	// If there are any remaining bits, add them to save data & fill out rest o’ byte with 0s.
	if ( bits.length > 0 ) {
		while ( bits.length < 8 ) {
			bits.push( 0 );
		}
		compressedPixels.push( parseInt( bits.join( `` ), 2 ) );
	}

	return compressedPixels;
};

const decompressPixels = ( pixels: number[] ): number[] => {
	const out: number[] = [];
	let bits: number[] = [];
	pixels.forEach( byte => {
		// Get bits from byte & add to total list.
		bits = bits.concat( getBitsFromByte( byte ) );

		// If there are ’nough bits to make a color, add it to pixels.
		while ( bits.length >= 3 ) {
			const v = bits.splice( 0, 3 );
			const color = getColorFromBits( v );
			out.push( color );
		}
	} );

	if ( bits.length > 0 ) {
		throw new Error( `Invalid tileset data` );
	}

	return out;
};

const createTileset = (
	widthTiles: number,
	heightTiles: number,
	pixels: number[],
	canvas: HTMLCanvasElement,
): Tileset => {
	const getWidthPixels = () => widthTiles * tileSize;
	const getHeightPixels = () => heightTiles * tileSize;
	const ctx: CanvasRenderingContext2D | null = canvas.getContext( `2d` );

	if ( !ctx ) {
		throw new Error( `Canvas 2D context is null.` );
	}

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
		createTexture: ( ctx: WebGLRenderingContext, index: number ): WebGLTexture => {
			const texture = ctx.createTexture();
			ctx.activeTexture( ctx[ `TEXTURE${ index }` ] );
			ctx.bindTexture( ctx.TEXTURE_2D, texture );
			ctx.texImage2D(
				ctx.TEXTURE_2D,
				0,
				ctx.LUMINANCE,
				getWidthPixels(),
				getHeightPixels(),
				0,
				ctx.LUMINANCE,
				ctx.UNSIGNED_BYTE,
				new Uint8Array( pixels.map( pixel => pixel * 32 ) ), // Stretch pixel to span 0 – 255.
			);
			ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST );
			ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST );
			ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.REPEAT );
			ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.REPEAT );
			return texture;
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
		importPixels: ( newPixels, importWidth, importHeight, tileIndex ) => {
			const tileX = tileIndex % widthTiles;
			const tileY = Math.floor( tileIndex / widthTiles );
			const x = tileX * tileSize;
			const y = tileY * tileSize;
			const endX = Math.min( x + importWidth, getWidthPixels() );
			const endY = Math.min( y + importHeight, getHeightPixels() );
			for ( let pixelY = y; pixelY < endY; pixelY++ ) {
				for ( let pixelX = x; pixelX < endX; pixelX++ ) {
					const srcIndex = ( pixelY - y ) * importWidth + ( pixelX - x );
					const destIndex = pixelY * getWidthPixels() + pixelX;

					// Show existent pixels under transparent pixels.
					if ( newPixels[ srcIndex ] !== 0 ) {
						pixels[ destIndex ] = newPixels[ srcIndex ];
						ctx.fillStyle = colors[ newPixels[ srcIndex ] ];
						ctx.fillRect( pixelX, pixelY, 1, 1 );
					}
				}
			}
		},
		toJSON: () => ( { widthTiles, heightTiles, pixels: compressPixels( pixels ) } ),
		updatePixels: newPixels => createNewTileset( widthTiles, heightTiles, newPixels ),
		updatePixel: ( color, x, y ) => {
			const index = y * getWidthPixels() + x;
			pixels[ index ] = color;
			ctx.clearRect( x, y, 1, 1 );
			ctx.fillStyle = colors[ color ];
			ctx.fillRect( x, y, 1, 1 );
		},
	};
};

const createNewTileset = (
	widthTiles: number,
	heightTiles: number,
	pixels: number[],
): Tileset => {
	const getWidthPixels = (): number => widthTiles * tileSize;
	const getHeightPixels = (): number => heightTiles * tileSize;
	const canvas: HTMLCanvasElement = document.createElement( `canvas` );
	canvas.style.imageRendering = `pixelated`;
	canvas.width = getWidthPixels();
	canvas.height = getHeightPixels();
	const ctx: CanvasRenderingContext2D | null = canvas.getContext( `2d` );

	if ( !ctx ) {
		throw new Error( `Canvas 2D context is null.` );
	}

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

const createBlankTileset = ( widthTiles: number, heightTiles: number ): Tileset => createNewTileset(
	widthTiles,
	heightTiles,
	new Array( widthTiles * tileSize * heightTiles * tileSize ).fill( 0 ),
);

export {
	compressPixels,
	createBlankTileset,
	createNewTileset,
	decompressPixels,
};
