import {
	MapObject,
	MapObjectArgs,
	MapObjectType,
} from '../../../../common/types';

interface ObjectOptionsProps {
	objects: MapObject[];
	removeObject: () => void;
	selectedObject: number;
	typesFactory: readonly MapObjectType[];
	updateObject: ( index: number, o: MapObjectArgs ) => void;
}

const ObjectOptions = ( props: ObjectOptionsProps ) => {
	const { objects, removeObject, selectedObject, typesFactory, updateObject } = props;

	return <div>
		<h2>Object options</h2>
		{
			typesFactory[ objects[ selectedObject ].type() ].options.map( ( options, i ) => {
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
				const extraAtts : Record<string, unknown> = {};
				const atts_ = atts as Record<string, unknown>;
				for ( const key in atts_ ) {
					extraAtts[ key ] = typeof atts_[ key ] === `function`
						? atts_[ key ]( objects[ selectedObject ] )
						: atts_[ key ];
				}
				return <label key={ i }>
					<span>{ title }:</span>
					<input
						type={ type }
						value={ objects[ selectedObject ].getProp( key ) }
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
	</div>;
};

export { ObjectOptions };
