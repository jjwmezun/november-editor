import {
	GraphicsEntry,
	GraphicTile,
	MapObject,
	Overworld,
	OverworldLayer,
	OverworldLayerType,
	PaletteList,
	Rect,
	ShaderType,
} from './types';
import {
	createRenderRectObject,
	createRenderTextureObject,
	createShaderProgram,
} from './render';
import { createMat3 } from './mat';
import { getOverworldTypeFactory } from './objects';

function generateRenderer(
	canvas: HTMLCanvasElement,
	overworld: Overworld,
	graphics: GraphicsEntry,
	palettes: PaletteList,
	selectedPalette: number,
	selectedLayer: number,
) {
	const ctx = canvas.getContext( `webgl2` );
	if ( !ctx ) {
		throw new Error( `WebGL2 context not available` );
	}
	ctx.enable( ctx.BLEND );
	ctx.blendFunc( ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA );
	ctx.viewport( 0, 0, ctx.canvas.width, ctx.canvas.height );

	const layers = overworld.getLayersList();

	let objectRenderers = layers.map( ( _l: OverworldLayer, i: number ) => createObjectRenderer(
		ctx,
		palettes,
		graphics,
		selectedPalette,
		selectedLayer === i,
	) );

	objectRenderers.forEach( ( objectRenderer: OverworldObjectRenderer, i: number ) => {
		objectRenderer.updateObjects( layers[ i ].getObjectsList() );
		objectRenderer.updatePalette( selectedPalette );
	} );

	const water = ( () => {
		const program = createShaderProgram(
			ctx,
			[
				{
					type: ShaderType.VERTEX_SHADER,
					source: `#version 300 es

						in vec2 a_position;
						in vec2 a_texture_coords;
						in vec2 a_trans;
						in float a_direction;
	
						out vec2 v_texture_coords;

						uniform mat3 u_scale;
						uniform float u_xscroll;
	
						void main() {
							mat3 trans = mat3(
								1.0, 0.0, a_trans.x + a_direction * u_xscroll,
								0.0, 1.0, a_trans.y,
								0.0, 0.0, 1.0
							);
							gl_Position = vec4( vec3( a_position, 1.0 ) * u_scale * trans, 1.0 );
							v_texture_coords = a_texture_coords;
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
	
						void main() {
							float u_palette_count = ${ palettes.getLength() }.0;
							frag_color = texture(
								u_palette_texture,
								vec2(
									texture( u_tileset_texture, v_texture_coords ).x,
									u_palette_index / u_palette_count
								)
							);
						}
					`,
				},
			],
		);

		const renderObject = createRenderTextureObject(
			ctx,
			program,
			`a_position`,
			`a_texture_coords`,
			[
				1.0, 1.0,   // top right vertex
				1.0 / graphics.getWidthTiles(), 0.0,   // top right texture coord
				1.0, -1.0,  // bottom right vertex
				1.0 / graphics.getWidthTiles(), 1.0 / graphics.getHeightTiles(),   // bottom right texture coord
				-1.0, -1.0, // bottom left vertex
				0.0, 1.0 / graphics.getHeightTiles(),   // bottom left texture coord
				-1.0, 1.0,  // top left vertex
				0.0, 0.0,   // top left texture coord
			],
		);

		// Add textures.
		const paletteTexture = palettes.createTexture( ctx, 0 );
		const tilesetTexture = graphics.createTexture( ctx, 1 );
		renderObject.addTextureUniform( `u_palette_texture`, 0, paletteTexture );
		renderObject.addTextureUniform( `u_tileset_texture`, 1, tilesetTexture );

		// Init palette index uniform.
		program.setUniform1f( `u_palette_index`, selectedPalette );

		// Add scale matrix uniform.
		const scale = createMat3()
			.scale( [ 1 / overworld.getWidthTiles(), 1 / overworld.getHeightTiles() ] );
		renderObject.addUniform( `u_scale`, `3fv`, new Float32Array( scale.getList() ) );

		// Add trans instances.
		const oddTiles: number[] = [];
		for ( let y = 0; y < overworld.getHeightTiles(); y += 2 ) {
			for ( let x = -1; x < overworld.getWidthTiles() + 1; ++x ) {
				oddTiles.push(
					-1 + ( 1 + x * 2 ) / overworld.getWidthTiles(),
					1 - ( 1 + y * 2 ) / overworld.getHeightTiles(),
					-1.0,
				);
				oddTiles.push(
					-1 + ( 1 + x * 2 ) / overworld.getWidthTiles(),
					1 - ( 1 + ( y + 1 ) * 2 ) / overworld.getHeightTiles(),
					1.0,
				);
			}
		}
		const instanceVbo = ctx.createBuffer();
		ctx.bindBuffer( ctx.ARRAY_BUFFER, instanceVbo );
		ctx.bufferData(
			ctx.ARRAY_BUFFER,
			new Float32Array( oddTiles ),
			ctx.DYNAMIC_DRAW,
		);
		renderObject.addInstanceAttribute( `a_trans`, 2, ctx.FLOAT, false, 12, 0 );
		renderObject.addInstanceAttribute( `a_direction`, 2, ctx.FLOAT, false, 12, 8 );

		// Add xscroll uniform.
		program.setUniform1f( `u_xscroll`, 0.0 );

		const render = () => renderObject.renderInstances( Math.floor( oddTiles.length / 2 ) );

		return Object.freeze( {
			render,
			updateAnimation: ( delta: number ): void => {
				program.use();
				const xscroll = ( ( delta / 1000 ) * 0.05 ) % ( 1 / overworld.getWidthTiles() );
				program.setUniform1f( `u_xscroll`, xscroll );
			},
			updateSelectedPalette: ( selectedPalette: number ): void => {
				program.use();
				program.setUniform1f( `u_palette_index`, selectedPalette );
			},
		} );
	} )();

	const selectedObject = ( () => {
		const program = createShaderProgram(
			ctx,
			[
				{
					type: ShaderType.VERTEX_SHADER,
					source: `#version 300 es

						in vec2 a_position;
						in vec3 a_modelx;
						in vec3 a_modely;
						in vec3 a_modelz;

						void main() {
							mat3 model = mat3(
								a_modelx,
								a_modely,
								a_modelz
							);
							gl_Position = vec4( vec3( a_position, 1.0 ) * model, 1.0 );
						}
					`,
				},
				{
					type: ShaderType.FRAGMENT_SHADER,
					source: `#version 300 es

						precision mediump float;

						out vec4 frag_color;

						void main() {
							frag_color = vec4( 0.0, 0.5, 1.0, 0.5 );
						}
					`,
				},
			],
		);
		program.use();

		const renderObject = createRenderRectObject( ctx, program );

		let canvasWidth = ctx.canvas.width / 32;
		let canvasHeight = ctx.canvas.height / 32;
		let rects: Rect[] = [];

		const instanceVbo = ctx.createBuffer();

		const updateModels = () => {
			const modelsList: number[] = rects.reduce(
				( acc: number[], rect: Rect ) => {
					const {
						x,
						y,
						width,
						height,
					} = rect;
					const modelWidth = width / canvasWidth;
					const modelHeight = height / canvasHeight;
					return acc.concat( createMat3()
						.translate( [
							-1 + modelWidth + ( 2 / canvasWidth ) * x,
							1 - modelHeight - ( 2 / canvasHeight ) * y,
						] )
						.scale( [ modelWidth, modelHeight ] )
						.getList() );
				},
				[],
			);

			ctx.bindBuffer( ctx.ARRAY_BUFFER, instanceVbo );
			ctx.bufferData(
				ctx.ARRAY_BUFFER,
				new Float32Array( modelsList ),
				ctx.DYNAMIC_DRAW,
			);
		};

		updateModels();

		[ `x`, `y`, `z` ].forEach( ( name, i ) => {
			renderObject.addInstanceAttribute( `a_model${ name }`, 3, ctx.FLOAT, false, 36, i * 12 );
		} );

		return Object.freeze( {
			render: () => renderObject.renderInstances( rects.length ),
			updateCanvas: ( newWidth: number, newHeight: number ) => {
				program.use();
				canvasWidth = newWidth;
				canvasHeight = newHeight;
				updateModels();
			},
			setSelected: ( i: number | null, objects: readonly MapObject[] ) => {
				program.use();
				const typeFactory = getOverworldTypeFactory( OverworldLayerType.block );
				rects = i === null
					? []
					: typeFactory[ objects[ i ].type() ].generateHighlight( objects[ i ] );
				updateModels();
			},
		} );
	} )();

	const hover = ( () => {
		const program = createShaderProgram(
			ctx,
			[
				{
					type: ShaderType.VERTEX_SHADER,
					source: `#version 300 es

						in vec2 a_position;

						uniform mat3 u_model;

						void main() {
							gl_Position = vec4( vec3( a_position, 1.0 ) * u_model, 1.0 );
						}
					`,
				},
				{
					type: ShaderType.FRAGMENT_SHADER,
					source: `#version 300 es

						precision mediump float;

						out vec4 frag_color;

						void main() {
							frag_color = vec4( 1.0, 1.0, 0.0, 0.5 );
						}
					`,
				},
			],
		);

		const renderObject = createRenderRectObject( ctx, program );

		let x = -1;
		let y = -1;
		const updateModel = () => {
			const model = createMat3()
				.translate( [
					-1 + ( 1 + x * 2 ) / overworld.getWidthBlocks(),
					1 - ( 1 + y * 2 ) / overworld.getHeightBlocks(),
				] )
				.scale( [ 1 / overworld.getWidthBlocks(), 1 / overworld.getHeightBlocks() ] );
			renderObject.addUniform( `u_model`, `3fv`, new Float32Array( model.getList() ) );
		};
		updateModel();

		return Object.freeze( {
			render: () => {
				program.use();
				renderObject.render();
			},
			updatePosition: ( _x: number, _y: number ): void => {
				if ( x === _x && y === _y ) {
					return;
				}
				x = _x;
				y = _y;
				program.use();
				updateModel();
			},
		} );
	} )();

	const gridLines = ( () => {
		const program = createShaderProgram(
			ctx,
			[
				{
					type: ShaderType.VERTEX_SHADER,
					source: `#version 300 es

						in vec2 a_position;

						out vec2 v_position;

						uniform vec2 u_resolution;

						void main() {
							gl_Position = vec4( a_position, 1.0, 1.0 );
							v_position = ( a_position + vec2( 1.0, 1.0 ) )
								/ vec2( 2.0, 2.0 )
								* vec2( u_resolution.x, u_resolution.y );
						}
					`,
				},
				{
					type: ShaderType.FRAGMENT_SHADER,
					source: `#version 300 es

						precision mediump float;

						in vec2 v_position;

						out vec4 frag_color;

						void main() {
							float x = mod( v_position.x, 16.0 );
							float y = mod( v_position.y, 16.0 );
							if ( x > 1.0 && y > 1.0 ) {
								discard;
							}
							frag_color = vec4( 1.0, 0.0, 0.0, 0.75 );
						}
					`,
				},
			],
		);

		const renderObject = createRenderRectObject( ctx, program );
		program.setUniform2f( `u_resolution`, overworld.getWidthPixels(), overworld.getHeightPixels() );

		return Object.freeze( {
			render: () => {
				program.use();
				renderObject.render();
			},
		} );
	} )();

	let showGrid = true;

	const updateAnimation = ( delta: number ): void => {
		water.updateAnimation( delta );
		render();
		window.requestAnimationFrame( updateAnimation );
	};
	window.requestAnimationFrame( updateAnimation );

	const render = () => {
		ctx.clearColor( 0.0, 0.0, 0.0, 0.0 );
		ctx.clear( ctx.COLOR_BUFFER_BIT );
		water.render();
		objectRenderers.forEach( ( objectRenderer: OverworldObjectRenderer ) => {
			objectRenderer.render();
		} );
		selectedObject.render();
		hover.render();
		if ( showGrid ) {
			gridLines.render();
		}
	};

	return Object.freeze( {
		render,
		setSelectedObject: ( i: number | null, objects: readonly MapObject[] ) => {
			selectedObject.setSelected( i, objects );
		},
		updateLayers: ( overworld: Overworld, selectedLayer: number ): void => {
			const layers = overworld.getLayersList();
			objectRenderers = layers.map( ( layer: OverworldLayer, i: number ) => {
				const objectRenderer = createObjectRenderer(
					ctx,
					palettes,
					graphics,
					selectedPalette,
					selectedLayer === i,
				);
				objectRenderer.updateObjects( layer.getObjectsList() );
				objectRenderer.updatePalette( selectedPalette );
				objectRenderer.updateDimensions(
					overworld.getWidthTiles(),
					overworld.getHeightTiles(),
				);
				return objectRenderer;
			} );
		},
		updateLayerObjects: ( layer: number, objects: readonly MapObject[], i: number ) => {
			objectRenderers[ layer ].updateObjects( objects );
			selectedObject.setSelected( i, objects );
		},
		updateHoverTile: ( x: number, y: number ): void => {
			hover.updatePosition( x, y );
			render();
		},
		updateSelectedObject: ( i: number | null, objects: readonly MapObject[] ): void => {
			selectedObject.setSelected( i, objects );
			render();
		},
		updateSelectedLayer: ( selectedLayer: number ): void => {
			objectRenderers.forEach( ( objectRenderer: OverworldObjectRenderer, i: number ) => {
				objectRenderer.setSelectedLayer( selectedLayer === i );
			} );
		},
		updateShowGrid: ( _showGrid: boolean ): void => {
			showGrid = _showGrid;
		},
	} );
}

