// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { SyntheticBaseEvent } from "react";

import { OverworldObjectControlsProps } from "../../../../common/types";

function OverworldObjectControls( props: OverworldObjectControlsProps ): React.ReactElement {
	const {
		typesFactory,
		selectedObjectType,
		setSelectedObjectType,
	} = props;

	const updateSelectedObjectType = ( e: SyntheticBaseEvent ): void => {
		const value = e.target.value;
		setSelectedObjectType( value );
	};

	return <div>
		<label>
			<h2>Object type to add:</h2>
			<select value={ selectedObjectType } onChange={ updateSelectedObjectType }>
				{ typesFactory.map( ( type, i ) => <option key={ i } value={ i }>{ type.name }</option> ) }
			</select>
		</label>
	</div>;
}

export default OverworldObjectControls;
