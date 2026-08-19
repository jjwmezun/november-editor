import { DataType, Goal, GoalAtts, GoalOptions, GoalTemplate, GoalValue } from './types';

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
				default: 10000,
				atts: {
					min: 1,
					max: 99999,
				},
			},
		],
		exportData: [
			{
				type: DataType.Uint32,
				key: `amount`,
			},
		],
	},
] );

const createGoal = (
	id: number,
	options?: GoalAtts | undefined,
): Goal => {
	if ( options === undefined ) {
		if ( goals[ id ]?.options && Array.isArray( goals[ id ].options ) ) {
			options = goals[ id ].options.reduce(
				( acc: GoalAtts, option: GoalOptions ) => {
					if (
						! ( `slug` in option )
						|| ! ( `default` in option )
						|| typeof option.slug !== `string`
					) {
						throw new Error( `Invalid goal option: ${ JSON.stringify( option ) }` );
					}
					acc[ option.slug ] = option.default;
					return acc;
				},
				{},
			);
		} else {
			options = {};
		}
	}

	return Object.freeze( {
		getId: () => id,
		getOption: ( slug: string ) => {
			if ( !( slug in options ) ) {
				throw new Error( `Invalid goal option: ${ slug }` );
			}
			return options[ slug ];
		},
		getOptionData: ( slug: string ) => {
			if ( !( slug in options ) ) {
				throw new Error( `Invalid goal option: ${ slug }` );
			}
			switch ( typeof options[ slug ] ) {
				case ( `string` ):
					return parseInt( options[ slug ] as string );
				case ( `number` ):
					return options[ slug ] as number;
				default:
					throw new Error( `Invalid goal option type: ${ typeof options[ slug ] }` );
			}
		},
		getOptionText: ( slug: string ) => {
			if ( !( slug in options ) ) {
				throw new Error( `Invalid goal option: ${ slug }` );
			}
			return String( options[ slug ] );
		},
		toJSON: () => ( { id, options } ),
		updateOption: ( slug: string, value: GoalValue ) => createGoal( id, { ...options, [ slug ]: value } ),
	} );
};

export {
	createGoal,
	goals,
};
