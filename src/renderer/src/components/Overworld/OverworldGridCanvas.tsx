// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { ReactElement, SyntheticEvent, useEffect, useRef, useState } from "react";

import {
	Coordinates,
	OverworldEventUpdateRemove,
	OverworldGridCanvasProps,
	OverworldRenderer,
} from '../../../../common/types';
import { getMousePosition } from '../../../../common/utils';
import generateRenderer from '../../../../common/render-ow';
import { getOverworldTypeGenerator } from '../../../../common/objects';

const zoom = 2;

function OverworldGridCanvas( props: OverworldGridCanvasProps ): ReactElement {
	const canvasRef = useRef<HTMLCanvasElement>( null );
	const [ hover, setHover ] = useState<Coordinates>( { x: -1, y: -1 } );
	const [ renderer, setRenderer ] = useState<OverworldRenderer | null>( null );
	const [ showGrid, setShowGrid ] = useState<boolean>( true );
	const {
		graphics,
		map,
		palettes,
		selectedEventFrames,
		selectedFrame,
		selectedLayer,
		selectedMap,
		selectedObject,
		selectedObjectType,
		setOverworld,
		setSelectedObject,
	} = props;

	const layers = map.getLayersList();
	let layer = layers[ selectedLayer ];
	let objects = layer.getObjectsList();
	const width = map.getWidthBlocks();
	const height = map.getHeightBlocks();
	const typeGenerator = getOverworldTypeGenerator( layer.getType() );

	// Update objects shown & editable based on frames going up to current frame.
	for ( let i = 0; i <= selectedFrame; i++ ) {
		const updates = selectedEventFrames[ i ] ? selectedEventFrames[ i ].getUpdates() : [];
		updates.forEach( update => {
			switch ( update.getType() ) {
				case `remove`:
					if ( update.getMap() === map.getId() && update.getLayer() === layer.getId() ) {
						const updateValue: OverworldEventUpdateRemove = update.getUpdate() as OverworldEventUpdateRemove;
						objects.forEach( ( o, i ) => {
							if ( o.id() === updateValue.getObjectId() ) {
								layer = layer.updateObject( i, { hidden: true } )
									.getMapsList()[ selectedMap ].getLayersList()[ selectedLayer ];
								objects = layer.getObjectsList();
							}
						} );
					}
				break;
				case `change`:
					if ( update.getMap() === map.getId() && update.getLayer() === layer.getId() ) {
						const updateValue = update.getUpdate();
						objects.forEach( ( o, i ) => {
							if ( o.id() === updateValue.getObjectId() ) {
								layer = layer.updateObject( i, { ...updateValue.getChanges() } )
									.getMapsList()[ selectedMap ].getLayersList()[ selectedLayer ];
								objects = layer.getObjectsList();
							}
						} );
					}
				break;
			}
		} );
	}

	// Select object on left click.
	const onClick = ( e: SyntheticEvent ) => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / ( 16 * zoom ) );
		const gridY = Math.floor( y / ( 16 * zoom ) );

		let newSelectedObject: number | null = null;

		// Go backwards so that the topmost object is selected first.
		for ( let i = objects.length - 1; i >= 0; i-- ) {
			const object = objects[ i ];

			// Ignore hidden objects.
			if ( object.hidden() ) {
				continue;
			}

			if (
				gridX >= object.xBlocks()
				&& gridX < object.rightBlocks()
				&& gridY >= object.yBlocks()
				&& gridY < object.bottomBlocks()
			) {
				newSelectedObject = i;
				break;
			}
		}
		if ( ! renderer ) {
			return;
		}
		renderer.setSelectedObject( newSelectedObject, objects );
		setSelectedObject( newSelectedObject );
	};

	// Update cursor visuals on mouse move.
	const onMouseMove = ( e: SyntheticEvent ) => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / ( 16 * zoom ) );
		const gridY = Math.floor( y / ( 16 * zoom ) );

		if ( hover.x === gridX && hover.y === gridY ) {
			return;
		}

		setHover( { x: gridX, y: gridY } );
		if ( ! renderer ) {
			return;
		}
		renderer.updateHoverTile( gridX, gridY );
	};

	// Create object on right click.
	const onRightClick = ( e: SyntheticEvent ) => {
		e.preventDefault();

		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / ( 16 * zoom ) );
		const gridY = Math.floor( y / ( 16 * zoom ) );

		setOverworld( layer.addObject( typeGenerator( layer.getLatestId(), selectedObjectType, gridX, gridY ) ) );
		setSelectedObject( null );
	};

	useEffect( () => {
		if ( canvasRef.current ) {
			const newRenderer = generateRenderer( canvasRef.current, map, graphics, palettes, 2, selectedLayer );
			setRenderer( newRenderer );
			newRenderer.render();
		}
	}, [ canvasRef ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateSelectedObject(
			selectedObject,
			objects,
		);
		renderer.render();
	}, [ objects, selectedObject, renderer ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateLayers( map, selectedLayer );
		renderer.render();
	}, [ layers ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateLayerObjects( selectedLayer, objects, selectedObject );
	}, [ selectedFrame, selectedEventFrames ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateSelectedLayer( selectedLayer );
		renderer.render();
	}, [ selectedLayer ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateShowGrid( showGrid );
		renderer.render();
	}, [ showGrid, renderer ] );

	useEffect( () => {
		if ( ! renderer ) {
			return;
		}
		renderer.updateResolution( width, height );
		renderer.render();
	}, [ height, renderer, width ] );

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
					renderer.render();
					prevTicks = ticks;
				}
			}
			window.requestAnimationFrame( tick );
		};
		const handle = window.requestAnimationFrame( tick );

		return () => window.cancelAnimationFrame( handle );
	}, [ renderer ] );

	return <div>
		<h2>O’erworld Canvas</h2>
		<div>
			<label>
				<input
					type="checkbox"
					checked={ showGrid }
					onChange={ () => setShowGrid( !showGrid ) }
				/>
				Show grid
			</label>
		</div>
		<div className="overworld__canvas">
			<canvas
				ref={ canvasRef }
				height={ map.getHeightPixels() * zoom }
				width={ map.getWidthPixels() * zoom }
				onClick={ onClick }
				onContextMenu={ onRightClick }
				onMouseMove={ onMouseMove }
			/>
		</div>
	</div>;
}

export default OverworldGridCanvas;
