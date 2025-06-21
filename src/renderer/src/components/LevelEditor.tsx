import { ReactElement, SyntheticBaseEvent, useEffect, useRef, useState } from 'react';
import {
	createMap,
	generateDataBytes,
	layerTypeNames,
	transformMapDataToObject,
} from '../../../common/levels';
import { getTypeFactory } from '../../../common/objects';
import { getMousePosition } from '../../../common/utils';
import {
	LayerType,
	LevelEditorProps,
	MapObject,
} from '../../../common/types';
import { createMapRenderer } from '../../../common/render-level';

import { LevelOptions } from './LevelEditor/LevelOptions';
import { MapSelectorList } from './LevelEditor/MapSelectorList';
import { LayerSelectorList } from './LevelEditor/LayerSelectorList';
import { MapOptions } from './LevelEditor/MapOptions';
import { LayerOptions } from './LevelEditor/LayerOptions';
import { ObjectOptions } from './LevelEditor/ObjectOptions';

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
	const [ addLayerOption, setAddLayerOption ] = useState( `block` );

	const { height, layers, palette, width } = selectedMap !== null
		? selectedMap.getProps()
		: { height: 0, layers: [], width: 0 };

	const { closeLevel, graphics, maps, name, setName, goal, palettes, setMaps, setGoal } = props;

	const exit = () => {
		closeLevel();
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		renderer.setSelectedObject( null, [] );
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
		renderer.setSelectedObject( null, [] );
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

	const addObject = o => {
		updateMap( selectedMap.updateLayer( selectedLayer ).addObject( o ) );
		renderer.updateLayerObjects( selectedLayer, objects );
	};

	const updateObject = ( index: number, o: MapObject ) => {
		updateMap( selectedMap.updateLayer( selectedLayer ).updateObject( index, o ) );
		renderer.setSelectedObject( index, objects, layers[ selectedLayer ].type );
		renderer.updateLayerObjects( selectedLayer, objects );
	};

	const removeObject = () => {
		updateMap( selectedMap.updateLayer( selectedLayer ).removeObject( selectedObject ) );
		setSelectedObject( null );
		renderer.setSelectedObject( null, [] );
		renderer.updateLayerObjects( selectedLayer, objects );
	};

	const addLayer = () => {
		setSelectedLayer( layers.length );
		setSelectedObject( null );
		renderer.setSelectedObject( null, [] );
		updateMap( selectedMap.addLayer( addLayerOption ) );
		renderer.addLayer( addLayerOption, palette );
	};

	const removeLayer = () => {
		const layersCount = layers.length - 1;
		updateMap( selectedMap.removeLayer( selectedLayer ) );
		setSelectedObject( null );
		renderer.setSelectedObject( null, [] );
		renderer.removeLayer( selectedLayer );
		setSelectedLayer( selectedLayer === 0
			? ( selectedLayer === layersCount
				? null
				: selectedLayer )
			: selectedLayer - 1 );
	};

	const generateLayerSelector = i => () => {
		setSelectedLayer( i );
		renderer.setSelectedLayer( i );
		setSelectedObject( null );
		renderer.setSelectedObject( null, [] );
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
		renderer.setSelectedObject( newSelectedObject, objects, layers[ selectedLayer ].type );
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

		addObject( { ...typesFactory[ selectedType ].create( gridX, gridY ), type: selectedType } );
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

	const onScrollWindow = e => {
		setWindowScrollX( e.target.scrollLeft );
	};

	const generateMapSelector = ( i: number ) => () => {
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

	const typesFactory = getTypeFactory( selectedLayer ? layers[ selectedLayer ].type : LayerType.block );

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
				graphics,
				layers,
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

	const changeAddLayerOption = ( e: SyntheticBaseEvent ) => {
		const target: HTMLSelectElement = e.target;
		const value = target.value;
		setAddLayerOption( value as LayerType );
		setSelectedType( 0 );
	};

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updatePalette( palette );
	}, [ palette, renderer ] );

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
		<h1>Level editor</h1>
		<LevelOptions
			goal={ goal }
			name={ name }
			setGoal={ setGoal }
			setName={ setName }
		/>
		{ maps.length > 0 && <MapSelectorList
			generateMapSelector={ generateMapSelector }
			maps={ maps }
			selectedMapIndex={ selectedMapIndex }
		/> }
		<div>
			<h2>Map controls</h2>
			<div>
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
			</div>
		</div>
		{ selectedMap !== null && <div>
			<MapOptions
				selectedMap={ selectedMap }
				updateMap={ updateMap }
				palettes={ palettes }
			/>
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
			{ selectedLayer !== null && <LayerOptions
				selectedLayer={ layers[ selectedLayer ] }
				updateLayer={ selectedMap.updateLayer( selectedLayer ) }
				updateMap={ updateMap }
			/> }
			<LayerSelectorList
				generateLayerSelector={ generateLayerSelector }
				layers={ layers }
				selectedLayer={ selectedLayer }
			/>
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
		</div> }
		{ selectedLayer !== null && <div>
			<label>
				<span>Type:</span>
				<select value={ selectedType } onChange={ e => setSelectedType( e.target.value ) }>
					{ typesFactory.map( ( type, i ) => <option key={ i } value={ i }>{ type.name }</option> ) }
				</select>
			</label>
		</div> }
		{ selectedLayer !== null && selectedObject !== null && <ObjectOptions
			objects={ objects }
			removeObject={ removeObject }
			selectedObject={ selectedObject }
			typesFactory={ typesFactory }
			updateObject={ updateObject }
		/> }
		<div>
			<button onClick={ exit }>Back to Level List</button>
		</div>
	</div>;
};

export default LevelEditor;
