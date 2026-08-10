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
	OverworldLayer,
	OverworldMap,
} from '../../../../common/types';

interface OverworldObjectOptionsProps {
	removeObject: () => void;
	selectedEventEntry: OverworldEvent | null;
	selectedEventFrameEntry: OverworldEventFrame | null;
	selectedLayer: OverworldLayer;
	selectedMap: OverworldMap;
	selectedObject: MapObject;
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
		selectedObject,
		selectedObjectIndex,
		selectedLayer,
		selectedMap,
		setSelectedObject,
		typesFactory,
		updateSelectedEventFrame,
		updateObject,
	} = props;

	const deleteObject = (): void => {
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

	const eventFrameUpdatesList: readonly OverworldEventUpdate[] = selectedEventFrameEntry === null
		? []
		: selectedEventFrameEntry.getUpdates();

	return <div>
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

				// Default to showing object value.
				let value = selectedObject.getProp( key );

				// But if there is an event update for the selected event frame, o’erride with that.
				eventFrameUpdatesList.forEach( ( update, index ) => {
					switch ( update.getType() ) {
						case `change`: {
							const updateValue = update.getUpdate() as OverworldEventUpdateChange;
							if (
								update.getMap() === selectedMap.getId()
								&& update.getLayer() === selectedLayer.getId()
								&& updateValue.getObjectId() === selectedObject.id()
							) {
								updateIndex = index;
								const changes = updateValue.getChanges();
								if ( key in changes ) {
									value = changes[ key ];
								}
							}
						}
						break;
					}
				} );

				// If not editing an event, update the object itself.
				// If updating a frame, if there is already an update for the selected object,
				// update that update instead o’ creating a new 1.
				const onUpdateObject = ( selectedEventEntry === null )
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
							const updatedFrame = updateIndex
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