function createObjectRenderer(
	ctx: WebGL2RenderingContext,
	palettes: PaletteList,
	graphics: GraphicsEntry,
	selectedPalette: number,
	isSelected: boolean,
): OverworldObjectRenderer {
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

					out vec2 v_texture_coords;

					uniform float u_animation;
					uniform vec2 u_scroll;

					void main() {
						mat3 model = mat3(
							a_modelx,
							a_modely,
							a_modelz
						);
						gl_Position = vec4( vec3( a_position, 1.0 ) * model, 1.0 ) + vec4( u_scroll, 0.0, 0.0 );
						mat3 texmodel = mat3(
							a_texmodelx,
							a_texmodely,
							a_texmodelz
						);
						float animation = mod( u_animation, a_animation ) - 1.0;
						vec3 coords = vec3( a_texture_coords, 1.0 ) * texmodel;
						v_texture_coords = coords.xy;
						if ( animation > 0.0 ) {
							v_texture_coords.x += animation * ( 2.0 / 64.0 );
						}
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
						frag_color.a *= u_alpha;
					}
				`,
			},
		],
	);

	const renderObject = createRenderTextureObject( ctx, program );

	// Setup textures.
	const paletteTexture = palettes.createTexture( ctx, 0 );
	const tilesetTexture = graphics.createTexture( ctx, 1 );
	renderObject.addTextureUniform( `u_palette_texture`, 0, paletteTexture );
	renderObject.addTextureUniform( `u_tileset_texture`, 1, tilesetTexture );

	// Init palette index uniform.
	program.setUniform1f( `u_palette_index`, selectedPalette );
	program.setUniform1f( `u_alpha`, isSelected ? 1.0 : 0.5 );
	program.setUniform1f( `u_animation`, 0 );

	const instanceVbo = ctx.createBuffer();

	let canvasWidth = ctx.canvas.width;
	let canvasHeight = ctx.canvas.height;
	let tiles: GraphicTile[] = [];

	const updateModels = () => {
		const modelsList: number[] = tiles.reduce(
			( acc: number[], tile: GraphicTile ) => {
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
				} = tile;
				const modelWidth = ( 8 / canvasWidth ) * srcWidth;
				const modelHeight = ( 8 / canvasHeight ) * srcHeight;
				const model = createMat3()
					.translate( [
						-1 + ( 1 + ( 2 / srcWidth ) * x ) * modelWidth * 2,
						1 - ( 1 + ( 2 / srcHeight ) * y ) * modelHeight * 2,
					] )
					.scale( [
						modelWidth * 2 * ( flipx ? -1 : 1 ),
						modelHeight * 2 * ( flipy ? -1 : 1 ),
					] );
				const texmodel = createMat3()
					.translate( [
						srcx / graphics.getWidthTiles(),
						srcy / graphics.getHeightTiles(),
					] )
					.scale( [
						1 / ( graphics.getWidthTiles() / srcWidth ),
						1 / ( graphics.getWidthTiles() / srcHeight ),
					] );
				return acc.concat( model.getList().concat( texmodel.getList() ) ).concat( animation );
			},
			[],
		);

		ctx.bindBuffer( ctx.ARRAY_BUFFER, instanceVbo );
		ctx.bufferData(
			ctx.ARRAY_BUFFER,
			new Float32Array( modelsList ),
			ctx.DYNAMIC_DRAW,
		);
	};

	updateModels();

	[ `x`, `y`, `z` ].forEach( ( name, i ) => {
		renderObject.addInstanceAttribute( `a_model${ name }`, 3, ctx.FLOAT, false, 76, i * 12 );
	} );

	[ `x`, `y`, `z` ].forEach( ( name, i ) => {
		renderObject.addInstanceAttribute( `a_texmodel${ name }`, 3, ctx.FLOAT, false, 76, 36 + i * 12 );
	} );
	renderObject.addInstanceAttribute( `a_animation`, 1, ctx.FLOAT, false, 76, 72 );

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
		updateDimensions: ( width: number, height: number ) => {
			program.use();
			canvasWidth = width * 16;
			canvasHeight = height * 16;
			updateModels();
		},
		updateObjects: ( objects: readonly MapObject[] ) => {
			program.use();
			const typeFactory = getOverworldTypeFactory( OverworldLayerType.block );
			tiles = objects.reduce(
				( acc: GraphicTile[], object: MapObject ) => {
					return acc.concat( typeFactory[ object.type() ].generateTiles( object, acc ) );
				},
				[],
			);
			updateModels();
		},
		updatePalette: ( palette: number ) => {
			program.use();
			program.setUniform1f( `u_palette_index`, palette );
		},
	} );
}

interface OverworldObjectRenderer {
	render: () => void;
	setSelectedLayer: ( isSelected: boolean ) => void;
	updateAnimationFrame: ( frame: number ) => void;
	updateDimensions: ( width: number, height: number ) => void;
	updateObjects: ( objects: readonly MapObject[] ) => void;
	updatePalette: ( palette: number ) => void;
}

export default generateRenderer;
