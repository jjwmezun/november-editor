import { Mode } from './types';

const modeMap: readonly Mode[] = Object.freeze( [
	{
		name: `Select`,
		slug: `select`,
	},
	{
		name: `Levels`,
		slug: `levelList`,
	},
	{
		name: `Graphics`,
		slug: `graphics`,
	},
	{
		name: `Palettes`,
		slug: `palettes`,
	},
	{
		name: `O’erworld`,
		slug: `overworld`,
	},
	{
		name: `Backgrounds`,
		slug: `backgrounds`,
	},
] );

type ModeKeys = {
	select: number,
	levelList: number,
	graphics: number,
	palettes: number,
	overworld: number,
	backgrounds: number,
};

const modeKeys: ModeKeys = {
	select: 0,
	levelList: 1,
	graphics: 2,
	palettes: 3,
	overworld: 4,
	backgrounds: 5,
};

export {
	modeKeys,
	modeMap,
};
