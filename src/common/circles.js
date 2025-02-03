import { levelsPerGame, levelsPerCircle } from './constants';

const getNthLevelOfCircle = ( game, circle, level ) => {
	return game * levelsPerGame + circle * levelsPerCircle + level;
};

const get1stLevelOfCircle = ( game, circle ) => {
	return getNthLevelOfCircle( game, circle, 0 );
};

const getLastLevelOfCircle = ( game, circle ) => {
	return getNthLevelOfCircle( game, circle, levelsPerCircle - 1 );
};

export {
	get1stLevelOfCircle,
	getNthLevelOfCircle,
	getLastLevelOfCircle,
};
