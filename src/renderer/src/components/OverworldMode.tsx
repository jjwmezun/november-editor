// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { ReactElement, useState } from "react";

import { getOverworldTypeFactory } from '../../../common/objects';
import {
	MapObjectArgs,
	Overworld,
	OverworldEventFrame,
	OverworldLayerType,
	OverworldModeProps,
} from '../../../common/types';
import OverworldEventControls from './Overworld/OverworldEventControls';
import OverworldGridCanvas from './Overworld/OverworldGridCanvas';
import OverworldLayerControls from './Overworld/OverworldLayerControls';
import OverworldMapControls from './Overworld/OverworldMapControls';
import OverworldMapOptions from './Overworld/OverworldMapOptions';
import OverworldObjectControls from './Overworld/OverworldObjectControls';
import OverworldObjectOptions from './Overworld/OverworldObjectOptions';

function OverworldMode( props: OverworldModeProps ): ReactElement {
	const { exitMode, graphics, overworld, palettes, setOverworld } = props;
	const [ selectedLayer, setSelectedLayer ] = useState<number>( 0 );
	const [ selectedLayerType, setSelectedLayerType ] = useState<OverworldLayerType>( OverworldLayerType.block );
	const [ selectedEvent, setSelectedEvent ] = useState<number>( 0 );
	const [ selectedEventFrame, setSelectedEventFrame ] = useState<number>( 0 );
	const [ selectedMap, setSelectedMap ] = useState<number>( 0 );
	const [ selectedObject, setSelectedObject ] = useState<number | null>( null );
	const [ selectedObjectType, setSelectedObjectType ] = useState<number>( 0 );

	const maps = overworld.getMapsList();
	const map = maps[ selectedMap ];
	const layers = map.getLayersList();
	const layer = layers[ selectedLayer ];
	const typesFactory = getOverworldTypeFactory( layer.getType() );

	const eventsList = overworld.getEventsList();
	const selectedEventEntry = selectedEvent > 0 ? eventsList.getEntry( selectedEvent - 1 ) : null;
	const selectedEventFrameEntry = selectedEventEntry
		? selectedEventEntry.getEntry( selectedEventFrame )
		: null;

	const addLayer = (): void => setOverworld( map.addLayer( selectedLayerType ) );

	const addMap = (): void => setOverworld( overworld.addMap() );

	const generateMapSelector = ( index: number ) => (): void => {
		setSelectedMap( index );
		setSelectedLayer( 0 );
		setSelectedObject( null );
		setSelectedObjectType( 0 );
	};

	const moveLayerDown = (): void => {
		if ( selectedLayer >= layers.length - 1 ) {
			return;
		}
		setOverworld( map.moveLayerDown( selectedLayer ) );
		setSelectedLayer( selectedLayer + 1 );
	};

	const moveLayerUp = (): void => {
		if ( selectedLayer <= 0 ) {
			return;
		}
		setOverworld( map.moveLayerUp( selectedLayer ) );
		setSelectedLayer( selectedLayer - 1 );
	};

	const moveMapUp = (): void => {
		if ( selectedMap <= 0 ) {
			return;
		}
		setOverworld( overworld.moveMapUp( selectedMap ) );
		setSelectedMap( selectedMap - 1 );
	};

	const moveMapDown = (): void => {
		if ( selectedMap >= maps.length - 1 ) {
			return;
		}
		setOverworld( overworld.moveMapDown( selectedMap ) );
		setSelectedMap( selectedMap + 1 );
	};

	const removeLayer = (): void => {
		setOverworld( map.removeLayer( selectedLayer ) );
		setSelectedLayer( Math.max( 0, selectedLayer - 1 ) );
		setSelectedObject( null );
		setSelectedObjectType( 0 );
	};

	const removeMap = (): void => {
		setOverworld( overworld.removeMap( selectedMap ) );
		setSelectedMap( Math.max( 0, selectedMap - 1 ) );
		setSelectedLayer( 0 );
		setSelectedObject( null );
		setSelectedObjectType( 0 );
	};

	const removeObject = (): void => {
		if ( selectedObject === null ) {
			return;
		}
		setOverworld( layer.removeObject( selectedObject ) );
		setSelectedObject( null );
	};

	const updateObject = ( id: number, object: MapObjectArgs ): void => {
		setOverworld( layer.updateObject( id, object ) );
	};

	const updateSelectedEventFrame = ( frame: OverworldEventFrame ): void => {
		setOverworld( ( overworld: Overworld ) => {
			const eventsList = overworld.getEventsList();
			const selectedEventEntry = selectedEvent > 0 ? eventsList.getEntry( selectedEvent - 1 ) : null;
			if ( ! selectedEventEntry ) {
				return overworld;
			}
			const updatedEvent = selectedEventEntry.updateFrame( selectedEventFrame, frame );
			return eventsList.updateEvent( selectedEvent - 1, updatedEvent );
		} );
	};

	const updateLayerLatestId = (): void => {
		setOverworld( ( overworld: Overworld ) => {
			// Make sure we reload these so we’re not updating the o’erworld with outdated data.
			const maps = overworld.getMapsList();
			const map = maps[ selectedMap ];
			const layers = map.getLayersList();
			const layer = layers[ selectedLayer ];

			return layer.updateLatestId();
		} );
	};

	return <div>
		<h1>O’erworld Mode</h1>
		<OverworldMapControls
			addMap={ addMap }
			generateMapSelector={ generateMapSelector }
			maps={ maps }
			moveMapDown={ moveMapDown }
			moveMapUp={ moveMapUp }
			removeMap={ removeMap }
			selectedMap={ selectedMap }
		/>
		<OverworldMapOptions
			map={ map }
			setOverworld={ setOverworld }
		/>
		<OverworldGridCanvas
			graphics={ graphics }
			map={ map }
			palettes={ palettes }
			selectedEventFrames={ selectedEventEntry === null ? [] : selectedEventEntry.getFrames() }
			selectedFrame={ selectedEventFrame }
			selectedLayer={ selectedLayer }
			selectedObject={ selectedObject }
			selectedObjectType={ selectedObjectType }
			setOverworld={ setOverworld }
			setSelectedObject={ setSelectedObject }
			updateLayerLatestId={ updateLayerLatestId }
			updateSelectedEventFrame={ updateSelectedEventFrame }
		/>
		<OverworldLayerControls
			addLayer={ addLayer }
			layers={ layers }
			moveLayerDown={ moveLayerDown }
			moveLayerUp={ moveLayerUp }
			removeLayer={ removeLayer }
			selectedLayer={ selectedLayer }
			selectedLayerType={ selectedLayerType }
			setSelectedLayer={ setSelectedLayer }
			setSelectedLayerType={ setSelectedLayerType }
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
			selectedEventEntry={ selectedEventEntry }
			selectedEventFrameEntry={ selectedEventFrameEntry }
			selectedFrame={ selectedEventFrame }
			selectedLayer={ layer }
			selectedMap={ map }
			selectedObjectIndex={ selectedObject }
			setSelectedObject={ setSelectedObject }
			typesFactory={ typesFactory }
			updateSelectedEventFrame={ updateSelectedEventFrame }
			updateObject={ updateObject }
		/> }
		<OverworldEventControls
			eventsList={ overworld.getEventsList() }
			selectedEvent={ selectedEvent }
			selectedEventFrame={ selectedEventFrame }
			setOverworld={ setOverworld }
			setSelectedEvent={ setSelectedEvent }
			setSelectedEventFrame={ setSelectedEventFrame }
			setSelectedObject={ setSelectedObject }
		/>
		<div><button onClick={ exitMode }>← Back</button></div>
	</div>;
}

export default OverworldMode;
