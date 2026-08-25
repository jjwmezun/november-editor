interface ByteBlock {
	type: DataType,
	value: number,
}

interface ByteBlockRef {
	type: DataType,
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

enum DataType {
	Uint8 = `Uint8`,
	Uint16 = `Uint16`,
	Uint32 = `Uint32`,
	Float32 = `Float32`,
	Int8 = `Int8`,
	Int16 = `Int16`,
	Int32 = `Int32`,
}

interface DecodedLevelData {
	data: LevelData,
	remainingBytes: Uint8Array,
}

interface DecodedLevelHeader {
	header: LevelHeader,
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
	getOption: ( key: string ) => GoalValue,
	getOptionData: ( key: string ) => number,
	getOptionText: ( key: string ) => string,
	toJSON: () => object,
	updateOption: ( key: string, value: GoalValue ) => Goal,
}

type GoalAtts = Record<string, GoalValue>;

interface GoalOptions {
	slug: string,
	title: string,
	type: string,
	default: GoalValue,
	atts: GoalAtts,
}

interface GoalTemplate {
	name: string,
	options?: GoalOptions[],
	exportData?: ByteBlockRef[],
}

type GoalValue = string | number | boolean;

interface Graphics {
	blocks: GraphicsEntry,
	overworld: GraphicsEntry,
	sprites: GraphicsEntry,
}

interface GraphicsEntry {
	clearTile: ( tileIndex: number ) => void,
	createTexture: ( ctx: WebGLRenderingContext, index: number ) => WebGLTexture,
	getData: () => GraphicsEntryRaw,
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

interface GraphicsEntryRaw {
	pixels: number[],
	width: number,
	height: number,
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

enum GraphicsType {
	blocks = `blocks`,
	overworld = `overworld`,
	sprites = `sprites`,
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
	getPtsScore: () => number,
	getTimeScoreMinutes: () => number,
	getTimeScoreSeconds: () => number,
	toJSON: () => object,
	updateGoal: ( newGoal: Goal ) => Level,
	updateMaps: ( newMaps: ArrayBuffer[] ) => Level,
	updatePtsScore: ( newPtsScore: number ) => Level,
	updateTimeScoreMinutes: ( newTimeScoreMinutes: number ) => Level,
	updateTimeScoreSeconds: ( newTimeScoreSeconds: number ) => Level,
	updateName: ( newName: string ) => Level,
}

interface LevelData {
	goal: Goal,
	maps: ArrayBuffer[],
}

interface LevelEditorProps {
	closeLevel: () => void;
	graphics: Graphics;
	level: Level;
	palettes: PaletteList;
	setLevel: ( level: Level ) => void;
	updateLevelName: ( name: string ) => void;
}

interface LevelHeader {
	name: string,
	ptsScore: number,
	timeScoreMinutes: number,
	timeScoreSeconds: number,
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
		updateObject: ( objectIndex: number, newObject: MapObjectArgs ) => LvMap,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		updateOption: ( key: string, value: any ) => LvMap,
	},
	updateHeight: ( newHeight: number ) => LvMap,
	updateWidth: ( newWidth: number ) => LvMap,
	updatePalette: ( newPalette: number ) => LvMap,
}

interface MapEditorProps {
	graphics: Graphics;
	maps: ArrayBuffer[];
	palettes: PaletteList;
	selectedMap: LvMap | null;
	selectedMapIndex: number | null;
	setMaps: ( maps: ArrayBuffer[] ) => void;
	setSelectedMap: ( map: LvMap | null ) => void;
}

interface MapObject {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getProp: ( key: string ) => any,
	id: () => number,
	hidden: () => boolean,
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
	id?: number,
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
	create: ( id: number, x: number, y: number ) => MapObjectArgs,
	generateHighlight: ( object: MapObject ) => Rect[],
	generateTiles: ( object: MapObject, currentTiles: GraphicTile[] ) => GraphicTile[],
	exportData: ByteBlockRef[],
	options: MapObjectTypeOption[],
}

interface MapRenderer {
	changeMap: ( map: LvMap ) => void,
	render: () => void,
	updateAnimationFrame: ( frame: number ) => void,
	updateDimensions: ( width: number, height: number ) => void,
	updateLayerObjects: ( layer: number, objects: MapObject[] ) => void,
	updatePalette: ( palette: number ) => void,
	addLayer: ( type: LayerType, selectedPalette: number ) => void,
	removeLayer: ( layer: number ) => void,
	setSelectedLayer: ( selectedLayer: number ) => void,
	setSelectedObject: ( i: number | null, objects: MapObject[], layerType: LayerType ) => void,
	setSelectedTile: ( x: number | null, y: number | null ) => void,
	switchLayers: ( layer1: number, layer2: number ) => void,
	updateScrollX: ( windowScrollX: number, map: LvMap ) => void,
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

interface ObjectRenderer {
	render: () => void;
	setSelectedLayer: ( isSelected: boolean ) => void;
	updateAnimationFrame: ( frame: number ) => void;
	updateDimensions: ( width: number, height: number ) => void;
	updateObjects: ( objects: MapObject[] ) => void;
	updatePalette: ( palette: number ) => void;
	updateScrollX: ( layerScrollX: number, windowScrollX: number, mapWidth: number ) => void;
}

interface Overworld {
	addMap: () => Overworld;
	getEventsList: () => OverworldEventsList;
	getMapsList: () => readonly OverworldMap[];
	encode: () => ByteBlock[];
	moveMapDown: ( index: number ) => Overworld;
	moveMapUp: ( index: number ) => Overworld;
	removeMap: ( index: number ) => Overworld;
	toJSON: () => object;
	updateMap: ( index: number, map: OverworldMapData ) => Overworld;
}

interface OverworldEventsList {
	addEvent: () => Overworld,
	encode: ( maps: readonly OverworldMap[] ) => ByteBlock[],
	forEach: ( callback: ( event: OverworldEvent, index: number ) => void ) => void,
	getEntry: ( index: number ) => OverworldEvent,
	getEvents: () => readonly OverworldEvent[],
	getLength: () => number,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	map: ( callback: ( event: OverworldEvent, index: number ) => any ) => any[],
	removeEvent: ( index: number ) => Overworld,
	toJSON: () => object[],
	updateEvent: ( index: number, event: OverworldEvent ) => Overworld,
}

interface OverworldEventUpdateRemove {
	encode: () => ByteBlock[];
	getObjectId: () => number,
	toJSON: () => object,
}

interface OverworldEventUpdateAdd {
	encode: ( layerType: OverworldLayerType ) => ByteBlock[];
	getObject: () => MapObject,
	toJSON: () => object,
}

interface OverworldEventUpdateChange {
	encode: ( layerType: OverworldLayerType, objectType: number ) => ByteBlock[];
	getChanges: () => MapObjectArgs,
	getObjectId: () => number,
	toJSON: () => object,
}

enum OverworldEventUpdateType {
	add = `add`,
	change = `change`,
	remove = `remove`,
}

interface OverworldEventUpdate {
	encode: ( maps: readonly OverworldMap[], events: readonly OverworldEvent[] ) => ByteBlock[];
	getObjectId: () => number,
	getLayer: () => number,
	getMap: () => number,
	getType: () => OverworldEventUpdateType,
	getUpdate: () => OverworldEventUpdateAdd | OverworldEventUpdateChange | OverworldEventUpdateRemove,
	toJSON: () => object,
}

interface OverworldEventFrame {
	addEventAdd: ( map: number, layer: number, object: MapObject ) => OverworldEventFrame,
	addEventChange: ( map: number, layer: number, objectId: number, changes: object ) => OverworldEventFrame,
	addEventRemove: ( map: number, layer: number, objectId: number ) => OverworldEventFrame,
	encode: ( maps: readonly OverworldMap[], events: readonly OverworldEvent[] ) => ByteBlock[];
	getDuration: () => number,
	getUpdates: () => readonly OverworldEventUpdate[],
	getUpdateById: ( objectId: number, mapId: number, layerId: number ) => OverworldEventUpdate | null,
	removeUpdate: ( mapId: number, layerId: number, objectId: number ) => OverworldEventFrame,
	toJSON: () => object,
	updateDuration: ( newDuration: number ) => OverworldEventFrame,
	updateEvent: ( objectId: number, mapId: number, layerId: number, changes: object ) => OverworldEventFrame,
}

interface OverworldEvent {
	addFrame: () => OverworldEvent,
	encode: ( maps: readonly OverworldMap[], events: readonly OverworldEvent[] ) => ByteBlock[];
	getEntry: ( index: number ) => OverworldEventFrame,
	getFrames: () => readonly OverworldEventFrame[];
	getLength: () => number,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	map: ( callback: ( frame: OverworldEventFrame, index: number ) => any ) => any[],
	removeLatestFrame: () => OverworldEvent,
	toJSON: () => object,
	updateFrame: ( index: number, frame: OverworldEventFrame ) => OverworldEvent,
}

interface OverworldEventControlsProps {
	eventsList: OverworldEventsList,
	selectedEvent: number,
	selectedEventFrame: number,
	setOverworld: ( overworld: Overworld ) => void,
	setSelectedEvent: ( index: number ) => void,
	setSelectedEventFrame: ( frame: number ) => void,
	setSelectedObject: ( object: number | null ) => void,
	updateEventFrame: ( frame: OverworldEventFrame, i: number ) => void,
	updateSelectedEventFrame: ( frame: OverworldEventFrame ) => void,
}

interface OverworldGridCanvasProps {
	graphics: GraphicsEntry,
	map: OverworldMap,
	palettes: PaletteList,
	selectedEventFrames: readonly OverworldEventFrame[],
	selectedFrame: number,
	selectedLayer: number,
	selectedObject: number | null,
	selectedObjectType: number,
	setOverworld: ( overworld: Overworld ) => void,
	setSelectedObject: ( object: number | null ) => void,
	updateLayerLatestId: () => void,
	updateSelectedEventFrame: ( frame: OverworldEventFrame ) => void,
}

interface OverworldLayer {
	addObject( object: MapObject ): Overworld;
	getId: () => number;
	getLatestId: () => number;
	getObject: ( index: number ) => MapObject;
	getObjectsList: () => readonly MapObject[];
	getType: () => OverworldLayerType;
	encode: () => ByteBlock[];
	removeObject: ( index: number ) => Overworld;
	toJSON: () => object;
	updateLatestId: () => Overworld;
	updateObject: ( id: number, changes: MapObjectArgs ) => Overworld;
}

interface OverworldLayerControlsProps {
	addLayer: () => void;
	layers: readonly OverworldLayer[];
	moveLayerDown: () => void;
	moveLayerUp: () => void;
	removeLayer: () => void;
	selectedLayer: number;
	selectedLayerType: OverworldLayerType;
	setSelectedLayer: ( index: number ) => void;
	setSelectedLayerType: ( type: OverworldLayerType ) => void;
	setSelectedObject: ( object: number | null ) => void;
	setSelectedObjectType: ( type: number ) => void;
}

interface OverworldLayerData {
	id: number;
	latestId: number;
	objects: readonly MapObject[];
	type: OverworldLayerType;
}

enum OverworldLayerType {
	block = `block`,
	sprite = `sprite`,
}

interface OverworldMap {
	addLayer: ( type: OverworldLayerType ) => Overworld;
	getHeightBlocks: () => number;
	getHeightPixels: () => number;
	getHeightTiles: () => number;
	getId: () => number;
	getLayersList: () => readonly OverworldLayer[];
	getWidthBlocks: () => number;
	getWidthPixels: () => number;
	getWidthTiles: () => number;
	encode: () => ByteBlock[];
	moveLayerDown: ( index: number ) => Overworld;
	moveLayerUp: ( index: number ) => Overworld;
	removeLayer: ( index: number ) => Overworld;
	toJSON: () => object;
	updateHeight: ( newHeight: number ) => Overworld;
	updateLayer: ( index: number, layer: OverworldLayerData ) => Overworld;
	updateWidth: ( newWidth: number ) => Overworld;
}

interface OverworldMapControlsProps {
	addMap: () => void;
	generateMapSelector: ( index: number ) => () => void;
	maps: readonly OverworldMap[];
	moveMapDown: () => void;
	moveMapUp: () => void;
	removeMap: () => void;
	selectedMap: number;
}

interface OverworldMapData {
	height: number;
	id: number;
	latestId: number;
	layers: readonly OverworldLayerData[];
	width: number;
}

interface OverworldMapOptionsProps {
	map: OverworldMap;
	setOverworld: ( overworld: Overworld ) => void;
}

interface OverworldModeProps {
	exitMode: () => void,
	graphics: GraphicsEntry,
	overworld: Overworld,
	palettes: PaletteList,
	setOverworld: ( overworld: Overworld | ( ( overworld: Overworld ) => Overworld ) ) => void,
}

interface OverworldObjectControlsProps {
	typesFactory: readonly MapObjectType[],
	selectedObjectType: number,
	setSelectedObjectType: ( type: number ) => void,
}

interface OverworldRenderer {
	render: () => void,
	setSelectedObject: ( i: number | null, objects: readonly MapObject[] ) => void,
	updateAnimationFrame: ( frame: number ) => void,
	updateLayers: ( map: OverworldMap, objects: Array<readonly MapObject[]>, selectedLayer: number ) => void,
	updateLayerObjects: ( layer: number, objects: readonly MapObject[], i: number | null ) => void,
	updateHoverTile: ( x: number, y: number ) => void,
	updateResolution: ( width: number, height: number ) => void,
	updateSelectedObject: ( i: number | null, objects: readonly MapObject[] ) => void,
	updateSelectedLayer: ( selectedLayer: number ) => void,
	updateShowGrid: ( _showGrid: boolean ) => void,
}

interface Palette {
	getList: () => number[],
	getName: () => string,
	encodeColors: () => ByteBlock[],
	encodeName: () => ByteBlock[],
	mapColors: <Type>( action: ( color: Color, index: number ) => Type, ignoreFirst: boolean ) => Type[],
	nthColor: ( index: number ) => Color,
	toJSON: () => object,
	updateName: ( newName: string ) => Palette,
	updateColor: ( index: number, newColor: Color ) => Palette,
}

interface PaletteData {
	palettes: PaletteSystem,
	remainingBytes: Uint8Array,
}

interface PaletteList {
	addBlankPalette: () => PaletteList,
	createTexture: ( ctx: WebGLRenderingContext, index: number ) => WebGLTexture,
	encodeColors: () => ByteBlock[],
	encodeNames: () => ByteBlock[][],
	getLength: () => number,
	map: <Type>( action: ( palette: Palette, index: number ) => Type ) => Type[],
	nth: ( index: number ) => Palette,
	removePalette: ( index: number ) => PaletteList,
	updatePalette: ( index: number, newPalette: Palette ) => PaletteList,
}

interface PaletteModeProps {
	palettes: PaletteSystem,
	exitMode: () => void,
	updatePalette: ( type: string, palettes: PaletteList ) => void,
}

interface PaletteSystem {
	main: PaletteList,
	overworld: PaletteList,
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

interface TileEditorProps {
	clearTile: () => void,
	drawPixel: ( x: number, y: number ) => void,
	graphics: GraphicsEntry,
	palettes: PaletteSystem,
	selectedColor: number,
	selectedPalette: number,
	tileX: number,
	tileY: number,
}

interface TileGridProps {
	graphics: GraphicsEntry,
	palettes: PaletteSystem,
	selectedPalette: number,
	selectedTile: number | null,
	setSelectedTile: ( tile: number ) => void,
}

interface TileGridRenderer {
	render: ( hovered: Coordinates, selected: Coordinates | null, showGridLines: boolean ) => void,
	updateSelectedPalette: ( selectedPalette: number ) => void,
	updateResolution: ( width: number, height: number ) => void,
	updateGraphics: ( graphics: GraphicsEntry ) => void,
}

interface TileRenderer {
	render: () => void,
	updateBrush: ( x: number, y: number, brushSize: number ) => void,
	updateResolution: ( width: number, height: number ) => void,
	updateSelected: ( x: number, y: number ) => void,
	updateSelectedColor: ( color: number ) => void,
	updateSelectedPalette: ( selectedPalette: number ) => void,
	updateGraphicsEntry: ( graphics: GraphicsEntry ) => void,
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
	compress: ( data: Buffer, name: string ) => void,
	decompress: ( data: Buffer, name: string ) => void,
	enableSave: () => void,
	export: ( data: DataView ) => void,
	exportMap: ( map: ArrayBuffer ) => void,
	importMap: () => void,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	on: ( channel: string, listener: ( _event: any, data: any, ...args: any[] ) => void ) => void,
	openTileImportWindow: () => void,
	openTileExportWindow: ( graphics: GraphicsEntryRaw ) => void,
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
	DataType,
	DecodedLevelData,
	DecodedLevelHeader,
	DecodedTextData,
	DecodedGraphicsData,
	Goal,
	GoalAtts,
	GoalOptions,
	GoalTemplate,
	GoalValue,
	Graphics,
	GraphicsEntry,
	GraphicsEntryRaw,
	GraphicTile,
	GraphicsType,
	Layer,
	LayerType,
	Level,
	LevelData,
	LevelEditorProps,
	LevelHeader,
	LevelListProps,
	LevelModeProps,
	LevelProps,
	LvMap,
	LvMapByteProps,
	LvMapProps,
	MapEditorProps,
	MapObject,
	MapObjectArgs,
	MapObjectType,
	MapRenderer,
	Mat3,
	Mode,
	MousePosition,
	ObjectRenderer,
	Overworld,
	OverworldEvent,
	OverworldEventsList,
	OverworldEventControlsProps,
	OverworldEventUpdate,
	OverworldEventUpdateAdd,
	OverworldEventUpdateChange,
	OverworldEventUpdateRemove,
	OverworldEventUpdateType,
	OverworldEventFrame,
	OverworldGridCanvasProps,
	OverworldLayer,
	OverworldLayerControlsProps,
	OverworldLayerData,
	OverworldLayerType,
	OverworldMap,
	OverworldMapControlsProps,
	OverworldMapData,
	OverworldMapOptionsProps,
	OverworldModeProps,
	OverworldObjectControlsProps,
	OverworldRenderer,
	Palette,
	PaletteData,
	PaletteList,
	PaletteModeProps,
	PaletteSystem,
	Rect,
	RenderObject,
	SelectModeProps,
	Shader,
	ShaderType,
	TextTrie,
	TileEditorProps,
	TileGridProps,
	TileGridRenderer,
	TileRenderer,
	TileRendererArgs,
	WebGL2Program,
};
