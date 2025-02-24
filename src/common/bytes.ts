const getBitsFromByte = ( n: number ): number[] => {
	const bits: number[] = [];
	for ( let i = 7; i >= 0; i-- ) {
		bits.push( getBitFromNumber( n, i ) );
	}
	return bits;
};

const getBitFromNumber = ( n: number, bit: number ): number => ( n & ( 1 << bit ) ) >> bit;

const getDataTypeSize = ( type: string ): number => {
	const m = type.match( /^[a-zA-Z]+([0-9]+)$/ );
	if ( !Array.isArray( m ) || m.length < 2 ) {
		throw new Error( `Invalid data type: ${ type }` );
	}
	return parseInt( m[ 1 ] ) / 8;
};

export {
	getBitsFromByte,
	getBitFromNumber,
	getDataTypeSize,
};
