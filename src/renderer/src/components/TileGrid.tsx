import { ReactElement, useEffect, useRef, useState } from 'react';
import { getMousePosition } from '../../../common/utils';
import {
	Coordinates,
	GraphicsEntry,
	Mat3,
	PaletteList,
	ShaderType,
	TileGridProps,
} from '../../../common/types';
import { createMat3 } from '../../../common/mat';
import {
	createRenderRectObject,
	createRenderTextureObject,
	createShaderProgram,
} from '../../../common/render';

const zoom: number = 4;
const tileSize: number = 8 * zoom;
const selectorScale: [ number, number ] = [ tileSize / 2, tileSize / 2 ];

// Convert tile positions to canvas positions.
const getSelectorPosition = ( x: number, y: number ): [ number, number ] => [
	x * tileSize + tileSize / 2,
	y * tileSize + tileSize / 2,
];

// Generate matrix for properly sizing & scaling selectors.
const generateSelectorMatrix = ( x: number, y: number ): Mat3 => createMat3()
	.translate( getSelectorPosition( x, y ) )
	.scale( selectorScale );

// Generate matrix for hiding selectors.
const generateHiddenMatrix = (): Mat3 => createMat3()
	.translate( [ -1000, -1000 ] )
	.scale( [ 0, 0 ] );

