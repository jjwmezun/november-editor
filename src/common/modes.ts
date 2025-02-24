import { Mode } from './types';

const modeMap: readonly Mode[] = Object.freeze( [
	{
		name: `Select`,
		slug: `select`,
	},
	{
		name: `Level List`,
		slug: `levelList`,
	},
	{
		name: `Graphics`,
		slug: `graphics`,
	},
] );

type ModeKeys = {
	select: number,
	levelList: number,
	graphics: number,
};

const modeKeys: ModeKeys = {
	select: 0,
	levelList: 1,
	graphics: 2,
};

export {
	modeKeys,
	modeMap,
};
