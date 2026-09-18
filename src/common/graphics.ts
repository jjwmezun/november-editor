import {
	Graphics,
	GraphicsEntry,
	GraphicsGeneral,
	GraphicsTilesets,
	GraphicsType,
	GraphicsTypeInfo,
} from "./types";
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

const getGraphicsTypeName = ( type: GraphicsType ): string => {
	switch ( type ) {
		case GraphicsType.general:
			return `General`;
		case GraphicsType.backgrounds:
			return `Backgrounds`;
		case GraphicsType.tilesets:
			return `Tilesets`;
		default:
			throw new Error( `Invalid graphics type` );
	}
};

const getGraphicsEntryInfo = ( type: GraphicsType, i: number ): GraphicsTypeInfo => {
	switch ( type ) {
		case GraphicsType.general:
			switch ( i ) {
				case ( GraphicsGeneral.charset ):
					return {
						name: `Charset`,
						widthTiles: 64,
						heightTiles: 72,
					};
				case ( GraphicsGeneral.overworld ):
					return {
						name: `Overworld`,
						widthTiles: 128,
						heightTiles: 128,
					};
				default:
					throw new Error( `Invalid general graphics type` );
			}
		case GraphicsType.backgrounds:
			return {
				name: `Unnamed Background`,
				widthTiles: 64,
				heightTiles: 48,
			};
		case GraphicsType.tilesets:
			switch ( i ) {
				case ( GraphicsTilesets.atticBlocks ):
					return {
						name: `Attic Blocks`,
						widthTiles: 64,
						heightTiles: 32,
					};
				case ( GraphicsTilesets.sprites ):
					return {
						name: `Sprites`,
						widthTiles: 64,
						heightTiles: 96,
					};
				case ( GraphicsTilesets.urbanBlocks ):
					return {
						name: `Urban Blocks`,
						widthTiles: 64,
						heightTiles: 32,
					};
				case ( GraphicsTilesets.universalBlocks ):
					return {
						name: `Universal Blocks`,
						widthTiles: 64,
						heightTiles: 8,
					};
				default:
					throw new Error( `Invalid tileset graphics type` );
			}
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

const convertAllGraphicsToJSON = ( graphics: Graphics ): Promise<object> => {
	return new Promise( resolve => Promise.all( graphics.general.map( entry => entry.toJSON() ) )
		.then( general => {
			Promise.all( graphics.tilesets.map( entry => entry.toJSON() ) ).then( tilesets => {
				Promise.all( graphics.backgrounds.map( entry => entry.toJSON() ) ).then( backgrounds => {
					resolve( {
						general,
						tilesets,
						backgrounds,
					} );
				} );
			} );
		} ) );
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
	slug: string,
	title: string,
	width: number,
	height: number,
	pixels: number[],
): GraphicsEntry => {
	const widthTiles = width;
	const heightTiles = height;
	const getWidthPixels = () => widthTiles * tileSize;
	const getHeightPixels = () => heightTiles * tileSize;

	return {
		clearAllTiles: () => {
			pixels.fill( 0 );
			return createGraphicsEntry( slug, title, width, height, pixels );
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
			return createGraphicsEntry( slug, title, width, height, pixels );
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
			return createGraphicsEntry( slug, title, width, height, pixels );
		},
		slug: () => slug,
		title: () => title,
		toJSON: async () => {
			// Compress pixels & convert to base64 string.
			const pixelList = await compressPixels( pixels, title );
			let pixelString = ``;
			for ( let i = 0; i < pixelList.length; i++ ) {
				pixelString += String.fromCharCode( pixelList[ i ] );
			}
			const pixelData = btoa( pixelString );

			return {
				widthTiles,
				heightTiles,
				pixels: pixelData,
				slug: slug,
				title: title,
			};
		},
		updatePixels: newPixels => createGraphicsEntry( slug, title, width, height, newPixels ),
		updatePixel: ( color, x, y ) => {
			const index = y * getWidthPixels() + x;
			pixels[ index ] = color;
			return createGraphicsEntry( slug, title, width, height, pixels );
		},
		updateTitle: newTitle => createGraphicsEntry( slug, newTitle, width, height, pixels ),
	};
};

const createBlankGraphicsEntry = (
	slug: string,
	type: GraphicsType,
	i: number,
): GraphicsEntry => {
	const info = getGraphicsEntryInfo( type, i );
	return createGraphicsEntry(
		slug,
		info.name,
		info.widthTiles,
		info.heightTiles,
		new Array(
			info.widthTiles * tileSize * info.heightTiles * tileSize,
		).fill( 0 ),
	);
};

const createNewGraphics = (): Graphics => {
	return {
		general: [
			createBlankGraphicsEntry( `general`, GraphicsType.general, GraphicsGeneral.charset ),
			createBlankGraphicsEntry( `overworld`, GraphicsType.general, GraphicsGeneral.overworld ),
		],
		tilesets: [
			createBlankGraphicsEntry(
				`atticBlocks`,
				GraphicsType.tilesets,
				GraphicsTilesets.atticBlocks,
			),
			createBlankGraphicsEntry(
				`sprites`,
				GraphicsType.tilesets,
				GraphicsTilesets.sprites,
			),
			createBlankGraphicsEntry(
				`universalBlocks`,
				GraphicsType.tilesets,
				GraphicsTilesets.universalBlocks,
			),
			createBlankGraphicsEntry(
				`urbanBlocks`,
				GraphicsType.tilesets,
				GraphicsTilesets.urbanBlocks,
			),
		],
		backgrounds: [
			createBlankGraphicsEntry(
				`unnamedBackground`,
				GraphicsType.backgrounds,
				0,
			),
		],
	};
};

const loadGraphicsFromData = async (
	slug: string,
	title: string,
	width: number,
	height: number,
	data: Uint8Array,
): Promise<GraphicsEntry> => new Promise<GraphicsEntry>( ( resolve: ( value: GraphicsEntry ) => void ) => {
	const dataSize = combineUint8ArrayIntoUint32( Array.from( data.slice( 0, 4 ) ) );
	decompressPixels( Array.from( data ).slice( 4, dataSize + 4 ), title ).then( ( pixels: number[] ) => {
		resolve( createGraphicsEntry( slug, title, width, height, pixels ) );
	} );
} );

export {
	compressPixels,
	convertAllGraphicsToJSON,
	createBlankGraphicsEntry,
	createGraphicsEntry,
	createNewGraphics,
	decompressPixels,
	getGraphicsEntryInfo,
	getGraphicsTypeName,
	loadGraphicsFromData,
};
