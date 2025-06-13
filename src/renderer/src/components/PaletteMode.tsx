import { ReactElement, SyntheticBaseEvent, useState } from 'react';
import { Color, Palette, PaletteModeProps } from '../../../common/types';
import { convertHexColorToObject } from '../../../common/palettes';
import { testCharacters } from '../../../common/text';

interface PaletteTableRowProps {
	key: number,
	palette: Palette;
	removePalette: ( () => void ) | null;
	selectedColor: number | null;
	selectColor: ( index:number ) => void;
	setPalette: ( palette: Palette ) => void;
}

interface PaletteTableColColorProps {
	key: number,
	color: Color;
	index: number;
	selectedColor: number | null;
	selectColor: ( index:number ) => void;
}

const PaletteTableColColor = ( props: PaletteTableColColorProps ): ReactElement => {
	const { color, index, selectedColor, selectColor } = props;

	const n: number = index + 1;
	const className = `palettes__color-selector${ selectedColor === n ? ` palettes__color-selector--selected` : `` }`;
	return <td
		className={ className }
		style={ { backgroundColor: color.rgba() } }
		onClick={ () => selectColor( n ) }
	/>;
};

const PaletteTableRow = ( props: PaletteTableRowProps ): ReactElement => {
	const { palette, removePalette, selectedColor, selectColor, setPalette } = props;
	const removeButtonProps = removePalette === null
		? { disabled: true }
		: { onClick: removePalette };

	const updateName = ( event: SyntheticBaseEvent ): void => {
		const newName = event.target.value.toUpperCase();

		// If name contains invalid characters, do not update.
		if ( ! testCharacters( newName ) ) {
			return;
		}

		setPalette( palette.updateName( newName ) );
	};

	return <tr>
		<td>
			<input
				type="text"
				value={ palette.getName() }
				onChange={ updateName }
			/>
		</td>
		<>
			{ palette.mapColors( ( color, index ) => <PaletteTableColColor
				key={ index }
				color={ color }
				index={ index }
				selectedColor={ selectedColor }
				selectColor={ selectColor }
			/>, true ) }
		</>
		<td>
			<button { ...removeButtonProps }>
				Remove Palette
			</button>
		</td>
	</tr>;
};

const PaletteMode = ( props: PaletteModeProps ): ReactElement => {
	const { exitMode, palettes, setPalettes } = props;
	const [ selectedPalette, setSelectedPalette ] = useState( null );
	const [ selectedColor, setSelectedColor ] = useState( null );

	const updateSelectedColor = ( event: SyntheticBaseEvent ): void => {
		if ( selectedPalette === null || selectedColor === null ) {
			return;
		}

		const newColor = event.target.value;
		setPalettes( palettes.updatePalette(
			selectedPalette,
			palettes.nth( selectedPalette ).updateColor( selectedColor, convertHexColorToObject( newColor ) ),
		) );
	};

	return <div>
		<h2>Palettes</h2>
		<div>
			<table>
				<tbody>
					{ palettes.map( ( palette, index ) => <PaletteTableRow
						key={ index }
						palette={ palette }
						removePalette={
							palettes.getLength() === 1
								? null
								: () => {
									if ( selectedPalette === index ) {
										setSelectedPalette( null );
										setSelectedColor( null );
									} else if ( selectedPalette > index ) {
										setSelectedPalette( selectedPalette - 1 );
									}
									setPalettes( palettes.removePalette( index ) );
								}
						}
						selectedColor={ index === selectedPalette ? selectedColor : null }
						selectColor={ ( color:number ) => {
							setSelectedPalette( index );
							setSelectedColor( color );
						} }
						setPalette={ palette => setPalettes( palettes.updatePalette( index, palette ) ) }
					/> ) }
				</tbody>
			</table>
			<div>
				<button
					onClick={ () => setPalettes( palettes.addBlankPalette() ) }
				>
					Add Palette
				</button>
			</div>
			{ selectedPalette !== null && selectedColor !== null && <div>
				<div
					className="palettes__selected-color-display"
					style={ { backgroundColor: palettes.nth( selectedPalette ).nthColor( selectedColor ).rgba() } }
				/>
				<div>
					<input
						type="color"
						onChange={ updateSelectedColor }
						value={ palettes.nth( selectedPalette ).nthColor( selectedColor ).hex() }
					/>
				</div>
			</div> }
		</div>
		<div>
			<button onClick={ exitMode }>Exit</button>
		</div>
	</div>;
};

export default PaletteMode;
