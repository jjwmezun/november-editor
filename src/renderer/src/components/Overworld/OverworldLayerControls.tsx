// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

import { OverworldLayerControlsProps } from "../../../../common/types";

function OverworldLayerControls( props: OverworldLayerControlsProps ): React.ReactElement {
	const {
		addLayer,
		layers,
		moveLayerDown,
		moveLayerUp,
		removeLayer,
		selectedLayer,
		setSelectedLayer,
		setSelectedObject,
		setSelectedObjectType,
	} = props;

	const generateLayerChanger = ( index: number ) => (): void => {
		setSelectedLayer( index );
		setSelectedObject( null );
		setSelectedObjectType( 0 );
	};

	return <div>
		<h2>Layer controls:</h2>
		<ul>
			{ layers.map( ( _layer, i ) => <li key={ i }>
				<button
					disabled={ selectedLayer === i }
					onClick={ generateLayerChanger( i ) }
				>
					Layer #{ i + 1 }
				</button>
			</li> ) }
		</ul>
		<div>
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
