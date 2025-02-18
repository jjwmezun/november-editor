import propTypes from 'prop-types';
import { useState } from 'react';
import { circlesPerGame, levelsPerCircle } from '../../../common/constants';
import {
	get1stLevelOfCircle,
	getNthLevelOfCircle,
	getLastLevelOfCircle,
} from '../../../common/circles.js';
import { levelPropType } from '../../../common/levels';

const LevelList = props => {
	const { exitMode, generateLevelNameUpdater, levels, setLevels, setSelectedLevel } = props;
	const [ selectedGame, setSelectedGame ] = useState( 0 );
	const [ selectedCircle, setSelectedCircle ] = useState( 0 );
	const [ selectedSwitchLevel, setSelectedSwitchLevel ] = useState( null );
	const [ selectedSwitchCircle, setSelectedSwitchCircle ] = useState( 0 );

	const generateLevelSelector = i => () => setSelectedLevel( i );

	const switchLevelCircle = () => {
		const selectedLevel = getNthLevelOfCircle( selectedGame, selectedCircle, selectedSwitchLevel );
		const levelToSwitch = getNthLevelOfCircle( selectedGame, selectedSwitchCircle, selectedSwitchLevel );
		const newLevels = [ ...levels ];
		const temp = newLevels[ selectedLevel ];
		newLevels[ selectedLevel ] = newLevels[ levelToSwitch ];
		newLevels[ levelToSwitch ] = temp;
		setLevels( newLevels );
		setSelectedSwitchLevel( null );
	};

	const firstLevel = get1stLevelOfCircle( selectedGame, selectedCircle );
	const lastLevel = getLastLevelOfCircle( selectedGame, selectedCircle ) + 1;

	return <div>
		<ul>
			<li>
				<button
					disabled={ selectedGame === 0 }
					onClick={ () => setSelectedGame( 0 ) }
				>
					Main Adventure
				</button>
			</li>
			<li>
				<button
					disabled={ selectedGame === 1 }
					onClick={ () => setSelectedGame( 1 ) }
				>
					Shrouded Stages
				</button>
			</li>
		</ul>
		<ul>
			{ Array.from( { length: circlesPerGame } ).map( ( _, i ) => <li key={ i }>
				<button
					disabled={ selectedCircle === i }
					onClick={ () => setSelectedCircle( i ) }
				>
					Circle { i }
				</button>
			</li> ) }
		</ul>
		<h2>Levels</h2>
		<ul>
			{ levels.slice( firstLevel, lastLevel ).map( ( level, i ) => <li key={ i }>
				<span>
					{ `${ `0123456789ABCDEF`[ i ] }–${ selectedCircle } –` }
					<input
						type="text"
						value={ level.getName() }
						onChange={ e => generateLevelNameUpdater( firstLevel + i )( e.target.value ) }
					/>
				</span>
				<button onClick={ generateLevelSelector( firstLevel + i ) }>Edit</button>
				<button
					onClick={ () => {
						const newLevels = [ ...levels ];

						// If level is first in this circle, switch with last in this circle;
						// otherwise, switch with previous level.
						const switchLevel = i === 0
							? getLastLevelOfCircle( selectedGame, selectedCircle )
							: getNthLevelOfCircle( selectedGame, selectedCircle, i - 1 );

						const temp = newLevels[ switchLevel ];
						newLevels[ switchLevel ] = newLevels[ firstLevel + i ];
						newLevels[ firstLevel + i ] = temp;
						setLevels( newLevels );
					} }
				>
					↑
				</button>
				<button
					onClick={ () => {
						const newLevels = [ ...levels ];

						// If level is last in this circle, switch with first in this circle;
						// otherwise, switch with next level.
						const switchLevel = i === levelsPerCircle - 1
							? firstLevel
							: getNthLevelOfCircle( selectedGame, selectedCircle, i + 1 );

						const temp = newLevels[ switchLevel ];
						newLevels[ switchLevel ] = newLevels[ firstLevel + i ];
						newLevels[ firstLevel + i ] = temp;
						setLevels( newLevels );
					} }
				>
					↓
				</button>
				<button
					onClick={ () => {
						setSelectedSwitchLevel( i );
						setSelectedSwitchCircle( selectedCircle );
					} }
				>
					Switch Circle
				</button>
			</li> ) }
		</ul>
		{ selectedSwitchLevel !== null && <div>
			<h2>Switch Level Circle</h2>
			<div>
				<input
					type="number"
					min={ 0 }
					max={ circlesPerGame - 1 }
					value={ selectedSwitchCircle }
					onChange={ e => setSelectedSwitchCircle( e.target.value ) }
				/>
			</div>
			<div>
				<button onClick={ switchLevelCircle }>Confirm</button>
				<button onClick={ () => setSelectedSwitchLevel( null ) }>Cancel</button>
			</div>
		</div> }
		<button onClick={ exitMode }>← Back</button>
	</div>;
};

LevelList.propTypes = {
	exitMode: propTypes.func.isRequired,
	generateLevelNameUpdater: propTypes.func.isRequired,
	levels: propTypes.arrayOf( levelPropType ).isRequired,
	setLevels: propTypes.func.isRequired,
	setSelectedLevel: propTypes.func.isRequired,
};

export default LevelList;
