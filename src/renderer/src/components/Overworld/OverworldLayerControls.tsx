// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { SyntheticBaseEvent } from "react";

import { OverworldLayerControlsProps, OverworldLayerType } from "../../../../common/types";

function OverworldLayerControls( props: OverworldLayerControlsProps ): React.ReactElement {
	const {
		addLayer,
		layers,
		moveLayerDown,
		moveLayerUp,
		removeLayer,
		selectedLayer,
		selectedLayerType,
		setSelectedLayer,
		setSelectedLayerType,
		setSelectedObject,
		setSelectedObjectType,
	} = props;

	const generateLayerChanger = ( index: number ) => (): void => {
		setSelectedLayer( index );
		setSelectedObject( null );
		setSelectedObjectType( 0 );
	};

	const updateLayerType = ( e: SyntheticBaseEvent<HTMLSelectElement> ): void => {
		const value = e.currentTarget.value as OverworldLayerType;
		setSelectedLayerType( value );
	};

	return <div>
		<h2>Layer controls:</h2>
		<ul>
			{ layers.map( ( layer, i ) => <li key={ i }>
				<button
					disabled={ selectedLayer === i }
					onClick={ generateLayerChanger( i ) }
				>
					Layer #{ i + 1 } – { OverworldLayerType[ layer.getType() ] }
				</button>
			</li> ) }
		</ul>
		<div>
			<label>
				Layer type
				<select value={ selectedLayerType } onChange={ updateLayerType }>
					{ Object.keys( OverworldLayerType ).map( ( key, i ) => <option
						key={ i }
						value={ key }
					>
						{ OverworldLayerType[ key ] }
					</option> ) }
				</select>
			</label>
			<button disabled={ layers.length >= 255 } onClick={ addLayer }>Add layer</button>
			<button disabled={ layers.length <= 1 } onClick={ removeLayer }>Remove layer</button>
			<button disabled={ selectedLayer <= 0 } onClick={ moveLayerUp }>↑</button>
			<button
				disabled={ selectedLayer >= layers.length - 1 }
				onClick={ moveLayerDown }
			>
				↓
			</button>
		</div>
	</div>;
}

export default OverworldLayerControls;
