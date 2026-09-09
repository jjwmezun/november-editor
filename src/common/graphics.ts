import { DecodedGraphicsData, Graphics, GraphicsEntry, GraphicsType, GraphicsTypeInfo } from "./types";
import { tileSize } from "./constants";
import { combineUint8ArrayIntoUint32, getBitsFromByte } from "./bytes";

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

const getGraphicsTypeInfo = ( type: GraphicsType ): GraphicsTypeInfo => {
	switch ( type ) {
		case GraphicsType.atticBlocks:
			return {
				name: `Attic Blocks`,
				widthTiles: 64,
				heightTiles: 32,
			};
		case GraphicsType.charset:
			return {
				name: `Charset`,
				widthTiles: 64,
				heightTiles: 72,
			};
		case GraphicsType.overworld:
			return {
				name: `Overworld`,
				widthTiles: 128,
				heightTiles: 128,
			};
		case GraphicsType.sprites:
			return {
				name: `Sprites`,
				widthTiles: 64,
				heightTiles: 96,
			};
		case GraphicsType.universalBlocks:
			return {
				name: `Universal Blocks`,
				widthTiles: 64,
				heightTiles: 8,
			};
		case GraphicsType.urbanBlocks:
			return {
				name: `Urban Blocks`,
				widthTiles: 64,
				heightTiles: 32,
			};
		default:
			throw new Error( `Invalid graphics type` );
	}
};

const compressPixels = async ( pixels: number[], name: string ): Promise<number[]> => {
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

	return new Promise( resolve => {
		window.electronAPI.on( `compression-response`, ( _event, data, _name ) => {
			if ( _name === name ) {
				resolve( data );
			}
		} );
		window.electronAPI.compress( Buffer.from( compressedPixels ), name );
	} );
};

const decompressPixels = async ( pixels: number[], name: string ): Promise<number[]> => {
	return new Promise( resolve => {
		window.electronAPI.on( `decompression-response`, ( _event, pixels, _name ) => {
			if ( _name !== name ) {
				return;
			}
			const out: number[] = [];
			let bits: number[] = [];
			pixels.forEach( ( byte: number ) => {
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

			resolve( out );
		} );
		window.electronAPI.decompress( Buffer.from( pixels ), name );
	} );
};

const createGraphicsEntry = (
	type: GraphicsType,
	pixels: number[],
): GraphicsEntry => {
	const widthTiles = getGraphicsTypeInfo( type as GraphicsType ).widthTiles;
	const heightTiles = getGraphicsTypeInfo( type as GraphicsType ).heightTiles;
	const getWidthPixels = () => widthTiles * tileSize;
	const getHeightPixels = () => heightTiles * tileSize;

	return {
		clearAllTiles: () => {
			pixels.fill( 0 );
			return createGraphicsEntry( type, pixels );
		},
		clearTile: tileIndex => {
			const tileX = tileIndex % widthTiles;
			const tileY = Math.floor( tileIndex / widthTiles );
			const x = tileX * tileSize;
			const y = tileY * tileSize;
			for ( let pixelY = y; pixelY < y + tileSize; pixelY++ ) {
				const start = pixelY * getWidthPixels() + x;
				pixels.fill( 0, start, start + tileSize );
			}
			return createGraphicsEntry( type, pixels );
		},
		createTexture: ( ctx: WebGLRenderingContext, index: number ): WebGLTexture => {
			const texture = ctx.createTexture();

			// @ts-expect-error – We know that WebGLRenderingContext has `TEXTURE#` properties for each index.
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
		getData: () => ( {
			pixels,
			width: getWidthPixels(),
			height: getHeightPixels(),
		} ),
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
			return createGraphicsEntry( type, pixels );
		},
		toJSON: async () => {
			// Compress pixels & convert to base64 string.
			const pixelList = await compressPixels( pixels, type );
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
		updatePixels: newPixels => createGraphicsEntry( type, newPixels ),
		updatePixel: ( color, x, y ) => {
			const index = y * getWidthPixels() + x;
			pixels[ index ] = color;
			return createGraphicsEntry( type, pixels );
		},
	};
};

const createBlankGraphicsEntry = (
	type: GraphicsType,
): GraphicsEntry => createGraphicsEntry(
	type,
	new Array(
		getGraphicsTypeInfo( type ).widthTiles * tileSize * getGraphicsTypeInfo( type ).heightTiles * tileSize,
	).fill( 0 ),
);

const createNewGraphics = (): Graphics => {
	const graphics: Graphics = {};
	for ( const type of Object.values( GraphicsType ) ) {
		graphics[ type ] = createBlankGraphicsEntry( type );
	}
	return graphics;
};

const loadGraphicsFromData = async ( data: Uint8Array ): Promise<DecodedGraphicsData> => {
	const graphics: Graphics = createNewGraphics();

	// Gather list o’ data sizes.
	const sizes = [
		GraphicsType.charset,
		GraphicsType.universalBlocks,
		GraphicsType.urbanBlocks,
		GraphicsType.atticBlocks,
		GraphicsType.sprites,
		GraphicsType.overworld,
	].map( ( type: GraphicsType ) => {
		const dataSize = combineUint8ArrayIntoUint32( Array.from( data.slice( 0, 4 ) ) );
		const prevData = [ ...data ];
		data = data.slice( dataSize + 4 );
		return {
			dataSize,
			data: prevData,
			type,
		};
	} );

	// For each data size, decompress graphics & add to graphics.
	return Promise.all( sizes.map( async ( { data, dataSize, type } ) => {
		let entry = createBlankGraphicsEntry( type );
		return new Promise<void>( resolve => {
			decompressPixels( Array.from( data ).slice( 4, dataSize + 4 ), type ).then( ( pixels: number[] ) => {
				entry = entry.updatePixels( pixels );
				graphics[ type ] = entry;
				resolve();
			} );
		} );
	} ) ).then( () => {
		return {
			graphics,
			remainingBytes: data,
		};
	} );
};

export {
	compressPixels,
	createBlankGraphicsEntry,
	createGraphicsEntry,
	createNewGraphics,
	decompressPixels,
	getGraphicsTypeInfo,
	loadGraphicsFromData,
};
