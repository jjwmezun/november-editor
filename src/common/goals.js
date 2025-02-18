import propTypes from 'prop-types';

const goals = Object.freeze( [
	{
		name: `Reach Keycane`,
		exportData: [
		],
	},
	{
		name: `Collect ₧`,
		options: [
			{
				slug: `amount`,
				title: `Amount`,
				type: `number`,
				default: 10000,
				atts: {
					min: 1,
					max: 99999,
				},
			},
		],
		exportData: [
			{ type: `Uint32`, data: `amount` },
		],
	},
] );

const createGoal = ( id, options = undefined ) => {
	if ( options === undefined ) {
		if ( !Array.isArray( goals[ id ].options ) ) {
			options = [];
		} else {
			options = goals[ id ].options.reduce( ( acc, option ) => {
				acc[ option.slug ] = option.default;
				return acc;
			}, {} );
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
		updateOption: ( slug, value ) => createGoal( id, { ...options, [ slug ]: value } ),
	} );
};

const goalPropType = propTypes.shape( {
	getId: propTypes.func.isRequired,
	getOption: propTypes.func.isRequired,
	updateOption: propTypes.func.isRequired,
} );

export {
	createGoal,
	goalPropType,
	goals,
};
