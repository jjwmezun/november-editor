import { SyntheticBaseEvent } from 'react';
import { createGoal, goals } from '../../../../common/goals';
import { Goal } from '../../../../common/types';

interface LevelOptionsProps {
	goal: Goal;
	name: string;
	setGoal: ( goal: Goal ) => void;
	setName: ( name: string ) => void;
}

const LevelOptions = ( props: LevelOptionsProps ) => {
	const { goal, name, setGoal, setName } = props;

	const onChangeGoal = ( e: SyntheticBaseEvent ) => {
		setGoal( createGoal( e.target.value ) );
		window.electronAPI.enableSave();
	};

	return <div>
		<h2>Level options</h2>
		<div>
			<label>
				<span>Name:</span>
				<input type="text" value={ name } onChange={ e => setName( e.target.value ) } />
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
					onChange={ e => setGoal( goal.updateOption( slug, e.target.value ) ) }
					value={ goal.getOption( slug ) }
					{ ...atts }
				/>
			</label> )
			}
		</div>
	</div>;
};

export { LevelOptions };
