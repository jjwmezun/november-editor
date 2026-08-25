import { SyntheticEvent } from 'react';
import { createGoal, goals } from '../../../../common/goals';
import { Level } from '../../../../common/types';

interface LevelOptionsProps {
	level: Level;
	setLevel: ( level: Level ) => void;
	updateLevelName: ( name: string ) => void;
}

const LevelOptions = ( props: LevelOptionsProps ) => {
	const {
		level,
		setLevel,
		updateLevelName,
	} = props;

	const name = level.getName();
	const goal = level.getGoal();

	const onChangeGoal = ( e: SyntheticEvent ) => {
		const index = ( e.target as HTMLSelectElement ).value;
		setLevel( level.updateGoal( createGoal( parseInt( index ) ) ) );
		window.electronAPI.enableSave();
	};

	const onChangePtsScore = ( e: SyntheticEvent ) => {
		const newPtsScore = parseInt( ( e.target as HTMLInputElement ).value );
		setLevel( level.updatePtsScore( newPtsScore ) );
		window.electronAPI.enableSave();
	};

	const onChangeTimeScoreMinutes = ( e: SyntheticEvent ) => {
		const minutes = parseInt( ( e.target as HTMLInputElement ).value );
		setLevel( level.updateTimeScoreMinutes( minutes ) );
		window.electronAPI.enableSave();
	};

	const onChangeTimeScoreSeconds = ( e: SyntheticEvent ) => {
		const seconds = parseInt( ( e.target as HTMLInputElement ).value );
		setLevel( level.updateTimeScoreSeconds( seconds ) );
		window.electronAPI.enableSave();
	};

	const onChangeName = ( e: SyntheticEvent ) => {
		const newName = ( e.target as HTMLInputElement ).value.toUpperCase();
		updateLevelName( newName );
		window.electronAPI.enableSave();
	};

	return <div>
		<h2>Level options</h2>
		<div>
			<label>
				<span>Name:</span>
				<input type="text" value={ name } onChange={ onChangeName } />
			</label>
		</div>
		<div>
			<label>
				<span>₧ score:</span>
				<input type="number" value={ level.getPtsScore() } onChange={ onChangePtsScore } />
			</label>
		</div>
		<div>
			<label>
				<span>Time score:</span>
				<span>
					<input
						max="9"
						min="0"
						type="number"
						value={ level.getTimeScoreMinutes() }
						onChange={ onChangeTimeScoreMinutes }
					/>
					:
					<input
						max="59"
						min="0"
						type="number"
						value={ level.getTimeScoreSeconds() }
						onChange={ onChangeTimeScoreSeconds }
					/>
				</span>
			</label>
		</div>
		<div>
			<label>
				<span>Goal:</span>
				<select onChange={ onChangeGoal } value={ goal.getId() }>
					{ goals.map( ( goal, i ) => <option
						key={ i }
						value={ i }
					>
						{ goal.name }
					</option> ) }
				</select>
			</label>
			{ goals[ goal.getId() ]?.options
			&& Array.isArray( goals[ goal.getId() ].options )
			&& goals[ goal.getId() ].options!.map( (
				{ atts, slug, title, type },
				i,
			) => <label key={ i }>
				<span>{ title }:</span>
				<input
					type={ type }
					onChange={ e => setLevel( level.updateGoal( goal.updateOption( slug, e.target.value ) ) ) }
					value={ goal.getOptionText( slug ) }
					{ ...atts }
				/>
			</label> )
			}
		</div>
	</div>;
};

export { LevelOptions };