// Create a tile grid renderer.
//
// Since this is given to useState, make it a function that returns a function,
// as useState will call the outer function when being set.
const createTileGridRenderer = (
	ctx: WebGL2RenderingContext,
	width: number,
	height: number,
	palettes: PaletteList,
	graphics: GraphicsEntry,
) => {
	ctx.enable( ctx.BLEND );
	ctx.blendFunc( ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA );

	const renderHighlight = ( () => {
		const program = createShaderProgram(
			ctx,
			[
				{
					type: ShaderType.VERTEX_SHADER,
					source: `#version 300 es

						in vec2 a_position;
						in vec3 a_color;
						in vec3 a_modelx;
						in vec3 a_modely;
						in vec3 a_modelz;

						out vec4 v_color;
						out vec2 v_relative_coords;

						void main() {
							vec2 resolution = vec2( ${ width }, ${ height } );
							mat3 model = mat3(
								a_modelx,
								a_modely,
								a_modelz
							);
							vec2 position = ( vec3( a_position, 1.0 ) * model ).xy;
							vec2 clipspace = ( ( position / resolution ) * 2.0 - 1.0 )
								* vec2( 1, -1 );
							gl_Position = vec4( clipspace, 1.0, 1.0 );
							v_color = vec4( a_color, 0.9 );
							v_relative_coords = a_position;
						}
					`,
				},
				{
					type: ShaderType.FRAGMENT_SHADER,
					source: `#version 300 es

						precision mediump float;

						in vec4 v_color;
						in vec2 v_relative_coords;

						out vec4 frag_color;

						void main() {
							float absx = abs( v_relative_coords.x );
							float absy = abs( v_relative_coords.y );
							if ( absx < 0.9 && absy < 0.9 ) {
								discard;
							}
							frag_color = v_color;
						}
					`,
				},
			],
		);
		program.use();

		const renderObject = createRenderRectObject( ctx, program );

		const selectedColor = [ 1, 0, 0 ];
		const hoverColor = [ 0, 1, 0 ];
		const instanceVbo = ctx.createBuffer();

		const updateSelectorGraphics = ( hovered: Coordinates | null, selected: Coordinates | null ) => {
			const hoverMat: Mat3 = hovered === null
				? generateHiddenMatrix()
				: generateSelectorMatrix( hovered.x, hovered.y );
			const selectorMat: Mat3 = selected === null
				? generateHiddenMatrix()
				: generateSelectorMatrix( selected.x, selected.y );
			ctx.bindBuffer( ctx.ARRAY_BUFFER, instanceVbo );
			ctx.bufferData(
				ctx.ARRAY_BUFFER,
				new Float32Array( selectedColor
					.concat( selectorMat.getList() )
					.concat( hoverColor )
					.concat( hoverMat.getList() ) ),
				ctx.DYNAMIC_DRAW,
			);
		};

		updateSelectorGraphics( null, { x: 0, y: 0 } );

		// Instance attributes.
		renderObject.addInstanceAttribute( `a_color`, 3, ctx.FLOAT, false, 48, 0 );
		[ `x`, `y`, `z` ].forEach( ( name, i ) => {
			renderObject.addInstanceAttribute( `a_model${ name }`, 3, ctx.FLOAT, false, 48, 12 + i * 12 );
		} );

		return ( hovered: Coordinates, selected: Coordinates | null ) => {
			updateSelectorGraphics( hovered, selected );
			renderObject.renderInstances( 2 );
		};
	} )();

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
	
						void main() {
							gl_Position = vec4( a_position, 0.0, 1.0 );
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

		const renderObject = createRenderTextureObject( ctx, program );

		// Add textures.
		const paletteTexture = palettes.createTexture( ctx, 0 );
		const tilesetTexture = graphics.createTexture( ctx, 1 );
		renderObject.addTextureUniform( `u_palette_texture`, 0, paletteTexture );
		renderObject.addTextureUniform( `u_tileset_texture`, 1, tilesetTexture );

		// Init palette index uniform.
		program.setUniform1f( `u_palette_index`, 0 );

		return {
			render: renderObject.render,
			updateSelectedPalette: ( selectedPalette: number ): void => {
				program.use();
				program.setUniform1f( `u_palette_index`, selectedPalette );
			},
			updateGraphics: ( graphics: GraphicsEntry ): void => {
				program.use();
				const tilesetTexture = graphics.createTexture( ctx, 1 );
				renderObject.addTextureUniform( `u_tileset_texture`, 1, tilesetTexture );
			},
		};
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
							float x = mod( v_position.x, ${ tileSize }.0 );
							float y = mod( v_position.y, ${ tileSize }.0 );
							if ( x > ${ zoom }.0 / 4.0 && y > ${ zoom }.0 / 4.0 ) {
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

	return {
		render: ( hovered: Coordinates, selected: Coordinates | null, showGridLines: boolean ): void => {
			tilemapRenderer.render();
			if ( showGridLines ) {
				renderGridLines();
			}
			renderHighlight( hovered, selected );
		},
		updateSelectedPalette: ( selectedPalette: number ): void => {
			tilemapRenderer.updateSelectedPalette( selectedPalette );
		},
		updateGraphics: ( graphics: GraphicsEntry ): void => {
			tilemapRenderer.updateGraphics( graphics );
		},
	};
};

const TileGrid = ( props: TileGridProps ): ReactElement => {
	const canvasRef = useRef();
	const { graphics, palettes, selectedPalette, selectedTile, setSelectedTile } = props;
	const [ hovered, setHovered ] = useState( { x: 0, y: 0 } );
	const [ showGridLines, setShowGridLines ] = useState( true );
	const [ renderer, setRenderer ] = useState( null );
	const width = graphics.getWidthPixels() * zoom;
	const height = graphics.getHeightPixels() * zoom;

	const render = () => {
		if ( ! canvasRef.current ) {
			return;
		}
		const ctx = canvasRef.current.getContext( `webgl2` );
		if ( ! ctx ) {
			throw new Error( `Could not get webgl2 context for canvas` );
		}

		if ( ! renderer ) {
			return;
		}

		const selected = selectedTile ?
			Object.freeze( {
				x: selectedTile % graphics.getWidthTiles(),
				y: Math.floor( selectedTile / graphics.getWidthTiles() ),
			} )
			: { x: 0, y: 0 };
		renderer.render( hovered, selected, showGridLines );
	};

	// Update cursor visuals on mouse move.
	const onMouseMove = e => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / tileSize );
		const gridY = Math.floor( y / tileSize );

		if ( hovered.x === gridX && hovered.y === gridY ) {
			return;
		}

		setHovered( { x: gridX, y: gridY } );
	};

	// Update cursor visuals on mouse move.
	const onClick = e => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / tileSize );
		const gridY = Math.floor( y / tileSize );
		const selected = gridY * graphics.getWidthTiles() + gridX;

		if ( selectedTile === selected ) {
			return;
		}

		setSelectedTile( selected );
	};

	// On canvas load, generate renderer.
	useEffect( () => {
		if ( canvasRef.current ) {
			const ctx: WebGL2RenderingContext | null = canvasRef.current.getContext( `webgl2` );
			if ( ! ctx ) {
				throw new Error( `Could not get webgl context for canvas` );
			}

			setRenderer( createTileGridRenderer( ctx, width, height, palettes, graphics ) );
		}
	}, [ canvasRef.current ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}

		renderer.updateSelectedPalette( selectedPalette );
		render();
	}, [ renderer, selectedPalette ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}

		renderer.updateGraphics( graphics );
		render();
	}, [ graphics ] );

	// Render on canvas ref or whene’er there is a state change.
	useEffect( render, [ canvasRef, selectedTile, hovered, renderer, showGridLines ] );

	return <div>
		<div>
			<label>
				<span>Show grid lines</span>
				<input
					checked={ showGridLines }
					type="checkbox"
					onChange={ e => setShowGridLines( e.target.checked ) }
				/>
			</label>
		</div>
		<div className="graphics__canvas" style={ { width, height } }>
			<canvas
				ref={ canvasRef }
				width={ width }
				height={ height }
				style={ { width, height } }
				onClick={ onClick }
				onMouseMove={ onMouseMove }
			/>
		</div>
	</div>;
};

export default TileGrid;
