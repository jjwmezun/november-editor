import { modeKeys } from '../src/common/modes';

test( `Text encodes to expected bits.`, () => {
	expect( modeKeys.select ).toBe( 0 );
	expect( modeKeys.levelList ).toBe( 1 );
	expect( modeKeys.graphics ).toBe( 2 );
} );
