import { getTypeFactory } from './objects';
import {
	Graphics,
	GraphicTile,
	Layer,
	LayerType,
	LvMap,
	MapObject,
	ObjectRenderer,
	PaletteList,
	Rect,
	ShaderType,
} from './types';
import { createMat3 } from './mat';
import {
	createRenderRectObject,
	createRenderTextureObject,
	createShaderProgram,
} from './render';

const createObjectRenderer = (
	ctx: WebGL2RenderingContext,
	palettes: PaletteList,
	graphics: Graphics,
	layerType: LayerType,
	selectedPalette: number,
): ObjectRenderer => {
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
	const graphicsType: string = layerType === LayerType.block ? `blocks` : `sprites`;
	const textureIndex = layerType === LayerType.block ? 1 : 2;
	const tilesetTexture = graphics[ graphicsType ].createTexture( ctx, textureIndex );
	renderObject.addTextureUniform( `u_palette_texture`, 0, paletteTexture );
	renderObject.addTextureUniform( `u_tileset_texture`, textureIndex, tilesetTexture );

	// Init palette index uniform.
	program.setUniform1f( `u_palette_index`, selectedPalette );
	program.setUniform1f( `u_alpha`, 0.5 );
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
						-1 + ( 1 + ( 2 / srcWidth ) * x ) * modelWidth,
						1 - ( 1 + ( 2 / srcHeight ) * y ) * modelHeight,
					] )
					.scale( [
						modelWidth * ( flipx ? -1 : 1 ),
						modelHeight * ( flipy ? -1 : 1 ),
					] );
				const texmodel = createMat3()
					.translate( [
						srcx / 64,
						srcy / 64,
					] )
					.scale( [
						1 / ( 64 / srcWidth ),
						1 / ( 64 / srcHeight ),
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
		updateObjects: ( objects: MapObject[] ) => {
			program.use();
			const typeFactory = getTypeFactory( layerType );
			tiles = objects.reduce(
				( acc: GraphicTile[], object: MapObject ) => {
					return acc.concat( typeFactory[ object.type() ].generateTiles( object ) );
				},
				[],
			);
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
	} );
};

