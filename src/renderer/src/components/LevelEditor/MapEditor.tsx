import { MouseEvent, ReactElement, SyntheticEvent, useEffect, useRef, useState } from 'react';
import {
	generateDataBytes,
	layerTypeNames,
} from '../../../../common/levels';
import {
	getBlockTypeFactory,
	getBlockTypeFactoryOfType,
	objectLimitOption,
	objectTypeHasOption,
} from '../../../../common/objects';
import { getMousePosition } from '../../../../common/utils';
import {
	EditorStateType,
	LayerTileSetOption,
	LayerType,
	LvMap,
	MapEditorProps,
	MapObjectArgs,
	MapRenderer,
	TileSetType,
} from '../../../../common/types';
import { createMapRenderer } from '../../../../common/render-level';

import { LayerOptions } from './LayerOptions';
import { LayerSelectorList } from './LayerSelectorList';
import { MapOptions } from './MapOptions';
import { ObjectOptions } from './ObjectOptions';

const MapEditor = ( props: MapEditorProps ): ReactElement => {
	const canvasRef = useRef<HTMLCanvasElement | null>( null );
	const [ addLayerOption, setAddLayerOption ] = useState<LayerType>( LayerType.block );
	const [ renderer, setRenderer ] = useState<MapRenderer | null>( null );
	const [ selected, setSelected ] = useState<{ x: number | null, y: number | null }>( { x: null, y: null } );
	const [ selectedLayer, setSelectedLayer ] = useState<number | null>( null );
	const [ selectedObject, setSelectedObject ] = useState<number | null>( null );
	const [ selectedType, setSelectedType ] = useState( 0 );
	const [ windowScrollX, setWindowScrollX ] = useState( 0 );
	const [ layerTileSetOption, setLayerTileSetOption ] = useState<LayerTileSetOption>( LayerTileSetOption.universal );
	const [ magnification, setMagnification ] = useState( 1 );
	const [ gridOpacity, setGridOpacity ] = useState( 0.5 );
	const [ editorState, setEditorState ] = useState<EditorStateType>( EditorStateType.normal );
	const [ shift, setShift ] = useState( false );

	const { graphics, maps, palettes, selectedMap, selectedMapIndex, setSelectedMap, setMaps } = props;

	const { height, layers, palette, width } = selectedMap !== null
		? selectedMap.getProps()
		: { height: 0, layers: [], palette: 0, width: 0 };

	const objects = selectedLayer === null || layers.length < selectedLayer
		? []
		: layers[ selectedLayer ]?.objects ?? [];

	const layerType = selectedLayer !== null && selectedLayer < layers.length
		? layers[ selectedLayer ].type
		: LayerType.block;
	const tilesetType = selectedMap !== null
		? selectedMap.getTilesetType()
		: TileSetType.urban;
	const typesFactory = getBlockTypeFactory( layerType, tilesetType );
	const typesFactoryGenerator = getBlockTypeFactoryOfType(
		selectedLayer && selectedLayer < layers.length ? layers[ selectedLayer ].type : LayerType.block,
		layerTileSetOption,
		tilesetType,
	);
	const cursorType = ( editorState === EditorStateType.wresizeHover
		|| editorState === EditorStateType.wresizeMove )
		? `ew-resize`
		: ( editorState === EditorStateType.hresizeHover || editorState === EditorStateType.hresizeMove )
			? `ns-resize`
			: ( editorState === EditorStateType.move )
				? `move`
				: `default`;

	const calculateLocalPosition = ( n: number ) => Math.floor( n / ( 16 * magnification ) );

	const addLayer = () => {
		if ( selectedMap === null ) {
			return;
		}
		setSelectedLayer( layers.length );
		setSelectedObject( null );
		updateMap( selectedMap.addLayer( addLayerOption ) );
		if ( ! renderer ) {
			return;
		}
		renderer.addLayer( addLayerOption, palette, selectedMap.getTilesetType() );
	};

	const addObject = ( o: MapObjectArgs ) => {
		if ( selectedMap === null || selectedLayer === null ) {
			return;
		}
		updateMap( selectedMap.updateLayer( selectedLayer ).addObject( o ) );
		if ( ! renderer ) {
			return;
		}
		renderer.updateLayerObjects( selectedLayer, objects, selectedMap.getTilesetType() );
	};

	const changeAddLayerOption = ( e: SyntheticEvent ) => {
		const target: HTMLSelectElement = e.target as HTMLSelectElement;
		const value = target.value;
		setAddLayerOption( value as LayerType );
		setSelectedType( 0 );
	};

	const generateLayerSelector = ( i: number ) => () => {
		setSelectedLayer( i );
		setSelectedObject( null );
		if ( ! renderer ) {
			return;
		}
		renderer.setSelectedLayer( i );
	};

	const moveLayerDown = () => {
		if ( selectedMap === null || selectedLayer === null ) {
			return;
		}
		updateMap( selectedMap.switchLayers( selectedLayer, selectedLayer + 1 ) );
		if ( renderer ) {
			renderer.switchLayers( selectedLayer, selectedLayer + 1 );
		}
		setSelectedLayer( selectedLayer + 1 );
	};

	const moveLayerUp = () => {
		if ( selectedMap === null || selectedLayer === null ) {
			return;
		}
		updateMap( selectedMap.switchLayers( selectedLayer, selectedLayer - 1 ) );
		if ( renderer ) {
			renderer.switchLayers( selectedLayer, selectedLayer - 1 );
		}
		setSelectedLayer( selectedLayer - 1 );
	};

	// Select object on left click.
	const onClick = ( e: MouseEvent ) => {
		// If showing the resize icons & clicking, start resizing.
		if ( selectedObject !== null && editorState === EditorStateType.wresizeHover ) {
			setEditorState( EditorStateType.wresizeMove );
			return;
		} else if ( selectedObject !== null && editorState === EditorStateType.hresizeHover ) {
			setEditorState( EditorStateType.hresizeMove );
			return;
		}

		const { x, y } = getMousePosition( e );

		const gridX = calculateLocalPosition( x );
		const gridY = calculateLocalPosition( y );

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
		if ( renderer && selectedLayer !== null && layers.length > selectedLayer ) {
			renderer.setSelectedObject( newSelectedObject, objects, layers[ selectedLayer ].type );
		}

		// If we successfully selected an object, also set to move when holding down.
		if ( newSelectedObject !== null ) {
			setEditorState( EditorStateType.move );
		}

		setSelectedObject( newSelectedObject );
	};

	// End all special states when releasing click.
	const onMouseUp = () => {
		if (
			editorState === EditorStateType.wresizeMove
			|| editorState === EditorStateType.hresizeMove
			|| editorState === EditorStateType.move
		) {
			setEditorState( EditorStateType.normal );
		}
	};

	const onKeyDown = ( e: React.KeyboardEvent<HTMLCanvasElement> ) => {
		// Deselect object when pressing esc.
		if ( e.key === `Escape` ) {
			setEditorState( EditorStateType.normal );
			setSelectedObject( null );
			return;
		}

		// Shift trigger.
		if ( e.key === `Shift` ) {
			setShift( true );
			return;
		}

		// Handle object manipulation when an object is selected.
		// When using arrow keys, if shift is held, resize width or height;
		// otherwise, move.
		if ( selectedLayer !== null && selectedObject !== null ) {
			if ( e.key === `Delete` ) {
				removeObject();
				setSelectedObject( null );
				return;
			} else if ( e.key === `ArrowUp` ) {
				const object = layers[ selectedLayer ].objects[ selectedObject ];
				if ( shift ) {
					const newHeight = objectLimitOption(
						typesFactory[ object.type() ],
						`height`,
						object.heightBlocks() - 1,
					);
					if ( newHeight !== object.heightBlocks() ) {
						updateObject( selectedObject, { height: newHeight } );
					}
				} else {
					updateObject( selectedObject, { y: object.yBlocks() - 1 } );
				}
				return;
			} else if ( e.key === `ArrowDown` ) {
				const object = layers[ selectedLayer ].objects[ selectedObject ];
				if ( shift ) {
					const newHeight = objectLimitOption(
						typesFactory[ object.type() ],
						`height`,
						object.heightBlocks() + 1,
					);
					if ( newHeight !== object.heightBlocks() ) {
						updateObject( selectedObject, { height: newHeight } );
					}
				} else {
					updateObject( selectedObject, { y: object.yBlocks() + 1 } );
				}
				return;
			} else if ( e.key === `ArrowLeft` ) {
				const object = layers[ selectedLayer ].objects[ selectedObject ];
				if ( shift ) {
					const newWidth = objectLimitOption(
						typesFactory[ object.type() ],
						`width`,
						object.widthBlocks() - 1,
					);
					if ( newWidth !== object.widthBlocks() ) {
						updateObject( selectedObject, { width: newWidth } );
					}
				} else {
					updateObject( selectedObject, { x: object.xBlocks() - 1 } );
				}
				return;
			} else if ( e.key === `ArrowRight` ) {
				const object = layers[ selectedLayer ].objects[ selectedObject ];
				if ( shift ) {
					const newWidth = objectLimitOption(
						typesFactory[ object.type() ],
						`width`,
						object.widthBlocks() + 1,
					);
					if ( newWidth !== object.widthBlocks() ) {
						updateObject( selectedObject, { width: newWidth } );
					}
				} else {
					updateObject( selectedObject, { x: object.xBlocks() + 1 } );
				}
				return;
			}
		}
	};

	// When releasing shift.
	const onKeyUp = ( e: React.KeyboardEvent<HTMLCanvasElement> ) => {
		if ( e.key === `Shift` ) {
			setShift( false );
			return;
		}
	};

	// Update cursor visuals on mouse move.
	const onMouseMove = ( e: MouseEvent ) => {
		const { x, y } = getMousePosition( e );

		// Handle moving object when moving mouse in move state.
		if ( selectedLayer !== null && selectedObject !== null && editorState === EditorStateType.move ) {
			const object = layers[ selectedLayer ].objects[ selectedObject ];
			const xblock = Math.floor( x / 16 );
			const yblock = Math.floor( y / 16 );

			// Only update if it actually changes to save time on redundant changes.
			if ( xblock !== object.xBlocks() && yblock !== object.yBlocks() ) {
				updateObject( selectedObject, { x: xblock, y: yblock } );
			}
			return;

		// Handle resizing width in width-resize state.
		} else if ( selectedLayer !== null && selectedObject !== null && editorState === EditorStateType.wresizeMove ) {
			const object = layers[ selectedLayer ].objects[ selectedObject ];
			const position = Math.floor( x / 16 );
			const diff = position - object.rightBlocks();
			const newWidth = objectLimitOption( typesFactory[ object.type() ], `width`, object.widthBlocks() + diff );

			// Only update if it actually changes to save time on redundant changes.
			if ( newWidth !== object.widthBlocks() ) {
				updateObject( selectedObject, { width: newWidth } );
			}
			return;

		// Handle resizing height in height-resize state.
		} else if ( selectedLayer !== null && selectedObject !== null && editorState === EditorStateType.hresizeMove ) {
			const object = layers[ selectedLayer ].objects[ selectedObject ];
			const position = Math.floor( y / 16 );
			const diff = position - object.bottomBlocks();
			const newHeight = objectLimitOption(
				typesFactory[ object.type() ],
				`height`,
				object.heightBlocks() + diff,
			);

			// Only update if it actually changes to save time on redundant changes.
			if ( newHeight !== object.heightBlocks() ) {
				updateObject( selectedObject, { height: newHeight } );
			}
			return;
		}

		// Test if we should show the resize icon & enable resizing,
		// based on the mouse position being near the edges
		// & if the object in question allows changing the width or height.
		if ( selectedLayer !== null && selectedObject !== null ) {
			const object = layers[ selectedLayer ].objects[ selectedObject ];
			const objectType = typesFactory[ object.type() ];
			if (
				objectTypeHasOption( objectType, `width` )
				&& x > object.rightPixels() - 5
				&& x < object.rightPixels() + 5
				&& y > object.yPixels()
				&& y < object.bottomPixels()
			) {
				setEditorState( EditorStateType.wresizeHover );
			} else if (
				objectTypeHasOption( objectType, `height` )
				&& y > object.bottomPixels() - 5
				&& y < object.bottomPixels() + 5
				&& x > object.xPixels()
				&& x < object.rightPixels()
			) {
				setEditorState( EditorStateType.hresizeHover );
			} else {
				setEditorState( EditorStateType.normal );
			}
		}

		const gridX = calculateLocalPosition( x );
		const gridY = calculateLocalPosition( y );

		if ( selected.x === gridX && selected.y === gridY ) {
			return;
		}

		setSelected( { x: gridX, y: gridY } );
		if ( ! renderer ) {
			return;
		}
		renderer.setSelectedTile( gridX, gridY );
	};

	const onMouseOut = () => {
		setSelected( { x: null, y: null } );
		if ( ! renderer ) {
			return;
		}
		renderer.setSelectedTile( null, null );
	};

	// Create object on right click.
	const onRightClick = ( e: MouseEvent ) => {
		if ( selectedLayer === null
			|| layers.length < selectedLayer
			|| selectedType === null
		) {
			return;
		}
		e.preventDefault();

		if ( selectedLayer === null ) {
			return;
		}

		const { x, y } = getMousePosition( e );

		const gridX = calculateLocalPosition( x );
		const gridY = calculateLocalPosition( y );

		addObject( { ...typesFactory[ selectedType ].create( 0, gridX, gridY ), type: selectedType } );
	};

	const onScrollWindow = ( e: SyntheticEvent ) => {
		const target: HTMLDivElement = e.target as HTMLDivElement;
		setWindowScrollX( target.scrollLeft );
	};

	const removeLayer = () => {
		if ( selectedMap === null || selectedLayer === null ) {
			return;
		}
		const layersCount = layers.length - 1;
		updateMap( selectedMap.removeLayer( selectedLayer ) );
		setSelectedObject( null );
		if ( renderer ) {
			renderer.removeLayer( selectedLayer );
		}
		setSelectedLayer( selectedLayer === 0
			? ( selectedLayer === layersCount
				? null
				: selectedLayer )
			: selectedLayer - 1 );
	};

	const removeObject = () => {
		if ( selectedMap === null || selectedLayer === null || selectedObject === null ) {
			return;
		}
		updateMap( selectedMap.updateLayer( selectedLayer ).removeObject( selectedObject ) );
		setSelectedObject( null );
		if ( ! renderer ) {
			return;
		}
		renderer.updateLayerObjects( selectedLayer, objects, selectedMap.getTilesetType() );
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

		renderer.render();
	};

	const updateMap = ( newMap: LvMap ) => {
		setSelectedMap( newMap );
		setMaps( maps.map( ( map, i ) => ( i === selectedMapIndex
			? generateDataBytes( newMap )
			: map ) ) );
		window.electronAPI.enableSave();
	};

	const updateObject = ( index: number, o: MapObjectArgs ) => {
		if ( selectedMap === null || selectedLayer === null ) {
			return;
		}
		updateMap( selectedMap.updateLayer( selectedLayer ).updateObject( index, o ) );
		if ( ! renderer ) {
			return;
		}
		renderer.setSelectedObject( index, objects, layers[ selectedLayer ].type );
		renderer.updateLayerObjects( selectedLayer, objects, selectedMap.getTilesetType() );
	};

	const updateLayerTilesetOption = ( e: React.ChangeEvent<HTMLSelectElement> ) => {
		const value = e.target.value as LayerTileSetOption;
		if ( value === layerTileSetOption ) {
			return;
		}
		setLayerTileSetOption( value );

		// We also need to update the selected type to reflect changed tileset option.
		if ( value === LayerTileSetOption.tilesetSpecific ) {
			setSelectedType( 256 );
		} else {
			setSelectedType( 0 );
		}
	};

	const updateMagnification = ( e: React.ChangeEvent<HTMLInputElement> ) => {
		const value = Number( e.target.value );
		setMagnification( value );

		if ( renderer === null ) {
			return;
		}

		const width = selectedMap === null
			? 0
			: selectedMap.getWidthBlocks();
		const height = selectedMap === null
			? 0
			: selectedMap.getHeightBlocks();
		renderer.updateMagnification( width, height, value );
	};

	const updateGridOpacity = ( e: React.ChangeEvent<HTMLInputElement> ) => {
		const value = Number( e.target.value );
		setGridOpacity( value );

		if ( renderer === null ) {
			return;
		}

		renderer.updateGridOpacity( value );
	};

	// On canvas load, generate renderer.
	useEffect( () => {
		if ( ! canvasRef.current ) {
			return;
		}
		const ctx: WebGL2RenderingContext | null = canvasRef.current.getContext( `webgl2` );
		if ( ! ctx ) {
			throw new Error( `Could not get webgl context for canvas` );
		}

		const tilesetType = selectedMap === null
			? TileSetType.urban
			: selectedMap.getTilesetType();

		const width = selectedMap === null
			? 0
			: selectedMap.getWidthBlocks();
		const height = selectedMap === null
			? 0
			: selectedMap.getHeightBlocks();

		setRenderer( createMapRenderer(
			ctx,
			palettes,
			graphics,
			layers,
			palette ?? 0,
			tilesetType,
			width,
			height,
			magnification,
		) );
	}, [ canvasRef.current ] );

	useEffect( () => {
		setSelectedLayer( null );
		if ( renderer !== null
			&& selectedMapIndex < maps.length ) {
			renderer.changeMap( selectedMap );
		}
	}, [ renderer, selectedMapIndex ] );

	useEffect( () => {
		if ( selectedLayer === null || layers[ selectedLayer ].objects.length === 0 ) {
			setSelected( { x: null, y: null } );
			setSelectedObject( null );
			setSelectedType( 0 );
		}
	}, [ selectedLayer ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}

		if ( selectedObject === null || objects.length === 0 ) {
			renderer.setSelectedObject( null, [], LayerType.block );
		}
	}, [ renderer, selectedObject ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}

		// Set up animation loop on 1st load.
		let prevTicks: number | null = null;
		let frame: number = 0;
		const tick = ( ticks: number ) => {
			if ( prevTicks === null ) {
				prevTicks = ticks;
			} else {
				const delta = ticks - prevTicks;
				if ( delta > 1000 / 60 ) {
					renderer.updateAnimationFrame( ++frame );
					render();
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
		if ( ! renderer ) {
			return;
		}

		renderer.updateDimensions( width, height );
	}, [ width, height ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}

		renderer.updateScrollX( windowScrollX, selectedMap );
	}, [ windowScrollX, selectedMap ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updatePalette( palette );
	}, [ palette, renderer ] );

	useEffect( () => {
		if ( renderer === null ) {
			return;
		}
		renderer.updateTexture( tilesetType );

		if ( selectedLayer === null ) {
			return;
		}

		renderer.updateLayerObjects( selectedLayer, objects, selectedMap.getTilesetType() );
	}, [ renderer, tilesetType ] );

	return <div>
		<MapOptions
			selectedMap={ selectedMap }
			updateMap={ updateMap }
			palettes={ palettes }
		/>
		<div>
			<h2>Map</h2>
			<div>
				<label>
					<span>Zoom:</span>
					<input
						max={ 8 }
						min={ 1 }
						step={ 0.25 }
						type="range"
						value={ magnification }
						onChange={ updateMagnification }
					/>
					<span>{ magnification }</span>
				</label>
			</div>
			<div>
				<label>
					<span>Grid Opacity:</span>
					<input
						max={ 1 }
						min={ 0 }
						step={ 0.1 }
						type="range"
						value={ gridOpacity }
						onChange={ updateGridOpacity }
					/>
					<span>{ gridOpacity }</span>
				</label>
			</div>
			<div className="window" onScroll={ onScrollWindow }>
				<canvas
					ref={ canvasRef }
					id="editor"
					width={ width * 16 * magnification }
					height={ height * 16 * magnification }
					tabIndex={ 0 }
					onKeyDown={ onKeyDown }
					onKeyUp={ onKeyUp }
					onMouseDown={ onClick }
					onMouseUp={ onMouseUp }
					onContextMenu={ onRightClick }
					onMouseMove={ onMouseMove }
					onMouseOut={ onMouseOut }
					style={{ cursor: cursorType }}
				/>
			</div>
		</div>
		{ layers.length > 0 && <LayerSelectorList
			generateLayerSelector={ generateLayerSelector }
			layers={ layers }
			selectedLayer={ selectedLayer }
		/> }
		<div>
			<h2>Layer controls</h2>
			<div>
				<button disabled={ layers.length >= 255 } onClick={ addLayer }>Add layer</button>
				<select value={ addLayerOption } onChange={ changeAddLayerOption }>
					{ Object.keys( layerTypeNames ).map( ( type, i ) => {
						return <option key={ i } value={ type }>{ layerTypeNames[ type as LayerType ] }</option>;
					} ) }
				</select>
				<button disabled={ selectedLayer === null } onClick={ removeLayer }>Delete layer</button>
				<button
					disabled={ selectedLayer === null || selectedLayer === 0 }
					onClick={ moveLayerUp }
				>
					↑
				</button>
				<button
					disabled={ selectedLayer === null || selectedLayer === layers.length - 1 }
					onClick={ moveLayerDown }
				>
					↓
				</button>
			</div>
		</div>
		{ selectedLayer !== null && selectedLayer < layers.length && <LayerOptions
			selectedLayer={ layers[ selectedLayer ] }
			updateLayer={ selectedMap.updateLayer( selectedLayer ) }
			updateMap={ updateMap }
		/> }
		{ selectedLayer !== null && selectedLayer < layers.length && <div>
			<div>
				<label>Tileset Type:</label>
				<select
					value={ layerTileSetOption }
					onChange={ updateLayerTilesetOption }
				>
					<option value={ LayerTileSetOption.universal }>Universal</option>
					<option value={ LayerTileSetOption.tilesetSpecific }>Tileset Specific</option>
				</select>
			</div>
			<div>
				<label>
					<div>Type:</div>
					<select
						size={ 10 }
						value={ selectedType }
						onChange={ e => setSelectedType( Number( e.target.value ) ) }
					>
						{ typesFactoryGenerator.map(
							( type, i ) => <option key={ i } value={ type.type }>{ type.name }</option>,
						) }
					</select>
				</label>
			</div>
		</div> }
		{ selectedLayer !== null
		&& layers.length > selectedLayer
		&& selectedObject !== null
		&& objects.length > selectedObject
		&& <ObjectOptions
			objects={ objects }
			removeObject={ removeObject }
			selectedObject={ selectedObject }
			typesFactory={ typesFactory }
			updateObject={ updateObject }
		/> }
	</div>;
};

export default MapEditor;
