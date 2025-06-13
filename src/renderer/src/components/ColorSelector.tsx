import { ReactElement } from 'react';
import { Color, ColorSelectorProps } from '../../../common/types';

const getCellClassName = ( isSelected: boolean, isTransparent: boolean ): string => {
	let className = `graphics__color-selector-item`;
	if ( isTransparent ) {
		className += ` graphics__color-selector-item--transparent`;
	}
	if ( isSelected ) {
		className += ` graphics__color-selector-item--selected`;
	}
	return className;
};

const ColorSelector = ( props: ColorSelectorProps ): ReactElement => {
	const {
		palettes,
		selectedColor,
		selectedPalette,
		setSelectedColor,
	} = props;

	const colors = palettes.nth( selectedPalette ).mapColors( ( color: Color ) => color.rgba(), true );

	return <table className="graphics__color-selector">
		<tbody>
			<tr>
				<td
					key={ 0 }
					className={ getCellClassName( 0 === selectedColor, true ) }
					onClick={ () => setSelectedColor( 0 ) }
				/>
				{ colors.map( ( color, i ) => <td
					key={ i + 1 }
					className={ getCellClassName( ( i + 1 ) === selectedColor, false ) }
					style={ { backgroundColor: color } }
					onClick={ () => setSelectedColor( i + 1 ) }
				/> ) }
			</tr>
		</tbody>
	</table>;
};

export default ColorSelector;
