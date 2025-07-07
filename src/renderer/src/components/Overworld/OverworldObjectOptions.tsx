// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

import {
	MapObject,
	MapObjectArgs,
	MapObjectType,
} from '../../../../common/types';

interface OverworldObjectOptionsProps {
	removeObject: () => void;
	selectedObject: MapObject;
	selectedObjectIndex: number;
	typesFactory: readonly MapObjectType[];
	updateObject: ( index: number, o: MapObjectArgs ) => void;
}

const OverworldObjectOptions = ( props: OverworldObjectOptionsProps ) => {
	const { removeObject, selectedObject, selectedObjectIndex, typesFactory, updateObject } = props;

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
		<button onClick={ removeObject }>Delete</button>
	</div>;
};

export default OverworldObjectOptions;
