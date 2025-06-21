import { LvMap } from '../../../../common/types';

interface MapSelectorList {
	generateMapSelector: ( i: number ) => () => void;
	maps: LvMap[];
	selectedMapIndex: number | null;
}

const MapSelectorList = ( props: MapSelectorList ) => {
	const { generateMapSelector, maps, selectedMapIndex } = props;

	return <div>
		<h2>Select a map</h2>
		<ul>
			{ maps.map( ( _map, i ) => <li key={ i }>
				<button
					disabled={ selectedMapIndex === i }
					onClick={ generateMapSelector( i ) }
				>
					Map { i + 1 }
				</button>
			</li> ) }
		</ul>
	</div>;
};

export { MapSelectorList };
