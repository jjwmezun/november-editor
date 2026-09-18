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
	convertAllGraphicsToJSON,
	createGraphicsEntry,
	createNewGraphics,
	decompressPixels,
	getGraphicsEntryInfo,
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
	GraphicsEntry,
	GraphicsGeneral,
	GraphicsTilesets,
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
	TileSetType,
} from '../../../common/types';
import { createGoal } from '../../../common/goals';
import {
	createBlankPaletteSystem,
	createColor,
	createPalette,
	createPaletteList,
	decodePaletteData,
	decodePaletteNames,
} from '../../../common/palettes';
import { createBlankOverworld, createOverworldFromJSON, loadOverworldFromData } from '../../../common/ow';

const generateExportData = async (
	levels: Level[],
	palettes: PaletteSystem,
	graphics: Graphics,
	overworld: Overworld,
): Promise<DataView> => {
	const tableOfContents : ByteBlock[] = [];
	let saveData: ByteBlock[] = [];

	// Store main palette count.
	tableOfContents.push( { type: DataType.Uint8, value: palettes.main.getLength() } );

	// Store o’erworld palette count.
	tableOfContents.push( { type: DataType.Uint8, value: palettes.overworld.getLength() } );

	// Encode main palette name data.
	const mainPaletteNames = palettes.main.encodeNames();
	mainPaletteNames.forEach( ( paletteName: ByteBlock[] ) => {
		// Calculate pointer to palette name.
		tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

		// Encode palette name.
		saveData = saveData.concat( paletteName );
	} );

	// Calculate o’erworld palette name pointer.
	const overworldPaletteNames = palettes.overworld.encodeNames();
	overworldPaletteNames.forEach( ( paletteName: ByteBlock[] ) => {
		// Calculate pointer to palette name.
		tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

		// Encode palette name.
		saveData = saveData.concat( paletteName );
	} );

	// Calculate main palette data pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode main palette data.
	saveData = saveData.concat( palettes.main.encodeColors() );

	// Calculate o’erworld palette data pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode o’erworld palette data.
	saveData = saveData.concat( palettes.overworld.encodeColors() );

	// Calculate charset graphics pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode charset graphics data.
	const charsetGFX = Array.from(
		await compressPixels( graphics.general[ GraphicsGeneral.charset ].getPixels(), `charset` ),
	);
	saveData.push( { type: DataType.Uint32, value: charsetGFX.length } );
	saveData = saveData.concat(
		charsetGFX.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
	);

	// Calculate o’erworld graphics pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode o’erworld graphics data.
	const overworldGFX = Array.from( await compressPixels(
		graphics.general[ GraphicsGeneral.overworld ].getPixels(),
		`overworld`,
	) );
	saveData.push( { type: DataType.Uint32, value: overworldGFX.length } );
	saveData = saveData.concat(
		overworldGFX.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
	);

	// Calculate sprite graphics pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode sprite graphics data.
	const spriteGFX = Array.from( await compressPixels(
		graphics.tilesets[ GraphicsTilesets.sprites ].getPixels(),
		`sprites`,
	) );
	saveData.push( { type: DataType.Uint32, value: spriteGFX.length } );
	saveData = saveData.concat(
		spriteGFX.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
	);

	// Calculate universal block graphics pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode universal block graphics data.
	const universalBlockGFX = Array.from(
		await compressPixels( graphics.tilesets[ GraphicsTilesets.universalBlocks ].getPixels(), `universalBlocks` ),
	);
	saveData.push( { type: DataType.Uint32, value: universalBlockGFX.length } );
	saveData = saveData.concat(
		universalBlockGFX.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
	);

	// Calculate urban block graphics pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode urban block graphics data.
	const urbanGFX = Array.from( await compressPixels(
		graphics.tilesets[ GraphicsTilesets.urbanBlocks ].getPixels(),
		`urbanBlocks`,
	) );
	saveData.push( { type: DataType.Uint32, value: urbanGFX.length } );
	saveData = saveData.concat(
		urbanGFX.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
	);

	// Calculate attic block graphics pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode attic block graphics data.
	const atticBlockGFX = Array.from( await compressPixels(
		graphics.tilesets[ GraphicsTilesets.atticBlocks ].getPixels(),
		`atticBlocks`,
	) );
	saveData.push( { type: DataType.Uint32, value: atticBlockGFX.length } );
	saveData = saveData.concat(
		atticBlockGFX.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
	);

	// Calculate background graphics count & table pointer.
	tableOfContents.push( { type: DataType.Uint32, value: getTotalBytes( saveData ) } );

	// Encode background graphics count.
	saveData.push( { type: DataType.Uint8, value: graphics.backgrounds.length } );

	const backgroundTableOfContentsStart = saveData.length;

	// For each background, generate table of contents entry.
	for ( let i = 0; i < graphics.backgrounds.length; ++i ) {
		saveData.push( { type: DataType.Uint32, value: 0 } );
	}

	const bgGFX = await Promise.all( graphics.backgrounds.map( async ( background: GraphicsEntry ) => {
		return Array.from( await compressPixels(
			background.getPixels(),
			background.title(),
		) );
	} ) );
	bgGFX.forEach( ( bg: number[], i: number ) => {
		// Update background table of contents entry with actual pointer.
		saveData[ backgroundTableOfContentsStart + i ].value = getTotalBytes( saveData );

		// Encode background graphics data.
		saveData.push( { type: DataType.Uint32, value: bg.length } );
		saveData = saveData.concat(
			bg.map( ( byte: number ): ByteBlock => ( { type: DataType.Uint8, value: byte } ) ),
		);
	} );

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
	// We skip the 1st 2 entries, because they are palette name counts, not pointers.
	for ( let i = 2; i < tableOfContents.length; i++ ) {
		tableOfContents[ i ].value += getTotalBytes( tableOfContents );
	}
	for ( let i = 0; i < graphics.backgrounds.length; ++i ) {
		saveData[ backgroundTableOfContentsStart + i ].value += getTotalBytes( tableOfContents );
	}

	// Now update the o’erworld events pointer to point to the correct location.
	// Note that since this points inside the TOC, we do NOT want to shift it by the TOC size.
	tableOfContents[ overworldEventsPointerIndex ].value = overworldEventsPointer;

	// Combine TOC & save data into one array.
	saveData = tableOfContents.concat( saveData );

	// Calculate total size o’ save data.
	const size = getTotalBytes( saveData ) + 4; // +4 for checksum at end of file.

	// Generate buffer to save data.
	const buffer = new ArrayBuffer( size );
	const view = new DataView( buffer );
	let i = 0;

	// Just to be sure the checksum is precise
	// make sure we start with 0s in the first 4 bytes of the file.
	view.setUint8( size - 1, 0 );
	view.setUint8( size - 2, 0 );
	view.setUint8( size - 3, 0 );
	view.setUint8( size - 4, 0 );

	// Add all bytes to buffer.
	saveData.forEach( ( { type, value } ) => {
		view[ `set${ type }` ]( i, value );
		i += getDataTypeSize( type );
	} );

	// Add checksum @ the end.
	let checksum = 0;
	for ( let j = 0; j < size; j++ ) {
		checksum += view.getUint8( j );
	}
	view.setUint32( size - 4, checksum & 0xFFFFFFFF );

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
		resetMode();

		// Create buffer from data & pull out the table of contents for the file.
		const buffer = new ArrayBuffer( data.length );
		const bufferView = new DataView( buffer );
		for ( let i = 0; i < data.length; i++ ) {
			bufferView.setUint8( i, data[ i ] );
		}
		const mainPaletteCount = bufferView.getUint8( 0 );
		const mainPaletteNamePointers : number[] = [];
		for ( let i = 0; i < mainPaletteCount; i++ ) {
			mainPaletteNamePointers.push( bufferView.getUint32( 2 + ( i * 4 ) ) );
		}
		const overworldPaletteCount = bufferView.getUint8( 1 );
		const overworldPaletteNamePointers : number[] = [];
		for ( let i = 0; i < overworldPaletteCount; i++ ) {
			overworldPaletteNamePointers.push( bufferView.getUint32( 2 + ( mainPaletteCount * 4 ) + ( i * 4 ) ) );
		}
		const afterPaletteNamePointers = 2 + ( mainPaletteCount * 4 ) + ( overworldPaletteCount * 4 );
		const levelPointerStart = afterPaletteNamePointers + 36;
		const levelHeadersPointers : number[] = [];
		for ( let i = 0; i < levelCount; i++ ) {
			levelHeadersPointers.push( bufferView.getUint32( levelPointerStart + ( i * 4 ) ) );
		}
		const levelData : number[] = [];
		for ( let i = 0; i < levelCount; i++ ) {
			levelData.push( bufferView.getUint32( levelPointerStart + ( levelCount * 4 ) + ( i * 4 ) ) );
		}
		const tableOfContents = {
			palettes: {
				main: {
					count: mainPaletteCount,
					data: bufferView.getUint32( afterPaletteNamePointers ),
					names: mainPaletteNamePointers,
				},
				overworld: {
					count: overworldPaletteCount,
					data: bufferView.getUint32( afterPaletteNamePointers + 4 ),
					names: overworldPaletteNamePointers,
				},
			},
			graphics: {
				general: {
					charset: bufferView.getUint32( afterPaletteNamePointers + 8 ),
					overworld: bufferView.getUint32( afterPaletteNamePointers + 12 ),
				},
				tilesets: {
					sprites: bufferView.getUint32( afterPaletteNamePointers + 16 ),
					universalBlocks: bufferView.getUint32( afterPaletteNamePointers + 20 ),
					urbanBlocks: bufferView.getUint32( afterPaletteNamePointers + 24 ),
					atticBlocks: bufferView.getUint32( afterPaletteNamePointers + 28 ),
				},
				backgrounds: bufferView.getUint32( afterPaletteNamePointers + 32 ),
			},
			levelHeaders: levelHeadersPointers,
			levelData,
			overworld: bufferView.getUint32( levelPointerStart + ( levelCount * 8 ) + 4 ),
		};

		// Decode palette names & color data & combine into palette lists.
		const mainPaletteNames = decodePaletteNames(
			tableOfContents.palettes.main.count,
			data.slice( tableOfContents.palettes.main.names[ 0 ] ),
		);
		const mainPaletteData = decodePaletteData(
			tableOfContents.palettes.main.count,
			data.slice( tableOfContents.palettes.main.data ),
		);
		const overworldPaletteNames = decodePaletteNames(
			tableOfContents.palettes.overworld.count,
			data.slice( tableOfContents.palettes.overworld.names[ 0 ] ),
		);
		const overworldPaletteData = decodePaletteData(
			tableOfContents.palettes.overworld.count,
			data.slice( tableOfContents.palettes.overworld.data ),
		);
		const palettes = {
			main: createPaletteList( mainPaletteNames.map( ( name: string, i: number ): Palette => {
				return createPalette( name, mainPaletteData[ i ] );
			} ) ),
			overworld: createPaletteList( overworldPaletteNames.map( ( name: string, i: number ): Palette => {
				return createPalette( name, overworldPaletteData[ i ] );
			} ) ),
		};
		setPalettes( palettes );

		// Load levels.
		const levels: Level[] = [];

		// Load headers for all levels.
		const levelHeaders : LevelHeader[] = [];
		while ( levelHeaders.length < levelCount ) {
			const levelHeader = decodeLevelHeaders(
				data.slice( tableOfContents.levelHeaders[ levelHeaders.length ] ),
			);
			levelHeaders.push( levelHeader );
		}

		// Load data for all levels.
		const levelsData : LevelData[] = [];
		while ( levelsData.length < levelCount ) {
			const levelData = decodeLevelData(
				data.slice( tableOfContents.levelData[ levelsData.length ] ),
			);
			levelsData.push( levelData );
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

		setLevels( levels );

		// Load overworld data.
		// Note that we need the o’erworld map count,
		// which is 1 byte before the 1st o’erworld map pointer in the table of contents.
		setOverworld( loadOverworldFromData( data.slice( tableOfContents.overworld - 1 ) ) );

		// Load GFX.
		const gfx = createNewGraphics();
		const graphicsInfo = getGraphicsEntryInfo( GraphicsType.backgrounds, 0 );
		const backgroundsCount = bufferView.getUint8( tableOfContents.graphics.backgrounds );
		const backgrounds = [];
		for ( let i = 0; i < backgroundsCount; ++i ) {
			const backgroundPointer = bufferView.getUint32( tableOfContents.graphics.backgrounds + 1 + i * 4 );
			backgrounds.push( backgroundPointer );
		}
		const general = [ `charset`, `overworld` ].map( ( slug: string, i: number ) => {
			const info = getGraphicsEntryInfo( GraphicsType.general, i );
			return {
				height: info.heightTiles,
				slug,

				// @ts-expect-error - I'm sure it's here.
				pointer: tableOfContents.graphics.general[ slug as string ],
				title: info.name,
				width: info.widthTiles,
			};
		} );
		const tilesets = [ `atticBlocks`, `sprites`, `universalBlocks`, `urbanBlocks` ]
			.map( ( slug: string | GraphicsTilesets, i: number ) => {
				const info = getGraphicsEntryInfo( GraphicsType.tilesets, i );
				return {
					height: info.heightTiles,
					slug,

					// @ts-expect-error - I'm sure it's here.
					pointer: tableOfContents.graphics.tilesets[ slug as string ],
					title: info.name,
					width: info.widthTiles,
				};
			} );
		Promise.all( [
			Promise.all( general.map( entry => loadGraphicsFromData(
				`general`,
				entry.title,
				entry.width,
				entry.height,
				data.slice( entry.pointer ),
			) ) ),
			Promise.all( tilesets.map( entry => loadGraphicsFromData(
				`tilesets`,
				entry.title,
				entry.width,
				entry.height,
				data.slice( entry.pointer ),
			) ) ),
			Promise.all( backgrounds.map( ( pointer: number, i: number ) => loadGraphicsFromData(
				`backgrounds`,
				`background-${ i }`,
				graphicsInfo.widthTiles,
				graphicsInfo.heightTiles,
				data.slice( pointer ),
			) ) ),
		] ).then( ( graphicsData: GraphicsEntry[][] ) => {
			const [ generalData, tilesetsData, backgroundsData ] = graphicsData;
			gfx.general = generalData;
			gfx.tilesets = tilesetsData;
			gfx.backgrounds = backgroundsData;
			setGraphics( gfx );
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

		// Import graphics.
		if (
			! ( `graphics` in data )
			|| typeof data.graphics !== `object`
			|| data.graphics === null
			|| ! ( `general` in data.graphics )
			|| ! ( `tilesets` in data.graphics )
			|| ! ( `backgrounds` in data.graphics )
			|| ! Array.isArray( data.graphics.general )
			|| ! Array.isArray( data.graphics.tilesets )
			|| ! Array.isArray( data.graphics.backgrounds )
		) {
			throw new Error( `Invalid graphics data.` );
		}

		Promise.all( Object.values( GraphicsType ).map( ( type: GraphicsType ) => {
			const graphicsType = ( data.graphics as Record<string, Record<string, unknown>[]> )[ type ];

			return Promise.all( graphicsType.map( ( graphic: Record<string, unknown>, j: number ) => {
				if ( ! ( `title` in graphic ) || typeof graphic.title !== `string` ) {
					throw new Error( `Invalid title for graphic #${ j } of type ${ type }` );
				}

				if ( ! ( `slug` in graphic ) || typeof graphic.slug !== `string` ) {
					throw new Error( `Invalid slug for graphic #${ j } of type ${ type }` );
				}

				if ( ! ( `widthTiles` in graphic ) || typeof graphic.widthTiles !== `number` ) {
					throw new Error( `Invalid widthTiles for graphic #${ j } of type ${ type }` );
				}
				if ( ! ( `heightTiles` in graphic ) || typeof graphic.heightTiles !== `number` ) {
					throw new Error( `Invalid heightTiles for graphic #${ j } of type ${ type }` );
				}

				if ( ! ( `pixels` in graphic ) || typeof graphic.pixels !== `string` ) {
					throw new Error( `Invalid pixels data for graphic #${ j } of type ${ type }` );
				}

				const {
					heightTiles,
					pixels,
					slug,
					title,
					widthTiles,
				} = graphic;

				// Convert base 64 string to byte array.
				const pixelList: number[] = [];
				for ( const letter of atob( pixels ) ) {
					pixelList.push( letter.charCodeAt( 0 ) );
				}

				return new Promise( ( resolve: ( value: GraphicsEntry ) => void ) => {
					decompressPixels( pixelList, title ).then( pixelData => {
						resolve( createGraphicsEntry(
							slug,
							title,
							widthTiles,
							heightTiles,
							pixelData,
						) );
					} );
				} );
			} ) );
		} ) )
			.then( ( data: GraphicsEntry[][] ) => {
				const graphics = {
					[ GraphicsType.backgrounds ]: data[ 0 ],
					[ GraphicsType.general ]: data[ 1 ],
					[ GraphicsType.tilesets ]: data[ 2 ],
				};
				setGraphics( graphics );
			} );

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
				if ( typeof map.tileSetType !== `string` ) {
					throw new Error( `Invalid map tileset type for map #${ j } o’ level #${ i }` );
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
					map.tileSetType as TileSetType,
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
			convertAllGraphicsToJSON( graphics )
				.then( graphicsData => {
					window.electronAPI.save( JSON.stringify( {
						graphics: graphicsData,
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
				graphics={ graphics.general[ GraphicsGeneral.overworld ] }
				overworld={ overworld }
				palettes={ palettes.overworld }
				setOverworld={ updateOverworld }
			/> }
		</div> }
	</div>;
};

export default Editor;
