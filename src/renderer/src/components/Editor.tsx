// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { ReactElement, SyntheticEvent, useEffect, useState } from 'react';

// @ts-expect-error – CSS import, doesn’t follow normal JS rules, obviously.
import '../assets/editor.scss';

import { getDataTypeSize, getTotalBytes } from '../../../common/bytes';
import { levelCount } from '../../../common/constants';
import { modeKeys } from '../../../common/modes';
import LevelMode from './LevelMode';
import SelectMode from './SelectMode';
import GraphicsMode from './GraphicsMode';
import PaletteMode from './PaletteMode';
import OverworldMode from './OverworldMode';
import {
	compressPixels,
	createBlankGraphicsEntry,
	createGraphicsEntry,
	createNewGraphics,
	decompressPixels,
	loadGraphicsFromData,
} from '../../../common/graphics';
import {
	createLayer,
	createLevel,
	createMap,
	decodeLevelData,
	decodeLevelHeaders,
	encodeLevelData,
	encodeLevelHeader,
	generateDataBytes,
}	from '../../../common/levels';
import { createObject }	from '../../../common/objects';
import {
	ByteBlock,
	Color,
	DataType,
	GoalAtts,
	Graphics,
	GraphicsType,
	Layer,
	LayerType,
	Level,
	LevelData,
	LevelHeader,
	LvMap,
	MapObject,
	Overworld,
	OverworldEvent,
	OverworldMap,
	Palette,
	PaletteList,
	PaletteSystem,
} from '../../../common/types';
import { createGoal } from '../../../common/goals';
import {
	createBlankPaletteSystem,
	createColor,
	createPalette,
	createPaletteList,
	decodePaletteData,
} from '../../../common/palettes';
import { createBlankOverworld, createOverworldFromJSON, loadOverworldFromData } from '../../../common/ow';

