import {
	ByteBlock,
	MapObject,
	MapObjectArgs,
	Overworld,
	OverworldEvent,
	OverworldEventFrame,
	OverworldEventsList,
	OverworldEventUpdate,
	OverworldEventUpdateAdd,
	OverworldEventUpdateChange,
	OverworldEventUpdateRemove,
	OverworldEventUpdateType,
	OverworldLayer,
	OverworldLayerData,
	OverworldLayerType,
	OverworldMap,
	OverworldMapData,
} from './types';
import { createObject, getOverworldTypeFactory } from './objects';

function convertLayerTypeToByte( type: OverworldLayerType ): number {
	switch ( type ) {
	case OverworldLayerType.block:
		return 0;
	case OverworldLayerType.sprite:
		return 1;
	default:
		throw new Error( `Invalid layer type: ${ type }` );
	}
}

function createBlankOverworld(): Overworld {
	return createOverworld( 1, [ createBlankOverworldMapData( 0 ) ], [] );
}

function createBlankOverworldLayerData( latestId: number, atts: object = {} ): OverworldLayerData {
	return Object.freeze( {
		id: latestId,
		latestId: 0,
		objects: [],
		type: OverworldLayerType.block,
		...atts,
	} );
}

function createBlankOverworldMapData( index: number, atts: object = {} ): OverworldMapData {
	return Object.freeze( {
		height: 20,
		id: index,
		latestId: 1,
		layers: [ createBlankOverworldLayerData( 0 ) ],
		width: 20,
		...atts,
	} );
}

function createOverworld(
	latestId: number,
	maps: readonly OverworldMapData[],
	events: readonly OverworldEvent[],
): Overworld {
	const updateMap = ( index: number, map: OverworldMapData ): Overworld => {
		const newMaps = [ ...maps ];
		newMaps[ index ] = map;
		return createOverworld( latestId, newMaps, events );
	};
	const maps_ = maps.map( ( map: OverworldMapData, index: number ) => createOverworldMap( map, index, updateMap ) );

	const updateEvents = ( newEvents: readonly OverworldEvent[] ): Overworld => {
		return createOverworld( latestId, maps, newEvents );
	};

	const eventsList = createOverworldEventsList( events, updateEvents );

	return Object.freeze( {
		addMap: () => createOverworld( latestId + 1, [ ...maps, createBlankOverworldMapData( latestId ) ], events ),
		getEventsList: () => eventsList,
		getMapsList: () => maps_,
		encode: () => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Write maps count to data list.
			data.push( { type: `Uint8`, value: maps_.length } );

			// Write each map to data list.
			maps_.forEach( map => {
				data.push( ...map.encode() );
			} );

			return data;
		},
		moveMapDown: ( index: number ) => {
			if ( index >= maps.length - 1 ) {
				throw new Error( `Cannot move map down: index out of bounds.` );
			}
			const newMaps = [ ...maps ];
			[ newMaps[ index ], newMaps[ index + 1 ] ] = [
				newMaps[ index + 1 ],
				newMaps[ index ],
			];
			return createOverworld( latestId, newMaps, events );
		},
		moveMapUp: ( index: number ) => {
			if ( index <= 0 ) {
				throw new Error( `Cannot move map up: index out of bounds.` );
			}
			const newMaps = [ ...maps ];
			[ newMaps[ index ], newMaps[ index - 1 ] ] = [
				newMaps[ index - 1 ],
				newMaps[ index ],
			];
			return createOverworld( latestId, newMaps, events );
		},
		removeMap: ( index: number ) => {
			if ( maps.length <= 1 ) {
				throw new Error( `Cannot remove the last map.` );
			}
			const newMaps = [ ...maps ];
			newMaps.splice( index, 1 );
			return createOverworld( latestId, newMaps, events );
		},
		toJSON: () => {
			return {
				events: eventsList.toJSON(),
				latestId,
				maps: maps_.map( map => map.toJSON() ),
			};
		},
		updateMap,
	} );
}

