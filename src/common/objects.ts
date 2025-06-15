import { tilesPerBlock } from "./constants";
import { GraphicTile, LayerType, MapObject, MapObjectType } from "./types";

const createTile = ( options: object ) => {
	return {
		animation: 1,
		srcHeight: 1,
		srcWidth: 1,
		srcx: 0,
		srcy: 0,
		x: 0,
		y: 0,
		flipx: false,
		flipy: false,
		...options,
	};
};

const objectTypes: readonly MapObjectType[] = Object.freeze( [
	{
		name: `Ground`,
		create: ( x, y ) => ( {
			x: x,
			y: y,
			width: 1,
			height: 1,
		} ),
		generateHighlight: ( object: MapObject ) => {
			return [
				{
					x: object.xBlocks(),
					y: object.yBlocks(),
					width: object.widthBlocks(),
					height: object.heightBlocks(),
				},
			];
		},
		generateTiles: ( object: MapObject ) => {
			const list: GraphicTile[] = [];

			// Generate tiles for sidewalk top.
			for ( let x = object.xTiles(); x < object.rightTiles(); x += tilesPerBlock ) {
				list.push( createTile( {
					x,
					y: object.yTiles(),
					srcWidth: tilesPerBlock,
				} ) );
				list.push( createTile( {
					x,
					y: object.yTiles() + 1,
					srcx: 2,
				} ) );
				list.push( createTile( {
					x: x + 1,
					y: object.yTiles() + 1,
					srcx: 2,
				} ) );
			}

			// Render dirt center.
			for ( let y = object.yTiles() + tilesPerBlock; y < object.bottomTiles(); y++ ) {
				for ( let x = object.xTiles(); x < object.rightTiles(); x++ ) {
					list.push( createTile( {
						x,
						y,
						srcx: 3,
					} ) );
				}
			}

			return list;
		},
		exportData: [
			{ type: `Uint16`, key: `x` },
			{ type: `Uint16`, key: `y` },
			{ type: `Uint16`, key: `width` },
			{ type: `Uint8`, key: `height` },
		],
		options: [
			{
				title: `X`,
				key: `x`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Y`,
				key: `y`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Width`,
				key: `width`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 1,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Height`,
				key: `height`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 1,
					max: Math.pow( 2, 8 ) - 1,
				},
			},
		],
	},
	{
		name: `Fire Hydrant`,
		create: ( x, y ) => ( {
			x: x,
			y: y,
		} ),
		generateHighlight: ( object: MapObject ) => {
			return [
				{
					x: object.xBlocks(),
					y: object.yBlocks(),
					width: 1,
					height: 1,
				},
			];
		},
		generateTiles: ( object: MapObject ) => {
			const tiles: GraphicTile[] = [];
			tiles.push( createTile( {
				srcx: 13,
				x: object.xTiles(),
				y: object.yTiles(),
				srcWidth: 2,
			} ) );
			tiles.push( createTile( {
				srcx: 15,
				x: object.xTiles(),
				y: object.yTiles() + 1,
				srcWidth: 2,
			} ) );
			return tiles;
		},
		exportData: [
			{ type: `Uint16`, key: `x` },
			{ type: `Uint16`, key: `y` },
		],
		options: [
			{
				title: `X`,
				key: `x`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Y`,
				key: `y`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
		],
	},
	{
		name: `Gem`,
		create: ( x, y ) => ( {
			x: x,
			y: y,
			width: 1,
			height: 1,
		} ),
		generateHighlight: ( object: MapObject ) => {
			return [
				{
					x: object.xBlocks(),
					y: object.yBlocks(),
					width: object.widthBlocks(),
					height: object.heightBlocks(),
				},
			];
		},
		generateTiles: ( object: MapObject ) => {
			const tiles: GraphicTile[] = [];

			for ( let y = object.yTiles(); y < object.bottomTiles(); y += tilesPerBlock ) {
				for ( let x = object.xTiles(); x < object.rightTiles(); x += tilesPerBlock ) {
					tiles.push( createTile( {
						animation: 6,
						srcx: 5,
						srcy: 1,
						x,
						y,
						srcWidth: tilesPerBlock,
					} ) );
					tiles.push( createTile( {
						animation: 6,
						srcx: 17,
						srcy: 1,
						x,
						y: y + 1,
						srcWidth: tilesPerBlock,
					} ) );
				}
			}

			return tiles;
		},
		exportData: [
			{ type: `Uint16`, key: `x` },
			{ type: `Uint16`, key: `y` },
			{ type: `Uint8`, key: `width` },
			{ type: `Uint8`, key: `height` },
		],
		options: [
			{
				title: `X`,
				key: `x`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Y`,
				key: `y`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Width`,
				key: `width`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 1,
					max: Math.pow( 2, 8 ) - 1,
				},
			},
			{
				title: `Height`,
				key: `height`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 1,
					max: Math.pow( 2, 8 ) - 1,
				},
			},
		],
	},
	{
		name: `Building`,
		create: ( x, y ) => ( {
			x: x,
			y: y,
			width: 6,
			height: 3,
			door: 2,
		} ),
		generateHighlight: ( object: MapObject ) => {
			return [
				{
					x: object.xBlocks(),
					y: object.yBlocks(),
					width: object.widthBlocks(),
					height: object.heightBlocks(),
				},
			];
		},
		generateTiles: ( object: MapObject ) => {
			const ystart = object.yTiles();
			const xstart = object.xTiles();
			const yend = object.bottomTiles() - 1;
			const xend = object.rightTiles() - 1;

			const tiles: GraphicTile[] = [];

			// Render top-left corner.
			tiles.push( createTile( {
				srcx: 22,
				x: xstart,
				y: ystart,
			} ) );

			// Render top-right corner.
			tiles.push( createTile( {
				srcx: 23,
				x: xend,
				y: ystart,
			} ) );

			// Render bottom-left corner.
			tiles.push( createTile( {
				srcx: 24,
				x: xstart,
				y: yend,
			} ) );

			// Render bottom-right corner.
			tiles.push( createTile( {
				srcx: 25,
				x: xend,
				y: yend,
			} ) );

			// Render top & bottom tiles.
			for ( let x = xstart + 1; x < xend; x++ ) {
				tiles.push( createTile( {
					srcx: 18,
					x: x,
					y: ystart,
				} ) );
				tiles.push( createTile( {
					srcx: 19,
					x: x,
					y: yend,
				} ) );
			}

			// Render left & right tiles.
			for ( let y = ystart + 1; y < yend; y++ ) {
				tiles.push( createTile( {
					srcx: 20,
					x: xstart,
					y: y,
				} ) );
				tiles.push( createTile( {
					srcx: 21,
					x: xend,
					y: y,
				} ) );
			}

			// Render center tiles.
			for ( let y = ystart + 1; y < yend; y++ ) {
				for ( let x = xstart + 1; x < xend; x++ ) {
					tiles.push( createTile( {
						srcx: 17,
						x: x,
						y: y,
					} ) );
				}
			}

			// Render door.
			for ( let i = 3; i >= 0; i-- ) {
				tiles.push( createTile( {
					srcx: 47 - i * 2,
					x: xstart + object.getProp( `door` ) * 2,
					y: yend - i,
					srcWidth: 2,
				} ) );
			}

			return tiles;
		},
		exportData: [
			{ type: `Uint16`, key: `x` },
			{ type: `Uint16`, key: `y` },
			{ type: `Uint8`, key: `width` },
			{ type: `Uint8`, key: `height` },
			{ type: `Uint8`, key: `door` },
		],
		options: [
			{
				title: `X`,
				key: `x`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Y`,
				key: `y`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Width`,
				key: `width`,
				type: `number`,
				update: v => parseInt( v ),
				extraUpdate: ( object, v ) => {
					const door = object.getProp( `door` );
					if ( door >= v - 1 ) {
						return { door: v - 2 };
					}
					return {};
				},
				atts: {
					min: 3,
					max: Math.pow( 2, 8 ) - 1,
				},
			},
			{
				title: `Height`,
				key: `height`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 3,
					max: Math.pow( 2, 8 ) - 1,
				},
			},
			{
				title: `Door`,
				key: `door`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 1,
					max: ( object: MapObject ) => object.widthBlocks() - 2,
				},
			},
		],
	},
	{
		name: `Fence`,
		create: ( x, y ) => ( {
			x: x,
			y: y,
			width: 4,
			height: 3,
		} ),
		generateHighlight: ( object: MapObject ) => {
			return [
				{
					x: object.xBlocks(),
					y: object.yBlocks(),
					width: object.widthBlocks(),
					height: object.heightBlocks(),
				},
			];
		},
		generateTiles: ( object: MapObject ) => {
			const tiles: GraphicTile[] = [];

			// Render top row.
			for ( let x = 0; x < object.widthBlocks(); x++ ) {
				tiles.push( createTile( {
					srcx: x % 3 === 0 ? 4 : 6,
					x: object.xTiles() + x * 2,
					y: object.yTiles(),
					srcWidth: tilesPerBlock,
				} ) );
			}
			for ( let y = 1; y < object.heightTiles(); y++ ) {
				for ( let x = 0; x < object.widthBlocks(); x += 3 ) {
					// Render leftmost column.
					tiles.push( createTile( {
						srcx: y === 1 ? 8 : ( y === 2 ? 11 : 12 ),
						x: object.xTiles() + x * 2,
						y: object.yTiles() + y,
					} ) );

					// Render center.
					tiles.push( createTile( {
						srcx: 9,
						x: object.xTiles() + x * 2 + 1,
						y: object.yTiles() + y,
						srcWidth: 2,
					} ) );
					for ( let i = 3; i < 6; i++ ) {
						tiles.push( createTile( {
							srcx: 10,
							x: object.xTiles() + x * 2 + i,
							y: object.yTiles() + y,
						} ) );
					}
				}
			}

			return tiles;
		},
		exportData: [
			{ type: `Uint16`, key: `x` },
			{ type: `Uint16`, key: `y` },
			{ type: `Uint16`, key: `width` },
		],
		options: [
			{
				title: `X`,
				key: `x`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Y`,
				key: `y`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Width`,
				key: `width`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 4,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
		],
	},
] );