const generateExportData = async (
	levels: Level[],
	palettes: PaletteSystem,
	graphics: Graphics,
	overworld: Overworld,
): Promise<DataView> => {
	const tableOfContents : ByteBlock[] = [];

	// Init main palette pointer.
	tableOfContents.push( { type: DataType.Uint32, value: 0 } );

	// Encode main palette data.
	let saveData: ByteBlock[] = palettes.main.encode();

	// Calculate o’erworld palette pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode o’erworld palette data.
	saveData = saveData.concat( palettes.overworld.encode() );

	// Calculate block graphics pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode graphics data.
	const blockGFX = Array.from( await compressPixels( graphics.blocks.getPixels(), `blocks` ) );
	saveData.push( { type: DataType.Uint32, value: blockGFX.length } );
	saveData = saveData.concat(
		blockGFX.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
	);

	// Calculate sprite graphics pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode sprite graphics data.
	const spriteGFX = Array.from( await compressPixels( graphics.sprites.getPixels(), `sprites` ) );
	saveData.push( { type: DataType.Uint32, value: spriteGFX.length } );
	saveData = saveData.concat(
		spriteGFX.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
	);

	// Calculate o’erworld graphics pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode o’erworld graphics data.
	const overworldGFX = Array.from( await compressPixels( graphics.overworld.getPixels(), `overworld` ) );
	saveData.push( { type: DataType.Uint32, value: overworldGFX.length } );
	saveData = saveData.concat(
		overworldGFX.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
	);

	// For each level, generate header bytes for name, ₧ score, & time scores,
	// to be used on the o’erworld.
	levels.forEach( ( level: Level ) => {
		// Calculate level header pointer.
		tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

		// Encode level header data.
		saveData = saveData.concat( encodeLevelHeader( level ) );
	} );

	// For each level, generate data bytes for goal, maps, & map objects
	// to be used in level mode.
	levels.forEach( ( level: Level ) => {
		// Calculate level header pointer.
		tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

		// Encode level data.
		saveData = saveData.concat( encodeLevelData( level ) );
	} );

	// Store o’erworld events pointer for later.
	tableOfContents.push( { type: DataType.Uint32, value: 0 } );
	const overworldEventsPointerIndex = tableOfContents.length - 1;

	saveData.push( { type: DataType.Uint8, value: overworld.getMapsList().length } );

	// Encode overworld maps data.
	overworld.getMapsList().forEach( ( map: OverworldMap ) => {
		// Calculate overworld map pointer.
		tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

		// Encode overworld map data.
		saveData = saveData.concat( map.encode() );
	} );
	const overworldEventsPointer = getTotalBytes( saveData );

	saveData.push( { type: DataType.Uint8, value: overworld.getEventsList().getLength() } );

	overworld.getEventsList().forEach( ( event: OverworldEvent ) => {
		// Calculate overworld event pointer.
		tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

		// Encode overworld event data.
		saveData = saveData.concat( event.encode( overworld.getMapsList(), overworld.getEventsList().getEvents() ) );
	} );

	// Shift TOC pointers to account for the TOC itself, which is stored at the start o’ the file.
	for ( let i = 0; i < tableOfContents.length; i++ ) {
		tableOfContents[ i ].value += getTotalBytes( tableOfContents );
	}

	// Now update the o’erworld events pointer to point to the correct location.
	// Note that since this points inside the TOC, we do NOT want to shift it by the TOC size.
	tableOfContents[ overworldEventsPointerIndex ].value = overworldEventsPointer;

	// Combine TOC & save data into one array.
	saveData = tableOfContents.concat( saveData );

	// Calculate total size o’ save data.
	const size = getTotalBytes( saveData );

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
	const [ graphics, setGraphics ] = useState<Graphics | null>( null );
	const [ levels, setLevels ] = useState<Level[] | null>( null );
	const [ palettes, setPalettes ] = useState<PaletteSystem | null>( null );
	const [ overworld, setOverworld ] = useState<Overworld | null>( null );
	const [ mode, setMode ] = useState( modeKeys.select );

	// @ts-expect-error – TypeScript is too dumb to realize that a function that only returns an Overworld
	// should be compatible with a function that returns an Overworld or null.
	const updateOverworld = ( o: Overworld | ( ( o: Overworld ) => Overworld ) ) => setOverworld( o );

	const updatePalette = ( type: string, palettes: PaletteList ) => {
		setPalettes( ( prev: PaletteSystem | null ) => {
			if ( prev === null ) {
				throw new Error( `updatePalette: Palettes are null` );
			}
			return { ...prev, [ type ]: palettes };
		} );
	};

	const onImport = ( _event: SyntheticEvent, data: Uint8Array ) => {
		// Create buffer from data & pull out the table of contents for the file.
		const buffer = new ArrayBuffer( data.length );
		const bufferView = new DataView( buffer );
		for ( let i = 0; i < data.length; i++ ) {
			bufferView.setUint8( i, data[ i ] );
		}
		const levelHeaders : number[] = [];
		for ( let i = 0; i < levelCount; i++ ) {
			levelHeaders.push( bufferView.getUint32( 20 + ( i * 4 ) ) );
		}
		const levelData : number[] = [];
		for ( let i = 0; i < levelCount; i++ ) {
			levelData.push( bufferView.getUint32( 20 + ( levelCount * 4 ) + ( i * 4 ) ) );
		}
		const tableOfContents = {
			palettes: {
				main: bufferView.getUint32( 0 ),
				overworld: bufferView.getUint32( 4 ),
			},
			graphics: {
				blocks: bufferView.getUint32( 8 ),
				sprites: bufferView.getUint32( 12 ),
				overworld: bufferView.getUint32( 16 ),
			},
			levelHeaders,
			levelData,
			overworld: bufferView.getUint32( 20 + ( levelCount * 8 ) + 4 ),
		};

		// Start decoding from the main palette data, which is the first pointer in the table of contents.
		const paletteData = decodePaletteData( data.slice( tableOfContents.palettes.main ) );

		// Load graphics data.
		loadGraphicsFromData( data.slice( tableOfContents.graphics.blocks ) ).then( graphicsData => {
			// Load level data.
			const levels: Level[] = [];

			// Load headers for all levels.
			const levelHeaders : LevelHeader[] = [];
			while ( levelHeaders.length < levelCount ) {
				const levelHeader = decodeLevelHeaders(
					data.slice( tableOfContents.levelHeaders[ levelHeaders.length ] ),
				);
				levelHeaders.push( levelHeader.header );
			}

			// Load data for all levels.
			const levelsData : LevelData[] = [];
			while ( levelsData.length < levelCount ) {
				const levelData = decodeLevelData(
					data.slice( tableOfContents.levelData[ levelsData.length ] ),
				);
				levelsData.push( levelData.data );
			}

			// Combine all level headers & data into Level objects.
			while ( levels.length < levelCount ) {
				levels.push( createLevel(
					levelHeaders[ levels.length ].name,
					levelsData[ levels.length ].goal,
					levelsData[ levels.length ].maps,
					levelHeaders[ levels.length ].ptsScore,
					levelHeaders[ levels.length ].timeScoreMinutes,
					levelHeaders[ levels.length ].timeScoreSeconds,
				) );
			}

			// Load overworld data.
			// Note that we need the o’erworld map count,
			// which is 1 byte before the 1st o’erworld map pointer in the table of contents.
			setOverworld( loadOverworldFromData( data.slice( tableOfContents.overworld - 1 ) ) );

			resetMode();
			setPalettes( paletteData.palettes );
			setGraphics( graphicsData.graphics );
			setLevels( levels );
		} );
	};

	const onOpen = ( _event: SyntheticEvent, data: object ) => {
		resetMode();

		if ( ! data || typeof data !== `object` ) {
			throw new Error( `Invalid editor data` );
		}

		if ( ! ( `graphics` in data ) ) {
			throw new Error( `Missing graphics data` );
		}

		if ( ! ( `levels` in data ) ) {
			throw new Error( `Missing levels data` );
		}

		if ( ! ( `overworld` in data ) ) {
			throw new Error( `Missing overworld data` );
		}

		if ( ! ( `palettes` in data ) ) {
			throw new Error( `Missing palettes data` );
		}

		// Import palettes.
		if (
			! data[ `palettes` ]
			|| typeof data[ `palettes` ] !== `object`
			|| ! ( `main` in data.palettes )
			|| ! ( `overworld` in data.palettes )
		) {
			throw new Error( `Invalid palettes data` );
		}

		// Load palettes.
		const palettes: PaletteSystem = createBlankPaletteSystem();
		Object.entries( data[ `palettes` ] ).forEach(
			( [ name, paletteList ] : [ string, unknown ] ) => {
				if ( ! paletteList || ! Array.isArray( paletteList ) ) {
					throw new Error( `Invalid palette list for ${ name }` );
				}

				palettes[ name as keyof PaletteSystem ] = createPaletteList( paletteList.map(
					( palette: Record<string, unknown>, i: number ): Palette => {
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

						const colors: Color[] = palette[ `colors` ].map(
							( color: Record<string, unknown>, j: number ): Color => {
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
							},
						);

						return createPalette( palette[ `name` ], colors );
					},
				) );
			},
		);

		setPalettes( palettes );

		// Import graphics if present.
		if ( `graphics` in data ) {
			// Validate data.
			if ( ! data[ `graphics` ] || typeof data[ `graphics` ] !== `object` ) {
				throw new Error( `Invalid graphics data` );
			}

			const graphics = {
				blocks: createBlankGraphicsEntry( `blocks`, 64, 64 ),
				sprites: createBlankGraphicsEntry( `sprites`, 64, 64 ),
				overworld: createBlankGraphicsEntry( `overworld`, 128, 128 ),
			};

			const graphicsTypes = [ GraphicsType.blocks, GraphicsType.sprites, GraphicsType.overworld ];

			Promise.all( graphicsTypes.map( ( type: GraphicsType ) => {
				if ( ! data[ `graphics` ] || typeof data.graphics !== `object` ) {
					throw new Error( `Invalid graphics data` );
				}
				if ( ! ( type in data.graphics )
					|| typeof ( data.graphics as Record<string, unknown> )[ type ] !== `object`
				) {
					throw new Error( `Invalid graphics ${ type } data` );
				}

				const dataItem = ( data.graphics as Record<string, unknown> )[ type ] as Record<string, unknown>;

				if ( ! dataItem[ `widthTiles` ] || typeof dataItem[ `widthTiles` ] !== `number` ) {
					throw new Error( `Invalid graphics width` );
				}
				if ( ! dataItem[ `heightTiles` ] || typeof dataItem[ `heightTiles` ] !== `number` ) {
					throw new Error( `Invalid graphics height` );
				}
				if ( ! dataItem[ `pixels` ] || typeof dataItem[ `pixels` ] !== `string` ) {
					throw new Error( `Invalid graphics pixels` );
				}

				// Convert base 64 string to byte array.
				const pixelList: number[] = [];
				for ( const letter of atob( dataItem[ `pixels` ] ) ) {
					pixelList.push( letter.charCodeAt( 0 ) );
				}

				return new Promise( resolve => {
					decompressPixels( pixelList, type ).then( pixelData => {
						graphics[ type ] = createGraphicsEntry(
							type,
							dataItem.widthTiles as number,
							dataItem.heightTiles as number,
							pixelData,
						);
						resolve( null );
					} );
				} );
			} ) ).then( () => {
				setGraphics( graphics );
			} );
		} else {
			// If no graphics is present, set to default.
			setGraphics( createNewGraphics() );
		}

		// Import levels.
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
			if ( ! ( `name` in level ) || typeof level.name !== `string` ) {
				throw new Error( `Invalid level name for level #${ i }` );
			}
			if ( ! ( `ptsScore` in level ) || typeof level.ptsScore !== `number` ) {
				throw new Error( `Invalid level ptsScore for level #${ i }` );
			}
			if ( ! ( `timeScore` in level ) || typeof level.timeScore !== `object` || level.timeScore === null ) {
				throw new Error( `Invalid level timeScore for level #${ i }` );
			}
			if ( ! ( `minutes` in level.timeScore ) || typeof level.timeScore.minutes !== `number` ) {
				throw new Error( `Invalid level timeScore minutes for level #${ i }` );
			}
			if ( ! ( `seconds` in level.timeScore ) || typeof level.timeScore.seconds !== `number` ) {
				throw new Error( `Invalid level timeScore seconds for level #${ i }` );
			}
			if ( ! ( `goal` in level ) || typeof level.goal !== `object` ) {
				throw new Error( `Invalid level goal for level #${ i }` );
			}
			const goal = ( level.goal as Record<string, unknown> );
			if ( ! ( `id` in goal ) || typeof goal.id !== `number` ) {
				throw new Error( `Invalid goal ID for level #${ i }` );
			}
			if ( ! ( `options` in goal ) || typeof goal.options !== `object` ) {
				throw new Error( `Invalid goal options for level #${ i }` );
			}
			if ( ! ( `maps` in level ) || ! Array.isArray( level[ `maps` ] ) ) {
				throw new Error( `Invalid level maps for level #${ i }` );
			}

			const maps = level.maps.map( ( map: Record<string, unknown>, j: number ): ArrayBuffer => {
				if ( ! map || typeof map !== `object` ) {
					throw new Error( `Invalid map data for map #${ j } o’ level #${ i }` );
				}
				if ( typeof map.width !== `number` ) {
					throw new Error( `Invalid map width for map #${ j } o’ level #${ i }` );
				}
				if ( typeof map.height !== `number` ) {
					throw new Error( `Invalid map height for map #${ j } o’ level #${ i }` );
				}
				if ( typeof map.palette !== `number` ) {
					throw new Error( `Invalid map palette for map #${ j } o’ level #${ i }` );
				}
				if ( ! Array.isArray( map.layers ) ) {
					throw new Error( `Invalid map layers for map #${ j } o’ level #${ i }` );
				}

				const layers = map.layers.map( ( layer: Record<string, unknown>, k: number ): Layer => {
					if ( ! layer || typeof layer !== `object` ) {
						throw new Error( `Invalid layer data for layer #${ k } o’ map #${ j } o’ level #${ i }` );
					}
					if ( typeof layer.type !== `string` ) {
						throw new Error( `Invalid layer type for layer #${ k } o’ map #${ j } o’ level #${ i }` );
					}
					if ( ! Array.isArray( layer.objects ) ) {
						// eslint-disable-next-line max-len
						throw new Error( `Invalid layer objects for layer #${ k } o’ map #${ j } o’ level #${ i }` );
					}
					if ( typeof layer.scrollX !== `number` ) {
						// eslint-disable-next-line max-len
						throw new Error( `Invalid layer scrollX for layer #${ k } o’ map #${ j } o’ level #${ i }` );
					}

					const objects = layer.objects.map(
						( object: Record<string, unknown>, l: number ): MapObject => {
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
								type: object.type,
								x: object.x,
								y: object.y,
								width: object.width as number,
								height: object.height as number,
								...object,
							} );
						},
					);

					return createLayer(
						layer.type as LayerType,
						objects,
						layer.scrollX,
					);
				} );

				const mapBlock: LvMap = createMap(
					map.width,
					map.height,
					layers,
					map.palette,
				);

				return generateDataBytes( mapBlock );
			} );
			return createLevel(
				level.name,
				createGoal( goal.id, goal.options as GoalAtts ),
				maps,
				level.ptsScore,
				level.timeScore.minutes,
				level.timeScore.seconds,
			);
		} ) );

		// Import overworld.
		if ( ! data[ `overworld` ] || typeof data[ `overworld` ] !== `object` ) {
			throw new Error( `Invalid overworld data` );
		}
		setOverworld( createOverworldFromJSON( data[ `overworld` ] ) );
	};

	const resetMode = () => setMode( modeKeys.select );

	const onNew = () => {
		setLevels( Array.from( { length: levelCount } ).map( () => createLevel() ) );
		setGraphics( createNewGraphics() );
		setPalettes( createBlankPaletteSystem() );
		setOverworld( createBlankOverworld() );
		resetMode();
	};

	const onClose = () => {
		setLevels( null );
		setGraphics( null );
		setPalettes( null );
		setOverworld( null );
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
			if ( graphics === null || levels === null || palettes === null || overworld === null ) {
				return;
			}
			Promise.all( [ graphics.blocks.toJSON(), graphics.sprites.toJSON(), graphics.overworld.toJSON() ] )
				.then( ( [ blockGraphics, spriteGraphics, overworldGraphics ] ) => {
					window.electronAPI.save( JSON.stringify( {
						graphics: {
							blocks: blockGraphics,
							sprites: spriteGraphics,
							overworld: overworldGraphics,
						},
						palettes: {
							main: palettes.main.map( ( palette: Palette ) => palette.toJSON() ),
							overworld: palettes.overworld.map( ( palette: Palette ) => palette.toJSON() ),
						},
						levels: levels.map( ( level: Level ) => level.toJSON() ),
						overworld: overworld.toJSON(),
					}, null, 4 ) );
				} );
		};
		const onExport = () => {
			if ( graphics === null || levels === null || palettes === null || overworld === null ) {
				return;
			}
			generateExportData( levels, palettes, graphics, overworld ).then( dataView => {
				window.electronAPI.export( dataView );
			} );
		};
		window.electronAPI.on( `save__editor`, onSave );
		window.electronAPI.on( `export__editor`, onExport );

		return () => {
			window.electronAPI.remove( `save__editor` );
			window.electronAPI.remove( `export__editor` );
		};
	}, [ graphics, levels, overworld, palettes ] ); // Update whene’er levels change so they always reflect latest data.

	return <div>
		{ graphics !== null && levels !== null && palettes !== null && overworld !== null && <div>
			{ mode === modeKeys.select && <SelectMode setMode={ setMode } /> }
			{ mode === modeKeys.levelList && <LevelMode
				exitMode={ resetMode }
				graphics={ graphics }
				levels={ levels }
				palettes={ palettes.main }
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
				updatePalette={ updatePalette }
			/> }
			{ mode === modeKeys.overworld && <OverworldMode
				exitMode={ resetMode }
				graphics={ graphics.overworld }
				overworld={ overworld }
				palettes={ palettes.overworld }
				setOverworld={ updateOverworld }
			/> }
		</div> }
	</div>;
};

export default Editor;
