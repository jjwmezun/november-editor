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

interface Color {
	encode: () => ByteBlock,
	getList: () => number[],
	hex: () => string,
	rgba: () => string,
	toJSON: () => object,
}

interface ColorSelectorProps {
	palettes: PaletteList;
	selectedColor: number;
	selectedPalette: number;
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

interface DecodedGraphicsData {
	graphics: Graphics,
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

interface Graphics {
	blocks: GraphicsEntry,
	sprites: GraphicsEntry,
}

interface GraphicsEntry {
	clearTile: ( tileIndex: number ) => void,
	createTexture: ( ctx: WebGLRenderingContext, index: number ) => WebGLTexture,
	getWidthTiles: () => number,
	getHeightTiles: () => number,
	getWidthPixels: () => number,
	getHeightPixels: () => number,
	getPixels: () => number[],
	importPixels: ( newPixels: number[], importWidth: number, importHeight: number, tileIndex: number ) => void,
	toJSON: () => object,
	updatePixels: ( newPixels: number[] ) => GraphicsEntry,
	updatePixel: ( color: number, x: number, y: number ) => void,
}

interface GraphicTile {
	animation: number;
	srcHeight: number;
	srcWidth: number;
	srcx: number;
	srcy: number;
	x: number;
	y: number;
	flipx: boolean;
	flipy: boolean;
}

interface BlockLayer {
	type: LayerType,
	objects: MapObject[],
	scrollX: number,
}

type Layer = BlockLayer;

enum LayerType {
	block = `block`,
	sprite = `sprite`,
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
	graphics: Graphics;
	maps: ArrayBuffer[];
	name: string;
	setName: ( name: string ) => void;
	goal: Goal;
	palettes: PaletteList;
	setMaps: ( maps: ArrayBuffer[] ) => void;
	setGoal: ( goal: Goal ) => void;
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
	graphics: Graphics;
	levels: Level[];
	palettes: PaletteList;
	setLevels: ( levels: Level[] ) => void;
}

interface LevelProps { name: string, goal: Goal, maps: ArrayBuffer[] }

interface LvMap {
	addLayer: ( type: LayerType ) => LvMap,
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
	updatePalette: ( newPalette: number ) => LvMap,
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
	generateHighlight: ( object: MapObject ) => Rect[],
	generateTiles: ( object: MapObject ) => GraphicTile[],
	exportData: ByteBlockRef[],
	options: MapObjectTypeOption[],
}

interface Mat3 {
	getList: () => number[];
	scale: ( v: [ number, number ] ) => Mat3;
	translate: ( v: [ number, number ] ) => Mat3;
}

interface Mode {
	name: string;
	slug: string;
}

interface LvMapByteProps {
	width: number,
	height: number,
	layerCount: number,
	palette: number,
}

interface LvMapProps {
	width: number,
	height: number,
	layers: Layer[],
	palette: number,
}

interface MousePosition {
	x: number,
	y: number,
}

interface Palette {
	getList: () => number[],
	getName: () => string,
	encode: () => ByteBlock[],
	mapColors: <Type>( action: ( color: Color, index: number ) => Type, ignoreFirst: boolean ) => Type[],
	nthColor: ( index: number ) => Color,
	toJSON: () => object,
	updateName: ( newName: string ) => Palette,
	updateColor: ( index: number, newColor: Color ) => Palette,
}

interface PaletteData {
	palettes: PaletteList,
	remainingBytes: Uint8Array,
}

interface PaletteList {
	addBlankPalette: () => PaletteList,
	createTexture: ( ctx: WebGLRenderingContext, index: number ) => WebGLTexture,
	encode: () => ByteBlock[],
	getLength: () => number,
	map: <Type>( action: ( palette: Palette, index: number ) => Type ) => Type[],
	nth: ( index: number ) => Palette,
	removePalette: ( index: number ) => PaletteList,
	updatePalette: ( index: number, newPalette: Palette ) => PaletteList,
}

interface PaletteModeProps {
	palettes: PaletteList,
	exitMode: () => void,
	setPalettes: ( palettes: PaletteList ) => void,
}

interface Rect {
	x: number,
	y: number,
	width: number,
	height: number,
}

interface RenderObject {
	addAttribute: (
		name: string,
		size: number,
		type: GLenum,
		normalized: boolean,
		stride: number,
		offset: number,
	) => void;
	addInstanceAttribute: (
		name: string,
		size: number,
		type: GLenum,
		normalized: boolean,
		stride: number,
		offset: number,
	) => void;
	addTextureUniform: ( name: string, index: number, texture: WebGLTexture ) => void;
	addUniform: ( name: string, type: string, value: number | Float32Array | number[] ) => void;
	render: () => void;
	renderInstances: ( instances: number ) => void;
}

interface SelectModeProps {
	setMode: ( mode: number ) => void;
}

interface Shader {
	type: ShaderType;
	source: string;
}

enum ShaderType {
	VERTEX_SHADER = `VERTEX_SHADER`,
	FRAGMENT_SHADER = `FRAGMENT_SHADER`,
}

interface TextTrie {
	char: string | null,
	frequency: number,
	children: TextTrie[] | null,
	code?: number[],
}

interface TileGridProps {
	graphics: GraphicsEntry,
	palettes: PaletteList,
	selectedPalette: number,
	selectedTile: number | null,
	setSelectedTile: ( tile: number ) => void,
}

interface TileEditorProps {
	clearTile: () => void,
	drawPixel: ( x: number, y: number ) => void,
	graphics: GraphicsEntry,
	palettes: PaletteList,
	selectedColor: number,
	selectedPalette: number,
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

interface WebGL2Program {
	getAttribLocation: ( name: string ) => number;
	setUniform1f: ( name: string, value: number ) => void;
	setUniform1i: ( name: string, value: number ) => void;
	setUniform2f: ( name: string, v1: number, v2: number ) => void;
	setUniformMatrix3fv: ( name: string, value: Float32Array ) => void;
	use: () => void;
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
	Color,
	ColorSelectorProps,
	Coordinates,
	DecodedLevelData,
	DecodedTextData,
	DecodedGraphicsData,
	Goal,
	GoalTemplate,
	Graphics,
	GraphicsEntry,
	GraphicTile,
	Layer,
	LayerType,
	Level,
	LevelEditorProps,
	LevelListProps,
	LevelModeProps,
	LevelProps,
	LvMap,
	LvMapByteProps,
	LvMapProps,
	MapObject,
	MapObjectArgs,
	MapObjectType,
	Mat3,
	Mode,
	MousePosition,
	Palette,
	PaletteData,
	PaletteList,
	PaletteModeProps,
	Rect,
	RenderObject,
	SelectModeProps,
	Shader,
	ShaderType,
	TextTrie,
	TileGridProps,
	TileEditorProps,
	TileRendererArgs,
	WebGL2Program,
};
