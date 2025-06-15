import { ReactElement, useEffect, useRef, useState } from 'react';
import { getMousePosition } from '../../../common/utils';
import { tileSize } from '../../../common/constants';
import {
	Coordinates,
	GraphicsEntry,
	PaletteList,
	ShaderType,
	TileEditorProps,
} from '../../../common/types';
import { createMat3 } from '../../../common/mat';
import {
	createRenderRectObject,
	createRenderTextureObject,
	createShaderProgram,
} from '../../../common/render';

const pixelZoom: number = 16;
const width: number = tileSize * pixelZoom;
const height: number = tileSize * pixelZoom;

const brushLayouts: readonly Coordinates[][] = Object.freeze( [
	[ { x: 0, y: 0 } ],
	[
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
	],
	[
		{ x: 0, y: 0 },
		{ x: -1, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: -1 },
		{ x: 0, y: 1 },
	],
	[
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: -1, y: 0 },
		{ x: -1, y: 1 },
		{ x: 2, y: 0 },
		{ x: 2, y: 1 },
		{ x: 0, y: -1 },
		{ x: 1, y: -1 },
		{ x: 0, y: 2 },
		{ x: 1, y: 2 },
	],
	[
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: -1, y: -1 },
		{ x: 0, y: -1 },
		{ x: 1, y: -1 },
		{ x: -1, y: 1 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: -2, y: -1 },
		{ x: -2, y: 0 },
		{ x: -2, y: 1 },
		{ x: 2, y: -1 },
		{ x: 2, y: 0 },
		{ x: 2, y: 1 },
		{ x: -1, y: -2 },
		{ x: 0, y: -2 },
		{ x: 1, y: -2 },
		{ x: -1, y: 2 },
		{ x: 0, y: 2 },
		{ x: 1, y: 2 },
	],
	[
		{ x: 0, y: 0 },
		{ x: -1, y: 0 },
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
		{ x: 0, y: -1 },
		{ x: -1, y: -1 },
		{ x: 1, y: -1 },
		{ x: 2, y: -1 },
		{ x: 0, y: 1 },
		{ x: -1, y: 1 },
		{ x: 1, y: 1 },
		{ x: 2, y: 1 },
		{ x: 0, y: 2 },
		{ x: -1, y: 2 },
		{ x: 1, y: 2 },
		{ x: 2, y: 2 },
		{ x: 0, y: -2 },
		{ x: 1, y: -2 },
		{ x: 0, y: 3 },
		{ x: 1, y: 3 },
		{ x: -2, y: 0 },
		{ x: -2, y: 1 },
		{ x: 3, y: 0 },
		{ x: 3, y: 1 },
	],
	[
		{ x: -2, y: -2 },
		{ x: -1, y: -2 },
		{ x: 0, y: -2 },
		{ x: 1, y: -2 },
		{ x: 2, y: -2 },
		{ x: -2, y: -1 },
		{ x: -1, y: -1 },
		{ x: 0, y: -1 },
		{ x: 1, y: -1 },
		{ x: 2, y: -1 },
		{ x: -2, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
		{ x: -2, y: 1 },
		{ x: -1, y: 1 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: 2, y: 1 },
		{ x: -2, y: 2 },
		{ x: -1, y: 2 },
		{ x: 0, y: 2 },
		{ x: 1, y: 2 },
		{ x: 2, y: 2 },
		{ x: -1, y: -3 },
		{ x: 0, y: -3 },
		{ x: 1, y: -3 },
		{ x: -1, y: 3 },
		{ x: 0, y: 3 },
		{ x: 1, y: 3 },
		{ x: -3, y: -1 },
		{ x: -3, y: 0 },
		{ x: -3, y: 1 },
		{ x: 3, y: -1 },
		{ x: 3, y: 0 },
		{ x: 3, y: 1 },
	],
	[
		{ x: -2, y: -2 },
		{ x: -1, y: -2 },
		{ x: 0, y: -2 },
		{ x: 1, y: -2 },
		{ x: 2, y: -2 },
		{ x: 3, y: -2 },
		{ x: -2, y: -1 },
		{ x: -1, y: -1 },
		{ x: 0, y: -1 },
		{ x: 1, y: -1 },
		{ x: 2, y: -1 },
		{ x: 3, y: -1 },
		{ x: -2, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
		{ x: 3, y: 0 },
		{ x: -2, y: 1 },
		{ x: -1, y: 1 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
		{ x: 2, y: 1 },
		{ x: 3, y: 1 },
		{ x: -2, y: 2 },
		{ x: -1, y: 2 },
		{ x: 0, y: 2 },
		{ x: 1, y: 2 },
		{ x: 2, y: 2 },
		{ x: 3, y: 2 },
		{ x: -2, y: 3 },
		{ x: -1, y: 3 },
		{ x: 0, y: 3 },
		{ x: 1, y: 3 },
		{ x: 2, y: 3 },
		{ x: 3, y: 3 },
		{ x: -1, y: -3 },
		{ x: 0, y: -3 },
		{ x: 1, y: -3 },
		{ x: 2, y: -3 },
		{ x: -1, y: 4 },
		{ x: 0, y: 4 },
		{ x: 1, y: 4 },
		{ x: 2, y: 4 },
		{ x: -3, y: -1 },
		{ x: -3, y: 0 },
		{ x: -3, y: 1 },
		{ x: -3, y: 2 },
		{ x: 4, y: -1 },
		{ x: 4, y: 0 },
		{ x: 4, y: 1 },
		{ x: 4, y: 2 },
	],
] );

const generateBrushLayout = (
	size: number,
	x: number,
	y: number,
): Coordinates[] => brushLayouts[ size - 1 ].map( o => ( {
	x: ( o.x + x ),
	y: ( o.y + y ),
} ) );

const createRenderer = (
	ctx: WebGL2RenderingContext,
	palettes: PaletteList,
	graphics: GraphicsEntry,
) => {
	ctx.enable( ctx.BLEND );
	ctx.blendFunc( ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA );

	const tilemapRenderer = ( () => {
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
	
						void main() {
							gl_Position = vec4( a_position, 0.0, 1.0 );
							v_texture_coords = ( vec3( a_texture_coords, 1.0 ) * u_model ).xy;
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

		const renderObject = createRenderTextureObject( ctx, program );

		// Setup textures.
		const paletteTexture = palettes.createTexture( ctx, 0 );
		const tilesetTexture = graphics.createTexture( ctx, 1 );
		renderObject.addTextureUniform( `u_palette_texture`, 0, paletteTexture );
		renderObject.addTextureUniform( `u_tileset_texture`, 1, tilesetTexture );

		// Init palette index uniform.
		program.setUniform1f( `u_palette_index`, 0 );

		// Setup tilemap positions.
		const model = createMat3()
			.translate( [ 0, 0 ] )
			.scale( [ 1 / ( tileSize * 8 ), 1 / ( tileSize * 8 ) ] );
		renderObject.addUniform( `u_model`, `3fv`, new Float32Array( model.getList() ) );

		return Object.freeze( {
			render: () => {
				program.use();
				renderObject.render();
			},
			updateSelected: ( x: number, y: number ): void => {
				program.use();
				const model = createMat3()
					.translate( [ x / graphics.getWidthTiles(), y / graphics.getHeightTiles() ] )
					.scale( [ 1 / ( tileSize * 8 ), 1 / ( tileSize * 8 ) ] );
				renderObject.addUniform( `u_model`, `3fv`, new Float32Array( model.getList() ) );
			},
			updateSelectedPalette: ( selectedPalette: number ): void => {
				program.use();
				program.setUniform1f( `u_palette_index`, selectedPalette );
			},
			updateGraphicsEntry: ( graphics: GraphicsEntry ): void => {
				program.use();
				const tilesetTexture = graphics.createTexture( ctx, 1 );
				renderObject.addTextureUniform( `u_tileset_texture`, 1, tilesetTexture );
			},
		} );
	} )();

	const renderBrush = ( () => {
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

						uniform sampler2D u_palette_texture;
						uniform sampler2D u_transparency_texture;
						uniform float u_palette_index;
						uniform float u_selected_color;

						void main() {
							float u_palette_count = ${ palettes.getLength() }.0;
							frag_color = vec4(
								texture(
									u_palette_texture,
									vec2( u_selected_color / 8.0, u_palette_index / u_palette_count )
								).rgb,
								1.0
							);
						}
					`,
				},
			],
		);

		const renderObject = createRenderRectObject( ctx, program );

		// Setup positions.
		const instanceVbo = ctx.createBuffer();

		let instances = 1;

		const updateBrush = ( x: number, y: number, brushSize: number ): void => {
			brushSize = Math.max( 1, Math.min( 8, brushSize ) );
			const brush = brushLayouts[ brushSize - 1 ];
			instances = brush.length;
			let modelList = [];
			brush.forEach( brush => {
				const xrel = ( x + brush.x - 4 ) / 4 + 1 / 8;
				const yrel = ( ( 7 - ( y + brush.y ) ) - 4 ) / 4 + 1 / 8;
				const model = createMat3()
					.translate( [ xrel, yrel ] )
					.scale( [ 1 / 8, 1 / 8 ] );
				modelList = modelList.concat( model.getList() );
			} );
			ctx.bindBuffer( ctx.ARRAY_BUFFER, instanceVbo );
			ctx.bufferData(
				ctx.ARRAY_BUFFER,
				new Float32Array( modelList ),
				ctx.DYNAMIC_DRAW,
			);
		};

		updateBrush( 0, 0, 1 );

		// Instance attributes.
		[ `x`, `y`, `z` ].forEach( ( name, i ) => {
			renderObject.addInstanceAttribute( `a_model${ name }`, 3, ctx.FLOAT, false, 36, i * 12 );
		} );

		// Add palette.
		const paletteTexture = palettes.createTexture( ctx, 0 );
		renderObject.addTextureUniform( `u_palette_texture`, 0, paletteTexture );
		program.setUniform1f( `u_palette_index`, 0 );
		program.setUniform1f( `u_selected_color`, 0 );

		const transparencyTexture = ctx.createTexture();
		ctx.activeTexture( ctx[ `TEXTURE2` ] );
		ctx.bindTexture( ctx.TEXTURE_2D, transparencyTexture );
		ctx.texImage2D(
			ctx.TEXTURE_2D,
			0,
			ctx.RGBA,
			2,
			2,
			0,
			ctx.RGBA,
			ctx.UNSIGNED_BYTE,
			new Uint8Array( [
				64, 64, 64, 128,
				192, 192, 192, 128,
				192, 192, 192, 128,
				64, 64, 64, 128,
			] ),
		);
		ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST );
		ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST );
		ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE );
		ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE );
		renderObject.addTextureUniform( `u_transparency_texture`, 2, transparencyTexture );

		return Object.freeze( {
			render: () => renderObject.renderInstances( instances ),
			updateBrush: ( x: number, y: number, brushSize: number ): void => {
				program.use();
				updateBrush( x, y, brushSize );
			},
			updateSelectedColor: ( selectedColor: number ): void => {
				program.use();
				program.setUniform1f( `u_selected_color`, selectedColor );
			},
			updateSelectedPalette: ( selectedPalette: number ): void => {
				program.use();
				program.setUniform1f( `u_palette_index`, selectedPalette );
			},
		} );
	} )();

	const renderTransparentBrush = ( () => {
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

						out vec2 v_texture_coords;

						void main() {
							mat3 model = mat3(
								a_modelx,
								a_modely,
								a_modelz
							);
							gl_Position = vec4( vec3( a_position, 1.0 ) * model, 1.0 );
							v_texture_coords = a_position;
						}
					`,
				},
				{
					type: ShaderType.FRAGMENT_SHADER,
					source: `#version 300 es

						precision mediump float;

						in vec2 v_texture_coords;

						out vec4 frag_color;

						uniform sampler2D u_transparency_texture;

						void main() {
							float u_palette_count = ${ palettes.getLength() }.0;
							frag_color = texture(
								u_transparency_texture,
								( v_texture_coords + vec2( 1.0, 1.0 ) ) / 2.0
							);
						}
					`,
				},
			],
		);

		const renderObject = createRenderRectObject( ctx, program );

		// Setup positions.
		const instanceVbo = ctx.createBuffer();

		let instances = 1;

		const updateBrush = ( x: number, y: number, brushSize: number ): void => {
			brushSize = Math.max( 1, Math.min( 8, brushSize ) );
			const brush = brushLayouts[ brushSize - 1 ];
			instances = brush.length;
			let modelList = [];
			brush.forEach( brush => {
				const xrel = ( x + brush.x - 4 ) / 4 + 1 / 8;
				const yrel = ( ( 7 - ( y + brush.y ) ) - 4 ) / 4 + 1 / 8;
				const model = createMat3()
					.translate( [ xrel, yrel ] )
					.scale( [ 1 / 8, 1 / 8 ] );
				modelList = modelList.concat( model.getList() );
			} );
			ctx.bindBuffer( ctx.ARRAY_BUFFER, instanceVbo );
			ctx.bufferData(
				ctx.ARRAY_BUFFER,
				new Float32Array( modelList ),
				ctx.DYNAMIC_DRAW,
			);
		};

		updateBrush( 0, 0, 1 );

		// Instance attributes.
		[ `x`, `y`, `z` ].forEach( ( name, i ) => {
			renderObject.addInstanceAttribute( `a_model${ name }`, 3, ctx.FLOAT, false, 36, i * 12 );
		} );

		const transparencyTexture = ctx.createTexture();
		ctx.activeTexture( ctx[ `TEXTURE2` ] );
		ctx.bindTexture( ctx.TEXTURE_2D, transparencyTexture );
		ctx.texImage2D(
			ctx.TEXTURE_2D,
			0,
			ctx.RGBA,
			2,
			2,
			0,
			ctx.RGBA,
			ctx.UNSIGNED_BYTE,
			new Uint8Array( [
				64, 64, 64, 128,
				192, 192, 192, 128,
				192, 192, 192, 128,
				64, 64, 64, 128,
			] ),
		);
		ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST );
		ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST );
		ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE );
		ctx.texParameteri( ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE );
		renderObject.addTextureUniform( `u_transparency_texture`, 2, transparencyTexture );

		return Object.freeze( {
			render: () => renderObject.renderInstances( instances ),
			updateBrush: ( x: number, y: number, brushSize: number ): void => {
				program.use();
				updateBrush( x, y, brushSize );
			},
		} );
	} )();

	const renderGridLines = ( () => {
		const program = createShaderProgram(
			ctx,
			[
				{
					type: ShaderType.VERTEX_SHADER,
					source: `#version 300 es

						in vec2 a_position;

						out vec2 v_position;

						void main() {
							gl_Position = vec4( a_position, 0.0, 1.0 );
							v_position = ( a_position + vec2( 1.0, 1.0 ) )
								/ vec2( 2.0, 2.0 )
								* vec2( ${ width }.0, ${ height }.0 );
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
							float x = mod( v_position.x, ${ pixelZoom }.0 );
							float y = mod( v_position.y, ${ pixelZoom }.0 );
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

		return renderObject.render;
	} )();

	let selectedColor = 0;

	return {
		render: () => {
			tilemapRenderer.render();
			if ( selectedColor === 0 ) {
				renderTransparentBrush.render();
			} else {
				renderBrush.render();
			}
			renderGridLines();
		},
		updateBrush: ( x: number, y: number, brushSize: number ): void => {
			renderBrush.updateBrush( x, y, brushSize );
			renderTransparentBrush.updateBrush( x, y, brushSize );
		},
		updateSelected: ( x: number, y: number ): void => {
			tilemapRenderer.updateSelected( x, y );
		},
		updateSelectedColor: ( color: number ): void => {
			selectedColor = color;
			renderBrush.updateSelectedColor( selectedColor );
		},
		updateSelectedPalette: ( selectedPalette: number ): void => {
			tilemapRenderer.updateSelectedPalette( selectedPalette );
			renderBrush.updateSelectedPalette( selectedPalette );
		},
		updateGraphicsEntry: ( graphics: GraphicsEntry ): void => {
			tilemapRenderer.updateGraphicsEntry( graphics );
		},
	};
};

const TileEditor = ( props: TileEditorProps ): ReactElement => {
	const canvasRef = useRef();
	const { clearTile, drawPixel, graphics, palettes, selectedColor, selectedPalette, tileX, tileY } = props;
	const [ selected, setSelected ] = useState( { x: 0, y: 0 } );
	const [ mouseDown, setMouseDown ] = useState( false );
	const [ brushSize, setBrushSize ] = useState( 1 );
	const [ renderer, setRenderer ] = useState( null );

	const drawBrush = () => {
		const brushPixels = generateBrushLayout( brushSize, selected.x, selected.y );
		brushPixels.forEach( ( { x, y } ) => {
			// Make sure to cut off edges o’ brush that’re out o’ bounds.
			if ( x < 0 || x >= tileSize || y < 0 || y >= tileSize ) {
				return;
			}
			drawPixel( x, y );
		} );
	};

	const render = () => {
		if ( ! canvasRef.current ) {
			return;
		}
		const ctx: WebGL2RenderingContext | null = canvasRef.current.getContext( `webgl2` );
		if ( ! ctx ) {
			throw new Error( `Could not get webgl context for canvas` );
		}
		if ( ! renderer ) {
			return;
		}
		ctx.clearColor( 0.0, 0.0, 0.0, 0.0 );
		ctx.clear( ctx.COLOR_BUFFER_BIT );

		renderer.render();
	};

	// Select object on left click.
	const onClick = () => {
		setMouseDown( true );
		drawBrush();
	};

	const onMouseUp = () => setMouseDown( false );

	// Update cursor visuals on mouse move.
	const onMouseMove = e => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / pixelZoom );
		const gridY = Math.floor( y / pixelZoom );

		if ( selected.x === gridX && selected.y === gridY ) {
			return;
		}

		setSelected( { x: gridX, y: gridY } );

		if ( mouseDown ) {
			drawBrush();
		}
	};

	useEffect( () => {
		if ( ! canvasRef.current ) {
			return;
		}

		const ctx: WebGL2RenderingContext | null = canvasRef.current.getContext( `webgl2` );
		if ( ! ctx ) {
			throw new Error( `Could not get webgl context for canvas` );
		}

		setRenderer( createRenderer( ctx, palettes, graphics ) );
	}, [ canvasRef.current ] );

	// Render on init or whenever relevant state changes.
	useEffect( render, [ renderer, graphics ] );
	useEffect( render );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateBrush( selected.x, selected.y, brushSize );
		render();
	}, [ selected, brushSize ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateSelected( tileX, tileY );
		render();
	}, [ tileX, tileY ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateSelectedPalette( selectedPalette );
		render();
	}, [ selectedPalette ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateSelectedColor( selectedColor );
		render();
	}, [ selectedColor ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateGraphicsEntry( graphics );
		render();
	}, [ graphics ] );

	return <div className="graphics__tile-grid-canvas">
		<canvas
			ref={ canvasRef }
			width={ width }
			height={ height }
			onMouseDown={ onClick }
			onMouseUp={ onMouseUp }
			onMouseMove={ onMouseMove }
		/>
		<div>
			<label>
				<span>Brush size:</span>
				<input
					type="number"
					min={ 1 }
					max={ 8 }
					value={ brushSize }
					onChange={ e => {
						// Make sure brush doesn’t go below 1 or above 8 or app will break.
						const brushSize = Math.max( 1, Math.min( 8, parseInt( e.target.value ) ) );
						setBrushSize( brushSize );
					} }
				/>
			</label>
		</div>
		<button onClick={ clearTile }>Clear Tile</button>
	</div>;
};

export default TileEditor;
