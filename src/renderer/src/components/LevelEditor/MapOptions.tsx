import { SyntheticBaseEvent } from 'react';
import { LvMap, PaletteList } from '../../../../common/types';

interface MapOptionsProps {
	selectedMap: LvMap;
	updateMap: ( map: LvMap ) => void;
	palettes: PaletteList;
}

const MapOptions = ( props: MapOptionsProps ) => {
	const { selectedMap, updateMap, palettes } = props;
	const { height, palette, width } = selectedMap.getProps();

	const setWidth = width => updateMap( selectedMap.updateWidth( width ) );
	const setHeight = height => updateMap( selectedMap.updateHeight( height ) );

	const updatePalette = ( e: SyntheticBaseEvent ) => {
		const target: HTMLSelectElement = e.target;
		const paletteIndex = parseInt( target.value );
		updateMap( selectedMap.updatePalette( paletteIndex ) );
	};

	return <div>
		<h2>Map options</h2>
		<div>
			<label>
				<span>Width:</span>
				<input type="number" value={ width } onChange={ e => setWidth( parseInt( e.target.value ) ) } />
			</label>
			<label>
				<span>Height:</span>
				<input type="number" value={ height } onChange={ e => setHeight( parseInt( e.target.value ) ) } />
			</label>
			<label>
				<span>Palette:</span>
				<select onChange={ updatePalette } value={ palette }>
					{ palettes.map( ( palette, index ) => {
						return <option
							key={ index }
							value={ index }
						>
							{ palette.getName() }
						</option>;
					} ) }
				</select>
			</label>
		</div>
	</div>;
};

export { MapOptions };
