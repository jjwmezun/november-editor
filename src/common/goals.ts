import { Goal, GoalTemplate } from './types';

const goals: readonly GoalTemplate[] = Object.freeze( [
	{
		name: `Reach Keycane`,
	},
	{
		name: `Collect ₧`,
		options: [
			{
				slug: `amount`,
				title: `Amount`,
				type: `number`,
				default: `10000`,
				atts: {
					min: `1`,
					max: `99999`,
				},
			},
		],
		exportData: [
			{ type: `Uint32`, key: `amount` },
		],
	},
] );

const createGoal = (
	id: number,
	options?: { [key: string]: string },
): Goal => {
	if ( options === undefined ) {
		if ( goals[ id ]?.options && Array.isArray( goals[ id ].options ) ) {
			options = goals[ id ].options.reduce( ( acc, option ) => {
				acc[ option.slug ] = option.default;
				return acc;
			}, {} );
		} else {
			options = {};
		}
	}

	return Object.freeze( {
		getId: () => id,
		getOption: slug => {
			if ( !( slug in options ) ) {
				throw new Error( `Invalid goal option: ${ slug }` );
			}
			return options[ slug ];
		},
		toJSON: () => ( { id, options } ),
		updateOption: ( slug, value ) => createGoal( id, { ...options, [ slug ]: value } ),
	} );
};

export {
	createGoal,
	goals,
};