function createOverworldEventsList(
	events: readonly OverworldEvent[],
	updateEvents: ( newEvents: readonly OverworldEvent[] ) => Overworld,
): OverworldEventsList {
	return Object.freeze( {
		addEvent: () => {
			const newEvents = [ ...events, createOverworldEvent( [ createFrame() ] ) ];
			return updateEvents( newEvents );
		},
		getEntry: ( index: number ): OverworldEvent => {
			if ( index < 0 || index >= events.length ) {
				throw new Error( `Event index out o’ bounds: ${ index }` );
			}
			return events[ index ];
		},
		getLength: () => events.length,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		map: ( callback: ( event: OverworldEvent, index: number ) => any ) => {
			return events.map( callback );
		},
		toJSON: () => ( {
			events: events.map( event => event.toJSON() ),
		} ),
		removeEvent: ( index: number ) => {
			if ( index < 0 || index >= events.length ) {
				throw new Error( `Event index out o’ bounds: ${ index }` );
			}
			const newEvents = [ ...events ];
			newEvents.splice( index, 1 );
			return updateEvents( newEvents );
		},
		updateEvent: ( index: number, event: OverworldEvent ) => {
			if ( index < 0 || index >= events.length ) {
				throw new Error( `Event index out o’ bounds: ${ index }` );
			}
			const newEvents = [ ...events ];
			newEvents[ index ] = event;
			return updateEvents( newEvents );
		},
	} );
}

function createOverworldEvent( frames: OverworldEventFrame[] = [] ): OverworldEvent {
	return Object.freeze( {
		addFrame: () => {
			const newFrames = [ ...frames, createFrame() ];
			return createOverworldEvent( newFrames );
		},
		getEntry: ( index: number ): OverworldEventFrame => {
			if ( index < 0 || index >= frames.length ) {
				throw new Error( `Frame index out o’ bounds: ${ index }` );
			}
			return frames[ index ];
		},
		getFrames: () => frames,
		getLength: () => frames.length,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		map: ( callback: ( frame: OverworldEventFrame, index: number ) => any ) => {
			return frames.map( callback );
		},
		removeLatestFrame: () => {
			if ( frames.length < 2 ) {
				throw new Error( `No frames to remove` );
			}
			const newFrames = [ ...frames ];
			newFrames.splice( newFrames.length - 1, 1 );
			return createOverworldEvent( newFrames );
		},
		toJSON: () => ( {
			frames: frames.map( frame => frame.toJSON() ),
		} ),
		updateFrame: ( index: number, frame: OverworldEventFrame ) => {
			if ( index < 0 || index >= frames.length ) {
				throw new Error( `Frame index out o’ bounds: ${ index }` );
			}
			const newFrames = [ ...frames ];
			newFrames[ index ] = frame;
			return createOverworldEvent( newFrames );
		},
	} );
}

function createEventUpdateAdd( object: MapObject ): OverworldEventUpdateAdd {
	return Object.freeze( {
		getObject: () => object,
		toJSON: () => object.toJSON(),
	} );
}

function createEventUpdateChange( objectId: number, changes: object ): OverworldEventUpdateChange {
	return Object.freeze( {
		getChanges: () => changes,
		getObjectId: () => objectId,
		toJSON: () => ( {
			id: objectId,
			changes,
		} ),
	} );
}

function createEventUpdateRemove( objectId: number ): OverworldEventUpdateRemove {
	return Object.freeze( {
		getObjectId: () => objectId,
		toJSON: () => ( {
			id: objectId,
		} ),
	} );
}

