import { useEffect, useRef, useState } from 'react';
import goals from '../../../common/goals';
import types from '../../../common/types';
import { getDataTypeSize } from '../../../common/utils';
import propTypes from 'prop-types';
import { tilesetProp } from '../../../common/tileset';

const layerTypes = Object.freeze( {
	block: {
		slug: `block`,
		title: `Block`,
	},
} );

const createGoal = id => {
	const goal = {
		id,
	};
	if ( Array.isArray( goals[ id ].options ) ) {
		goals[ id ].options.forEach( option => {
			goal[ option.slug ] = option.default;
		} );
	}
	return goal;
};

const createTileRenderer = ( ctx, tileset, layer, windowScrollX ) => args => {
	const {
		srcx,
		srcy,
		x,
		y,
		w,
		h,
	} = {
		srcx: 0,
		srcy: 0,
		x: 0,
		y: 0,
		w: 1,
		h: 1,
		...args,
	};
	tileset.drawPiece(
		ctx,
		srcx * 8,
		srcy * 8,
		w * 8,
		h * 8,
		x * 8 + windowScrollX * layer.scrollX,
		y * 8,
		w * 8,
		h * 8,
	);
};

const createObject = object => ( {
	xTiles: function() {
		return this.x * 2;
	},
	widthTiles: function() {
		return this.width * 2;
	},
	rightTiles: function() {
		return ( this.x + this.width ) * 2;
	},
	yTiles: function() {
		return this.y * 2;
	},
	heightTiles: function() {
		return this.height * 2;
	},
	bottomTiles: function() {
		return ( this.y + this.height ) * 2;
	},
	...object,
} );

const createNewLayer = () => ( {
	type: layerTypes.block,
	objects: [],
	scrollX: 1.0,
} );

const getMousePosition = e => ( {
	x: e.clientX - e.target.offsetLeft,
	y: e.clientY - e.target.offsetTop,
} );

const createNewMap = () => ( {
	width: 20,
	height: 20,
	layers: [],
} );

const transformMapDataToObject = data => {
	const view = new DataView( data );

	// Read width and height from buffer.
	const width = view.getUint16( 0 );
	const height = view.getUint16( 2 );

	// Read layer data from buffer.
	const layers = [];
	const layerCount = view.getUint8( 4 );
	for ( let i = 0; i < layerCount; i++ ) {
		layers.push( createNewLayer() );
	}
	let currentLayer = 0;
	let state = `readingLayerOptions`;
	let type = 0;
	let i = 5; // Initialize to bytes after width, height, & layer count.
	while ( currentLayer < layerCount ) {
		if ( state === `readingLayerOptions` ) {
			layers[ currentLayer ].scrollX = view.getFloat32( i );
			i += 4; // Move to bytes after layer options.
			state = `readingType`;
		} else if ( state === `readingType` ) {
			type = view.getUint16( i );

			// If type is terminator, move to next layer.
			if ( type === 0xFFFF ) {
				++currentLayer;
				i += 2; // Move to bytes after type.
				state = `readingLayerOptions`;
			} else { // Otherwise, interpret bytes as type for next object.
				if ( layers.length === 0 ) {
					throw new Error( `No layers found in buffer.` );
				}
				state = `readingObjectData`;
				i += 2; // Move to bytes after type.
			}
		} else {
			// Initialize object with type’s default.
			const object = types[ type ].create( 0, 0 );

			// Go thru each object data type, read from buffer, then move forward bytes read.
			const data = types[ type ].exportData;
			data.forEach( ( { type, data } ) => {
				object[ data ] = view[ `get${ type }` ]( i );
				i += getDataTypeSize( type );
			} );
			layers[ currentLayer ].objects.push( createObject( { ...object, type } ) );

			// Since object has been fully read, try reading the next object’s type.
			state = `readingType`;
		}
	}
	return { width, height, layers };
};

