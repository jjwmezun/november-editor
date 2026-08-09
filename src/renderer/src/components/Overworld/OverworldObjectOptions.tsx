// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

import {
	MapObject,
	MapObjectArgs,
	MapObjectType,
	OverworldEvent,
	OverworldEventFrame,
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
				return <label key={ i }>
					<span>{ title }:</span>
					<input
						type={ type }
						value={ selectedObject.getProp( key ) }
						onChange={ e =>
							updateObject(
								selectedObjectIndex,
								{
									[ key ]: update( e.target.value ),
									...extraUpdate( selectedObject, e.target.value ),
								},
							)
						}
						{ ...extraAtts }
					/>
				</label>;
			} )
		}
		<button onClick={ deleteObject }>Delete</button>
	</div>;
};

export default OverworldObjectOptions;
