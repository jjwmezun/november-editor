// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

import {
	MapObject,
	MapObjectArgs,
	MapObjectType,
	OverworldEvent,
	OverworldEventFrame,
	OverworldEventUpdate,
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

	let selectedObjectIsEvent: boolean = false;
	let selectedObject: MapObject | null = null;

	// Search global objects to see if any are selected.
	selectedLayer.getObjectsList().forEach( object => {
		if ( object.id() === selectedObjectIndex ) {
			selectedObject = object;
		}
	} );

	// Otherwise, search event frames to see if any added object is selected.
	if ( selectedObject === null ) {
		for ( let i = 0; i <= selectedFrame; ++i ) {
			const updates = eventFrames[ i ] ? eventFrames[ i ].getUpdates() : [];
			updates.forEach( update => {
				switch ( update.getType() ) {
					case `add`: {
						const updateValue = update.getUpdate() as OverworldEventUpdateAdd;
						const object = updateValue.getObject();
						if (
							update.getMap() === selectedMap.getId()
							&& update.getLayer() === selectedLayer.getId()
							&& object.id() === selectedObjectIndex
						) {
							selectedObjectIsEvent = true;
							selectedObject = object;
							break;
						}
					}
				}
			} );
		}
	}

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

					let updateIndex: number | null = null;
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
										updateIndex = index;
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
										updateIndex = index;
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
					// If updating a frame, if there is already an update for the selected object,
					// update that update instead o’ creating a new 1.
					// If the update is an event object:
					// * If the object is from a past frame, add a change event.
					// * If the object is from the current frame, update the existing add event.
					const onUpdateObject = selectedObjectIsEvent
						? ( e: React.ChangeEvent<HTMLInputElement> ): void => {
							if ( selectedEventFrameEntry === null || updateIndex === null || selectedObject === null ) {
								return;
							}
							const updatedFrame = selectedObjectFrame !== selectedFrame
								? selectedEventFrameEntry.addEventChange(
									selectedMap.getId(),
									selectedLayer.getId(),
									selectedObject.id(),
									{
										[ key ]: update( e.target.value ),
										...extraUpdate( selectedObject, e.target.value ),
									},
								)
								: selectedEventFrameEntry.updateEventAdd(
									updateIndex,
									selectedMap.getId(),
									selectedLayer.getId(),
									{
										[ key ]: update( e.target.value ),
										...extraUpdate( selectedObject, e.target.value ),
									},
								);
							updateSelectedEventFrame( updatedFrame );
						}
						: ( selectedEventEntry === null )
							? ( e: React.ChangeEvent<HTMLInputElement> ): void => {
								updateObject(
									selectedObjectIndex,
									{
										[ key ]: update( e.target.value ),
										...extraUpdate( selectedObject, e.target.value ),
									},
								);
							}
							: ( selectedEventFrameEntry !== null )
								? ( e: React.ChangeEvent<HTMLInputElement> ): void => {
									const updatedFrame = updateIndex !== null
										? selectedEventFrameEntry.updateEventChange(
											updateIndex,
											selectedMap.getId(),
											selectedLayer.getId(),
											selectedObject.id(),
											{
												[ key ]: update( e.target.value ),
												...extraUpdate( selectedObject, e.target.value ),
											},
										)
										: selectedEventFrameEntry.addEventChange(
											selectedMap.getId(),
											selectedLayer.getId(),
											selectedObject.id(),
											{
												[ key ]: update( e.target.value ),
												...extraUpdate( selectedObject, e.target.value ),
											},
										);
									updateSelectedEventFrame( updatedFrame );
								}
								: () => null;

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
