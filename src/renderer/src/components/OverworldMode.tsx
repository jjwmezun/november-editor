// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { ReactElement, SyntheticBaseEvent, useState } from "react";

import { getOverworldTypeFactory } from '../../../common/objects';
import { MapObjectArgs, OverworldLayerType, OverworldModeProps } from '../../../common/types';
import OverworldGridCanvas from './Overworld/OverworldGridCanvas';
import OverworldLayerControls from './Overworld/OverworldLayerControls';
import OverworldObjectControls from './Overworld/OverworldObjectControls';
import OverworldObjectOptions from './Overworld/OverworldObjectOptions';

function OverworldMode( props: OverworldModeProps ): ReactElement {
	const { exitMode, graphics, overworld, palettes, setOverworld } = props;
	const [ selectedLayer, setSelectedLayer ] = useState<number>( 0 );
	const [ selectedObject, setSelectedObject ] = useState<number | null>( null );
	const [ selectedObjectType, setSelectedObjectType ] = useState<number>( 0 );

	const layers = overworld.getLayersList();
	const typesFactory = getOverworldTypeFactory( OverworldLayerType.block );

	const addLayer = (): void => setOverworld( overworld.addLayer( OverworldLayerType.block ) );

	const moveLayerDown = (): void => {
		if ( selectedLayer >= layers.length - 1 ) {
			return;
		}
		setOverworld( overworld.moveLayerDown( selectedLayer ) );
		setSelectedLayer( selectedLayer + 1 );
	};

	const moveLayerUp = (): void => {
		if ( selectedLayer <= 0 ) {
			return;
		}
		setOverworld( overworld.moveLayerUp( selectedLayer ) );
		setSelectedLayer( selectedLayer - 1 );
	};

	const removeLayer = (): void => {
		setOverworld( overworld.removeLayer( selectedLayer ) );
		setSelectedLayer( Math.max( 0, selectedLayer - 1 ) );
		setSelectedObject( null );
		setSelectedObjectType( 0 );
	};

	const removeObject = (): void => {
		setOverworld( layers[ selectedLayer ].removeObject( selectedObject ) );
		setSelectedObject( null );
	};

	const updateObject = ( index: number, object: MapObjectArgs ): void => {
		setOverworld( layers[ selectedLayer ].updateObject( index, object ) );
	};

	return <div>
		<h1>O’erworld Mode</h1>
		<OverworldGridCanvas
			graphics={ graphics }
			overworld={ overworld }
			palettes={ palettes }
			selectedLayer={ selectedLayer }
			selectedObject={ selectedObject }
			selectedObjectType={ selectedObjectType }
			setOverworld={ setOverworld }
			setSelectedObject={ setSelectedObject }
		/>
		<OverworldLayerControls
			addLayer={ addLayer }
			layers={ layers }
			moveLayerDown={ moveLayerDown }
			moveLayerUp={ moveLayerUp }
			removeLayer={ removeLayer }
			selectedLayer={ selectedLayer }
			setSelectedLayer={ setSelectedLayer }
			setSelectedObject={ setSelectedObject }
			setSelectedObjectType={ setSelectedObjectType }
		/>
		<OverworldObjectControls
			typesFactory={ typesFactory }
			selectedObjectType={ selectedObjectType }
			setSelectedObjectType={ setSelectedObjectType }
		/>
		{ selectedObject !== null && <OverworldObjectOptions
			removeObject={ removeObject }
			selectedObject={ layers[ selectedLayer ].getObject( selectedObject ) }
			selectedObjectIndex={ selectedObject }
			typesFactory={ typesFactory }
			updateObject={ updateObject }
		/> }
		<div><button onClick={ exitMode }>← Back</button></div>
	</div>;
}

export default OverworldMode;