const generateDataBytes = map => {
	const { width, height, layers } = map;

	// Initialize data list with width, height, & layers count.
	const dataList = [
		{ type: `Uint16`, data: width },
		{ type: `Uint16`, data: height },
		{ type: `Uint8`, data: layers.length },
	];

	layers.forEach( layer => {
		// Add layer options.
		dataList.push( { type: `Float32`, data: layer.scrollX } );

		// For each object, add 2 bytes for type, then add bytes for each object data type
		// & add each datum to data list.
		layer.objects.forEach( object => {
			dataList.push( { type: `Uint16`, data: object.type } );
			const data = types[ object.type ].exportData;
			dataList.push( ...data.map( ( { type, data } ) => ( { type, data: object[ data ] } ) ) );
		} );

		// Add terminator for layer.
		dataList.push( { type: `Uint16`, data: 0xFFFF } );
	} );

	// Having calculated the total size, create a buffer, view, & iterate through data list
	// to set each datum in the buffer.
	const size = dataList.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );
	const buffer = new ArrayBuffer( size );
	const view = new DataView( buffer );
	let i = 0;
	dataList.forEach( ( { type, data } ) => {
		view[ `set${ type }` ]( i, data );
		i += getDataTypeSize( type );
	} );
	return buffer;
};

const LevelEditor = props => {
	const canvasRef = useRef();
	const [ gridImage, setGridImage ] = useState( null );
	const [ selected, setSelected ] = useState( { x: null, y: null } );
	const [ selectedObject, setSelectedObject ] = useState( null );
	const [ selectedType, setSelectedType ] = useState( 0 );
	const [ frame, setFrame ] = useState( 0 );
	const [ selectedLayer, setSelectedLayer ] = useState( null );
	const [ windowScrollX, setWindowScrollX ] = useState( 0 );
	const [ selectedMapIndex, setSelectedMapIndex ] = useState( null );
	const [ selectedMap, setSelectedMap ] = useState( null );
	const { height, layers, width } = selectedMap !== null ? selectedMap : { height: 0, layers: [], width: 0 };

	const { closeLevel, maps, name, setName, selectedGoal, setMaps, setSelectedGoal, tileset } = props;

	const exit = () => {
		closeLevel();
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		setSelectedLayer( null );
		setSelectedMap( null );
		setSelectedMapIndex( null );
	};

	const update = ( key, value ) => {
		setSelectedMap( { ...selectedMap, [ key ]: value } );
		setMaps( maps.map( ( map, i ) => ( i === selectedMapIndex
			? generateDataBytes( { ...selectedMap, [ key ]: value } )
			: map ) ) );
		window.electronAPI.enableSave();
	};

	const addMap = () => {
		setSelectedMapIndex( maps.length );
		const map = createNewMap();
		setSelectedMap( map );
		setMaps( [ ...maps, generateDataBytes( map ) ] );
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
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

	const setWidth = width => update( `width`, width );
	const setHeight = height => update( `height`, height );

	const addObject = o => {
		update( `layers`, ( () => {
			const newLayers = [ ...layers ];
			newLayers[ selectedLayer ].objects.push( createObject( o ) );
			return newLayers;
		} )() );
	};

	const updateObject = ( index, o ) => {
		update( `layers`, ( () => {
			const newLayers = [ ...layers ];
			newLayers[ selectedLayer ].objects[ index ] = { ...newLayers[ selectedLayer ].objects[ index ], ...o };
			return newLayers;
		} )() );
	};

	const removeObject = () => {
		update( `layers`, ( () => {
			const newLayers = [ ...layers ];
			newLayers[ selectedLayer ].objects = newLayers[ selectedLayer ]
				.objects
				.filter( ( _, i ) => i !== selectedObject );
			return newLayers;
		} )() );
		setSelectedObject( null );
	};

	const addLayer = () => {
		setSelectedLayer( layers.length );
		setSelectedObject( null );
		update( `layers`, [ ...layers, createNewLayer() ] );
	};

	const removeLayer = () => {
		const layersCount = layers.length - 1;
		update( `layers`, layers.filter( ( _, i ) => i !== selectedLayer ) );
		setSelectedObject( null );
		setSelectedLayer( selectedLayer === 0
			? ( selectedLayer === layersCount
				? null
				: selectedLayer )
			: selectedLayer - 1 );
	};

	const updateLayerOption = ( key, value ) => {
		update( `layers`, ( () => {
			const newLayers = [ ...layers ];
			newLayers[ selectedLayer ][ key ] = value;
			return newLayers;
		} )() );
	};

	const generateLayerSelector = i => () => {
		setSelectedLayer( i );
		setSelectedObject( null );
	};

	const moveLayerUp = () => {
		update( `layers`, ( () => {
			const newLayers = [ ...layers ];
			const temp = newLayers[ selectedLayer ];
			newLayers[ selectedLayer ] = newLayers[ selectedLayer - 1 ];
			newLayers[ selectedLayer - 1 ] = temp;
			return newLayers;
		} )() );
		setSelectedLayer( selectedLayer - 1 );
	};

	const moveLayerDown = () => {
		update( `layers`, ( () => {
			const newLayers = [ ...layers ];
			const temp = newLayers[ selectedLayer ];
			newLayers[ selectedLayer ] = newLayers[ selectedLayer + 1 ];
			newLayers[ selectedLayer + 1 ] = temp;
			return newLayers;
		} )() );
		setSelectedLayer( selectedLayer + 1 );
	};

	// Select object on left click.
	const onClick = e => {
		const { x, y } = getMousePosition( e );

		const gridX = Math.floor( x / 16 );
		const gridY = Math.floor( y / 16 );

		let newSelectedObject = null;

		// Go backwards so that the topmost object is selected first.
		for ( let i = objects.length - 1; i >= 0; i-- ) {
			const object = objects[ i ];
			if (
				gridX >= object.x
				&& gridX <= object.x + ( object.width ?? 1 )
				&& gridY >= object.y
				&& gridY <= object.y + ( object.height ?? 1 )
			) {
				newSelectedObject = i;
				break;
			}
		}
		setSelectedObject( newSelectedObject );
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

		addObject( { ...types[ selectedType ].create( gridX, gridY ), type: selectedType } );
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
	};

	const onScrollWindow = e => {
		setWindowScrollX( e.target.scrollLeft );
	};

	const generateMapSelector = ( maps, i ) => () => {
		setSelectedMapIndex( i );
		setSelectedMap( transformMapDataToObject( maps[ i ] ) );
		setSelected( { x: null, y: null } );
		setSelectedObject( null );
		setSelectedLayer( null );
	};

	const render = () => {
		if ( ! canvasRef.current ) {
			return;
		}
		const ctx = canvasRef.current.getContext( `2d` );

		ctx.clearRect( 0, 0, width * 16, height * 16 );

		// Render objects.
		layers.forEach( ( layer, i ) => {
			const tileRenderer = createTileRenderer( ctx, tileset, layer, windowScrollX );

			// Fade out layer if not selected.
			ctx.globalAlpha = selectedLayer === i ? 1.0 : 0.5;

			layer.objects.forEach( object => {
				types[ object.type ].render( tileRenderer, object, frame );
			} );
		} );

		// Render highlight o’er selected object.
		if ( selectedObject !== null ) {
			const object = objects[ selectedObject ];
			ctx.fillStyle = `rgba( 0, 64, 128, 0.5 )`;
			ctx.fillRect( object.x * 16, object.y * 16, ( object.width ?? 1 ) * 16, ( object.height ?? 1 ) * 16 );
		}

		// Render highlight o’er selected grid box.
		const gridXPixels = selected.x * 16;
		const gridYPixels = selected.y * 16;
		ctx.fillStyle = `rgba( 0, 64, 128, 0.5 )`;
		ctx.fillRect( gridXPixels, gridYPixels, 15, 15 );

		// Render grid lines.
		if ( gridImage !== null ) {
			ctx.globalAlpha = 0.5;
			ctx.drawImage( gridImage, 0, 0 );
			ctx.globalAlpha = 1.0;
		}
	};

	const onChangeGoal = e => {
		setSelectedGoal( createGoal( e.target.selectedIndex ) );
		window.electronAPI.enableSave();
	};

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
		// Set up animation loop on 1st load.
		let prevTicks = null;
		const tick = ticks => {
			if ( prevTicks === null ) {
				prevTicks = ticks;
			} else {
				const delta = ticks - prevTicks;
				if ( delta > 1000 / 8 ) {
					setFrame( frame => frame + 1 );
					prevTicks = ticks;
				}
			}
			window.requestAnimationFrame( tick );
		};
		window.requestAnimationFrame( tick );

		return () => {
			window.cancelAnimationFrame( tick );
		};
	}, [] );

	// Generate gridline image whene’er width or height changes.
	useEffect( () => {
		if ( canvasRef.current ) {
			const gridImage = document.createElement( `canvas` );
			gridImage.width = width * 16;
			gridImage.height = height * 16;
			const gridImageCtx = gridImage.getContext( `2d` );

			gridImageCtx.strokeStyle = `#4488ff`;
			gridImageCtx.lineWidth = 1;

			for ( let i = 16; i < height * 16; i += 16 ) {
				gridImageCtx.moveTo( 0, i );
				gridImageCtx.lineTo( width * 16, i );
				gridImageCtx.stroke();
			}

			for ( let i = 16; i < width * 16; i += 16 ) {
				gridImageCtx.moveTo( i, 0 );
				gridImageCtx.lineTo( i, height * 16 );
				gridImageCtx.stroke();
			}

			setGridImage( gridImage );
		}
	}, [ width, height ] );

	// Render on canvas ref or whene’er there is a state change.
	useEffect( render, [ canvasRef ] );
	useEffect( render );

	const importMapData = data => {
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

	useEffect( () => {
		window.electronAPI.importMapData( importMapData );
		window.electronAPI.onOpen( onOpen );
		window.electronAPI.onClose( onClose );
		window.electronAPI.onNew( onNew );

		return () => {
			window.electronAPI.removeImportMapDataListener( importMapData );
			window.electronAPI.removeOpenListener( onOpen );
			window.electronAPI.removeCloseListener( onClose );
			window.electronAPI.removeNewListener( onNew );
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
					<select onChange={ onChangeGoal } value={ selectedGoal.id }>
						{ goals.map( ( goal, i ) => <option
							key={ i }
							value={ i }
						>
							{ goal.name }
						</option> ) }
					</select>
				</label>
				{ Array.isArray( goals[ selectedGoal.id ].options ) && goals[ selectedGoal.id ].options.map( (
					{ atts, slug, title, type },
					i,
				) => <label key={ i }>
					<span>{ title }:</span>
					<input
						type={ type }
						onChange={ e => setSelectedGoal( { ...selectedGoal, [ slug ]: e.target.value } ) }
						value={ selectedGoal[ slug ] }
						{ ...atts }
					/>
				</label> )
				}
			</div>
		</div>
		{ maps.length > 0 && <ul>
			{ maps.map( ( map, i ) => <li key={ i }>
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
					<span>Type:</span>
					<select value={ selectedType } onChange={ e => setSelectedType( e.target.value ) }>
						{ types.map( ( type, i ) => <option key={ i } value={ i }>{ type.name }</option> ) }
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
					types[ objects[ selectedObject ].type ].options.map( ( options, i ) => {
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
								value={ objects[ selectedObject ][ key ] }
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
							Layer { i + 1 } – { layer.type.title }
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

LevelEditor.propTypes = {
	closeLevel: propTypes.func.isRequired,
	maps: propTypes.array.isRequired,
	name: propTypes.string.isRequired,
	setMaps: propTypes.func.isRequired,
	setName: propTypes.func.isRequired,
	selectedGoal: propTypes.object.isRequired,
	setSelectedGoal: propTypes.func.isRequired,
	tileset: tilesetProp.isRequired,
};

export default LevelEditor;
