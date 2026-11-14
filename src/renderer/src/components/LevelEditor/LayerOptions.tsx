
import { SyntheticEvent } from 'react';
import {
	Graphics,
	Layer,
	LvMap,
	LvMapLayerUpdater,
	MapObject,
} from '../../../../common/types';
import { getBlockTypeFactory } from '../../../../common/objects';

interface LayerOptionsProps {
	graphics: Graphics;
	map: LvMap;
	selectedLayer: Layer;
	selectedObject: number | null;
	setSelectedObject: ( i: number | null ) => void;
	updateLayer: LvMapLayerUpdater;
	updateMap: ( map: LvMap ) => void;
}

const LayerOptions = ( props: LayerOptionsProps ) => {
	const { graphics, map, selectedLayer, selectedObject, setSelectedObject, updateLayer, updateMap } = props;
	const { data, type } = selectedLayer;

	const blockFactory = getBlockTypeFactory( type, map.getTilesetType() );

	const generateBackgroundGraphicsUpdater = ( e: SyntheticEvent ) => {
		const target = e.target as HTMLSelectElement;
		const value = parseInt( target.value );
		updateMap( updateLayer.updateBackgroundGraphics( value ) );
	};

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
					value={ selectedLayer.data.scrollX }
					onChange={ generateLayerOptionUpdater( `scrollX` ) }
				/>
			</label>
		</div>
		{ `graphics` in data && <div>
			<label>
				<span>Background Graphics:</span>
				<select
					value={ data.graphics }
					onChange={ generateBackgroundGraphicsUpdater }
				>
					{ graphics.backgrounds.map( ( background, i ) => (
						<option key={ i } value={ i }>
							{ background.title() }
						</option>
					) ) }
				</select>
			</label>
		</div> }
		{ `objects` in data && <div>
			<label>
				<span>Object List:</span>
				<select
					size={ 10 }
					value={ selectedObject === null ? undefined : selectedObject }
					onChange={ generateSelectedObjectUpdater }
				>
					<option value="null">Select an object</option>
					{ data.objects.map( ( object: MapObject, i: number ) => (
						<option key={ i } value={ i }>
							{ i }.
							{ blockFactory[ object.type() ].name } ( { object.xBlocks() }, { object.yBlocks() } )
						</option>
					) ) }
				</select>
			</label>
		</div> }
	</div>;
};

export { LayerOptions };