const createMapRenderer = (
	ctx: WebGL2RenderingContext,
	palettes: PaletteList,
	graphics: Graphics,
	layers: Layer[],
	selectedPalette: number,
) => {
	ctx.enable( ctx.BLEND );
	ctx.blendFunc( ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA );
	ctx.viewport( 0, 0, ctx.canvas.width, ctx.canvas.height );

	let objectRenderers = layers
		.map( ( layer: Layer ) => createObjectRenderer( ctx, palettes, graphics, layer.type, selectedPalette ) );

	objectRenderers.forEach( ( objectRenderer: ObjectRenderer, i: number ) => {
		objectRenderer.updateObjects( layers[ i ].objects );
		objectRenderer.updatePalette( selectedPalette );
	} );

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
							gl_Position = vec4( a_position, 0.0, 1.0 );
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
							frag_color = vec4( 0.0, 0.5, 1.0, 0.75 );
						}
					`,
				},
			],
		);
		program.use();

		const renderObject = createRenderRectObject( ctx, program );

		renderObject.addUniform( `u_resolution`, `2f`, [ ctx.canvas.width, ctx.canvas.height ] );

		return Object.freeze( {
			render: renderObject.render,
			updateDimensions: ( width: number, height: number ) => {
				program.use();
				renderObject.addUniform( `u_resolution`, `2f`, [ width * 16, height * 16 ] );
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

		let canvasWidth = ctx.canvas.width / 16;
		let canvasHeight = ctx.canvas.height / 16;
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
					return createMat3()
						.translate( [
							-1 + modelWidth + ( 2 / canvasWidth ) * x,
							1 - modelHeight - ( 2 / canvasHeight ) * y,
						] )
						.scale( [ modelWidth, modelHeight ] )
						.getList();
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
			setSelected: ( i: number | null, objects: MapObject[], layerType: LayerType ) => {
				program.use();
				const typeFactory = getTypeFactory( layerType );
				rects = i === null
					? []
					: typeFactory[ objects[ i ].type() ].generateHighlight( objects[ i ] );
				updateModels();
			},
		} );
	} )();

	const selectedTile = ( () => {
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
							frag_color = vec4( 0.0, 0.5, 1.0, 0.5 );
						}
					`,
				},
			],
		);
		program.use();

		const renderObject = createRenderRectObject( ctx, program );

		let width = ctx.canvas.width / 16;
		let height = ctx.canvas.height / 16;
		let x = 0;
		let y = 0;

		const updateModel = () => {
			const modelWidth = 1 / width;
			const modelHeight = 1 / height;
			const model = createMat3()
				.translate( [
					-1 + modelWidth + ( 2 / width ) * x,
					1 - modelHeight - ( 2 / height ) * y,
				] )
				.scale( [ modelWidth, modelHeight ] );
			renderObject.addUniform( `u_model`, `3fv`, model.getList() );
		};

		updateModel();

		return Object.freeze( {
			render: renderObject.render,
			updateDimensions: ( newWidth: number, newHeight: number ) => {
				program.use();
				width = newWidth;
				height = newHeight;
				updateModel();
			},
			updatePosition: ( newX: number, newY: number ) => {
				program.use();
				x = newX;
				y = newY;
				updateModel();
			},
		} );
	} )();

	let isATileSelected: boolean = false;
	let isAnObjectSelected: boolean = false;

	return Object.freeze( {
		changeMap: ( map: LvMap ) => {
			const { width, height, layers, palette } = map.getProps();

			ctx.viewport( 0, 0, width * 16, height * 16 );
			gridLines.updateDimensions( width, height );

			objectRenderers = layers
				.map( ( layer: Layer ) => createObjectRenderer( ctx, palettes, graphics, layer.type, palette ) );

			objectRenderers.forEach( ( objectRenderer: ObjectRenderer, i: number ) => {
				objectRenderer.updateObjects( layers[ i ].objects );
				objectRenderer.updatePalette( palette );
				objectRenderer.updateDimensions( width, height );
			} );
		},
		render: () => {
			ctx.clear( ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT );
			ctx.clearColor( 0.0, 0.0, 0.0, 0.0 );
			objectRenderers.forEach( ( objectRenderer: ObjectRenderer ) => {
				objectRenderer.render();
			} );
			gridLines.render();
			if ( isAnObjectSelected ) {
				selectedObject.render();
			}
			if ( isATileSelected ) {
				selectedTile.render();
			}
		},
		updateAnimationFrame: ( frame: number ) => {
			objectRenderers.forEach( ( objectRenderer: ObjectRenderer ) => {
				objectRenderer.updateAnimationFrame( frame );
			} );
		},
		updateDimensions: ( width: number, height: number ) => {
			ctx.viewport( 0, 0, width * 16, height * 16 );
			objectRenderers.forEach( ( objectRenderer: ObjectRenderer ) => {
				objectRenderer.updateDimensions( width, height );
			} );
			gridLines.updateDimensions( width, height );
			selectedObject.updateCanvas( width, height );
			selectedTile.updateDimensions( width, height );
		},
		updateLayerObjects: ( layer: number, objects: MapObject[] ) => {
			objectRenderers[ layer ].updateObjects( objects );
		},
		updatePalette: ( palette: number ) => {
			objectRenderers.forEach( ( objectRenderer: ObjectRenderer ) => {
				objectRenderer.updatePalette( palette );
			} );
		},
		addLayer: ( type: LayerType, selectedPalette: number ) => {
			objectRenderers.push( createObjectRenderer( ctx, palettes, graphics, type, selectedPalette ) );
		},
		removeLayer: ( layer: number ) => {
			objectRenderers.splice( layer, 1 );
		},
		setSelectedLayer: ( selectedLayer: number ) => {
			objectRenderers.forEach( ( objectRenderer: ObjectRenderer, i: number ) => {
				objectRenderer.setSelectedLayer( selectedLayer === i );
			} );
		},
		setSelectedObject: ( i: number | null, objects: MapObject[], layerType: LayerType = LayerType.block ) => {
			isAnObjectSelected = i !== null;
			if ( isAnObjectSelected ) {
				selectedObject.setSelected( i, objects, layerType );
			}
		},
		setSelectedTile: ( x: number | null, y: number | null ) => {
			isATileSelected = x !== null && y !== null;
			if ( x !== null && y !== null ) {
				selectedTile.updatePosition( x, y );
			}
		},
		switchLayers( layer1: number, layer2: number ) {
			const temp = objectRenderers[ layer1 ];
			objectRenderers[ layer1 ] = objectRenderers[ layer2 ];
			objectRenderers[ layer2 ] = temp;
		},
		updateScrollX: ( windowScrollX: number, map: LvMap ) => {
			const { layers, width } = map.getProps();
			objectRenderers.forEach( ( objectRenderer: ObjectRenderer, i: number ) => {
				objectRenderer.updateScrollX( layers[ i ].scrollX, windowScrollX, width );
			} );
		},
	} );
};

export { createMapRenderer };
