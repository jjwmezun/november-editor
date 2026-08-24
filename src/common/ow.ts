import {
	ByteBlock,
	DataType,
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

function convertOverworldEventTypeToByte( type: OverworldEventUpdateType ): number {
	switch ( type ) {
		case OverworldEventUpdateType.add:
			return 0;
		case OverworldEventUpdateType.change:
			return 1;
		case OverworldEventUpdateType.remove:
			return 2;
		default:
			throw new Error( `Unknown OverworldEventUpdateType: ${ type }` );
	}
}

function convertByteToOverworldEventType( value: number ): OverworldEventUpdateType {
	switch ( value ) {
		case 0:
			return OverworldEventUpdateType.add;
		case 1:
			return OverworldEventUpdateType.change;
		case 2:
			return OverworldEventUpdateType.remove;
		default:
			throw new Error( `Unknown OverworldEventUpdateType number: ${ value }` );
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
			data.push( { type: DataType.Uint8, value: maps_.length } );

			// Write each map to data list.
			maps_.forEach( map => {
				data.push( ...map.encode() );
			} );

			// Write each event to data list.
			data.push( ...eventsList.encode( maps_ ) );

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
		encode: ( maps: readonly OverworldMap[] ) => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Write events count to data list.
			data.push( { type: DataType.Uint8, value: events.length } );

			// Write each event to data list.
			events.forEach( event => {
				data.push( ...event.encode( maps, events ) );
			} );

			return data;
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
		toJSON: () => events.map( event => event.toJSON() ),
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
		encode: ( maps: readonly OverworldMap[], events: readonly OverworldEvent[] ) => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Write frames count to data list.
			data.push( { type: DataType.Uint8, value: frames.length } );

			// Write each frame to data list.
			frames.forEach( frame => {
				data.push( ...frame.encode( maps, events ) );
			} );

			return data;
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
		encode: ( layerType: OverworldLayerType ) => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Encode object data just like encoding a static map layer’s objects.
			data.push( { type: DataType.Uint16, value: object.type() } );
			const typeFactory = getOverworldTypeFactory( layerType );
			const exportData = typeFactory[ object.type() ].exportData;
			data.push( ...exportData.map( ( { type, key } ) => ( { type, value: object.getProp( key ) } ) ) );

			return data;
		},
		getObject: () => object,
		toJSON: () => object.toJSON(),
	} );
}

