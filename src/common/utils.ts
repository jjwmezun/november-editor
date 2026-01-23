import { SyntheticBaseEvent } from 'react';
import { MousePosition } from './types';

function createRange( min: number, max: number ): number[] {
	const range: number[] = [];
	for ( let i = min; i <= max; i++ ) {
		range.push( i );
	}
	return range;
}

function getMousePosition( e: SyntheticBaseEvent ): MousePosition {
	const canvas: EventTarget | null = e.target;
	if ( canvas === null || !( canvas instanceof HTMLCanvasElement ) ) {
		throw new Error( `getMousePosition: Event target is not a canvas element` );
	}
	const rect = canvas.getBoundingClientRect();
	return {
		x: e.clientX - rect.left,
		y: e.clientY - rect.top,
	};
}

export {
	createRange,
	getMousePosition,
};
