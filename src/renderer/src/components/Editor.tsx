import '../assets/editor.scss';
import { ReactElement, useEffect, useState } from 'react';
import { getDataTypeSize } from '../../../common/bytes';
import { levelCount } from '../../../common/constants';
import { modeKeys } from '../../../common/modes';
import LevelMode from './LevelMode';
import SelectMode from './SelectMode';
import GraphicsMode from './GraphicsMode';
import PaletteMode from './PaletteMode';
import {
	createGraphicsEntry,
	createNewGraphics,
	decompressPixels,
	loadGraphicsFromData,
} from '../../../common/graphics';
import {
	createLayer,
	createLevel,
	createMap,
	encodeLevels,
	generateDataBytes,
	createObject,
	loadLevelFromData,
}	from '../../../common/levels';
import {
	ByteBlock,
	Color,
	Graphics,
	Layer,
	LayerType,
	Level,
	LvMap,
	MapObject,
	Palette,
	PaletteList,
} from '../../../common/types';
import { createGoal } from '../../../common/goals';
import {
	createBlankPaletteList,
	createColor,
	createPalette,
	createPaletteList,
	decodePaletteData,
} from '../../../common/palettes';

const generateExportData = ( levels: Level[], palettes: PaletteList, graphics: Graphics ): DataView => {
	let saveData: ByteBlock[] = palettes.encode();

	// Encode each graphics entry.
	for ( const entry in graphics ) {
		saveData = saveData.concat( graphics[ entry ].encode() );
	}

	// For each level, generate bytes for name, goal, and maps.
	saveData = saveData.concat( encodeLevels( levels ) );

	// Calculate total size o’ save data.
	const size = saveData.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );

	// Generate buffer to save data.
	const buffer = new ArrayBuffer( size );
	const view = new DataView( buffer );
	let i = 0;

	// Add all bytes to buffer.
	saveData.forEach( ( { type, value } ) => {
		view[ `set${ type }` ]( i, value );
		i += getDataTypeSize( type );
	} );
	return view;
};

