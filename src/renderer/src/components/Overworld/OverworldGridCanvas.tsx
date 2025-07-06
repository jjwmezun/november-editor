// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { ReactElement, SyntheticBaseEvent, useEffect, useRef, useState } from "react";

import {
	Coordinates,
	OverworldGridCanvasProps,
	OverworldLayerType,
} from '../../../../common/types';
import { getMousePosition } from '../../../../common/utils';
import { getOverworldTypeGenerator } from '../../../../common/objects';
import generateRenderer from '../../../../common/render-ow';

const zoom = 2;

function OverworldGridCanvas( props: OverworldGridCanvasProps ): ReactElement {
	const canvasRef = useRef<HTMLCanvasElement>( null );
	const [ hover, setHover ] = useState<Coordinates>( { x: -1, y: -1 } );
	const [ renderer, setRenderer ] = useState( null );
	const [ showGrid, setShowGrid ] = useState<boolean>( true );
	const {
		graphics,
		overworld,
		palettes,
		selectedLayer,
		selectedObject,
		selectedObjectType,
		setOverworld,
		setSelectedObject,
	} = props;

	const layers = overworld.getLayersList();
	const layer = layers[ selectedLayer ];
	const typesFactory = getOverworldTypeGenerator( OverworldLayerType.block );
	const objects = layer.getObjectsList();

	// Select object on left click.
	const onClick = ( e: SyntheticBaseEvent ) => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / ( 16 * zoom ) );
		const gridY = Math.floor( y / ( 16 * zoom ) );

		let newSelectedObject: number | null = null;

		// Go backwards so that the topmost object is selected first.
		for ( let i = objects.length - 1; i >= 0; i-- ) {
			const object = objects[ i ];
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
		renderer.setSelectedObject( newSelectedObject, objects );
		setSelectedObject( newSelectedObject );
	};

	// Update cursor visuals on mouse move.
	const onMouseMove = ( e: SyntheticBaseEvent ) => {
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
	const onRightClick = ( e: SyntheticBaseEvent ) => {
		e.preventDefault();

		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / ( 16 * zoom ) );
		const gridY = Math.floor( y / ( 16 * zoom ) );

		setOverworld( layer.addObject( typesFactory( selectedObjectType, gridX, gridY ) ) );
		setSelectedObject( null );
	};

	useEffect( () => {
		if ( canvasRef.current ) {
			const newRenderer = generateRenderer( canvasRef.current, overworld, graphics, palettes, 2, selectedLayer );
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
		renderer.updateLayers( overworld, selectedLayer );
		renderer.render();
	}, [ layers ] );

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
				height={ overworld.getHeightPixels() * zoom }
				width={ overworld.getWidthPixels() * zoom }
				onClick={ onClick }
				onContextMenu={ onRightClick }
				onMouseMove={ onMouseMove }
			/>
		</div>
	</div>;
}

export default OverworldGridCanvas;