const spriteTypes: readonly MapObjectType[] = Object.freeze( [
	{
		name: `Player`,
		create: ( x, y ) => ( {
			x: x,
			y: y,
			width: 1,
			height: 2,
		} ),
		generateHighlight: ( object: MapObject ) => {
			return [
				{
					x: object.xBlocks(),
					y: object.yBlocks(),
					width: object.widthBlocks(),
					height: object.heightBlocks(),
				},
			];
		},
		generateTiles: ( object: MapObject ) => [
			createTile( {
				x: object.xTiles(),
				y: object.yTiles(),
				srcWidth: tilesPerBlock,
				srcHeight: tilesPerBlock * 2,
				flipx: true,
			} ),
		],
		exportData: [
			{ type: `Uint16`, key: `x` },
			{ type: `Uint16`, key: `y` },
		],
		options: [
			{
				title: `X`,
				key: `x`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Y`,
				key: `y`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
		],
	},
	{
		name: `Bad Apple`,
		create: ( x, y ) => ( {
			x: x,
			y: y,
			width: 1,
			height: 1,
			direction: 0,
		} ),
		generateHighlight: ( object: MapObject ) => {
			return [
				{
					x: object.xBlocks(),
					y: object.yBlocks(),
					width: object.widthBlocks(),
					height: object.heightBlocks(),
				},
			];
		},
		generateTiles: ( object: MapObject ) => [
			createTile( {
				x: object.xTiles(),
				y: object.yTiles(),
				srcWidth: tilesPerBlock,
				srcHeight: tilesPerBlock,
				srcy: 4,
				flipx: object.getProp( `direction` ) === 1,
			} ),
		],
		exportData: [
			{ type: `Uint16`, key: `x` },
			{ type: `Uint16`, key: `y` },
			{ type: `Uint8`, key: `direction` },
		],
		options: [
			{
				title: `X`,
				key: `x`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Y`,
				key: `y`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: Math.pow( 2, 16 ) - 1,
				},
			},
			{
				title: `Direction`,
				key: `direction`,
				type: `number`,
				update: v => parseInt( v ),
				atts: {
					min: 0,
					max: 1,
				},
			},
		],
	},
] );

const getTypeFactory = ( type: LayerType ): readonly MapObjectType[] => (
	type === LayerType.sprite ? spriteTypes : objectTypes );

export { getTypeFactory };
