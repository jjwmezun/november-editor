import { createMat3 } from '../src/common/mat';

test( `Test matrix functions work as expected.`, () => {
	const identity = createMat3();
	expect( identity.getList() ).toEqual( [
		1, 0, 0,
		0, 1, 0,
		0, 0, 1,
	] );
	const translation = identity.translate( [ 1, 2 ] );
	expect( translation.getList() ).toEqual( [
		1, 0, 1,
		0, 1, 2,
		0, 0, 1,
	] );
	const scale = identity.scale( [ 2, 3 ] );
	expect( scale.getList() ).toEqual( [
		2, 0, 0,
		0, 3, 0,
		0, 0, 1,
	] );
	const combined = translation.scale( [ 2, 3 ] );
	expect( combined.getList() ).toEqual( [
		2, 0, 1,
		0, 3, 2,
		0, 0, 1,
	] );
	const combined2 = scale.translate( [ 1, 2 ] );
	expect( combined2.getList() ).toEqual( [
		2, 0, 2,
		0, 3, 6,
		0, 0, 1,
	] );
} );
