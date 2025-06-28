// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { ReactElement, SyntheticBaseEvent, useState } from "react";

import { MapObjectArgs, OverworldLayerType, OverworldModeProps } from '../../../common/types';
import { getOverworldTypeFactory } from '../../../common/objects';
import OverworldGridCanvas from './Overworld/OverworldGridCanvas';
import OverworldObjectOptions from './Overworld/OverworldObjectOptions';

function OverworldMode( props: OverworldModeProps ): ReactElement {
	const { exitMode, graphics, overworld, palettes, setOverworld } = props;
	const [ selectedObject, setSelectedObject ] = useState<number | null>( null );
	const [ selectedObjectType, setSelectedObjectType ] = useState<number>( 0 );

	const typesFactory = getOverworldTypeFactory( OverworldLayerType.block );

	const removeObject = (): void => {
		setOverworld( overworld.removeObject( selectedObject ) );
		setSelectedObject( null );
	};

	const updateObject = ( index: number, object: MapObjectArgs ): void => {
		setOverworld( overworld.updateObject( index, object ) );
	};

	const updateSelectedObjectType = ( e: SyntheticBaseEvent ): void => {
		const value = e.target.value;
		setSelectedObjectType( value );
	};

	return <div>
		<h1>O’erworld Mode</h1>
		<OverworldGridCanvas
			graphics={ graphics }
			overworld={ overworld }
			palettes={ palettes }
			selectedObject={ selectedObject }
			selectedObjectType={ selectedObjectType }
			setOverworld={ setOverworld }
			setSelectedObject={ setSelectedObject }
		/>
		<div>
			<label>
				<h2>Object type to add:</h2>
				<select value={ selectedObjectType } onChange={ updateSelectedObjectType }>
					{ typesFactory.map( ( type, i ) => <option key={ i } value={ i }>{ type.name }</option> ) }
				</select>
			</label>
		</div>
		{ selectedObject !== null && <OverworldObjectOptions
			removeObject={ removeObject }
			selectedObject={ overworld.getObject( selectedObject ) }
			selectedObjectIndex={ selectedObject }
			typesFactory={ typesFactory }
			updateObject={ updateObject }
		/> }
		<div><button onClick={ exitMode }>← Back</button></div>
	</div>;
}

export default OverworldMode;
