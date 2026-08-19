import { ReactElement } from 'react';
import {
	OverworldEvent,
	OverworldEventControlsProps,
	OverworldEventUpdate,
	OverworldEventUpdateAdd,
	OverworldEventUpdateChange,
	OverworldEventUpdateRemove,
} from '../../../../common/types';

interface UpdateInfoProps {
	update: OverworldEventUpdate;
}

function UpdateInfo( props: UpdateInfoProps ): ReactElement {
	const { update } = props;
	let data: object = {};

	switch ( update.getType() ) {
		case `add`: {
			const value = update.getUpdate() as OverworldEventUpdateAdd;
			data = { ...value.getObject().toJSON() };
		}
		break;
		case `change`: {
			const value = update.getUpdate() as OverworldEventUpdateChange;
			data = {
				id: value.getObjectId(),
				...value.getChanges(),
			};
		}
		break;
		case `remove`: {
			const value = update.getUpdate() as OverworldEventUpdateRemove;
			data = { id: value.getObjectId() };
		}
		break;
	}

	return <li>
		{ `M ${ update.getMap() }, L ${ update.getLayer() }: ${ update.getType() } – ${ JSON.stringify( data ) }` }
	</li>;
}

function OverworldEventControls( props: OverworldEventControlsProps ): ReactElement {
	const {
		eventsList,
		selectedEvent,
		selectedEventFrame,
		setOverworld,
		setSelectedEvent,
		setSelectedEventFrame,
		setSelectedObject,
	} = props;

	const selectedEventEntry = selectedEvent > 0 ? eventsList.getEntry( selectedEvent - 1 ) : null;
	const selectedEventFrameEntry = selectedEventEntry
		? selectedEventEntry.getEntry( selectedEventFrame )
		: null;
	const updatesList: readonly OverworldEventUpdate[] =
		selectedEventFrameEntry ? selectedEventFrameEntry.getUpdates() : [];

	const addEvent = (): void => {
		setOverworld( eventsList.addEvent() );
		setSelectedEvent( eventsList.getLength() + 1 );
		setSelectedEventFrame( 0 );
		setSelectedObject( null );
	};

	const removeEvent = (): void => {
		if ( selectedEvent <= 0 ) {
			return;
		}
		setOverworld( eventsList.removeEvent( selectedEvent - 1 ) );
		setSelectedEvent( 0 );
		setSelectedEventFrame( 0 );
		setSelectedObject( null );
	};

	const generateEventSelector = ( index: number ) => (): void => {
		if ( selectedEvent !== index ) {
			setSelectedEvent( index );
			setSelectedEventFrame( 0 );
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

	const removeLatestFrame = (): void => {
		if ( ! selectedEventEntry || selectedEventFrameEntry === null || selectedEventEntry.getLength() < 2 ) {
			return;
		}
		setOverworld( eventsList.updateEvent(
			selectedEvent - 1,
			selectedEventEntry.removeLatestFrame(),
		) );

		// If the selected frame is the last, change to the previous, as the current last is no longer valid.
		if ( selectedEventFrame >= selectedEventEntry.getLength() - 1 ) {
			setSelectedEventFrame( selectedEventEntry.getLength() - 2 );
		}
	};

	const generateFrameDurationUpdater = ( event: React.ChangeEvent<HTMLInputElement> ): void => {
		if ( ! selectedEventEntry || selectedEventFrameEntry === null ) {
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
			<button disabled={ selectedEvent === 0 } onClick={ removeEvent }>Remove Event</button>
		</div>
		{ selectedEventEntry !== null && <div>
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
			<button
				disabled={ selectedEventEntry.getLength() < 2 }
				onClick={ removeLatestFrame }
			>
				Remove Last Frame
			</button>
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
				{ updatesList.map( ( update, index ) => <UpdateInfo key={ index } update={ update } /> ) }
			</ul> }
		</div> }
	</div>;
}

export default OverworldEventControls;
