const getDataTypeSize = type => parseInt( type.match( /^[a-zA-Z]+([0-9]+)$/ )[ 1 ] ) / 8;

export {
	getDataTypeSize,
};
