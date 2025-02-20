interface ByteBlock {
	type: string,
	value: number,
}

interface ByteBlockRef {
	type: string,
	key: string,
}

interface CharItem {
	char: string,
	code: string,
}

interface ColorSelectorProps {
	colors: string[];
	selectedColor: number;
	setSelectedColor: ( color: number ) => void;
}

interface Coordinates {
	x: number,
	y: number,
}

interface DecodedLevelData {
	level: Level,
	remainingBytes: Uint8Array,
}

interface DecodedTextData {
	text: string,
	bytesUsed: number,
	remainingBytes: Uint8Array,
}

interface DecodedTilesetData {
	tileset: Tileset,
	remainingBytes: Uint8Array,
}

interface Goal {
	getId: () => number,
	getOption: ( key: string ) => string,
	toJSON: () => object,
	updateOption: ( key: string, value: string ) => Goal,
}

interface GoalTemplate {
	name: string,
	options?: {
		slug: string,
		title: string,
		type: string,
		default: string,
		atts?: { [key: string]: string },
	}[],
	exportData?: ByteBlockRef[],
}

interface BlockLayer {
	type: LayerType.block,
	objects: MapObject[],
	scrollX: number,
}

type Layer = BlockLayer;

enum LayerType {
	block = `block`,
}

interface Level {
	getGoal: () => Goal,
	getMaps: () => ArrayBuffer[],
	getName: () => string,
	getProps: () => LevelProps,
	toJSON: () => object,
	updateGoal: ( newGoal: Goal ) => Level,
	updateMaps: ( newMaps: ArrayBuffer[] ) => Level,
	updateName: ( newName: string ) => Level,
}

interface LevelEditorProps {
	closeLevel: () => void;
	maps: ArrayBuffer[];
	name: string;
	setName: ( name: string ) => void;
	goal: Goal;
	setMaps: ( maps: ArrayBuffer[] ) => void;
	setGoal: ( goal: Goal ) => void;
	tileset: Tileset;
}

interface LevelListProps {
	exitMode: () => void;
	generateLevelNameUpdater: ( index: number ) => ( name: string ) => void;
	levels: Level[];
	setLevels: ( levels: Level[] ) => void;
	setSelectedLevel: ( index: number ) => void;
}

interface LevelModeProps {
	exitMode: () => void;
	levels: Level[];
	setLevels: ( levels: Level[] ) => void;
	tileset: Tileset;
}

interface LevelProps { name: string, goal: Goal, maps: ArrayBuffer[] }

interface LvMap {
	addLayer: () => LvMap,
	getProps: () => LvMapProps,
	removeLayer: ( index: number ) => LvMap,
	switchLayers: ( a: number, b: number ) => LvMap,
	toJSON: () => object,
	updateLayer: ( index: number ) => {
		addObject: ( object: object ) => LvMap,
		removeObject: ( objectIndex: number ) => LvMap,
		updateObject: ( objectIndex: number, newObject: object ) => LvMap,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		updateOption: ( key: string, value: any ) => LvMap,
	},
	updateHeight: ( newHeight: number ) => LvMap,
	updateWidth: ( newWidth: number ) => LvMap,
}

interface MapObject {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getProp: ( key: string ) => any,
	type: () => number,
	xBlocks: () => number,
	xTiles: () => number,
	xPixels: () => number,
	yBlocks: () => number,
	yTiles: () => number,
	yPixels: () => number,
	widthBlocks: () => number,
	widthTiles: () => number,
	widthPixels: () => number,
	heightBlocks: () => number,
	heightTiles: () => number,
	heightPixels: () => number,
	rightBlocks: () => number,
	rightTiles: () => number,
	rightPixels: () => number,
	bottomBlocks: () => number,
	bottomTiles: () => number,
	bottomPixels: () => number,
	toJSON: () => object,
	update: ( newObject: object ) => MapObject,
}

interface MapObjectArgs {
	type?: number,
	x?: number,
	y?: number,
	width?: number,
	height?: number,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any,
}

interface MapObjectTypeOption {
	title: string,
	key: string,
	type: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	update: ( v: any ) => any,
	atts: object,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	extraUpdate?: ( object: MapObject, v: any ) => object,
}

interface MapObjectType {
	name: string,
	create: ( x: number, y: number ) => object,
	render: (
		tileRenderer: ( args: TileRendererArgs ) => void,
		object: MapObject,
		frame: number
	) => void,
	exportData: ByteBlockRef[],
	options: MapObjectTypeOption[],
}

interface Mode {
	name: string;
	slug: string;
}

interface LvMapProps {
	width: number,
	height: number,
	layers: Layer[],
}

interface MousePosition {
	x: number,
	y: number,
}

interface SelectModeProps {
	setMode: ( mode: number ) => void;
}

interface TextTrie {
	char: string | null,
	frequency: number,
	children: TextTrie[] | null,
	code?: number[],
}

interface TileGridProps {
	selectedTile: number | null,
	setSelectedTile: ( tile: number ) => void,
	tileset: Tileset,
}

interface TileEditorProps {
	clearTile: () => void,
	colors: string[],
	drawPixel: ( x: number, y: number ) => void,
	selectedColor: number,
	tileset: Tileset,
	tileX: number,
	tileY: number,
}

interface TileRendererArgs {
	srcx?: number,
	srcy?: number,
	x?: number,
	y?: number,
	w?: number,
	h?: number,
}

interface Tileset {
	clearTile: ( tileIndex: number ) => void,
	drawPiece: (
		ctx: CanvasRenderingContext2D,
		srcX: number,
		srcY: number,
		srcW: number,
		srcH: number,
		destX: number,
		destY: number,
		destW: number,
		destH: number
	) => void,
	drawWhole: ( ctx: CanvasRenderingContext2D, ctxWidth: number, ctxHeight: number ) => void,
	getWidthTiles: () => number,
	getHeightTiles: () => number,
	getWidthPixels: () => number,
	getHeightPixels: () => number,
	getPixels: () => number[],
	importPixels: ( newPixels: number[], importWidth: number, importHeight: number, tileIndex: number ) => void,
	toJSON: () => object,
	updatePixels: ( newPixels: number[] ) => Tileset,
	updatePixel: ( color: number, x: number, y: number ) => void,
}

interface ElectronAPI {
	enableSave: () => void,
	export: ( data: DataView ) => void,
	exportMap: ( map: ArrayBuffer ) => void,
	importMap: () => void,
	on: ( channel: string, listener: ( _event, data: object ) => void ) => void,
	openTileImportWindow: () => void,
	remove: ( channel: string ) => void,
	save: ( data: string ) => void,
}

declare global {
    interface Window { electronAPI: ElectronAPI; }
}

export {
	ByteBlock,
	ByteBlockRef,
	CharItem,
	ColorSelectorProps,
	Coordinates,
	DecodedLevelData,
	DecodedTextData,
	DecodedTilesetData,
	Goal,
	GoalTemplate,
	Layer,
	LayerType,
	Level,
	LevelEditorProps,
	LevelListProps,
	LevelModeProps,
	LevelProps,
	LvMap,
	LvMapProps,
	MapObject,
	MapObjectArgs,
	MapObjectType,
	Mode,
	MousePosition,
	SelectModeProps,
	TextTrie,
	TileGridProps,
	TileEditorProps,
	TileRendererArgs,
	Tileset,
};
