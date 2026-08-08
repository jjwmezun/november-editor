import { ReactElement } from 'react';
import {
	OverworldEvent,
	OverworldEventControlsProps,
	OverworldEventUpdate,
	OverworldEventUpdateRemove,
} from '../../../../common/types';

function OverworldEventControls( props: OverworldEventControlsProps ): ReactElement {
	const {
		eventsList,
		selectedEvent,
		selectedEventFrame,
		selectedObject,
		setOverworld,
		setSelectedEvent,
		setSelectedEventFrame,
		setSelectedObject,
	} = props;

	const selectedEventEntry = selectedEvent > 0 ? eventsList.getEntry( selectedEvent - 1 ) : null;
	const selectedEventFrameEntry = selectedEventEntry && selectedEventFrame !== null
		? selectedEventEntry.getEntry( selectedEventFrame )
		: null;
	const updatesList: readonly OverworldEventUpdate[] =
		selectedEventFrameEntry ? selectedEventFrameEntry.getUpdates() : [];

	const addEvent = (): void => {
		setOverworld( eventsList.addEvent() );
		setSelectedEvent( eventsList.getLength() + 1 );
		setSelectedEventFrame( null );
	};

	const generateEventSelector = ( index: number ) => (): void => {
		if ( selectedEvent !== index ) {
			setSelectedEvent( index );
			setSelectedEventFrame( null );
		}
	};

	const generateFrameSelector = ( index: number ) => (): void => {
		if ( selectedEventFrame !== index ) {
			setSelectedEventFrame( index );
			setSelectedObject( null );
		}
	};

	const addFrame = (): void => {
		if ( ! selectedEventEntry ) {
			return;
		}
		setOverworld( eventsList.updateEvent( selectedEvent - 1, selectedEventEntry.addFrame() ) );
		setSelectedEventFrame( selectedEventEntry.getLength() );
	};

	const generateFrameDurationUpdater = ( event: React.ChangeEvent<HTMLInputElement> ): void => {
		if ( ! selectedEventEntry || selectedEventFrameEntry === null || selectedEventFrame === null ) {
			return;
		}
		const newDuration = Number( event.target.value );
		const updatedFrame = selectedEventFrameEntry.updateDuration( newDuration );
		const updatedEvent = selectedEventEntry.updateFrame( selectedEventFrame, updatedFrame );
		setOverworld( eventsList.updateEvent( selectedEvent - 1, updatedEvent ) );
	};

	return <div>
		<div>
			<ul>
				<li>
					<button disabled={ selectedEvent === 0 } onClick={ generateEventSelector( 0 ) }>
						Start
					</button>
				</li>
				{ eventsList.map( ( _event: OverworldEvent, index: number ) => <li key={ index }>
					<button disabled={ selectedEvent === index + 1 } onClick={ generateEventSelector( index + 1 ) }>
						{ `Event ${ index + 1 }` }
					</button>
				</li> ) }
			</ul>
			<button onClick={ addEvent }>Add Event</button>
		</div>
		{ selectedEventEntry && <div>
			<ul>
				{ selectedEventEntry.map( ( _frame, index: number ) => <li key={ index }>
					<button
						disabled={ selectedEventFrame === index }
						onClick={ generateFrameSelector( index ) }
					>
						{ `Frame ${ index + 1 }` }
					</button>
				</li> ) }
			</ul>
			<button onClick={ addFrame }>Add Frame</button>
		</div> }
		{ selectedEventFrameEntry && <div>
			<label>Duration:
				<input
					type="number"
					value={ selectedEventFrameEntry.getDuration() }
					onChange={ generateFrameDurationUpdater }
				/>
			</label>
			{ updatesList.length > 0 && <ul>
				{ updatesList.map( ( update, index ) => <li key={ index }>
					{ `Map ${ update.getMap() }, Layer ${ update.getLayer() }: ${ update.getType() }` }
				</li> ) }
			</ul> }
		</div> }
	</div>;
}

export default OverworldEventControls;
