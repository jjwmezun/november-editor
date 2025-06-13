import { ReactElement, SyntheticBaseEvent, useEffect, useRef, useState } from 'react';
import { createGoal, goals } from '../../../common/goals';
import {
	createMap,
	generateDataBytes,
	layerTypeNames,
	transformMapDataToObject,
} from '../../../common/levels';
import { objectTypes } from '../../../common/objects';
import { getMousePosition } from '../../../common/utils';
import {
	GraphicTile,
	LevelEditorProps,
	Layer,
	LvMap,
	MapObject,
	PaletteList,
	Rect,
	ShaderType,
	Tileset,
} from '../../../common/types';
import { createMat3 } from '../../../common/mat';
import {
	createRenderRectObject,
	createRenderTextureObject,
	createShaderProgram,
} from '../../../common/render';

interface ObjectRenderer {
	render: () => void;
	setSelectedLayer: ( isSelected: boolean ) => void;
	updateAnimationFrame: ( frame: number ) => void;
	updateDimensions: ( width: number, height: number ) => void;
	updateObjects: ( objects: MapObject[] ) => void;
	updatePalette: ( palette: number ) => void;
	updateScrollX: ( layerScrollX: number, windowScrollX: number, mapWidth: number ) => void;
}

const createObjectRenderer = (
	ctx: WebGL2RenderingContext,
	palettes: PaletteList,
	tileset: Tileset,
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
	const tilesetTexture = tileset.createTexture( ctx, 1 );
	renderObject.addTextureUniform( `u_palette_texture`, 0, paletteTexture );
	renderObject.addTextureUniform( `u_tileset_texture`, 1, tilesetTexture );

	// Init palette index uniform.
	program.setUniform1f( `u_palette_index`, 0 );
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
				} = tile;
				const modelWidth = ( 8 / canvasWidth ) * srcWidth;
				const modelHeight = ( 8 / canvasHeight ) * srcHeight;
				const model = createMat3()
					.translate( [
						-1 + ( 1 + ( 2 / srcWidth ) * x ) * modelWidth,
						1 - ( 1 + ( 2 / srcHeight ) * y ) * modelHeight,
					] )
					.scale( [ modelWidth, modelHeight ] );
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
			tiles = objects.reduce(
				( acc: GraphicTile[], object: MapObject ) => {
					return acc.concat( objectTypes[ object.type() ].generateTiles( object ) );
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
	tileset: Tileset,
	layerObjects: MapObject[][],
	selectedPalette: number,
) => {
	ctx.enable( ctx.BLEND );
	ctx.blendFunc( ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA );
	ctx.viewport( 0, 0, ctx.canvas.width, ctx.canvas.height );

	let objectRenderers = [ ...Array( layerObjects.length ).keys() ]
		.map( () => createObjectRenderer( ctx, palettes, tileset ) );

	objectRenderers.forEach( ( objectRenderer: ObjectRenderer, i: number ) => {
		objectRenderer.updateObjects( layerObjects[ i ] );
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
			setSelected: ( i: number | null, objects: MapObject[] ) => {
				program.use();
				rects = i === null
					? []
					: objectTypes[ objects[ i ].type() ].generateHighlight( objects[ i ] );
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

			objectRenderers = [ ...Array( layers.length ).keys() ]
				.map( () => createObjectRenderer( ctx, palettes, tileset ) );

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
		addLayer: () => {
			objectRenderers.push( createObjectRenderer( ctx, palettes, tileset ) );
		},
		removeLayer: ( layer: number ) => {
			objectRenderers.splice( layer, 1 );
		},
		setSelectedLayer: ( selectedLayer: number ) => {
			objectRenderers.forEach( ( objectRenderer: ObjectRenderer, i: number ) => {
				objectRenderer.setSelectedLayer( selectedLayer === i );
			} );
		},
		setSelectedObject: ( i: number | null, objects: MapObject[] ) => {
			isAnObjectSelected = i !== null;
			if ( isAnObjectSelected ) {
				selectedObject.setSelected( i, objects );
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

const LevelEditor = ( props: LevelEditorProps ): ReactElement => {
	const canvasRef = useRef();
	const [ selected, setSelected ] = useState( { x: null, y: null } );
	const [ selectedObject, setSelectedObject ] = useState( null );
	const [ selectedType, setSelectedType ] = useState( 0 );
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [ frame, setFrame ] = useState( 0 );
	const [ selectedLayer, setSelectedLayer ] = useState( null );
	const [ windowScrollX, setWindowScrollX ] = useState( 0 );
	const [ selectedMapIndex, setSelectedMapIndex ] = useState( null );
	const [ selectedMap, setSelectedMap ] = useState( null );
	const [ renderer, setRenderer ] = useState( null );

	const { height, layers, palette, width } = selectedMap !== null
		? selectedMap.getProps()
		: { height: 0, layers: [], width: 0 };

	const { closeLevel, maps, name, setName, goal, palettes, setMaps, setGoal, tileset } = props;

	const exit = () => {
		closeLevel();
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		renderer.setSelectedObject( null );
		setSelectedLayer( null );
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const updateMap = newMap => {
		setSelectedMap( newMap );
		setMaps( maps.map( ( map, i ) => ( i === selectedMapIndex
			? generateDataBytes( newMap )
			: map ) ) );
		window.electronAPI.enableSave();
	};

	const addMap = () => {
		setSelectedMapIndex( maps.length );
		const map = createMap();
		setSelectedMap( map );
		setMaps( [ ...maps, generateDataBytes( map ) ] );
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		renderer.setSelectedObject( null );
		setSelectedLayer( null );
	};

	const deleteMap = () => {
		setMaps( maps.filter( ( _, i ) => i !== selectedMapIndex ) );
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const moveMapUp = () => {
		setMaps( ( () => {
			const newMaps = [ ...maps ];
			const temp = newMaps[ selectedMapIndex ];
			newMaps[ selectedMapIndex ] = newMaps[ selectedMapIndex - 1 ];
			newMaps[ selectedMapIndex - 1 ] = temp;
			return newMaps;
		} )() );
		setSelectedMapIndex( selectedMapIndex - 1 );
	};

	const moveMapDown = () => {
		setMaps( ( () => {
			const newMaps = [ ...maps ];
			const temp = newMaps[ selectedMapIndex ];
			newMaps[ selectedMapIndex ] = newMaps[ selectedMapIndex + 1 ];
			newMaps[ selectedMapIndex + 1 ] = temp;
			return newMaps;
		} )() );
		setSelectedMapIndex( selectedMapIndex + 1 );
	};

	const exportMap = () => {
		window.electronAPI.exportMap( maps[ selectedMapIndex ] );
	};

	const importMap = () => {
		window.electronAPI.importMap();
	};

	const objects = selectedLayer === null || layers.length === 0 ? [] : layers[ selectedLayer ].objects;

	const setWidth = width => updateMap( selectedMap.updateWidth( width ) );
	const setHeight = height => updateMap( selectedMap.updateHeight( height ) );

	const addObject = o => {
		updateMap( selectedMap.updateLayer( selectedLayer ).addObject( o ) );
		renderer.updateLayerObjects( selectedLayer, objects );
	};

	const updateObject = ( index, o ) => {
		updateMap( selectedMap.updateLayer( selectedLayer ).updateObject( index, o ) );
		renderer.setSelectedObject( index, objects );
		renderer.updateLayerObjects( selectedLayer, objects );
	};

	const removeObject = () => {
		updateMap( selectedMap.updateLayer( selectedLayer ).removeObject( selectedObject ) );
		setSelectedObject( null );
		renderer.setSelectedObject( null );
		renderer.updateLayerObjects( selectedLayer, objects );
	};

	const addLayer = () => {
		setSelectedLayer( layers.length );
		setSelectedObject( null );
		renderer.setSelectedObject( null );
		updateMap( selectedMap.addLayer() );
		renderer.addLayer();
	};

	const removeLayer = () => {
		const layersCount = layers.length - 1;
		updateMap( selectedMap.removeLayer( selectedLayer ) );
		setSelectedObject( null );
		renderer.setSelectedObject( null );
		renderer.removeLayer( selectedLayer );
		setSelectedLayer( selectedLayer === 0
			? ( selectedLayer === layersCount
				? null
				: selectedLayer )
			: selectedLayer - 1 );
	};

	const updateLayerOption = ( key, value ) => {
		updateMap( selectedMap.updateLayer( selectedLayer ).updateOption( key, value ) );
	};

	const generateLayerSelector = i => () => {
		setSelectedLayer( i );
		renderer.setSelectedLayer( i );
		setSelectedObject( null );
		renderer.setSelectedObject( null );
	};

	const moveLayerUp = () => {
		updateMap( selectedMap.switchLayers( selectedLayer, selectedLayer - 1 ) );
		renderer.switchLayers( selectedLayer, selectedLayer - 1 );
		setSelectedLayer( selectedLayer - 1 );
	};

	const moveLayerDown = () => {
		updateMap( selectedMap.switchLayers( selectedLayer, selectedLayer + 1 ) );
		renderer.switchLayers( selectedLayer, selectedLayer + 1 );
		setSelectedLayer( selectedLayer + 1 );
	};

	// Select object on left click.
	const onClick = e => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / 16 );
		const gridY = Math.floor( y / 16 );

		let newSelectedObject: number | null = null;

		// Go backwards so that the topmost object is selected first.
		for ( let i = objects.length - 1; i >= 0; i-- ) {
			const object = objects[ i ];
			if (
				gridX >= object.xBlocks()
				&& gridX <= object.rightBlocks()
				&& gridY >= object.yBlocks()
				&& gridY <= object.bottomBlocks()
			) {
				newSelectedObject = i;
				break;
			}
		}
		renderer.setSelectedObject( newSelectedObject, objects );
		setSelectedObject( newSelectedObject, objects );
	};

	// Create object on right click.
	const onRightClick = e => {
		e.preventDefault();

		if ( selectedLayer === null ) {
			return;
		}

		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / 16 );
		const gridY = Math.floor( y / 16 );

		addObject( { ...objectTypes[ selectedType ].create( gridX, gridY ), type: selectedType } );
	};

	// Update cursor visuals on mouse move.
	const onMouseMove = e => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / 16 );
		const gridY = Math.floor( y / 16 );

		if ( selected.x === gridX && selected.y === gridY ) {
			return;
		}

		setSelected( { x: gridX, y: gridY } );
		renderer.setSelectedTile( gridX, gridY );
	};

	const onMouseOut = () => {
		setSelected( { x: null, y: null } );
		renderer.setSelectedTile( null, null );
	};

	const onScrollWindow = e => {
		setWindowScrollX( e.target.scrollLeft );
	};

	const generateMapSelector = ( maps, i ) => () => {
		const mapobj = transformMapDataToObject( maps[ i ] );
		setSelectedMapIndex( i );
		setSelectedMap( mapobj );
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		setSelectedLayer( null );
		if ( ! renderer ) {
			return;
		}
		renderer.changeMap( mapobj );
	};

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

		renderer.render( ctx );
	};

	const onChangeGoal = ( e: SyntheticBaseEvent ) => {
		setGoal( createGoal( e.target.value ) );
		window.electronAPI.enableSave();
	};

	// On canvas load, generate renderer.
	useEffect( () => {
		if ( canvasRef.current ) {
			const ctx: WebGL2RenderingContext | null = canvasRef.current.getContext( `webgl2` );
			if ( ! ctx ) {
				throw new Error( `Could not get webgl context for canvas` );
			}

			setRenderer( createMapRenderer(
				ctx,
				palettes,
				tileset,
				layers.map( ( l: Layer ) => l.objects ),
				palette,
			) );
		}
	}, [ canvasRef.current ] );

	useEffect( () => {
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		setSelectedLayer( null );
	}, [ selectedMapIndex ] );

	useEffect( () => {
		if ( selectedLayer === null || layers[ selectedLayer ].objects.length === 0 ) {
			setSelected( { x: null, y: null } );
			setSelectedObject( null );
			setSelectedLayer( null );
			setSelectedType( 0 );
		}
	}, [ selectedMap ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}

		// Set up animation loop on 1st load.
		let prevTicks: number | null = null;
		const tick = ( ticks: number ) => {
			if ( prevTicks === null ) {
				prevTicks = ticks;
			} else {
				const delta = ticks - prevTicks;
				if ( delta > 1000 / 8 ) {
					setFrame( ( frame: number ) => {
						renderer.updateAnimationFrame( frame + 1 );
						return frame + 1;
					} );
					prevTicks = ticks;
				}
			}
			window.requestAnimationFrame( tick );
		};
		const handle = window.requestAnimationFrame( tick );

		return () => window.cancelAnimationFrame( handle );
	}, [ renderer ] );

	// Render on canvas ref or whene’er there is a state change.
	useEffect( render, [ canvasRef ] );
	useEffect( render );

	useEffect( () => {
		if ( ! renderer || selectedMap === null ) {
			return;
		}

		renderer.updateDimensions( width, height );
	}, [ width, height ] );

	useEffect( () => {
		if ( ! renderer || selectedMap === null ) {
			return;
		}

		renderer.updateScrollX( windowScrollX, selectedMap );
	}, [ windowScrollX, selectedMap ] );

	const importMapData = ( _event, data ) => {
		const map = transformMapDataToObject( data.buffer );
		setSelectedMap( map );
		setSelectedMapIndex( maps.length );
		setMaps( [ ...maps, data.buffer ] );
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		setSelectedLayer( null );
	};

	const onOpen = () => {
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		setSelectedLayer( null );
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const onClose = () => {
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		setSelectedLayer( null );
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const onNew = () => {
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		setSelectedLayer( null );
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const updatePalette = ( e: SyntheticBaseEvent ) => {
		const target: HTMLSelectElement = e.target;
		const paletteIndex = parseInt( target.value );
		updateMap( selectedMap.updatePalette( paletteIndex ) );
		renderer.updatePalette( paletteIndex );
	};

	useEffect( () => {
		window.electronAPI.on( `import-map__level-editor`, importMapData );
		window.electronAPI.on( `open__level-editor`, onOpen );
		window.electronAPI.on( `close__level-editor`, onClose );
		window.electronAPI.on( `new__level-editor`, onNew );

		return () => {
			window.electronAPI.remove( `import-map__level-editor` );
			window.electronAPI.remove( `open__level-editor` );
			window.electronAPI.remove( `close__level-editor` );
			window.electronAPI.remove( `new__level-editor` );
		};
	}, [ maps ] );

	return <div>
		<div>
			<h2>Level options:</h2>
			<div>
				<label>
					<span>Name:</span>
					<input type="text" value={ name } onChange={ e => setName( e.target.value ) } />
				</label>
			</div>
			<div>
				<label>
					<span>Goal:</span>
					<select onChange={ onChangeGoal } value={ goal.getId() }>
						{ goals.map( ( goal, i ) => <option
							key={ i }
							value={ i }
						>
							{ goal.name }
						</option> ) }
					</select>
				</label>
				{ goals[ goal.getId() ]?.options
				&& Array.isArray( goals[ goal.getId() ].options )
				&& goals[ goal.getId() ].options!.map( (
					{ atts, slug, title, type },
					i,
				) => <label key={ i }>
					<span>{ title }:</span>
					<input
						type={ type }
						onChange={ e => setGoal( goal.updateOption( slug, e.target.value ) ) }
						value={ goal.getOption( slug ) }
						{ ...atts }
					/>
				</label> )
				}
			</div>
		</div>
		{ maps.length > 0 && <ul>
			{ maps.map( ( _map, i ) => <li key={ i }>
				<button
					disabled={ selectedMapIndex === i }
					onClick={ generateMapSelector( maps, i ) }
				>
                    Map { i + 1 }
				</button>
			</li> ) }
		</ul>}
		<button disabled={ maps.length >= 255 } onClick={ addMap }>Add Map</button>
		<button disabled={ selectedMap === null } onClick={ deleteMap }>Delete Map</button>
		<button
			disabled={ selectedMapIndex === null || selectedMapIndex === 0 }
			onClick={ moveMapUp }
		>
			↑
		</button>
		<button
			disabled={ selectedMapIndex === null || selectedMapIndex === maps.length - 1 }
			onClick={ moveMapDown }
		>
			↓
		</button>
		<button disabled={ selectedMap === null } onClick={ exportMap }>Export Map</button>
		<button disabled={ maps.length >= 255 } onClick={ importMap }>Import Map</button>
		{ selectedMap !== null && <div>
			<div className="window" onScroll={ onScrollWindow }>
				<canvas
					ref={ canvasRef }
					id="editor"
					width={ width * 16 }
					height={ height * 16 }
					onClick={ onClick }
					onContextMenu={ onRightClick }
					onMouseMove={ onMouseMove }
					onMouseOut={ onMouseOut }
				/>
			</div>
			<div>
				<label>
					<span>Width:</span>
					<input type="number" value={ width } onChange={ e => setWidth( e.target.value ) } />
				</label>
				<label>
					<span>Height:</span>
					<input type="number" value={ height } onChange={ e => setHeight( e.target.value ) } />
				</label>
				<label>
					<span>Palette:</span>
					<select onChange={ updatePalette } value={ palette }>
						{ palettes.map( ( palette, index ) => {
							return <option
								key={ index }
								value={ index }
							>
								{ palette.getName() }
							</option>;
						} ) }
					</select>
				</label>
				<label>
					<span>Type:</span>
					<select value={ selectedType } onChange={ e => setSelectedType( e.target.value ) }>
						{ objectTypes.map( ( type, i ) => <option key={ i } value={ i }>{ type.name }</option> ) }
					</select>
				</label>
			</div>
			{ selectedLayer !== null && <div>
				<label>
					<span>Scroll X:</span>
					<input
						type="number"
						value={ layers[ selectedLayer ].scrollX }
						onChange={ v => updateLayerOption( `scrollX`, v.target.value ) }
					/>
				</label>
			</div> }
			{ selectedLayer !== null && selectedObject !== null && <div>
				<div>Selected object: { selectedObject }</div>
				{
					objectTypes[ objects[ selectedObject ].type() ].options.map( ( options, i ) => {
						const {
							atts,
							key,
							title,
							type,
							update,
							extraUpdate,
						} = {
							atts: [],
							title: `MISSING TITLE`,
							key: `missingKey`,
							type: `text`,
							update: v => v,
							extraUpdate: () => ( {} ),
							...options,
						};
						const extraAtts = {};
						for ( const key in atts ) {
							extraAtts[ key ] = typeof atts[ key ] === `function`
								? atts[ key ]( objects[ selectedObject ] )
								: atts[ key ];
						}
						return <label key={ i }>
							<span>{ title }:</span>
							<input
								type={ type }
								value={ objects[ selectedObject ].getProp( key ) }
								onChange={ e =>
									updateObject(
										selectedObject,
										{
											[ key ]: update( e.target.value ),
											...extraUpdate( objects[ selectedObject ], e.target.value ),
										},
									)
								}
								{ ...extraAtts }
							/>
						</label>;
					} )
				}
				<button onClick={ removeObject }>Delete</button>
			</div> }
			<div>
				<ul>
					{ layers.map( ( layer, i ) => <li key={ i }>
						<button
							disabled={ selectedLayer === i }
							onClick={ generateLayerSelector( i ) }
						>
							Layer { i + 1 } – { layerTypeNames[ layer.type ] }
						</button>
					</li> ) }
				</ul>
			</div>
			<button disabled={ layers.length >= 255 } onClick={ addLayer }>Add layer</button>
			<button disabled={ selectedLayer === null } onClick={ removeLayer }>Delete layer</button>
			<button disabled={ selectedLayer === null || selectedLayer === 0 } onClick={ moveLayerUp }>↑</button>
			<button
				disabled={ selectedLayer === null || selectedLayer === layers.length - 1 }
				onClick={ moveLayerDown }
			>
				↓
			</button>
		</div> }
		<div>
			<button onClick={ exit }>Back to Level List</button>
		</div>
	</div>;
};

export default LevelEditor;
