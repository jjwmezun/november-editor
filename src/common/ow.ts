import { MapObject, MapObjectArgs, Overworld } from './types';
import { createObject } from './objects';

const createOverworld = (
	width: number,
	height: number,
	objects: MapObject[] = [],
): Overworld => Object.freeze( {
	addObject: ( object: MapObject ) => createOverworld( width, height, [ ...objects, object ] ),
	getHeightBlocks: () => height,
	getHeightPixels: () => height * 16,
	getHeightTiles: () => height * 2,
	getObject: ( index: number ): MapObject => {
		if ( index < 0 || index >= objects.length ) {
			throw new Error( `Object index out of bounds: ${ index }` );
		}
		return objects[ index ];
	},
	getObjectsList: () => objects,
	getWidthBlocks: () => width,
	getWidthPixels: () => width * 16,
	getWidthTiles: () => width * 2,
	removeObject: ( index: number ) => {
		const newObjects = [ ...objects ];
		newObjects.splice( index, 1 );
		return createOverworld( width, height, newObjects );
	},
	updateObject: ( index: number, object: MapObjectArgs ) => {
		const newObjects = [ ...objects ];
		newObjects[ index ] = createObject( { ...newObjects[ index ].toJSON(), ...object } );
		return createOverworld( width, height, newObjects );
	},
} );

const createBlankOverworld = (): Overworld => createOverworld( 20, 20 );

export { createOverworld, createBlankOverworld };
