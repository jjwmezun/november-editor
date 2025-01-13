import propTypes from 'prop-types';

const generateNewLevel = () => ( {
	name: `New Level`,
	goal: { id: 0 },
	maps: [],
} );

const LevelList = props => {
	const { levels, setLevels, setSelectedLevel } = props;

	const generateLevelNameUpdater = i =>
		e => setLevels( levels.map( ( l, j ) => ( i === j ? { ...l, name: e.target.value } : l ) ) );

	const generateLevelSelector = i => () => setSelectedLevel( i );

	const generateLevelDeleter = i => () => setLevels( levels.filter( ( _, j ) => i !== j ) );

	const addLevel = () => setLevels( [ ...levels, generateNewLevel() ] );

	return <div>
		<h2>Levels</h2>
		<ul>
			{ levels.map( ( level, i ) => <li key={ i }>
				<input type="text" value={ level.name } onChange={ generateLevelNameUpdater( i ) } />
				<button onClick={ generateLevelSelector( i ) }>Edit</button>
				<button onClick={ generateLevelDeleter( i ) }>Delete</button>
			</li> ) }
		</ul>
		<button onClick={ addLevel }>Add Level</button>
	</div>;
};

LevelList.propTypes = {
	levels: propTypes.array.isRequired,
	setLevels: propTypes.func.isRequired,
	setSelectedLevel: propTypes.func.isRequired,
};

export default LevelList;
