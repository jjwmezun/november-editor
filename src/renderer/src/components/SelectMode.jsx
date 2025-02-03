import propTypes from 'prop-types';
import { modeMap } from '../../../common/modes';

const SelectMode = props => {
	const { setMode } = props;

	return <div>
		<h2>Select Mode</h2>
		<ul>
			{ modeMap.slice( 1 ).map( ( mode, i ) => <li key={ i }>
				<button onClick={ () => setMode( i + 1 ) }>{ mode.name }</button>
			</li> ) }
		</ul>
	</div>;
};

SelectMode.propTypes = {
	setMode: propTypes.func.isRequired,
};

export default SelectMode;
