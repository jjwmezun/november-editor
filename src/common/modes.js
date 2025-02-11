const modeMap = Object.freeze( [
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

const modeKeys = Object.freeze( modeMap.reduce( ( keys, mode, i ) => {
	keys[ mode.slug ] = i;
	return keys;
}, {} ) );

export {
	modeKeys,
	modeMap,
};
