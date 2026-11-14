import { getBlockTypeFactory } from './objects';
import {
	Graphics,
	GraphicsTilesets,
	GraphicTile,
	LayerType,
	MapObject,
	LayerRenderer,
	PaletteList,
	ShaderType,
	TileSetType,
	Layer,
} from './types';
import { createMat3 } from './mat';
import {
	createRenderTextureObject,
	createShaderProgram,
} from './render';
import { convertDegreesToRadians } from './utils';

const createTexture = (
	ctx: WebGLRenderingContext,
	index: number,
	pixels: number[],
	width: number,
	height: number,
): WebGLTexture => {
	const texture = ctx.createTexture();

	// @ts-expect-error – We know that WebGLRenderingContext has `TEXTURE#` properties for each index.
	ctx.activeTexture( ctx[ `TEXTURE${ index }` ] );

	ctx.bindTexture( ctx.TEXTURE_2D, texture );
	ctx.texImage2D(
		ctx.TEXTURE_2D,
		0,
		ctx.LUMINANCE,
		width,
		height,
		0,
		ctx.LUMINANCE,
		ctx.UNSIGNED_BYTE,
		new Uint8Array( pixels.map( pixel => pixel * 32 ) ), // Stretch pixel to span 0 – 255.
	);
	ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST );
	ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST );
	ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.REPEAT );
	ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.REPEAT );
	return texture;
};

const createBackgroundLayerRenderer = (
	ctx: WebGL2RenderingContext,
	palettes: PaletteList,
	graphics: Graphics,
	layerType: LayerType,
	selectedPalette: number,
	tilesetType: TileSetType,
	mapWidth: number,
	mapHeight: number,
	layer: Layer,
): LayerRenderer => {
	if ( ! ( `graphics` in layer.data ) ) {
		throw new Error( `Layer data does not contain graphics.` );
	}

	const program = createShaderProgram(
		ctx,
		[
			{
				type: ShaderType.VERTEX_SHADER,
				source: `#version 300 es

					in vec2 a_position;
					in vec2 a_texture_coords;

					out vec2 v_texture_coords;

					uniform mat3 u_model;
					uniform mat3 u_texmodel;

					void main() {
						vec3 pos = vec3( a_position, 1.0 ) * u_model;
						gl_Position = vec4( pos.xy, 0.0, 1.0 );
						vec3 texCoords = vec3( a_texture_coords, 1.0 ) * u_texmodel;
						v_texture_coords = texCoords.xy;
					}
				`,
			},
			{
				type: ShaderType.FRAGMENT_SHADER,
				source: `#version 300 es

					precision mediump float;

					in vec2 v_texture_coords;

					out vec4 frag_color;

					uniform sampler2D u_palette_texture;
					uniform sampler2D u_background_texture;
					uniform float u_palette_index;
					uniform float u_alpha;

					void main() {
						float color_index = texture( u_background_texture, v_texture_coords ).x;
						if ( color_index == 0.0 ) {
							discard;
							return;
						}
						frag_color = texture(
							u_palette_texture,
							vec2(
								color_index,
								u_palette_index
							)
						);
						frag_color.a *= u_alpha;
					}
				`,
			},
		],
	);

	const renderObject = createRenderTextureObject( ctx, program );

	// Setup textures.
	const paletteTexture = palettes.createTexture( ctx, 0 );

	renderObject.addTextureUniform( `u_palette_texture`, 0, paletteTexture );
	renderObject.addUniform( `u_alpha`, `1f`, 1 );

	// Init palette index uniform.
	program.setUniform1f( `u_palette_index`, selectedPalette );

	let canvasWidth = mapWidth * 16;
	let canvasHeight = mapHeight * 16;
	let backgroundTextureIndex = layer.data.graphics;
	let textureWidth = 0;
	let textureHeight = 0;

	const updateBackgroundTexture = () => {
		const textureIndex = 3;
		const pixels = graphics.backgrounds[ backgroundTextureIndex ].getPixels();
		textureWidth = graphics.backgrounds[ backgroundTextureIndex ].getWidthPixels();
		textureHeight = graphics.backgrounds[ backgroundTextureIndex ].getHeightPixels();
		const backgroundTexture = createTexture( ctx, textureIndex, pixels, textureWidth, textureHeight );
		renderObject.addTextureUniform( `u_background_texture`, textureIndex, backgroundTexture );
	};

	const updateModels = () => {
		const texmodelWidth = Math.ceil( canvasWidth / textureWidth );
		const texmodelHeight = Math.ceil( canvasHeight / textureHeight );
		const modelWidth = textureWidth * texmodelWidth / canvasWidth;
		const modelHeight = textureHeight * texmodelHeight / canvasHeight;
		const model = createMat3()
			.scale( [ modelWidth, modelHeight ] );
		const texmodel = createMat3()
			.scale( [ texmodelWidth, texmodelHeight ] );
		renderObject.addUniform( `u_model`, `mat3`, model.getList() );
		renderObject.addUniform( `u_texmodel`, `mat3`, texmodel.getList() );
	};

	updateBackgroundTexture();
	updateModels();

	return Object.freeze( {
		render: () => {
			program.use();
			renderObject.render();
		},
		setSelectedLayer: ( isSelected: boolean ) => {
			program.use();
			program.setUniform1f( `u_alpha`, isSelected ? 1 : 0.5 );
		},
		updateAnimationFrame: () => null,
		updateBackground: ( background: number ) => {
			program.use();
			backgroundTextureIndex = background;
			updateBackgroundTexture();
			updateModels();
		},
		updateDimensions: ( width: number, height: number ) => {
			program.use();
			canvasWidth = width * 16;
			canvasHeight = height * 16;
			updateModels();
		},
		updateObjects: () => null,
		updatePalette: ( palette: number ) => {
			program.use();
			program.setUniform1f( `u_palette_index`, palette );
		},
		updateScrollX: ( layerScrollX: number, windowScrollX: number, mapWidth: number ) => {
			program.use();
			const scrollX = layerScrollX * windowScrollX;
			program.setUniform2f( `u_scroll`, scrollX * ( 1 / ( mapWidth * 8 ) ), 0 );
		},
		updateTexture: () => null,
	} );
};

