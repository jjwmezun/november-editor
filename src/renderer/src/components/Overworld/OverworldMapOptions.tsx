// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { ReactElement, SyntheticBaseEvent } from "react";

import { OverworldMapOptionsProps } from '../../../../common/types';

function OverworldMapOptions( props: OverworldMapOptionsProps ): ReactElement {
	const { map, setOverworld } = props;

	const updateMapHeight = ( e: SyntheticBaseEvent ) => {
		const value = e.target.value;
		setOverworld( map.updateHeight( value ) );
	};

	const updateMapWidth = ( e: SyntheticBaseEvent ) => {
		const value = e.target.value;
		setOverworld( map.updateWidth( value ) );
	};

	return <div>
		<h2>Map options</h2>
		<div>
			<label>
				Width
				<input
					type="number"
					value={ map.getWidthBlocks() }
					onChange={ updateMapWidth }
				/>
			</label>
			<label>
				Height
				<input
					type="number"
					value={ map.getHeightBlocks() }
					onChange={ updateMapHeight }
				/>
			</label>
		</div>
	</div>;
}

export default OverworldMapOptions;
