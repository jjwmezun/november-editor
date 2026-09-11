import { MouseEvent } from 'react';
import { MousePosition } from './types';

function convertDegreesToRadians( degrees: number ): number {
	return degrees * ( Math.PI / 180 );
}

function createRange( min: number, max: number ): number[] {
	const range: number[] = [];
	for ( let i = min; i <= max; i++ ) {
		range.push( i );
	}
	return range;
}

function getMousePosition( e: MouseEvent ): MousePosition {
	const canvas = e.target as HTMLCanvasElement;
	if ( canvas === null || !( canvas instanceof HTMLCanvasElement ) ) {
		throw new Error( `getMousePosition: Event target is not a canvas element` );
	}
	const rect = canvas.getBoundingClientRect();
	return {
		x: e.clientX - rect.left,
		y: e.clientY - rect.top,
	};
}

function toTitleCase( str: string ): string {
	return str.replace( /\w\S*/g, txt => {
		return txt.charAt( 0 ).toUpperCase() + txt.substring( 1 ).toLowerCase();
	} );
}

export {
	convertDegreesToRadians,
	createRange,
	getMousePosition,
	toTitleCase,
};
