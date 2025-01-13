const { encode, decode, testCharacters } = require( `../src/common/text` );

test( `Text encodes to expected bits.`, () => {
	expect( encode( `1st We Take Manhattan…` ) )
		.toEqual( new Uint8Array( [
			0x33,
			0x58,
			0xB8,
			0x7D,
			0x87,
			0xED,
			0xF7,
			0xA7,
			0x2D,
			0xBC,
			0x43,
			0x96,
			0x35,
			0x40,
		] ) );
} );

test( `Bits decode to expected text.`, () => {
	const bytes = new Uint8Array( [
		0x33,
		0x58,
		0xB8,
		0x7D,
		0x87,
		0xED,
		0xF7,
		0xA7,
		0x2D,
		0xBC,
		0x43,
		0x96,
		0x35,
		0x40,
		0x22,
		0x84,
		0xF3,
		0xA2,
	] );
	const decoded = decode( bytes );
	expect( decoded )
		.toEqual( {
			text: `1st We Take Manhattan…`.toUpperCase(),
			bytesUsed: 14,
			remainingBytes: new Uint8Array( [ 0x22, 0x84, 0xF3, 0xA2 ] ),
		} );
} );

test( `Only accepts valid characters`, () => {
	expect( testCharacters( `1st We Take Manhattan…` ) ).toBe( true );
	expect( testCharacters( `1st We Take Manhattan… べ` ) ).toBe( false );
} );
