import propTypes from 'prop-types';

const ColorSelector = props => {
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

ColorSelector.propTypes = {
	colors: propTypes.arrayOf( propTypes.string ).isRequired,
	selectedColor: propTypes.number.isRequired,
	setSelectedColor: propTypes.func.isRequired,
};

export default ColorSelector;
