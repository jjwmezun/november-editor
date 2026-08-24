// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

import { OverworldMapControlsProps } from "../../../../common/types";

function OverworldMapControls( props: OverworldMapControlsProps ): React.JSX.Element {
	const {
		addMap,
		generateMapSelector,
		maps,
		moveMapDown,
		moveMapUp,
		removeMap,
		selectedMap,
	} = props;
	return <div>
		<h2>Map controls</h2>
		<ul>
			{ maps.map( ( map, index ) => (
				<li key={ index }>
					<button
						disabled={ index === selectedMap }
						onClick={ generateMapSelector( index ) }
					>
						Map #{ index + 1 }
					</button>
				</li>
			) ) }
		</ul>
		<div>
			<button
				disabled={ maps.length >= 255 }
				onClick={ addMap }
			>
				Add Map
			</button>
			<button
				disabled={ maps.length <= 1 }
				onClick={ removeMap }
			>
				Remove Map
			</button>
			<button
				disabled={ selectedMap <= 0 }
				onClick={ moveMapUp }
			>
				↑
			</button>
			<button
				disabled={ selectedMap >= maps.length - 1 }
				onClick={ moveMapDown }
			>
				↓
			</button>
		</div>
	</div>;
}

export default OverworldMapControls;
