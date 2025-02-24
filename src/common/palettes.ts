import { encodeText, decodeText } from './text';
import { ByteBlock, Color, Palette, PaletteData, PaletteList } from './types';
import { getBitsFromByte } from './bytes';

// Round true color value to nearest high color value.
const roundToHighColor = ( c: number ): number => Math.min( Math.round( c / 8 ) * 8, 255 );

const convertHexColorToObject = ( hexColor: string ): Color => {
	const hex = hexColor.replace( /^#/, `` );
	const r = roundToHighColor( parseInt( hex.substring( 0, 2 ), 16 ) );
	const g = roundToHighColor( parseInt( hex.substring( 2, 4 ), 16 ) );
	const b = roundToHighColor( parseInt( hex.substring( 4, 6 ), 16 ) );
	return createColor( r, g, b, 1 );
};

const encodeColorChannel = ( c: number ): number[] => [
	...Math.floor( c / 8 ).toString( 2 ).padStart( 5, `0` ),
].map( bit => parseInt( bit ) );

// Convert list o’ 5 bits into color value.
const decodeColorChannel = ( bits: number[] ): number => {
	const color = parseInt( bits.join( `` ), 2 );
	if ( color < 0 || color > 31 ) {
		throw new Error( `Invalid color: ${ color }` );
	}

	// Stretch color value from 5-bit 0 - 31 interval to reach full 255 interval.
	return color * 8;
};

const createColor = ( r: number, g: number, b: number, a: number ): Color => Object.freeze( {
	encode: (): ByteBlock => {
		// Generate list o’ 16 bits that represents high color value.
		const bits: number[] = encodeColorChannel( r )
			.concat( encodeColorChannel( g ) )
			.concat( encodeColorChannel( b ) )
			.concat( [ 1 ] );

		// Convert list o’ 16 bits into single Uint16 #.
		const value = parseInt( bits.join( `` ), 2 );
		return {
			type: `Uint16`,
			value,
		};
	},
	hex: (): string => {
		const hexR = r.toString( 16 ).padStart( 2, `0` );
		const hexG = g.toString( 16 ).padStart( 2, `0` );
		const hexB = b.toString( 16 ).padStart( 2, `0` );
		return `#${ hexR }${ hexG }${ hexB }`;
	},
	rgba: (): string => `rgba( ${ r }, ${ g }, ${ b }, ${ a } )`,
	toJSON: (): object => Object.freeze( {
		r,
		g,
		b,
		a,
	} ),
} );

const createPalette = ( name: string, colors: readonly Color[] ): Palette => {
	return Object.freeze( {
		getName: () => name,
		encode: (): ByteBlock[] => encodeText( name )
			.concat( colors.slice( 1 ).map( color => color.encode() ) ),
		mapColors: <Type>( action: ( color: Color, index: number ) => Type, ignoreFirst: boolean = false ): Type[] => {
			return ignoreFirst
				? colors.slice( 1 ).map( action )
				: colors.map( action );
		},
		nthColor: ( index: number ): Color => colors[ index ],
		toJSON: (): object => Object.freeze( {
			name,
			colors: colors.map( color => color.toJSON() ),
		} ),
		updateName: ( newName: string ): Palette => createPalette( newName, colors ),
		updateColor: ( index: number, newColor: Color ):Palette => {
			const newColors = [ ...colors ];
			newColors[ index ] = newColor;
			return createPalette( name, newColors );
		},
	} );
};

const createBlankPalette = (): Palette => createPalette(
	`GRAYSCALE`,
	Object.freeze( [
		createColor( 0, 0, 0, 0 ),
		createColor( 0, 0, 0, 1 ),
		createColor( 43, 43, 43, 1 ),
		createColor( 85, 85, 85, 1 ),
		createColor( 128, 128, 128, 1 ),
		createColor( 170, 170, 170, 1 ),
		createColor( 213, 213, 213, 1 ),
		createColor( 255, 255, 255, 1 ),
	] ),
);

const createPaletteList = ( list: readonly Palette[] ): PaletteList => {
	return Object.freeze( {
		addBlankPalette: (): PaletteList => createPaletteList( [ ...list, createBlankPalette() ] ),
		encode: (): ByteBlock[] => [
			{
				type: `Uint8`,
				value: list.length,
			},
		].concat( list.map( palette => palette.encode() ).flat( 1 ) ),
		getLength: (): number => list.length,
		map: <Type>( action: ( palette: Palette, index: number ) => Type ): Type[] => list.map( action ),
		nth: ( index: number ): Palette => list[ index ],
		removePalette: ( index: number ): PaletteList => {
			const newList = [ ...list ];
			newList.splice( index, 1 );
			return createPaletteList( newList );
		},
		updatePalette: ( index: number, newPalette: Palette ): PaletteList => {
			const newList = [ ...list ];
			newList[ index ] = newPalette;
			return createPaletteList( newList );
		},
	} );
};

const createBlankPaletteList = (): PaletteList => createPaletteList( [ createBlankPalette() ] );

const decodePaletteData = ( data: Uint8Array ): PaletteData => {
	const numOfPalettes = data[ 0 ];
	data = data.slice( 1 );

	const palettes: Palette[] = Array.from( { length: numOfPalettes } ).map( (): Palette => {
		// Pull name from data.
		const nameData = decodeText( data );
		const name = nameData.text;

		// Move data forward past name bytes.
		data = nameData.remainingBytes;

		// 1st color is always transparent;
		// following 7 colors come from the next 2 pairs o’ bytes.
		const colors: Color[] = [ createColor( 0, 0, 0, 0 ) ].concat( Array.from( { length: 7 } ).map( (): Color => {
			// Color is pair o’ bytes.
			const color: Uint8Array = data.slice( 0, 2 );

			// Convert pair o’ bytes into list o’ 16 bits.
			const bits: number[] = getBitsFromByte( color[ 0 ] )
				.concat( getBitsFromByte( color[ 1 ] ) );

			// As per high color, 5 bits each for red, green, & blue, 1 bit for alpha.
			const red = decodeColorChannel( bits.slice( 0, 5 ) );
			const green = decodeColorChannel( bits.slice( 5, 10 ) );
			const blue = decodeColorChannel( bits.slice( 10, 15 ) );
			const alpha = bits[ 15 ];

			// Move on to next pair o’ bytes.
			data = data.slice( 2 );
			return createColor( red, green, blue, alpha );
		} ) );

		return createPalette( name, colors );
	} );

	return {
		palettes: createPaletteList( palettes ),
		remainingBytes: data,
	};
};

export {
	convertHexColorToObject,
	createBlankPaletteList,
	createColor,
	createPalette,
	createPaletteList,
	decodePaletteData,
};
