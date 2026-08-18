// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

import {
	MapObject,
	MapObjectArgs,
	MapObjectType,
	OverworldEvent,
	OverworldEventFrame,
	OverworldEventUpdateChange,
	OverworldEventUpdateAdd,
	OverworldLayer,
	OverworldMap,
} from '../../../../common/types';

interface OverworldObjectOptionsProps {
	removeObject: () => void;
	selectedEventEntry: OverworldEvent | null;
	selectedEventFrameEntry: OverworldEventFrame | null;
	selectedFrame: number;
	selectedLayer: OverworldLayer;
	selectedMap: OverworldMap;
	selectedObjectIndex: number;
	setSelectedObject: ( object: number | null ) => void;
	typesFactory: readonly MapObjectType[];
	updateSelectedEventFrame: ( frame: OverworldEventFrame ) => void;
	updateObject: ( index: number, o: MapObjectArgs ) => void;
}

const OverworldObjectOptions = ( props: OverworldObjectOptionsProps ) => {
	const {
		removeObject,
		selectedEventEntry,
		selectedEventFrameEntry,
		selectedFrame,
		selectedObjectIndex,
		selectedLayer,
		selectedMap,
		setSelectedObject,
		typesFactory,
		updateSelectedEventFrame,
		updateObject,
	} = props;

	const eventFrames: readonly OverworldEventFrame[] = selectedEventEntry === null
		? []
		: selectedEventEntry.getFrames();

	const selectedObject = ( (): MapObject | null => {
		// Search global objects to see if any are selected.
		const objectList = selectedLayer.getObjectsList();
		for ( let i = 0; i < objectList.length; ++i ) {
			const object = objectList[ i ];
			if ( object.id() === selectedObjectIndex ) {
				return object;
			}
		}

		// Otherwise, search event frames to see if any added object is selected.
		for ( let i = 0; i <= selectedFrame; ++i ) {
			const updates = eventFrames[ i ] ? eventFrames[ i ].getUpdates() : [];
			for ( let j = 0; j < updates.length; ++j ) {
				const update = updates[ j ];
				switch ( update.getType() ) {
					case `add`: {
						const updateValue = update.getUpdate() as OverworldEventUpdateAdd;
						const object = updateValue.getObject();
						if (
							update.getMap() === selectedMap.getId()
							&& update.getLayer() === selectedLayer.getId()
							&& object.id() === selectedObjectIndex
						) {
							return object;
						}
					}
				}
			}
		}

		return null;
	} )();

	const deleteObject = (): void => {
		if ( selectedObject === null ) {
			return;
		}

		// If not in an event, remove as usual.
		if ( selectedEventEntry === null ) {
			removeObject();
		} else if ( selectedEventFrameEntry !== null ) {
			// If in an event, add remove event entry instead.
			const updatedFrame = selectedEventFrameEntry.addEventRemove(
				selectedMap.getId(),
				selectedLayer.getId(),
				selectedObject.id(),
			);
			updateSelectedEventFrame( updatedFrame );
		}
		setSelectedObject( null );
	};

	return selectedObject === null
		? <></>
		: <div>
			<h2>Object options</h2>
			<div>ID: { selectedObject.id() } </div>
			{
				typesFactory[ selectedObject.type() ].options.map( ( options, i ) => {
					const {
						atts,
						key,
						title,
						type,
						update,
						extraUpdate,
					} = {
						extraUpdate: () => ( {} ),
						...options,
					};
					const extraAtts = {};
					for ( const key in atts ) {
						extraAtts[ key ] = typeof atts[ key ] === `function`
							? atts[ key ]( selectedObject )
							: atts[ key ];
					}

					let selectedObjectFrame: number | null = null;

					// Default to showing object value.
					let value = selectedObject.getProp( key );

					// But if there is an event update for the selected event frames current or below, o’erride with that.
					for ( let i = 0; i <= selectedFrame; i++ ) {
						const updates = eventFrames[ i ] ? eventFrames[ i ].getUpdates() : [];
						updates.forEach( ( update, index ) => {
							switch ( update.getType() ) {
								case `add`: {
									const updateValue = update.getUpdate() as OverworldEventUpdateAdd;
									const object = updateValue.getObject();
									if (
										update.getMap() === selectedMap.getId()
										&& update.getLayer() === selectedLayer.getId()
										&& object.id() === selectedObject.id()
									) {
										selectedObjectFrame = i;
										if ( key in object ) {
											value = object.getProp( key );
										}
									}
								}
								break;
								case `change`: {
									const updateValue = update.getUpdate() as OverworldEventUpdateChange;
									if (
										update.getMap() === selectedMap.getId()
										&& update.getLayer() === selectedLayer.getId()
										&& updateValue.getObjectId() === selectedObject.id()
									) {
										selectedObjectFrame = i;
										const changes = updateValue.getChanges();
										if ( key in changes ) {
											value = changes[ key ];
										}
									}
								}
								break;
							}
						} );
					}

					// If not editing an event, update the object itself.
					// Otherwise, if updating in an event & the object is from a past frame, add a change event.
					// Otherwise, change the existing event update.
					const onUpdateObject = ( e: React.ChangeEvent<HTMLInputElement> ) => {
						if ( selectedEventEntry === null ) {
							updateObject(
								selectedObjectIndex,
								{
									[ key ]: update( e.target.value ),
									...extraUpdate( selectedObject, e.target.value ),
								},
							);
						} else if ( selectedEventFrameEntry !== null ) {
							if ( selectedObjectFrame !== selectedFrame ) {
								const updatedFrame = selectedEventFrameEntry.addEventChange(
									selectedMap.getId(),
									selectedLayer.getId(),
									selectedObject.id(),
									{
										[ key ]: update( e.target.value ),
										...extraUpdate( selectedObject, e.target.value ),
									},
								);
								updateSelectedEventFrame( updatedFrame );
							} else {
								const updatedFrame = selectedEventFrameEntry.updateEvent(
									selectedObject.id(),
									{
										[ key ]: update( e.target.value ),
										...extraUpdate( selectedObject, e.target.value ),
									},
								);
								updateSelectedEventFrame( updatedFrame );
							}
						}
					};

					return <label key={ i }>
						<span>{ title }:</span>
						<input
							type={ type }
							value={ value }
							onChange={ onUpdateObject }
							{ ...extraAtts }
						/>
					</label>;
				} )
			}
			<button onClick={ deleteObject }>Delete</button>
		</div>;
};

export default OverworldObjectOptions;
