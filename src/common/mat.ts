import { Mat3 } from './types';

const identity: number[] = [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ];

const mat3Multiply = ( a: number[], b: number[] ): number[] => [
	a[ 0 ] * b[ 0 ] + a[ 1 ] * b[ 3 ] + a[ 2 ] * b[ 6 ],
	a[ 0 ] * b[ 1 ] + a[ 1 ] * b[ 4 ] + a[ 2 ] * b[ 7 ],
	a[ 0 ] * b[ 2 ] + a[ 1 ] * b[ 5 ] + a[ 2 ] * b[ 8 ],

	a[ 3 ] * b[ 0 ] + a[ 4 ] * b[ 3 ] + a[ 5 ] * b[ 6 ],
	a[ 3 ] * b[ 1 ] + a[ 4 ] * b[ 4 ] + a[ 5 ] * b[ 7 ],
	a[ 3 ] * b[ 2 ] + a[ 4 ] * b[ 5 ] + a[ 5 ] * b[ 8 ],

	a[ 6 ] * b[ 0 ] + a[ 7 ] * b[ 3 ] + a[ 8 ] * b[ 6 ],
	a[ 6 ] * b[ 1 ] + a[ 7 ] * b[ 4 ] + a[ 8 ] * b[ 7 ],
	a[ 6 ] * b[ 2 ] + a[ 7 ] * b[ 5 ] + a[ 8 ] * b[ 8 ],
];

const createMat3 = ( values: number[] = identity ): Mat3 => {
	return Object.freeze( {
		getList: () => values,
		scale: ( v: [ number, number ] ) => createMat3( mat3Multiply(
			values,
			[
				v[ 0 ], 0, 0,
				0, v[ 1 ], 0,
				0, 0, 1,
			],
		) ),
		translate: ( v: [ number, number ] ) => createMat3( mat3Multiply(
			values,
			[
				1, 0, v[ 0 ],
				0, 1, v[ 1 ],
				0, 0, 1,
			],
		) ),
	} );
};

export {
	createMat3,
};