function createFrame( duration: number = 8, updates: readonly OverworldEventUpdate[] = [] ): OverworldEventFrame {
	return Object.freeze( {
		addEventAdd: ( map: number, layer: number, object: MapObject ) => {
			const update = createEventUpdate(
				map,
				layer,
				OverworldEventUpdateType.add,
				createEventUpdateAdd( object ),
			);
			const newUpdates = [ ...updates, update ];
			return createFrame( duration, newUpdates );
		},
		addEventChange: ( map: number, layer: number, objectId: number, changes: object ) => {
			const update = createEventUpdate(
				map,
				layer,
				OverworldEventUpdateType.change,
				createEventUpdateChange( objectId, changes ),
			);
			const newUpdates = [ ...updates, update ];
			return createFrame( duration, newUpdates );
		},
		addEventRemove: ( map: number, layer: number, objectId: number ) => {
			const update = createEventUpdate(
				map,
				layer,
				OverworldEventUpdateType.remove,
				createEventUpdateRemove( objectId ),
			);
			const newUpdates = [ ...updates, update ];
			return createFrame( duration, newUpdates );
		},
		getDuration: () => duration,
		getUpdates: () => updates,
		toJSON: () => ( {
			duration,
			updates: updates.map( update => update.toJSON() ),
		} ),
		updateDuration: ( newDuration: number ) => createFrame( newDuration, updates ),
		updateEventAdd: ( index: number, map: number, layer: number, changes: object ) => {
			if ( index < 0 || index >= updates.length ) {
				throw new Error( `Update index out o’ bounds: ${ index }` );
			}
			const origUpdate = updates[ index ].getUpdate() as OverworldEventUpdateAdd;
			const update = createEventUpdate(
				map,
				layer,
				OverworldEventUpdateType.add,
				createEventUpdateAdd( origUpdate.getObject().update( changes ) ),
			);
			const newUpdates = [ ...updates ];
			newUpdates[ index ] = update;
			return createFrame( duration, newUpdates );
		},
		updateEventChange: ( index: number, map: number, layer: number, objectId: number, changes: object ) => {
			if ( index < 0 || index >= updates.length ) {
				throw new Error( `Update index out o’ bounds: ${ index }` );
			}
			const origUpdate = updates[ index ].getUpdate() as OverworldEventUpdateChange;
			const update = createEventUpdate(
				map,
				layer,
				OverworldEventUpdateType.change,
				createEventUpdateChange(
					objectId,
					{
						...origUpdate.getChanges(),
						...changes,
					},
				),
			);
			const newUpdates = [ ...updates ];
			newUpdates[ index ] = update;
			return createFrame( duration, newUpdates );
		},
	} );
}

function createEventUpdate(
	map: number,
	layer: number,
	type: OverworldEventUpdateType,
	update: OverworldEventUpdateAdd | OverworldEventUpdateChange | OverworldEventUpdateRemove,
): OverworldEventUpdate {
	return Object.freeze( {
		getLayer: () => layer,
		getMap: () => map,
		getType: () => type,
		getUpdate: () => update,
		toJSON: () => ( {
			map,
			layer,
			type,
			update: update.toJSON(),
		} ),
	} );
}

