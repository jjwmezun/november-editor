
import { SyntheticEvent } from 'react';
import {
	Layer,
	LvMap,
	MapObject,
} from '../../../../common/types';
import { getBlockTypeFactory } from '../../../../common/objects';

interface LayerOptionsProps {
	map: LvMap;
	selectedLayer: Layer;
	selectedObject: number | null;
	setSelectedObject: ( i: number | null ) => void;
	updateLayer: {
		updateOption: ( key: string, value: string ) => LvMap;
	};
	updateMap: ( map: LvMap ) => void;
}

const LayerOptions = ( props: LayerOptionsProps ) => {
	const { map, selectedLayer, selectedObject, setSelectedObject, updateLayer, updateMap } = props;
	const { objects, type } = selectedLayer;

	const blockFactory = getBlockTypeFactory( type, map.getTilesetType() );

	const generateLayerOptionUpdater = ( key: string ) => ( e: SyntheticEvent ) => {
		const target = e.target as HTMLInputElement;
		const value = target.value;
		updateMap( updateLayer.updateOption( key, value ) );
	};

	const generateSelectedObjectUpdater = ( e: SyntheticEvent ) => {
		const target = e.target as HTMLSelectElement;
		const value = target.value === `null` ? null : parseInt( target.value );
		setSelectedObject( value );
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
		<div>
			<label>
				<span>Object List:</span>
				<select
					size={ 10 }
					value={ selectedObject === null ? undefined : selectedObject }
					onChange={ generateSelectedObjectUpdater }
				>
					<option value="null">Select an object</option>
					{ objects.map( ( object: MapObject, i: number ) => (
						<option key={ i } value={ i }>
							{ i }.
							{ blockFactory[ object.type() ].name } ( { object.xBlocks() }, { object.yBlocks() } )
						</option>
					) ) }
				</select>
			</label>
		</div>
	</div>;
};

export { LayerOptions };
