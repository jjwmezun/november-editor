const getDataTypeSize = ( type: string ): number => {
	const m = type.match( /^[a-zA-Z]+([0-9]+)$/ );
	if ( !Array.isArray( m ) || m.length < 2 ) {
		throw new Error( `Invalid data type: ${ type }` );
	}
	return parseInt( m[ 1 ] ) / 8;
};

export {
	getDataTypeSize,
};