function createOverworldFromJSON( data: object ): Overworld {
	if ( ! ( `latestId` in data ) ||
		! ( `maps` in data ) ||
		! Array.isArray( data[ `maps` ] ) ||
			! ( `events` in data ) ||
			typeof data[ `events` ] !== `object` ||
			data[ `events` ] === null
	) {
		throw new Error( `Invalid overworld data` );
	}
	const mapsData: object[] = data[ `maps` ];
	const maps: OverworldMapData[] = mapsData.map( mapData => {
		if ( ! ( `height` in mapData )
			|| ! ( `id` in mapData )
			|| ! ( `latestId` in mapData )
			|| ! ( `layers` in mapData )
			|| ! ( `width` in mapData )
			|| ! Array.isArray( mapData[ `layers` ] )
			|| typeof mapData[ `height` ] !== `number`
			|| typeof mapData[ `width` ] !== `number` ) {
			throw new Error( `Invalid overworld map data` );
		}
		const layersData: object[] = mapData[ `layers` ];
		const layers: OverworldLayerData[] = layersData.map( layerData => {
			if ( ! ( `id` in layerData )
				|| ! ( `latestId` in layerData )
				|| ! ( `objects` in layerData )
				|| ! ( `type` in layerData )
				|| ! Array.isArray( layerData[ `objects` ] )
				|| typeof layerData[ `type` ] !== `string` ) {
				throw new Error( `Invalid overworld layer data` );
			}
			const objectsData: object[] = layerData[ `objects` ];
			const objects: MapObject[] = objectsData.map( objData => createObject( objData ) );
			return Object.freeze( {
				id: layerData[ `id` ] as number,
				latestId: layerData[ `latestId` ] as number,
				objects,
				type: layerData[ `type` ] as OverworldLayerType,
			} );
		} );
		return Object.freeze( {
			height: mapData[ `height` ] as number,
			id: mapData[ `id` ] as number,
			latestId: mapData[ `latestId` ] as number,
			layers,
			width: mapData[ `width` ] as number,
		} );
	} );

	const eventsData: object = data[ `events` ];

	if ( ! ( `events` in eventsData ) || ! Array.isArray( eventsData[ `events` ] ) ) {
		throw new Error( `Invalid overworld events data` );
	}

	const eventsList: object[] = eventsData[ `events` ];
	const events = eventsList.map( eventData => {
		if (
			typeof eventData !== `object` ||
			eventData === null ||
			! ( `frames` in eventData ) ||
			! Array.isArray( eventData[ `frames` ] )
		) {
			throw new Error( `Invalid overworld event data` );
		}
		const framesData: object[] = eventData[ `frames` ];
		const frames = framesData.map( frameData => {
			if (
				typeof frameData !== `object` ||
				frameData === null ||
				! ( `duration` in frameData ) ||
				! ( `updates` in frameData ) ||
				! Array.isArray( frameData[ `updates` ] ) ||
				typeof frameData[ `duration` ] !== `number`
			) {
				throw new Error( `Invalid overworld event frame data` );
			}
			const duration: number = frameData[ `duration` ] as number;
			const updatesData: object[] = frameData[ `updates` ];
			const updates: OverworldEventUpdate[] = updatesData.map( updateData => {
				if (
					typeof updateData !== `object` ||
					updateData === null ||
					! ( `map` in updateData ) ||
					! ( `layer` in updateData ) ||
					! ( `type` in updateData ) ||
					! ( `update` in updateData ) ||
					typeof updateData[ `map` ] !== `number` ||
					typeof updateData[ `layer` ] !== `number` ||
					typeof updateData[ `type` ] !== `string` ||
					typeof updateData[ `update` ] !== `object` ||
					updateData[ `update` ] === null
				) {
					throw new Error( `Invalid overworld event update data` );
				}

				const layer = updateData[ `layer` ] as number;
				const map = updateData[ `map` ] as number;
				const type = updateData[ `type` ] as OverworldEventUpdateType;

				// Default update.
				let update : OverworldEventUpdateAdd | OverworldEventUpdateChange | OverworldEventUpdateRemove =
					createEventUpdateRemove( 0 );

				// Generate update from type & value.
				switch ( type ) {
					case OverworldEventUpdateType.add:
					{
						if (
							! ( `id` in updateData[ `update` ] )
							|| typeof updateData[ `update` ][ `id` ] !== `number`
							|| ! ( `type` in updateData[ `update` ] )
							|| typeof updateData[ `update` ][ `type` ] !== `number`
						) {
							throw new Error( `Invalid overworld layer object data` );
						}
						const args : MapObjectArgs = {
							id: updateData[ `update` ][ `id` ] as number,
							type: updateData[ `update` ][ `type` ] as number,
							...updateData[ `update` ],
						};
						update = createEventUpdateAdd( createObject( args ) );
					}
					break;
					case OverworldEventUpdateType.change:
						if (
							! ( `id` in updateData[ `update` ] )
							|| typeof updateData[ `update` ][ `id` ] !== `number`
							|| ! ( `changes` in updateData[ `update` ] )
							|| typeof updateData[ `update` ][ `changes` ] !== `object`
							|| updateData[ `update` ][ `changes` ] === null
						) {
							throw new Error( `Invalid overworld event change update data` );
						}
						update = createEventUpdateChange(
							updateData[ `update` ][ `id` ],
							{ ...updateData[ `update` ][ `changes` ] },
						);
					break;
					case OverworldEventUpdateType.remove:
						if ( ! ( `id` in updateData[ `update` ] ) || typeof updateData[ `update` ][ `id` ] !== `number` ) {
							throw new Error( `Invalid overworld event remove update data` );
						}
						update = createEventUpdateRemove( updateData[ `update` ][ `id` ] );
					break;
				}

				return createEventUpdate( map, layer, type, update );
			} );

			return createFrame( duration, updates );
		} );

		return createOverworldEvent( frames );
	} );

	return createOverworld( data[ `latestId` ] as number, maps, events );
}

