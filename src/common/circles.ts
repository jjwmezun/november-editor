import { levelsPerGame, levelsPerCircle } from './constants';

const getNthLevelOfCircle = ( game: number, circle: number, level: number ): number => {
	return game * levelsPerGame + circle * levelsPerCircle + level;
};

const get1stLevelOfCircle = ( game: number, circle: number ): number => {
	return getNthLevelOfCircle( game, circle, 0 );
};

const getLastLevelOfCircle = ( game: number, circle: number ): number => {
	return getNthLevelOfCircle( game, circle, levelsPerCircle - 1 );
};

export {
	get1stLevelOfCircle,
	getNthLevelOfCircle,
	getLastLevelOfCircle,
};
