import { MapObject, MapObjectArgs, Overworld, OverworldLayer, OverworldLayerData, OverworldLayerType } from './types';
import { createObject } from './objects';

function createOverworld(
	width: number,
	height: number,
	layers: OverworldLayerData[] = [],
): Overworld {
	const updateLayer = ( index: number, layer: OverworldLayerData ): Overworld => {
		const newLayers = [ ...layers ];
		newLayers[ index ] = layer;
		return createOverworld( width, height, newLayers );
	};
	const layers_ = layers.map( ( layer, index ) => createOverworldLayer(
		updateLayer,
		index,
		layer,
	) );
	return Object.freeze( {
		addLayer: ( type: OverworldLayerType ) => createOverworld(
			width,
			height,
			[ ...layers, createBlankOverworldLayerData( { type } ) ],
		),
		getHeightBlocks: () => height,
		getHeightPixels: () => height * 16,
		getHeightTiles: () => height * 2,
		getLayersList: () => layers_,
		getWidthBlocks: () => width,
		getWidthPixels: () => width * 16,
		getWidthTiles: () => width * 2,
		moveLayerDown: ( index: number ) => {
			if ( index >= layers.length - 1 ) {
				throw new Error( `Cannot move layer down: index out of bounds.` );
			}
			const newLayers = [ ...layers ];
			[ newLayers[ index ], newLayers[ index + 1 ] ] = [
				newLayers[ index + 1 ],
				newLayers[ index ],
			];
			return createOverworld( width, height, newLayers );
		},
		moveLayerUp: ( index: number ) => {
			if ( index <= 0 ) {
				throw new Error( `Cannot move layer up: index out of bounds.` );
			}
			const newLayers = [ ...layers ];
			[ newLayers[ index ], newLayers[ index - 1 ] ] = [
				newLayers[ index - 1 ],
				newLayers[ index ],
			];
			return createOverworld( width, height, newLayers );
		},
		removeLayer: ( index: number ) => {
			if ( layers.length <= 1 ) {
				throw new Error( `Cannot remove the last layer.` );
			}
			const newLayers = [ ...layers ];
			newLayers.splice( index, 1 );
			return createOverworld( width, height, newLayers );
		},
		updateLayer,
	} );
}

function createOverworldLayer(
	updateLayer: ( index: number, layer: OverworldLayerData ) => Overworld,
	layerIndex: number,
	layer: OverworldLayerData,
): OverworldLayer {
	const { objects } = layer;
	return Object.freeze( {
		addObject: ( object: MapObject ) => updateLayer(
			layerIndex,
			{
				...layer,
				objects: [ ...objects, object ],
			},
		),
		getObject: ( index: number ): MapObject => {
			if ( index < 0 || index >= objects.length ) {
				throw new Error( `Object index out of bounds: ${ index }` );
			}
			return objects[ index ];
		},
		getObjectsList: () => objects,
		removeObject: ( index: number ) => {
			const newObjects = [ ...objects ];
			newObjects.splice( index, 1 );
			const newLayer = {
				...layer,
				objects: newObjects,
			};
			return updateLayer(
				layerIndex,
				newLayer,
			);
		},
		updateObject: ( index: number, object: MapObjectArgs ) => {
			const newObjects = [ ...objects ];
			newObjects[ index ] = createObject( { ...newObjects[ index ].toJSON(), ...object } );
			const newLayer = {
				...layer,
				objects: newObjects,
			};
			return updateLayer(
				layerIndex,
				newLayer,
			);
		},
	} );
}

function createBlankOverworldLayerData( atts: object ): OverworldLayerData {
	return Object.freeze( {
		objects: [],
		...atts,
	} );
}

const createBlankOverworld = (): Overworld => createOverworld( 20, 20, [ { objects: [] } ] );

export { createOverworld, createBlankOverworld };