function createEventUpdateChange( objectId: number, changes: MapObjectArgs ): OverworldEventUpdateChange {
	return Object.freeze( {
		encode: ( layerType: OverworldLayerType, objectType: number ) => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Write change count to data.
			data.push( { type: DataType.Uint8, value: Object.keys( changes ).length } );

			const typeFactory = getOverworldTypeFactory( layerType );
			const exportData = typeFactory[ objectType ].exportData;
			for ( const key in changes ) {
				for ( let i = 0; i < exportData.length; i++ ) {
					const { type } = exportData[ i ];

					if ( key === exportData[ i ].key ) {
						// Store export data index so we can use it when loading data
						// to pull in specific export data.
						// Write the index of the changed property to the data.
						data.push( { type: DataType.Uint8, value: i } );

						// & then save the value for that export data.
						// Write value itself to data.
						const value = changes[ key ] as number;
						data.push( { type, value } );
					}
				}
			}

			return data;
		},
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
		encode: () => [],
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
				object.id(),
				map,
				layer,
				OverworldEventUpdateType.add,
				createEventUpdateAdd( object ),
			);
			const newUpdates = [ ...updates, update ];
			return createFrame( duration, newUpdates );
		},
		addEventChange: ( map: number, layer: number, objectId: number, changes: MapObjectArgs ) => {
			const update = createEventUpdate(
				objectId,
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
				objectId,
				map,
				layer,
				OverworldEventUpdateType.remove,
				createEventUpdateRemove( objectId ),
			);
			const newUpdates = [ ...updates, update ];
			return createFrame( duration, newUpdates );
		},
		encode: ( maps: readonly OverworldMap[], events: readonly OverworldEvent[] ) => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Write updates count to data list.
			data.push( { type: DataType.Uint8, value: updates.length } );

			// Write duration to data list.
			data.push( { type: DataType.Uint8, value: duration } );

			// Write each update to data list.
			updates.forEach( update => {
				data.push( ...update.encode( maps, events ) );
			} );

			return data;
		},
		getDuration: () => duration,
		getUpdates: () => updates,
		getUpdateById: ( objectId: number, mapId: number, layerId: number ) => {
			for ( const update of updates ) {
				if (
					update.getObjectId() === objectId
					&& update.getMap() === mapId
					&& update.getLayer() === layerId
				) {
					return update;
				}
			}
			return null;
		},
		removeUpdate: ( mapId: number, layerId: number, objectId: number ) => {
			const newUpdates = updates.filter( update => ! (
				update.getObjectId() === objectId
				&& update.getMap() === mapId
				&& update.getLayer() === layerId
			) );
			return createFrame( duration, newUpdates );
		},
		toJSON: () => ( {
			duration,
			updates: updates.map( update => update.toJSON() ),
		} ),
		updateDuration: ( newDuration: number ) => createFrame( newDuration, updates ),
		updateEvent: function( objectId: number, mapId: number, layerId: number, changes: object ) {
			for ( let i = 0; i < updates.length; i++ ) {
				const update = updates[ i ];

				// Skip if not the update we seek.
				if (
					update.getObjectId() !== objectId
					|| update.getMap() !== mapId
					|| update.getLayer() !== layerId
				) {
					continue;
				}

				switch ( update.getType() ) {
					case `add`: {
						const origUpdate = update.getUpdate() as OverworldEventUpdateAdd;
						const newUpdate = createEventUpdate(
							objectId,
							update.getMap(),
							update.getLayer(),
							OverworldEventUpdateType.add,
							createEventUpdateAdd( origUpdate.getObject().update( changes ) ),
						);
						const newUpdates = [ ...updates ];
						newUpdates[ i ] = newUpdate;
						return createFrame( duration, newUpdates );
					}
					break;
					case `change`: {
						const origUpdate = update.getUpdate() as OverworldEventUpdateChange;

						// Combine existing changes with new changes.
						const newChanges : Record<string, unknown> = {
							...origUpdate.getChanges(),
							...changes,
						};

						// Values set to undefined should be removed.
						for ( const key in newChanges ) {
							if ( newChanges[ key ] === undefined ) {
								delete newChanges[ key ];
							}
						}

						const newUpdate = createEventUpdate(
							objectId,
							update.getMap(),
							update.getLayer(),
							OverworldEventUpdateType.change,
							createEventUpdateChange(
								objectId,
								newChanges,
							),
						);
						const newUpdates = [ ...updates ];
						newUpdates[ i ] = newUpdate;
						return createFrame( duration, newUpdates );
					}
					break;
					case `remove`: {
						throw new Error( `Cannot update a removed object with ID: ${ objectId }` );
					}
					break;
				}
			}

			throw new Error( `No update found for object with ID: ${ objectId }` );
		},
	} );
}

