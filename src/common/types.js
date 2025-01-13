export default Object.freeze( [
	{
		name: `Ground`,
		create: ( x, y ) => ( {
			x: x,
			y: y,
			width: 1,
			height: 1,
		} ),
		render: ( tileRenderer, object ) => {
			// Render sidewalk top.
			for ( let x = object.xTiles(); x < object.rightTiles(); x += 2 ) {
				tileRenderer( {
					x,
					y: object.yTiles(),
					w: 2,
				} );
				tileRenderer( {
					srcx: 2,
					x,
					y: object.yTiles() + 1,
				} );
				tileRenderer( {
					srcx: 2,
					x: x + 1,
					y: object.yTiles() + 1,
				} );
			}

			// Render dirt center.
			for ( let y = object.yTiles() + 2; y < object.bottomTiles(); y++ ) {
				for ( let x = object.xTiles(); x < object.rightTiles(); x++ ) {
					tileRenderer( {
						srcx: 3,
						x,
						y,
					} );
				}
			}
		},
		exportData: [
			{ type: `Uint16`, data: `x` },
			{ type: `Uint16`, data: `y` },
			{ type: `Uint16`, data: `width` },
			{ type: `Uint8`, data: `height` },
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
		render: ( tileRenderer, object ) => {
			tileRenderer( {
				srcx: 13,
				x: object.xTiles(),
				y: object.yTiles(),
				w: 2,
			} );
			tileRenderer( {
				srcx: 15,
				x: object.xTiles(),
				y: object.yTiles() + 1,
				w: 2,
			} );
		},
		exportData: [
			{ type: `Uint16`, data: `x` },
			{ type: `Uint16`, data: `y` },
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
		render: ( tileRenderer, object, frame ) => {
			const animationOffset = 2 * ( frame % 6 );
			for ( let y = object.yTiles(); y < object.bottomTiles(); y += 2 ) {
				for ( let x = object.xTiles(); x < object.rightTiles(); x += 2 ) {
					tileRenderer( {
						srcx: 67 + animationOffset,
						x,
						y,
						w: 2,
					} );
					tileRenderer( {
						srcx: 79 + animationOffset,
						x,
						y: y + 1,
						w: 2,
					} );
				}
			}
		},
		exportData: [
			{ type: `Uint16`, data: `x` },
			{ type: `Uint16`, data: `y` },
			{ type: `Uint8`, data: `width` },
			{ type: `Uint8`, data: `height` },
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
		render: ( tileRenderer, object ) => {
			const ystart = object.yTiles();
			const xstart = object.xTiles();
			const yend = object.bottomTiles() - 1;
			const xend = object.rightTiles() - 1;

			// Render top-left corner.
			tileRenderer( {
				srcx: 22,
				x: xstart,
				y: ystart,
			} );

			// Render top-right corner.
			tileRenderer( {
				srcx: 23,
				x: xend,
				y: ystart,
			} );

			// Render bottom-left corner.
			tileRenderer( {
				srcx: 24,
				x: xstart,
				y: yend,
			} );

			// Render bottom-right corner.
			tileRenderer( {
				srcx: 25,
				x: xend,
				y: yend,
			} );

			// Render top & bottom tiles.
			for ( let x = xstart + 1; x < xend; x++ ) {
				tileRenderer( {
					srcx: 18,
					x: x,
					y: ystart,
				} );
				tileRenderer( {
					srcx: 19,
					x: x,
					y: yend,
				} );
			}

			// Render left & right tiles.
			for ( let y = ystart + 1; y < yend; y++ ) {
				tileRenderer( {
					srcx: 20,
					x: xstart,
					y: y,
				} );
				tileRenderer( {
					srcx: 21,
					x: xend,
					y: y,
				} );
			}

			// Render center tiles.
			for ( let y = ystart + 1; y < yend; y++ ) {
				for ( let x = xstart + 1; x < xend; x++ ) {
					tileRenderer( {
						srcx: 17,
						x: x,
						y: y,
					} );
				}
			}

			// Render door.
			for ( let i = 3; i >= 0; i-- ) {
				tileRenderer( {
					srcx: 47 - i * 2,
					x: xstart + object.door * 2,
					y: yend - i,
					w: 2,
				} );
			}
		},
		exportData: [
			{ type: `Uint16`, data: `x` },
			{ type: `Uint16`, data: `y` },
			{ type: `Uint8`, data: `width` },
			{ type: `Uint8`, data: `height` },
			{ type: `Uint8`, data: `door` },
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
					const door = object.door;
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
					max: object => object.width - 2,
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
		render: ( tileRenderer, object ) => {
			// Render top row.
			for ( let x = 0; x < object.width; x++ ) {
				tileRenderer( {
					srcx: x % 3 === 0 ? 4 : 6,
					x: object.xTiles() + x * 2,
					y: object.yTiles(),
					w: 2,
				} );
			}
			for ( let y = 1; y < object.heightTiles(); y++ ) {
				for ( let x = 0; x < object.width; x += 3 ) {
					// Render leftmost column.
					tileRenderer( {
						srcx: y === 1 ? 8 : ( y === 2 ? 11 : 12 ),
						x: object.xTiles() + x * 2,
						y: object.yTiles() + y,
					} );

					// Render center.
					tileRenderer( {
						srcx: 9,
						x: object.xTiles() + x * 2 + 1,
						y: object.yTiles() + y,
						w: 2,
					} );
					for ( let i = 3; i < 6; i++ ) {
						tileRenderer( {
							srcx: 10,
							x: object.xTiles() + x * 2 + i,
							y: object.yTiles() + y,
						} );
					}
				}
			}
		},
		exportData: [
			{ type: `Uint16`, data: `x` },
			{ type: `Uint16`, data: `y` },
			{ type: `Uint16`, data: `width` },
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
