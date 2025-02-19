import { ReactElement } from 'react';
import { modeMap } from '../../../common/modes';
import { SelectModeProps } from '../../../common/types';

const SelectMode = ( props: SelectModeProps ): ReactElement => {
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

export default SelectMode;
