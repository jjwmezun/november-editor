import { ReactElement, SyntheticBaseEvent, useEffect, useRef, useState } from 'react';
import {
	generateDataBytes,
	layerTypeNames,
} from '../../../../common/levels';
import { getTypeFactory } from '../../../../common/objects';
import { getMousePosition } from '../../../../common/utils';
import {
	LayerType,
	MapEditorProps,
	MapObject,
} from '../../../../common/types';
import { createMapRenderer } from '../../../../common/render-level';

import { LayerOptions } from './LayerOptions';
import { LayerSelectorList } from './LayerSelectorList';
import { MapOptions } from './MapOptions';
import { ObjectOptions } from './ObjectOptions';

const MapEditor = ( props: MapEditorProps ): ReactElement => {
	const canvasRef = useRef();
	const [ addLayerOption, setAddLayerOption ] = useState( `block` );
	const [ renderer, setRenderer ] = useState( null );
	const [ selected, setSelected ] = useState( { x: null, y: null } );
	const [ selectedLayer, setSelectedLayer ] = useState( null );
	const [ selectedObject, setSelectedObject ] = useState( null );
	const [ selectedType, setSelectedType ] = useState( 0 );
	const [ windowScrollX, setWindowScrollX ] = useState( 0 );

	const { graphics, maps, palettes, selectedMap, selectedMapIndex, setSelectedMap, setMaps } = props;

	const { height, layers, palette, width } = selectedMap !== null
		? selectedMap.getProps()
		: { height: 0, layers: [], width: 0 };

	const objects = selectedLayer === null || layers.length < selectedLayer
		? []
		: layers[ selectedLayer ]?.objects ?? [];

	const typesFactory = getTypeFactory( selectedLayer && layers.length < selectedLayer
		? ( layers[ selectedLayer ]?.type ?? LayerType.block )
		: LayerType.block );

	const addLayer = () => {
		if ( selectedMap === null ) {
			return;
		}
		setSelectedLayer( layers.length );
		setSelectedObject( null );
		updateMap( selectedMap.addLayer( addLayerOption ) );
		renderer.addLayer( addLayerOption, palette );
	};

	const addObject = o => {
		if ( selectedMap === null ) {
			return;
		}
		updateMap( selectedMap.updateLayer( selectedLayer ).addObject( o ) );
		renderer.updateLayerObjects( selectedLayer, objects );
	};

	const changeAddLayerOption = ( e: SyntheticBaseEvent ) => {
		const target: HTMLSelectElement = e.target;
		const value = target.value;
		setAddLayerOption( value as LayerType );
		setSelectedType( 0 );
	};

	const generateLayerSelector = i => () => {
		setSelectedLayer( i );
		renderer.setSelectedLayer( i );
		setSelectedObject( null );
	};

	const moveLayerDown = () => {
		if ( selectedMap === null ) {
			return;
		}
		updateMap( selectedMap.switchLayers( selectedLayer, selectedLayer + 1 ) );
		renderer.switchLayers( selectedLayer, selectedLayer + 1 );
		setSelectedLayer( selectedLayer + 1 );
	};

	const moveLayerUp = () => {
		if ( selectedMap === null ) {
			return;
		}
		updateMap( selectedMap.switchLayers( selectedLayer, selectedLayer - 1 ) );
		renderer.switchLayers( selectedLayer, selectedLayer - 1 );
		setSelectedLayer( selectedLayer - 1 );
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

	// Create object on right click.
	const onRightClick = e => {
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

		const gridX = Math.floor( x / 16 );
		const gridY = Math.floor( y / 16 );

		addObject( { ...typesFactory[ selectedType ].create( gridX, gridY ), type: selectedType } );
	};

	const onScrollWindow = e => {
		setWindowScrollX( e.target.scrollLeft );
	};

	const removeLayer = () => {
		if ( selectedMap === null || selectedLayer === null ) {
			return;
		}
		const layersCount = layers.length - 1;
		updateMap( selectedMap.removeLayer( selectedLayer ) );
		setSelectedObject( null );
		renderer.removeLayer( selectedLayer );
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
		renderer.updateLayerObjects( selectedLayer, objects );
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

	const updateMap = newMap => {
		setSelectedMap( newMap );
		setMaps( maps.map( ( map, i ) => ( i === selectedMapIndex
			? generateDataBytes( newMap )
			: map ) ) );
		window.electronAPI.enableSave();
	};

	const updateObject = ( index: number, o: MapObject ) => {
		if ( selectedMap === null || selectedLayer === null ) {
			return;
		}
		updateMap( selectedMap.updateLayer( selectedLayer ).updateObject( index, o ) );
		renderer.setSelectedObject( index, objects, layers[ selectedLayer ].type );
		renderer.updateLayerObjects( selectedLayer, objects );
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
				graphics,
				layers,
				palette ?? 0,
			) );
		}
	}, [ canvasRef.current ] );

	useEffect( () => {
		setSelectedLayer( null );
		if ( renderer !== null && selectedMapIndex !== null && selectedMapIndex < maps.length ) {
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
			renderer.setSelectedObject( null, [] );
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
				if ( delta > 1000 / 8 ) {
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

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updatePalette( palette );
	}, [ palette, renderer ] );

	return <div>
		{ selectedMap !== null && <div>
			<MapOptions
				selectedMap={ selectedMap }
				updateMap={ updateMap }
				palettes={ palettes }
			/>
			<div>
				<h2>Map</h2>
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
			{ selectedLayer !== null && layers.length < selectedLayer && <LayerOptions
				selectedLayer={ layers[ selectedLayer ] }
				updateLayer={ selectedMap.updateLayer( selectedLayer ) }
				updateMap={ updateMap }
			/> }
			{ selectedLayer !== null && layers.length < selectedLayer && <div>
				<label>
					<span>Type:</span>
					<select value={ selectedType } onChange={ e => setSelectedType( e.target.value ) }>
						{ typesFactory.map( ( type, i ) => <option key={ i } value={ i }>{ type.name }</option> ) }
					</select>
				</label>
			</div> }
			{ selectedLayer !== null
			&& layers.length < selectedLayer
			&& selectedObject !== null
			&& objects.length < selectedObject
			&& <ObjectOptions
				objects={ objects }
				removeObject={ removeObject }
				selectedObject={ selectedObject }
				typesFactory={ typesFactory }
				updateObject={ updateObject }
			/> }
		</div> }
	</div>;
};

export default MapEditor;
