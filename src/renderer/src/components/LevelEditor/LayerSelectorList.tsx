import { layerTypeNames } from '../../../../common/levels';
import { LayerType } from '../../../../common/types';

interface LayerSelectorListProps {
	generateLayerSelector: ( i: number ) => () => void;
	layers: Array<{ type: LayerType }>;
	selectedLayer: number | null;
}

const LayerSelectorList = ( props: LayerSelectorListProps ) => {
	const { generateLayerSelector, layers, selectedLayer } = props;

	return <div>
		<h2>Select a layer</h2>
		<ul>
			{ layers.map( ( layer, i ) => <li key={ i }>
				<button
					disabled={ selectedLayer === i }
					onClick={ generateLayerSelector( i ) }
				>
					Layer { i + 1 } – { layerTypeNames[ layer.type ] }
				</button>
			</li> ) }
		</ul>
	</div>;
};

export { LayerSelectorList };