function createOverworldLayer(
	updateLayer: ( index: number, layer: OverworldLayerData ) => Overworld,
	layerIndex: number,
	layer: OverworldLayerData,
): OverworldLayer {
	const { id, latestId, objects, type } = layer;
	return Object.freeze( {
		addObject: ( object: MapObject ) => updateLayer(
			layerIndex,
			{
				...layer,
				latestId: latestId + 1,
				objects: [ ...objects, object ],
			},
		),
		getId: () => id,
		getLatestId: () => latestId,
		getObject: ( index: number ): MapObject => {
			if ( index < 0 || index >= objects.length ) {
				throw new Error( `Object index out of bounds: ${ index }` );
			}
			return objects[ index ];
		},
		getObjectsList: () => objects,
		getType: () => type,
		encode: () => {
			// Init data list.
			const dataList: ByteBlock[] = [];

			const typeFactory = getOverworldTypeFactory( layer.type );

			// Add layer options.
			dataList.push( { type: `Uint8`, value: convertLayerTypeToByte( layer.type ) } );

			// For each object, add 2 bytes for type, then add bytes for each object data type
			// & add each datum to data list.
			layer.objects.forEach( object => {
				dataList.push( { type: `Uint16`, value: object.type() } );
				const data = typeFactory[ object.type() ].exportData;
				dataList.push( ...data.map( ( { type, key } ) => ( { type, value: object.getProp( key ) } ) ) );
			} );

			// Add terminator for layer.
			dataList.push( { type: `Uint16`, value: 0xFFFF } );

			return dataList;
		},
		removeObject: ( index: number ) => {
			const newObjects = [ ...objects ];
			newObjects.splice( index, 1 );
			const newLayer = {
				...layer,
				objects: newObjects,
			};
			return updateLayer(
				layerIndex,
				newLayer,
			);
		},
		toJSON: () => ( {
			id,
			latestId,
			objects: objects.map( obj => obj.toJSON() ),
			type: OverworldLayerType[ type ],
		} ),
		updateLatestId: () => {
			return updateLayer(
				layerIndex,
				{
					...layer,
					latestId: latestId + 1,
				},
			);
		},
		updateObject: ( index: number, object: MapObjectArgs ) => {
			const newObjects = [ ...objects ];
			newObjects[ index ] = createObject( { ...newObjects[ index ].toJSON(), ...object } );
			const newLayer = {
				...layer,
				objects: newObjects,
			};
			return updateLayer(
				layerIndex,
				newLayer,
			);
		},
	} );
}