const Editor = (): ReactElement => {
	const [ graphics, setGraphics ] = useState( null );
	const [ levels, setLevels ] = useState( null );
	const [ palettes, setPalettes ] = useState( null );
	const [ mode, setMode ] = useState( modeKeys.select );

	const onImport = ( _event, data: Uint8Array ) => {
		resetMode();

		const paletteData = decodePaletteData( data );
		setPalettes( paletteData.palettes );

		// Load graphics data.
		const graphicsData = loadGraphicsFromData( paletteData.remainingBytes );
		setGraphics( graphicsData.graphics );

		// Load level data.
		const levels: Level[] = [];
		let remainingBytes = graphicsData.remainingBytes;
		while ( remainingBytes.length > 0 ) {
			const levelData = loadLevelFromData( remainingBytes );
			levels.push( levelData.level );
			remainingBytes = levelData.remainingBytes;
		}

		// If there are fewer levels than expected,
		// add new levels to fill the gap.
		while ( levels.length < levelCount ) {
			levels.push( createLevel() );
		}
		setLevels( levels );
	};

	const onOpen = ( _event, data: object ) => {
		resetMode();

		// Import palettes if present.
		if ( `palettes` in data ) {
			// Validate data.
			if ( ! Array.isArray( data[ `palettes` ] ) ) {
				throw new Error( `Invalid palettes data` );
			}

			// Load palettes.
			const palettes: Palette[] = data[ `palettes` ].map( ( palette: unknown, i: number ): Palette => {
				if ( ! palette || typeof palette !== `object` ) {
					throw new Error( `Invalid palette data for palette #${ i }` );
				}
				if ( typeof palette[ `name` ] !== `string` ) {
					throw new Error( `Invalid palette name for palette #${ i }` );
				}
				if ( ! Array.isArray( palette[ `colors` ] ) ) {
					throw new Error( `Invalid palette colors for palette #${ i }` );
				}
				if ( palette[ `colors` ].length !== 8 ) {
					throw new Error( `Invalid palette color count for palette #${ i }` );
				}

				const colors: Color[] = palette[ `colors` ].map( ( color: unknown, j: number ): Color => {
					if ( ! color || typeof color !== `object` ) {
						throw new Error( `Invalid color data for color #${ j } o’ palette #${ i }` );
					}
					if ( typeof color[ `r` ] !== `number` ) {
						throw new Error( `Invalid color red for color #${ j } o’ palette #${ i }` );
					}
					if ( typeof color[ `g` ] !== `number` ) {
						throw new Error( `Invalid color green for color #${ j } o’ palette #${ i }` );
					}
					if ( typeof color[ `b` ] !== `number` ) {
						throw new Error( `Invalid color blue for color #${ j } o’ palette #${ i }` );
					}
					if ( typeof color[ `a` ] !== `number` ) {
						throw new Error( `Invalid color alpha for color #${ j } o’ palette #${ i }` );
					}
					return createColor( color[ `r` ], color[ `g` ], color[ `b` ], color[ `a` ] );
				} );

				return createPalette( palette[ `name` ], colors );
			} );

			setPalettes( createPaletteList( palettes ) );
		}

		// Import graphics if present.
		if ( `graphics` in data ) {
			// Validate data.
			if ( ! data[ `graphics` ] || typeof data[ `graphics` ] !== `object` ) {
				throw new Error( `Invalid graphics data` );
			}

			const graphics = createNewGraphics();

			[ `blocks`, `overworld`, `sprites` ].forEach( ( type: string ) => {
				if ( ! data[ `graphics` ] || typeof data[ `graphics` ] !== `object` ) {
					throw new Error( `Invalid graphics data` );
				}
				if ( ! ( type in data[ `graphics` ] ) || typeof data[ `graphics` ][ type ] !== `object` ) {
					throw new Error( `Invalid graphics ${ type } data` );
				}

				const dataItem = data[ `graphics` ][ type ];

				if ( ! dataItem[ `widthTiles` ] || typeof dataItem[ `widthTiles` ] !== `number` ) {
					throw new Error( `Invalid graphics width` );
				}
				if ( ! dataItem[ `heightTiles` ] || typeof dataItem[ `heightTiles` ] !== `number` ) {
					throw new Error( `Invalid graphics height` );
				}
				if ( ! dataItem[ `pixels` ] || typeof dataItem[ `pixels` ] !== `string` ) {
					dataItem[ `pixels` ].map( ( pixel: unknown ) => console.log( typeof pixel ) );
					throw new Error( `Invalid graphics pixels` );
				}

				// Convert base 64 string to byte array.
				const pixelList: number[] = [];
				for ( const letter of atob( dataItem[ `pixels` ] ) ) {
					pixelList.push( letter.charCodeAt( 0 ) );
				}

				graphics[ type ] = createGraphicsEntry(
					dataItem[ `widthTiles` ],
					dataItem[ `heightTiles` ],
					decompressPixels( pixelList ),
				);
			} );

			setGraphics( graphics );
		} else {
			// If no graphics is present, set to default.
			setGraphics( createNewGraphics() );
		}

		// Import levels.
		if ( `levels` in data ) {
			// Validate data.
			if ( ! Array.isArray( data[ `levels` ] ) ) {
				throw new Error( `Invalid levels data` );
			}
			if ( data[ `levels` ].length > levelCount ) {
				throw new Error( `Too many levels` );
			}

			// Load levels.
			setLevels( data[ `levels` ].map( ( level: unknown, i: number ): Level => {
				if ( ! level || typeof level !== `object` ) {
					throw new Error( `Invalid level data for level #${ i }` );
				}
				if ( typeof level[ `name` ] !== `string` ) {
					throw new Error( `Invalid level name for level #${ i }` );
				}
				if ( ! level[ `goal` ] || typeof level[ `goal` ] !== `object` ) {
					throw new Error( `Invalid level goal for level #${ i }` );
				}
				if ( typeof level[ `goal` ][ `id` ] !== `number` ) {
					throw new Error( `Invalid goal ID for level #${ i }` );
				}
				if ( ! level[ `goal` ][ `options` ] || typeof level[ `goal` ][ `options` ] !== `object` ) {
					throw new Error( `Invalid goal options for level #${ i }` );
				}
				if ( ! Array.isArray( level[ `maps` ] ) ) {
					throw new Error( `Invalid level maps for level #${ i }` );
				}

				const maps = level[ `maps` ].map( ( map: unknown, j: number ): ArrayBuffer => {
					if ( ! map || typeof map !== `object` ) {
						throw new Error( `Invalid map data for map #${ j } o’ level #${ i }` );
					}
					if ( typeof map[ `width` ] !== `number` ) {
						throw new Error( `Invalid map width for map #${ j } o’ level #${ i }` );
					}
					if ( typeof map[ `height` ] !== `number` ) {
						throw new Error( `Invalid map height for map #${ j } o’ level #${ i }` );
					}
					if ( typeof map[ `palette` ] !== `number` ) {
						throw new Error( `Invalid map palette for map #${ j } o’ level #${ i }` );
					}
					if ( ! Array.isArray( map[ `layers` ] ) ) {
						throw new Error( `Invalid map layers for map #${ j } o’ level #${ i }` );
					}

					const layers = map[ `layers` ].map( ( layer: unknown, k: number ): Layer => {
						if ( ! layer || typeof layer !== `object` ) {
							throw new Error( `Invalid layer data for layer #${ k } o’ map #${ j } o’ level #${ i }` );
						}
						if ( typeof layer[ `type` ] !== `string` ) {
							throw new Error( `Invalid layer type for layer #${ k } o’ map #${ j } o’ level #${ i }` );
						}
						if ( ! Array.isArray( layer[ `objects` ] ) ) {
							// eslint-disable-next-line max-len
							throw new Error( `Invalid layer objects for layer #${ k } o’ map #${ j } o’ level #${ i }` );
						}
						if ( typeof layer[ `scrollX` ] !== `number` ) {
							// eslint-disable-next-line max-len
							throw new Error( `Invalid layer scrollX for layer #${ k } o’ map #${ j } o’ level #${ i }` );
						}

						const objects = layer[ `objects` ].map( ( object: unknown, l: number ): MapObject => {
							if ( ! object || typeof object !== `object` ) {
								// eslint-disable-next-line max-len
								throw new Error( `Invalid object data for object #${ l } o’ layer #${ k } o’ map #${ j } o’ level #${ i }` );
							}
							if ( typeof object[ `type` ] !== `number` ) {
								// eslint-disable-next-line max-len
								throw new Error( `Invalid object type for object #${ l } o’ layer #${ k } o’ map #${ j } o’ level #${ i }` );
							}
							if ( typeof object[ `x` ] !== `number` ) {
								// eslint-disable-next-line max-len
								throw new Error( `Invalid object x for object #${ l } o’ layer #${ k } o’ map #${ j } o’ level #${ i }` );
							}
							if ( typeof object[ `y` ] !== `number` ) {
								// eslint-disable-next-line max-len
								throw new Error( `Invalid object y for object #${ l } o’ layer #${ k } o’ map #${ j } o’ level #${ i }` );
							}
							if ( `width` in object && typeof object[ `width` ] !== `number` ) {
								// eslint-disable-next-line max-len
								throw new Error( `Invalid object width for object #${ l } o’ layer #${ k } o’ map #${ j } o’ level #${ i }` );
							}
							if ( `height` in object && typeof object[ `height` ] !== `number` ) {
								// eslint-disable-next-line max-len
								throw new Error( `Invalid object height for object #${ l } o’ layer #${ k } o’ map #${ j } o’ level #${ i }` );
							}

							return createObject( {
								type: object[ `type` ],
								x: object[ `x` ],
								y: object[ `y` ],
								width: object[ `width` ],
								height: object[ `height` ],
								...object,
							} );
						} );

						return createLayer(
							layer[ `type` ] as LayerType,
							objects,
							layer[ `scrollX` ],
						);
					} );

					const mapBlock: LvMap = createMap(
						map[ `width` ],
						map[ `height` ],
						layers,
						map[ `palette` ],
					);

					return generateDataBytes( mapBlock );
				} );
				return createLevel(
					level[ `name` ],
					createGoal( level[ `goal` ][ `id` ], level[ `goal` ][ `options` ] ),
					maps,
				);
			} ) );
		} else {
			// If no levels are present, set to default.
			setLevels( Array.from( { length: levelCount } ).map( () => createLevel() ) );
		}
	};

	const resetMode = () => setMode( modeKeys.select );

	const onNew = () => {
		setLevels( Array.from( { length: levelCount } ).map( () => createLevel() ) );
		setGraphics( createNewGraphics() );
		setPalettes( createBlankPaletteList );
		resetMode();
	};

	const onClose = () => {
		setLevels( null );
		setGraphics( null );
		resetMode();
	};

	useEffect( () => {
		window.electronAPI.on( `new__editor`, onNew );
		window.electronAPI.on( `open__editor`, onOpen );
		window.electronAPI.on( `import__editor`, onImport );
		window.electronAPI.on( `close__editor`, onClose );

		return () => {
			window.electronAPI.remove( `new__editor` );
			window.electronAPI.remove( `open__editor` );
			window.electronAPI.remove( `import__editor` );
			window.electronAPI.remove( `close__editor` );
		};
	}, [] );

	useEffect( () => {
		const onSave = () => {
			if ( graphics === null || levels === null || palettes === null ) {
				return;
			}
			window.electronAPI.save( JSON.stringify( {
				graphics: {
					blocks: graphics.blocks.toJSON(),
					overworld: graphics.overworld.toJSON(),
					sprites: graphics.sprites.toJSON(),
				},
				palettes: palettes.map( ( palette: Palette ) => palette.toJSON() ),
				levels: levels.map( ( level: Level ) => level.toJSON() ),
			}, null, 4 ) );
		};
		const onExport = () => {
			if ( graphics === null || levels === null || palettes === null ) {
				return;
			}
			window.electronAPI.export( generateExportData( levels, palettes, graphics ) );
		};
		window.electronAPI.on( `save__editor`, onSave );
		window.electronAPI.on( `export__editor`, onExport );

		return () => {
			window.electronAPI.remove( `save__editor` );
			window.electronAPI.remove( `export__editor` );
		};
	}, [ graphics, levels, palettes ] ); // Update whene’er levels change so they always reflect latest data.

	return <div>
		{ graphics !== null && levels !== null && palettes !== null && <div>
			{ mode === modeKeys.select && <SelectMode setMode={ setMode } /> }
			{ mode === modeKeys.levelList && <LevelMode
				exitMode={ resetMode }
				graphics={ graphics }
				levels={ levels }
				palettes={ palettes }
				setLevels={ setLevels }
			/> }
			{ mode === modeKeys.graphics && <GraphicsMode
				exitMode={ resetMode }
				graphics={ graphics }
				palettes={ palettes }
				setGraphics={ setGraphics }
			/> }
			{ mode === modeKeys.palettes && <PaletteMode
				exitMode={ resetMode }
				palettes={ palettes }
				setPalettes={ setPalettes }
			/> }
		</div> }
	</div>;
};

export default Editor;
