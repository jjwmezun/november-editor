import {
	get1stLevelOfCircle,
	getNthLevelOfCircle,
	getLastLevelOfCircle,
} from '../src/common/circles.js';

test( `get1stLevelOfCircle returns correct values.`, () => {
	expect( get1stLevelOfCircle( 0, 0 ) ).toEqual( 0 );
	expect( get1stLevelOfCircle( 0, 1 ) ).toEqual( 16 );
	expect( get1stLevelOfCircle( 0, 2 ) ).toEqual( 32 );
	expect( get1stLevelOfCircle( 0, 3 ) ).toEqual( 48 );
	expect( get1stLevelOfCircle( 0, 4 ) ).toEqual( 64 );
	expect( get1stLevelOfCircle( 1, 0 ) ).toEqual( 80 );
	expect( get1stLevelOfCircle( 1, 1 ) ).toEqual( 96 );
	expect( get1stLevelOfCircle( 1, 2 ) ).toEqual( 112 );
	expect( get1stLevelOfCircle( 1, 3 ) ).toEqual( 128 );
	expect( get1stLevelOfCircle( 1, 4 ) ).toEqual( 144 );
} );

test( `getlastLevelOfCircle returns correct values.`, () => {
	expect( getLastLevelOfCircle( 0, 0 ) ).toEqual( 15 );
	expect( getLastLevelOfCircle( 0, 1 ) ).toEqual( 31 );
	expect( getLastLevelOfCircle( 0, 2 ) ).toEqual( 47 );
	expect( getLastLevelOfCircle( 0, 3 ) ).toEqual( 63 );
	expect( getLastLevelOfCircle( 0, 4 ) ).toEqual( 79 );
	expect( getLastLevelOfCircle( 1, 0 ) ).toEqual( 95 );
	expect( getLastLevelOfCircle( 1, 1 ) ).toEqual( 111 );
	expect( getLastLevelOfCircle( 1, 2 ) ).toEqual( 127 );
	expect( getLastLevelOfCircle( 1, 3 ) ).toEqual( 143 );
	expect( getLastLevelOfCircle( 1, 4 ) ).toEqual( 159 );
} );

test( `getNthLevelOfCircle returns correct values.`, () => {
	expect( getNthLevelOfCircle( 0, 0, 0 ) ).toEqual( 0 );
	expect( getNthLevelOfCircle( 1, 1, 5 ) ).toEqual( 101 );
} );
