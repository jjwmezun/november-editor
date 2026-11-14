import { getBlockTypeFactory } from './objects';
import {
	Graphics,
	Layer,
	LayerType,
	LvMap,
	MapObject,
	LayerRenderer,
	PaletteList,
	Rect,
	ShaderType,
	TileSetType,
} from './types';
import { createMat3 } from './mat';
import {
	createRenderRectObject,
	createShaderProgram,
} from './render';
import createLayerRenderer from './render-layer';

const createMapRenderer = (
	ctx: WebGL2RenderingContext,
	palettes: PaletteList,
	graphics: Graphics,
	layers: Layer[],
	selectedPalette: number,
	tilesetType: TileSetType,
	mapWidth: number,
	mapHeight: number,
	magnification: number,
) => {
	ctx.enable( ctx.BLEND );
	ctx.blendFunc( ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA );
	ctx.viewport( 0, 0, mapWidth * 16 * magnification, mapHeight * 16 * magnification );

	let layerRenderers = layers
		.map( ( layer: Layer ) => createLayerRenderer(
			ctx,
			palettes,
			graphics,
			layer.type,
			selectedPalette,
			tilesetType,
			mapWidth,
			mapHeight,
			layer,
		) );

	layerRenderers.forEach( ( layerRenderer: LayerRenderer, i: number ) => {
		const objects = `objects` in layers[ i ].data ? layers[ i ].data.objects : [];
		layerRenderer.updateObjects( objects, tilesetType );
		layerRenderer.updatePalette( selectedPalette );
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

						uniform float u_opacity;

						void main() {
							float x = mod( v_position.x, 16.0 );
							float y = mod( v_position.y, 16.0 );
							if ( x > 1.0 && y > 1.0 ) {
								discard;
							}
							frag_color = vec4( 0.0, 0.5, 1.0, u_opacity );
						}
					`,
				},
			],
		);
		program.use();

		const renderObject = createRenderRectObject( ctx, program );

		renderObject.addUniform( `u_resolution`, `2f`, [ mapWidth * 16, mapHeight * 16 ] );
		renderObject.addUniform( `u_opacity`, `1f`, [ 0.75 ] );

		return Object.freeze( {
			render: renderObject.render,
			updateDimensions: ( width: number, height: number ) => {
				program.use();
				renderObject.addUniform( `u_resolution`, `2f`, [ width * 16, height * 16 ] );
			},
			updateOpacity: ( opacity: number ) => {
				program.use();
				renderObject.addUniform( `u_opacity`, `1f`, [ opacity ] );
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

		let canvasWidth = mapWidth;
		let canvasHeight = mapHeight;
		let rects: Rect[] = [];

		const instanceVbo = ctx.createBuffer();

		const updateModels = () => {
			const modelsList: number[] = [];
			for ( let i = 0; i < rects.length; ++i ) {
				const rect = rects[ i ];
				const {
					x,
					y,
					width,
					height,
				} = rect;
				const modelWidth = width / canvasWidth;
				const modelHeight = height / canvasHeight;
				const model = createMat3()
					.translate( [
						-1 + modelWidth + ( 2 / canvasWidth ) * x,
						1 - modelHeight - ( 2 / canvasHeight ) * y,
					] )
					.scale( [ modelWidth, modelHeight ] )
					.getList();
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
				const typeFactory = getBlockTypeFactory( layerType, tilesetType );
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

		let width = mapWidth;
		let height = mapHeight;
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

			layerRenderers = layers
				.map( ( layer: Layer ) => createLayerRenderer(
					ctx,
					palettes,
					graphics,
					layer.type,
					palette,
					map.getTilesetType(),
					width,
					height,
					layer,
				) );

			layerRenderers.forEach( ( layerRenderer: LayerRenderer, i: number ) => {
				const objects = `objects` in layers[ i ].data ? layers[ i ].data.objects : [];
				layerRenderer.updateObjects( objects, map.getTilesetType() );
				layerRenderer.updatePalette( palette );
				layerRenderer.updateDimensions( width, height );
			} );
		},
		render: () => {
			ctx.clear( ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT );
			ctx.clearColor( 0.0, 0.0, 0.0, 0.0 );
			layerRenderers.forEach( ( layerRenderer: LayerRenderer ) => {
				layerRenderer.render();
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
			layerRenderers.forEach( ( layerRenderer: LayerRenderer ) => {
				layerRenderer.updateAnimationFrame( frame );
			} );
		},
		updateBackground: ( selectedLayer: number, background: number ) => {
			layerRenderers[ selectedLayer ].updateBackground( background );
		},
		updateDimensions: ( width: number, height: number ) => {
			ctx.viewport( 0, 0, width * 16 * 2, height * 16 * 2 );
			layerRenderers.forEach( ( layerRenderer: LayerRenderer ) => {
				layerRenderer.updateDimensions( width, height );
			} );
			gridLines.updateDimensions( width, height );
			selectedObject.updateCanvas( width, height );
			selectedTile.updateDimensions( width, height );
		},
		updateGridOpacity: ( opacity: number ) => {
			gridLines.updateOpacity( opacity );
		},
		updateLayerObjects: ( layer: number, objects: MapObject[], tilesetType : TileSetType ) => {
			if ( layer >= layerRenderers.length ) {
				return;
			}
			layerRenderers[ layer ].updateObjects( objects, tilesetType );
		},
		updateMagnification: ( width: number, height: number, magnification: number ) => {
			ctx.viewport( 0, 0, width * 16 * magnification, height * 16 * magnification );
		},
		updatePalette: ( palette: number ) => {
			layerRenderers.forEach( ( layerRenderer: LayerRenderer ) => {
				layerRenderer.updatePalette( palette );
			} );
		},
		addLayer: ( layer: Layer, selectedPalette: number, tilesetType : TileSetType ) => {
			layerRenderers.push( createLayerRenderer(
				ctx,
				palettes,
				graphics,
				layer.type,
				selectedPalette,
				tilesetType,
				mapWidth,
				mapHeight,
				layer,
			) );
		},
		removeLayer: ( layer: number ) => {
			layerRenderers.splice( layer, 1 );
		},
		setSelectedLayer: ( selectedLayer: number ) => {
			layerRenderers.forEach( ( layerRenderer: LayerRenderer, i: number ) => {
				layerRenderer.setSelectedLayer( selectedLayer === i );
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
			const temp = layerRenderers[ layer1 ];
			layerRenderers[ layer1 ] = layerRenderers[ layer2 ];
			layerRenderers[ layer2 ] = temp;
		},
		updateScrollX: ( windowScrollX: number, map: LvMap ) => {
			const { layers, width } = map.getProps();
			layerRenderers.forEach( ( layerRenderer: LayerRenderer, i: number ) => {
				layerRenderer.updateScrollX( layers[ i ].data.scrollX, windowScrollX, width );
			} );
		},
		updateTexture: ( tilesetType : TileSetType ) => {
			layerRenderers.forEach( ( layerRenderer: LayerRenderer ) => {
				layerRenderer.updateTexture( tilesetType );
			} );
		},
	} );
};

export { createMapRenderer };
