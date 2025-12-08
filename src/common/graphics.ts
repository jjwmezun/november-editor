import { gzip, ungzip } from "node-gzip";

import { Graphics, GraphicsEntry } from "./types";
import { tileSize } from "./constants";
import { getBitsFromByte } from "./bytes";

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

const compressPixels = async ( pixels: number[] ): Promise<number[]> => {
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

	return await gzip( Buffer.from( compressedPixels ) );
};

const decompressPixels = async ( pixels: number[] ): Promise<number[]> => {
	pixels = await ungzip( Buffer.from( pixels ) ).then( buf => Array.from( buf ) );
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

const createGraphicsEntry = (
	widthTiles: number,
	heightTiles: number,
	pixels: number[],
): GraphicsEntry => {
	const getWidthPixels = () => widthTiles * tileSize;
	const getHeightPixels = () => heightTiles * tileSize;

	return {
		clearTile: tileIndex => {
			const tileX = tileIndex % widthTiles;
			const tileY = Math.floor( tileIndex / widthTiles );
			const x = tileX * tileSize;
			const y = tileY * tileSize;
			for ( let pixelY = y; pixelY < y + tileSize; pixelY++ ) {
				const start = pixelY * getWidthPixels() + x;
				pixels.fill( 0, start, start + tileSize );
			}
			return createGraphicsEntry( widthTiles, heightTiles, pixels );
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
					}
				}
			}
			return createGraphicsEntry( widthTiles, heightTiles, pixels );
		},
		toJSON: async () => {
			// Compress pixels & convert to base64 string.
			const pixelList = await compressPixels( pixels );
			let pixelString = ``;
			for ( let i = 0; i < pixelList.length; i++ ) {
				pixelString += String.fromCharCode( pixelList[ i ] );
			}
			const pixelData = btoa( pixelString );

			return {
				widthTiles,
				heightTiles,
				pixels: pixelData,
			};
		},
		updatePixels: newPixels => createGraphicsEntry( widthTiles, heightTiles, newPixels ),
		updatePixel: ( color, x, y ) => {
			const index = y * getWidthPixels() + x;
			pixels[ index ] = color;
			return createGraphicsEntry( widthTiles, heightTiles, pixels );
		},
	};
};

const createBlankGraphicsEntry = ( widthTiles: number, heightTiles: number ): GraphicsEntry => createGraphicsEntry(
	widthTiles,
	heightTiles,
	new Array( widthTiles * tileSize * heightTiles * tileSize ).fill( 0 ),
);

const createNewGraphics = (): Graphics => ( {
	blocks: createBlankGraphicsEntry( 64, 64 ),
	sprites: createBlankGraphicsEntry( 64, 64 ),
} );

export {
	compressPixels,
	createBlankGraphicsEntry,
	createGraphicsEntry,
	createNewGraphics,
	decompressPixels,
};