function createEventUpdate(
	objectId: number,
	map: number,
	layer: number,
	type: OverworldEventUpdateType,
	update: OverworldEventUpdateAdd | OverworldEventUpdateChange | OverworldEventUpdateRemove,
): OverworldEventUpdate {
	return Object.freeze( {
		encode: ( maps: readonly OverworldMap[], events: readonly OverworldEvent[] ) => {
			// Init data list.
			const data: ByteBlock[] = [];

			// Write object ID to data list.
			data.push( { type: DataType.Uint16, value: objectId } );

			// Write map ID to data list.
			data.push( { type: DataType.Uint8, value: map } );

			// Write layer ID to data list.
			data.push( { type: DataType.Uint8, value: layer } );

			// Write update type to data list.
			data.push( { type: DataType.Uint8, value: convertOverworldEventTypeToByte( type ) } );

			// Write update data to data list.
			//
			// We need the layer type for most update types,
			// so loop thru all maps & all layers in each map
			// till we find that which matches this update.
			let encoded = false;
			for ( let i = 0; i < maps.length; ++i ) {
				if ( maps[ i ].getId() === map ) {
					const layers = maps[ i ].getLayersList();
					for ( let j = 0; j < layers.length; ++j ) {
						if ( layers[ j ].getId() === layer ) {
							const layerType = layers[ j ].getType();

							switch ( type ) {
								case `add`:
									data.push( ...( update as OverworldEventUpdateAdd ).encode( layerType ) );
									encoded = true;
								break;
								case `change`: {
									let object : MapObject | null = null;

									// Start by searching thru all static map layer objects
									// till we find one that matches the ID.
									const objects = layers[ j ].getObjectsList();
									for ( let k = 0; k < objects.length; ++k ) {
										if ( objects[ k ].id() === objectId ) {
											object = objects[ k ];
											break;
										}
									}

									// If we haven’t found the object yet
									// next search thru all add event updates.
									if ( object === null ) {
										for ( let e = 0; e < events.length; ++e ) {
											const frames = events[ e ].getFrames();
											for ( let f = 0; f < frames.length; ++f ) {
												const updates = frames[ f ].getUpdates();
												for ( let u = 0; u < updates.length; ++u ) {
													if (
														updates[ u ].getType() === `add`
														&& updates[ u ].getMap() === maps[ i ].getId()
														&& updates[ u ].getLayer() === layers[ j ].getId()
														&& updates[ u ].getObjectId() === objectId
													) {
														// eslint-disable-next-line max-len
														object = ( updates[ u ].getUpdate() as OverworldEventUpdateAdd ).getObject();
														break;
													}
												}
											}
										}
									}

									if ( object === null ) {
										// eslint-disable-next-line max-len
										throw new Error( `Failed to find object with ID: ${ objectId } when exporting change event update` );
									}

									// eslint-disable-next-line max-len
									data.push( ...( update as OverworldEventUpdateChange ).encode( layerType, object.type() ) );
									encoded = true;
								}
								break;
								case `remove`:
									data.push( ...( update as OverworldEventUpdateRemove ).encode() );
									encoded = true;
								break;
							}

							break;
						}
					}
					break;
				}
			}

			if ( !encoded ) {
				throw new Error( `Failed to encode update type ${ type } for object with ID: ${ objectId }` );
			}

			return data;
		},
		getObjectId: () => objectId,
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
			! Array.isArray( data[ `events` ] )
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

	const eventsList: object[] = data[ `events` ];
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
				let objectId : number = 0;

				// Default update.
				let update : OverworldEventUpdateAdd | OverworldEventUpdateChange | OverworldEventUpdateRemove =
					createEventUpdateRemove( objectId );

				// Generate update from type & value.
				switch ( type ) {
					case OverworldEventUpdateType.add: {
						if (
							! ( `id` in updateData.update )
							|| typeof updateData.update.id !== `number`
							|| ! ( `type` in updateData.update )
							|| typeof updateData.update.type !== `number`
						) {
							throw new Error( `Invalid overworld layer object data` );
						}
						objectId = updateData.update.id as number;
						const args : MapObjectArgs = {
							...( updateData.update as MapObjectArgs ),
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
						objectId = updateData[ `update` ][ `id` ] as number;
						update = createEventUpdateChange(
							objectId,
							{ ...updateData[ `update` ][ `changes` ] },
						);
					break;
					case OverworldEventUpdateType.remove: {
						if ( ! ( `id` in updateData[ `update` ] )
							|| typeof updateData[ `update` ][ `id` ] !== `number` ) {
							throw new Error( `Invalid overworld event remove update data` );
						}
						objectId = updateData[ `update` ][ `id` ];
						update = createEventUpdateRemove( objectId );
					}
					break;
				}

				return createEventUpdate( objectId, map, layer, type, update );
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

			// Add ID to data list.
			dataList.push( { type: DataType.Uint8, value: id } );

			const typeFactory = getOverworldTypeFactory( layer.type );

			// Add layer options.
			dataList.push( { type: DataType.Uint8, value: convertLayerTypeToByte( layer.type ) } );

			// For each object, add 2 bytes for type, then add bytes for each object data type
			// & add each datum to data list.
			layer.objects.forEach( object => {
				dataList.push( { type: DataType.Uint16, value: object.type() } );
				const data = typeFactory[ object.type() ].exportData;
				dataList.push( ...data.map( ( { type, key } ) => ( { type, value: object.getProp( key ) } ) ) );
			} );

			// Add terminator for layer.
			dataList.push( { type: DataType.Uint16, value: 0xFFFF } );

			return dataList;
		},
		removeObject: ( id: number ) => {
			const newObjects = [ ...objects ];
			const objectIndex = newObjects.findIndex( obj => obj.id() === id );
			if ( objectIndex === -1 ) {
				throw new Error( `Object with id ${ id } not found.` );
			}
			newObjects.splice( objectIndex, 1 );
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
		updateObject: ( id: number, changes: MapObjectArgs ) => {
			const newObjects = [ ...objects ];
			const objectIndex = newObjects.findIndex( obj => obj.id() === id );
			if ( objectIndex === -1 ) {
				throw new Error( `Object with id ${ id } not found.` );
			}
			newObjects[ objectIndex ] = createObject( { ...newObjects[ objectIndex ].toJSON(), ...changes } );
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

			// Write ID, width, & height to data list.
			data.push( { type: DataType.Uint8, value: id } );
			data.push( { type: DataType.Uint8, value: width } );
			data.push( { type: DataType.Uint8, value: height } );

			// Write layers count to data list.
			data.push( { type: DataType.Uint8, value: layers_.length } );

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
	const content: Record<string, unknown> = { maps: [] };
	let i = 0;

	// Load map data.
	const mapCount = data[ i++ ];
	content.latestId = 0;
	for ( let m = 0; m < mapCount; m++ ) {
		const mapData: Record<string, unknown> = {};
		mapData.id = data[ i++ ];

		// Make sure the o’erworld’s latest ID is bigger than all maps’ IDs
		// so we don’t get ID conflicts when making new maps.
		// @ts-expect-error – Dynamic object.
		if ( mapData.id >= content.latestId ) {
			// @ts-expect-error – Dynamic object.
			content.latestId = mapData.id + 1;
		}

		mapData.width = data[ i++ ];
		mapData.height = data[ i++ ];
		const layerCount = data[ i++ ];
		mapData.latestId = 0;
		mapData.layers = [];
		for ( let l = 0; l < layerCount; l++ ) {
			const layerData: Record<string, unknown> = {};
			layerData.id = data[ i++ ];

			// Make sure the map’s latest ID is bigger than all layers’ IDs
			// so we don’t get ID conflicts when making new layers.
			// @ts-expect-error – Dynamic object.
			if ( layerData.id >= mapData.latestId ) {
				// @ts-expect-error – Dynamic object.
				mapData.latestId = layerData.id + 1;
			}

			layerData.latestId = 0;

			const layerTypeByte = data[ i++ ];
			layerData.type = layerTypeByte === 0 ? OverworldLayerType.block : OverworldLayerType.sprite;
			layerData.objects = [] as object[];
			const typeFactory = getOverworldTypeFactory( layerData.type as OverworldLayerType );

			// eslint-disable-next-line no-constant-condition
			while ( true ) {
				const objectType = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;
				if ( objectType === 0xFFFF ) {
					break;
				}
				const objData: Record<string, unknown> = { type: objectType };
				const exportData = typeFactory[ objectType ].exportData;
				for ( let d = 0; d < exportData.length; d++ ) {
					const { type, key } = exportData[ d ];
					switch ( type ) {
						case DataType.Uint8:
							objData[ key ] = data[ i++ ];
						break;
						case DataType.Uint16:
							objData[ key ] = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;
						break;
						case DataType.Int8:
							objData[ key ] = ( data[ i++ ] << 24 ) >> 24;
						break;
						case DataType.Int16:
							objData[ key ] = ( ( ( data[ i++ ] << 8 ) | data[ i++ ] ) << 16 ) >> 16;
						break;
						default:
							throw new Error( `Unsupported data type: ${ type }` );
						break;
					}
				}

				// Make sure the layer’s latest ID is always bigger than all objects’ IDs
				// so we don’t get ID conflicts when making new objects.
				// @ts-expect-error – Dynamic object.
				if ( `id` in objData && objData.id >= layerData.latestId ) {
					// @ts-expect-error – Dynamic object.
					layerData.latestId = objData.id + 1;
				}

				( layerData.objects as object[] ).push( objData );
			}

			( mapData.layers as object[] ).push( layerData );
		}
		( content.maps as object[] ).push( mapData );
	}

	// Load event data.
	content.events = [];
	const eventCount = data[ i++ ];
	for ( let e = 0; e < eventCount; e++ ) {
		const eventData: Record<string, unknown> = {
			frames: [],
		};
		const frameCount = data[ i++ ];
		for ( let f = 0; f < frameCount; f++ ) {
			const frameData: Record<string, unknown> = {
				updates: [],
			};
			const updateCount = data[ i++ ];
			frameData.duration = data[ i++ ];
			for ( let u = 0; u < updateCount; u++ ) {
				const objectId = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;
				const updateData : Record<string, unknown> = {
					map: data[ i++ ],
					layer: data[ i++ ],
					type: convertByteToOverworldEventType( data[ i++ ] ),
					update: {
						id: objectId,
					},
				};

				// For most event types, we need that event’s layer data,
				// so we need to loop thru the maps & each map’s layers till
				// we find the layer with the matching ID.
				const maps = content.maps as Record<string, unknown>[];
				for ( let m = 0; m < maps.length; m++ ) {
					// Skip if not the right map.
					if ( maps[ m ].id !== updateData.map ) {
						continue;
					}
					const layers = maps[ m ].layers as Record<string, unknown>[];
					for ( let l = 0; l < layers.length; l++ ) {
						// Skip if not the right layer.
						if ( layers[ l ].id !== updateData.layer ) {
							continue;
						}

						// Once we have the correct layer for this event, we need to save its type
						// for use in gathering object data.
						const layerType = layers[ l ].type as OverworldLayerType;
						const typeFactory = getOverworldTypeFactory( layerType );
						switch ( updateData.type ) {
							case ( `add` ): {
								// Make sure the layer’s latest ID is always bigger than all objects’ IDs
								// so we don’t get ID conflicts when making new objects.
								// @ts-expect-error – Dynamic object.
								if ( objectId >= layers[ l ].latestId ) {
									layers[ l ].latestId = objectId + 1;
								}

								const objectType = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;

								// @ts-expect-error – Dynamic object.
								updateData.update.type = objectType;

								// Gather object data just like in layers.
								const exportData = typeFactory[ objectType ].exportData;
								for ( let d = 0; d < exportData.length; d++ ) {
									const { type, key } = exportData[ d ];
									switch ( type ) {
										case DataType.Uint8:
											// @ts-expect-error – Dynamic object.
											updateData.update[ key ] = data[ i++ ];
										break;
										case DataType.Uint16:
											// @ts-expect-error – Dynamic object.
											updateData.update[ key ] = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;
										break;
										case DataType.Int8:
											// @ts-expect-error – Dynamic object.
											updateData.update[ key ] = ( data[ i++ ] << 24 ) >> 24;
										break;
										case DataType.Int16:
											// @ts-expect-error – Dynamic object.
											// eslint-disable-next-line
											updateData.update[ key ] = ( ( ( data[ i++ ] << 8 ) | data[ i++ ] ) << 16 ) >> 16;
										break;
										default:
											throw new Error( `Unsupported data type: ${ type }` );
										break;
									}
								}
							}
							break;
							case ( `change` ): {
								// @ts-expect-error – Dynamic object.
								updateData.update.changes = {} as Record<string, unknown>;
								let object : Record<string, unknown> | null = null;

								// 1st try looping thru all static map layer objects to find the change object.
								const objects = layers[ l ].objects as Record<string, unknown>[];
								for ( let o = 0; o < objects.length; o++ ) {
									if ( objects[ o ].id === objectId ) {
										object = objects[ o ];
										break;
									}
								}

								// If we still haven’t found the right object, loop thru event objects
								// to see if the change object is an add event object.
								if ( object === null ) {
									const frames = eventData.frames as Record<string, unknown>[];
									for ( let f = 0; f < frames.length; ++f ) {
										const updates = frames[ f ].updates as Record<string, unknown>[];
										for ( let u = 0; u < updates.length; ++u ) {
											const update = updates[ u ];
											const updateData = update.update as Record<string, unknown>;
											if (
												update.type === `add`
												&& update.map === maps[ m ].id
												&& update.layer === layers[ l ].id
												&& updateData.id === objectId
											) {
												object = update.update as Record<string, unknown>;
												break;
											}
										}
									}
								}

								// If we still haven’t found the object by now, there must be an error.
								if ( object === null ) {
									// eslint-disable-next-line max-len
									throw new Error( `Couldn’t find object with ID: ${ objectId } for change event import.` );
								}

								const changeCount = data[ i++ ];
								const exportData = typeFactory[ object.type as number ].exportData;

								// Now that we’ve confirmed that we have an object,
								// pull in the changed data like with static layer objects,
								// using the saved change indices to pull in specific change values.
								for ( let c = 0; c < changeCount; c++ ) {
									const changeIndex = data[ i++ ];
									const { type, key } = exportData[ changeIndex ];
									switch ( type ) {
										case DataType.Uint8:
											// @ts-expect-error – Dynamic object.
											updateData.update.changes[ key ] = data[ i++ ];
										break;
										case DataType.Uint16:
											// @ts-expect-error – Dynamic object.
											// eslint-disable-next-line
											updateData.update.changes[ key ] = ( ( data[ i++ ] << 8 ) | data[ i++ ] ) >>> 0;
										break;
										case DataType.Int8:
											// @ts-expect-error – Dynamic object.
											updateData.update.changes[ key ] = ( data[ i++ ] << 24 ) >> 24;
										break;
										case DataType.Int16:
											// @ts-expect-error – Dynamic object.
											// eslint-disable-next-line
											updateData.update.changes[ key ] = ( ( ( data[ i++ ] << 8 ) | data[ i++ ] ) << 16 ) >> 16;
										break;
										default:
											throw new Error( `Unsupported data type: ${ type }` );
										break;
									}
								}
							}
							break;
						}
					}
				}

				( frameData.updates as object[] ).push( updateData );
			}

			( eventData.frames as object[] ).push( frameData );
		}
		( content.events as object[] ).push( eventData );
	}

	return createOverworldFromJSON( content );
}

export { createBlankOverworld, createOverworld, createOverworldFromJSON, loadOverworldFromData };
