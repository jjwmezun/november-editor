
import { SyntheticEvent } from 'react';
import {
	Layer,
	LvMap,
} from '../../../../common/types';

interface LayerOptionsProps {
	selectedLayer: Layer;
	updateLayer: {
		updateOption: ( key: string, value: string ) => LvMap;
	};
	updateMap: ( map: LvMap ) => void;
}

const LayerOptions = ( props: LayerOptionsProps ) => {
	const { selectedLayer, updateLayer, updateMap } = props;

	const generateLayerOptionUpdater = ( key: string ) => ( e: SyntheticEvent ) => {
		const target = e.target as HTMLInputElement;
		const value = target.value;
		updateMap( updateLayer.updateOption( key, value ) );
	};

	return <div>
		<h2>Layer Options</h2>
		<div>
			<label>
				<span>Scroll X:</span>
				<input
					type="number"
					value={ selectedLayer.scrollX }
					onChange={ generateLayerOptionUpdater( `scrollX` ) }
				/>
			</label>
		</div>
	</div>;
};

export { LayerOptions };
