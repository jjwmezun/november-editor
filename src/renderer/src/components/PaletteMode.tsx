import { ReactElement, SyntheticEvent, useState } from 'react';
import { Color, Palette, PaletteModeProps, PaletteSystem } from '../../../common/types';
import { convertHexColorToObject } from '../../../common/palettes';
import { testCharacters } from '../../../common/text';
import { toTitleCase } from '../../../common/utils';

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

	const updateName = ( event: SyntheticEvent<HTMLInputElement> ): void => {
		const target = event.target as HTMLInputElement;
		const newName = target.value.toUpperCase();

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
	const { exitMode, palettes, updatePalette } = props;
	const [ selectedPaletteType, setSelectedPaletteType ] = useState<keyof PaletteSystem | null>( null );
	const [ selectedPalette, setSelectedPalette ] = useState<number | null>( null );
	const [ selectedColor, setSelectedColor ] = useState<number | null>( null );

	// eslint-disable-next-line max-len
	const generateSelectedColorUpdater = ( name: keyof PaletteSystem ) => ( event: SyntheticEvent<HTMLInputElement> ): void => {
		if ( selectedPalette === null || selectedColor === null ) {
			return;
		}

		const target = event.target as HTMLInputElement;
		const newColor = target.value;
		updatePalette(
			name,
			palettes[ name ].updatePalette(
				selectedPalette,
				palettes[ name ]
					.nth( selectedPalette )
					.updateColor( selectedColor, convertHexColorToObject( newColor ) ),
			),
		);
	};

	return <div>
		<h2>Palettes</h2>
		{ Object.entries( palettes ).map( ( [ name, paletteList ] ) => <div key={ name }>
			<h3>{ toTitleCase( name ) }</h3>
			<table>
				<tbody>
					{ paletteList.map( ( palette: Palette, index: number ) => <PaletteTableRow
						key={ index }
						palette={ palette }
						removePalette={
							paletteList.getLength() === 1
								? null
								: () => {
									setSelectedPalette( null );
									setSelectedColor( null );
									updatePalette( name, paletteList.removePalette( index ) );
								}
						}
						selectedColor={
							name === selectedPaletteType && index === selectedPalette ? selectedColor : null
						}
						selectColor={ ( color:number ) => {
							setSelectedPaletteType( name as keyof PaletteSystem );
							setSelectedPalette( index );
							setSelectedColor( color );
						} }
						setPalette={ palette => updatePalette( name, paletteList.updatePalette( index, palette ) ) }
					/> ) }
				</tbody>
			</table>
			<div>
				<button
					onClick={ () => updatePalette( name, paletteList.addBlankPalette() ) }
				>
					Add Palette
				</button>
			</div>
		</div> ) }
		{ selectedPaletteType !== null && selectedPalette !== null && selectedColor !== null && <div>
			<div
				className="palettes__selected-color-display"
				style={
					{
						backgroundColor:
							palettes[ selectedPaletteType ].nth( selectedPalette ).nthColor( selectedColor ).rgba(),
					}
				}
			/>
			<div>
				<input
					type="color"
					onChange={ generateSelectedColorUpdater( selectedPaletteType ) }
					value={ palettes[ selectedPaletteType ].nth( selectedPalette ).nthColor( selectedColor ).hex() }
				/>
			</div>
		</div> }
		<div>
			<button onClick={ exitMode }>Exit</button>
		</div>
	</div>;
};

export default PaletteMode;