const createObjectLayerRenderer = (
	ctx: WebGL2RenderingContext,
	palettes: PaletteList,
	graphics: Graphics,
	layerType: LayerType,
	selectedPalette: number,
	tilesetType: TileSetType,
	mapWidth: number,
	mapHeight: number,
): LayerRenderer => {
	const program = createShaderProgram(
		ctx,
		[
			{
				type: ShaderType.VERTEX_SHADER,
				source: `#version 300 es

					in vec2 a_position;
					in vec2 a_texture_coords;
					in vec3 a_modelx;
					in vec3 a_modely;
					in vec3 a_modelz;
					in vec3 a_texmodelx;
					in vec3 a_texmodely;
					in vec3 a_texmodelz;
					in float a_animation;
					in float a_priority;
					in float a_animation_speed;

					out vec2 v_texture_coords;

					uniform float u_animation;
					uniform vec2 u_scroll;

					void main() {
						mat3 model = mat3(
							a_modelx,
							a_modely,
							a_modelz
						);
						vec4 position = vec4( vec3( a_position, 1.0 ) * model, 1.0 ) + vec4( u_scroll, 0.0, 0.0 );
						gl_Position = vec4( position.xy, a_priority, 1.0 );
						mat3 texmodel = mat3(
							a_texmodelx,
							a_texmodely,
							a_texmodelz
						);
						float animation = 0.0;
						if ( a_animation > 0.0 ) {
							animation = mod( floor( u_animation / a_animation_speed ), a_animation ) / 64.0;
						}
						mat3 animation_model = mat3(
							vec3( 1.0, 0.0, animation ),
							vec3( 0.0, 1.0, 0.0 ),
							vec3( 0.0, 0.0, 1.0 )
						);
						vec3 coords = vec3( a_texture_coords, 1.0 ) * texmodel * animation_model;
						v_texture_coords = coords.xy;
					}
				`,
			},
			{
				type: ShaderType.FRAGMENT_SHADER,
				source: `#version 300 es

					precision mediump float;

					in vec2 v_texture_coords;

					out vec4 frag_color;

					uniform sampler2D u_palette_texture;
					uniform sampler2D u_tileset_texture;
					uniform float u_palette_index;
					uniform float u_alpha;

					void main() {
						float u_palette_count = ${ palettes.getLength() }.0;
						frag_color = texture(
							u_palette_texture,
							vec2(
								texture( u_tileset_texture, v_texture_coords ).x,
								u_palette_index / u_palette_count
							)
						);
						if ( frag_color.a == 0.0 )
						{
							discard;
						}
						frag_color.a *= u_alpha;
					}
				`,
			},
		],
	);

	const renderObject = createRenderTextureObject( ctx, program );

	// Setup textures.
	const paletteTexture = palettes.createTexture( ctx, 0 );

	const textureIndex = layerType === LayerType.block ? 1 : 2;
	const pixels = ( () => {
		if ( layerType === LayerType.sprite ) {
			return graphics.tilesets[ GraphicsTilesets.sprites ].getPixels();
		}
		const tilesetGfx = tilesetType === TileSetType.attic
			? GraphicsTilesets.atticBlocks
			: GraphicsTilesets.urbanBlocks;
		return graphics.tilesets[ GraphicsTilesets.universalBlocks ].getPixels()
			.concat( graphics.tilesets[ tilesetGfx ].getPixels() );
	} )();
	const tilesetTexture = createTexture( ctx, textureIndex, pixels, 64 * 8, 40 * 8 );
	const textureHeight = layerType === LayerType.block ? 40 : 64;

	renderObject.addTextureUniform( `u_palette_texture`, 0, paletteTexture );
	renderObject.addTextureUniform( `u_tileset_texture`, textureIndex, tilesetTexture );

	// Init palette index uniform.
	program.setUniform1f( `u_palette_index`, selectedPalette );
	program.setUniform1f( `u_alpha`, 0.5 );
	program.setUniform1f( `u_animation`, 0 );

	const instanceVbo = ctx.createBuffer();

	let canvasWidth = mapWidth * 16;
	let canvasHeight = mapHeight * 16;
	let tiles: GraphicTile[] = [];

	const generateTileModel = ( tile: GraphicTile ) => {
		const {
			animation,
			srcHeight,
			srcWidth,
			srcx,
			srcy,
			x,
			y,
			flipx,
			flipy,
			priority,
			animationSpeed,
			rotate,
		} = tile;
		const modelWidth = ( 8 / canvasWidth ) * srcWidth;
		const modelHeight = ( 8 / canvasHeight ) * srcHeight;
		const model = createMat3()
			.translate( [
				-1 + ( 1 + ( 2 / srcWidth ) * x ) * modelWidth,
				1 - ( 1 + ( 2 / srcHeight ) * y ) * modelHeight,
			] )
			.scale( [
				modelWidth * ( flipx ? -1 : 1 ),
				modelHeight * ( flipy ? -1 : 1 ),
			] )
			.rotateZ( convertDegreesToRadians( -rotate ) );
		const texmodel = createMat3()
			.translate( [
				srcx / 64,
				srcy / textureHeight,
			] )
			.scale( [
				1 / ( 64 / srcWidth ),
				1 / ( textureHeight / srcHeight ),
			] );
		return model.getList().concat( texmodel.getList() )
			.concat( animation )
			.concat( priority )
			.concat( animationSpeed );
	};

	const updateModels = () => {
		// Generate models list based on tiles.
		const modelsList = [];
		for ( let i = 0; i < tiles.length; ++i ) {
			const model = generateTileModel( tiles[ i ] );
			for ( let j = 0; j < model.length; ++j ) {
				modelsList.push( model[ j ] );
			}
		}

		ctx.bindBuffer( ctx.ARRAY_BUFFER, instanceVbo );
		ctx.bufferData(
			ctx.ARRAY_BUFFER,
			new Float32Array( modelsList ),
			ctx.DYNAMIC_DRAW,
		);
	};

	updateModels();

	[ `x`, `y`, `z` ].forEach( ( name, i ) => {
		renderObject.addInstanceAttribute( `a_model${ name }`, 3, ctx.FLOAT, false, 84, i * 12 );
	} );

	[ `x`, `y`, `z` ].forEach( ( name, i ) => {
		renderObject.addInstanceAttribute( `a_texmodel${ name }`, 3, ctx.FLOAT, false, 84, 36 + i * 12 );
	} );
	renderObject.addInstanceAttribute( `a_animation`, 1, ctx.FLOAT, false, 84, 72 );
	renderObject.addInstanceAttribute( `a_priority`, 1, ctx.FLOAT, false, 84, 76 );
	renderObject.addInstanceAttribute( `a_animation_speed`, 1, ctx.FLOAT, false, 84, 80 );

	const updateTexture = layerType === LayerType.block
		? ( tilesetType: TileSetType ) => {
			program.use();
			const pixels = ( () => {
				const tilesetGfx = tilesetType === TileSetType.attic
					? GraphicsTilesets.atticBlocks
					: GraphicsTilesets.urbanBlocks;
				return graphics.tilesets[ GraphicsTilesets.universalBlocks ].getPixels()
					.concat( graphics.tilesets[ tilesetGfx ].getPixels() );
			} )();
			const tilesetTexture = createTexture( ctx, textureIndex, pixels, 64 * 8, 40 * 8 );

			renderObject.addTextureUniform( `u_tileset_texture`, textureIndex, tilesetTexture );
		}
		: () => null;

	return Object.freeze( {
		render: () => {
			program.use();
			renderObject.renderInstances( tiles.length );
		},
		setSelectedLayer: ( isSelected: boolean ) => {
			program.use();
			program.setUniform1f( `u_alpha`, isSelected ? 1 : 0.5 );
		},
		updateAnimationFrame: ( frame: number ) => {
			program.use();
			program.setUniform1f( `u_animation`, frame );
		},
		updateBackground: () => null,
		updateDimensions: ( width: number, height: number ) => {
			program.use();
			canvasWidth = width * 16;
			canvasHeight = height * 16;
			updateModels();
		},
		updateObjects: ( objects: MapObject[], tilesetType: TileSetType ) => {
			program.use();

			// Generate tiles from objects.
			const typeFactory = getBlockTypeFactory( layerType, tilesetType );
			tiles = [];
			for ( let i = 0; i < objects.length; ++i ) {
				const object = objects[ i ];
				const objectTiles = typeFactory[ object.type() ].generateTiles( object, [] );
				for ( let j = 0; j < objectTiles.length; ++j ) {
					const tile = objectTiles[ j ];
					if ( object.type() > 255 ) {
						tile.srcy += 8;
					}
					tiles.push( tile );
				}
			}

			// Sort by priority.
			tiles.sort( ( a: GraphicTile, b: GraphicTile ) => b.priority - a.priority );

			updateModels();
		},
		updatePalette: ( palette: number ) => {
			program.use();
			program.setUniform1f( `u_palette_index`, palette );
		},
		updateScrollX: ( layerScrollX: number, windowScrollX: number, mapWidth: number ) => {
			program.use();
			const scrollX = layerScrollX * windowScrollX;
			program.setUniform2f( `u_scroll`, scrollX * ( 1 / ( mapWidth * 8 ) ), 0 );
		},
		updateTexture,
	} );
};

const createLayerRenderer = (
	ctx: WebGL2RenderingContext,
	palettes: PaletteList,
	graphics: Graphics,
	layerType: LayerType,
	selectedPalette: number,
	tilesetType: TileSetType,
	mapWidth: number,
	mapHeight: number,
	layer: Layer,
): LayerRenderer => {
	return layerType === LayerType.background
		? createBackgroundLayerRenderer(
			ctx,
			palettes,
			graphics,
			layerType,
			selectedPalette,
			tilesetType,
			mapWidth,
			mapHeight,
			layer,
		)
		: createObjectLayerRenderer(
			ctx,
			palettes,
			graphics,
			layerType,
			selectedPalette,
			tilesetType,
			mapWidth,
			mapHeight,
		);
};

export default createLayerRenderer;
