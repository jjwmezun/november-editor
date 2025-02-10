import propTypes from "prop-types";

const tileSize = 8;

const createTileset = ( widthTiles, heightTiles, pixels ) => {
	const getWidthPixels = () => widthTiles * tileSize;
	return {
		getWidthTiles: () => widthTiles,
		getHeightTiles: () => heightTiles,
		getWidthPixels,
		getHeightPixels: () => heightTiles * tileSize,
		getPixels: () => pixels,
		updatePixels: newPixels => createTileset( widthTiles, heightTiles, newPixels ),
		updatePixel: ( color, x, y ) => {
			const index = y * getWidthPixels() + x;
			const newPixels = [ ...pixels ];
			newPixels[ index ] = color;
			return createTileset( widthTiles, heightTiles, newPixels );
		},
	};
};

const createBlankTileset = ( widthTiles, heightTiles ) => createTileset(
	widthTiles,
	heightTiles,
	new Array( widthTiles * tileSize * heightTiles * tileSize ).fill( 0 ),
);

const tilesetProp = propTypes.shape( {
	getWidthTiles: propTypes.func.isRequired,
	getHeightTiles: propTypes.func.isRequired,
	getWidthPixels: propTypes.func.isRequired,
	getHeightPixels: propTypes.func.isRequired,
	getPixels: propTypes.func.isRequired,
	updatePixels: propTypes.func.isRequired,
	updatePixel: propTypes.func.isRequired,
} );

export {
	createBlankTileset,
	tilesetProp,
	tileSize,
};