function createOverworldMap(
	data: OverworldMapData,
	mapIndex: number,
	updateMap: ( index: number, map: OverworldMapData ) => Overworld,
): OverworldMap {
	const { height, id, latestId, layers, width } = data;
	const updateThisMap = ( atts: object = {} ) => updateMap(
		mapIndex,
		{
			height,
			id,
			latestId,
			layers,
			width,
			...atts,
		},
	);
	const updateLayer = ( index: number, layer: OverworldLayerData ): Overworld => {
		const newLayers = [ ...layers ];
		newLayers[ index ] = layer;
		return updateThisMap( { layers: newLayers } );
	};
	const layers_ = layers.map( ( layer, index ) => createOverworldLayer(
		updateLayer,
		index,
		layer,
	) );
	return Object.freeze( {
		addLayer: ( type: OverworldLayerType ) => updateThisMap( {
			latestId: latestId + 1,
			layers: [
				...layers,
				createBlankOverworldLayerData( latestId, { type } ),
			],
		} ),
		getHeightBlocks: () => height,
		getHeightPixels: () => height * 16,
		getHeightTiles: () => height * 2,
		getId: () => id,
		getLayersList: () => layers_,
		getWidthBlocks: () => width,
		getWidthPixels: () => width * 16,
		getWidthTiles: () => width * 2,
		encode: () => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Write width and height to data list.
			data.push( { type: `Uint8`, value: width } );
			data.push( { type: `Uint8`, value: height } );

			// Write layers count to data list.
			data.push( { type: `Uint8`, value: layers_.length } );

			// Write each layer to data list.
			layers_.forEach( layer => {
				data.push( ...layer.encode() );
			} );

			return data;
		},
		moveLayerDown: ( index: number ) => {
			if ( index >= layers.length - 1 ) {
				throw new Error( `Cannot move layer down: index out of bounds.` );
			}
			const newLayers = [ ...layers ];
			[ newLayers[ index ], newLayers[ index + 1 ] ] = [
				newLayers[ index + 1 ],
				newLayers[ index ],
			];
			return updateThisMap( { layers: newLayers } );
		},
		moveLayerUp: ( index: number ) => {
			if ( index <= 0 ) {
				throw new Error( `Cannot move layer up: index out of bounds.` );
			}
			const newLayers = [ ...layers ];
			[ newLayers[ index ], newLayers[ index - 1 ] ] = [
				newLayers[ index - 1 ],
				newLayers[ index ],
			];
			return updateThisMap( { layers: newLayers } );
		},
		removeLayer: ( index: number ) => {
			if ( layers.length <= 1 ) {
				throw new Error( `Cannot remove the last layer.` );
			}
			const newLayers = [ ...layers ];
			newLayers.splice( index, 1 );
			return updateThisMap( { layers: newLayers } );
		},
		toJSON: () => ( {
			height,
			id,
			latestId,
			layers: layers_.map( layer => layer.toJSON() ),
			width,
		} ),
		updateHeight: ( newHeight: number ) => updateThisMap( { height: newHeight } ),
		updateLayer,
		updateWidth: ( newWidth: number ) => updateThisMap( { width: newWidth } ),
	} );
}

function loadOverworldFromData( data: Uint8Array ): Overworld {
	const content: object = { maps: [] };
	let i = 0;
	const mapCount = data[ i++ ];
	for ( let m = 0; m < mapCount; m++ ) {
		const mapData: object = {};
		mapData[ `width` ] = data[ i++ ];
		mapData[ `height` ] = data[ i++ ];
		const layerCount = data[ i++ ];
		mapData[ `layers` ] = [];
		for ( let l = 0; l < layerCount; l++ ) {
			const layerData: object = {};
			const layerTypeByte = data[ i++ ];
			layerData[ `type` ] = layerTypeByte === 0 ? OverworldLayerType.block : OverworldLayerType.sprite;
			layerData[ `objects` ] = [];
			const typeFactory = getOverworldTypeFactory( layerData[ `type` ] as OverworldLayerType );

			// eslint-disable-next-line no-constant-condition
			while ( true ) {
				const objectType = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;
				if ( objectType === 0xFFFF ) {
					break;
				}
				const objData: object = { type: objectType };
				const exportData = typeFactory[ objectType ].exportData;
				for ( let d = 0; d < exportData.length; d++ ) {
					const { type, key } = exportData[ d ];
					switch ( type ) {
					case `Uint8`:
						objData[ key ] = data[ i++ ];
						break;
					case `Uint16`:
						objData[ key ] = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;
						break;
					case `Int8`:
						objData[ key ] = ( data[ i++ ] << 24 ) >> 24;
						break;
					case `Int16`:
						objData[ key ] = ( ( ( data[ i++ ] << 8 ) | data[ i++ ] ) << 16 ) >> 16;
						break;
					default:
						throw new Error( `Unsupported data type: ${ type }` );
					}
				}
				layerData[ `objects` ].push( objData );
			}
			( mapData[ `layers` ] as object[] ).push( layerData );
		}
		content.maps.push( mapData );
	}
	return createOverworldFromJSON( content );
}

export { createBlankOverworld, createOverworld, createOverworldFromJSON, loadOverworldFromData };
