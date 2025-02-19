import { ReactElement } from 'react';
import { ColorSelectorProps } from '../../../common/types';

const ColorSelector = ( props: ColorSelectorProps ): ReactElement => {
	const {
		colors,
		selectedColor,
		setSelectedColor,
	} = props;

	return <table className="graphics__color-selector">
		<tbody>
			<tr>
				{ colors.map( ( color, i ) => <td
					key={ i }
					className={ i === selectedColor ? `graphics__color-selector-item--selected` : `` }
					style={ { backgroundColor: color } }
					onClick={ () => setSelectedColor( i ) }
				/> ) }
			</tr>
		</tbody>
	</table>;
};

export default ColorSelector;
