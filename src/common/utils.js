const getDataTypeSize = type => parseInt( type.match( /^[a-zA-Z]+([0-9]+)$/ )[ 1 ] ) / 8;

const getMousePosition = e => {
	const canvas = e.target;
	const rect = canvas.getBoundingClientRect();
	return {
		x: e.clientX - rect.left,
		y: e.clientY - rect.top,
	};
};

export {
	getDataTypeSize,
	getMousePosition,
};
