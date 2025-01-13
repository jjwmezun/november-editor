import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import stylisticJs from '@stylistic/eslint-plugin-js';
import pluginJest from 'eslint-plugin-jest';

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );
const compat = new FlatCompat( {
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
} );

export default [
	{
		ignores: [ `**/node_modules`, `**/dist`, `**/out`, `**/.gitignore` ],
	},
	...compat
		.extends(
			`eslint:recommended`,
			`plugin:react/recommended`,
			`plugin:react/jsx-runtime`,
			`@electron-toolkit`,
		)
		.map( config => ( {
			...config,
			files: [ `**/*.js`, `**/*.jsx`, `**/*.mjs` ],
		} ) ),
	{
		files: [ `**/*.js`, `**/*.jsx`, `**/*.mjs` ],
		settings: {
			react: {
				version: `detect`,
			},
		},
		languageOptions: {
			globals: pluginJest.environments.globals.globals,
		},
		plugins: {
			'@stylistic/js': stylisticJs,
		},

		rules: {
			curly: [ `error`, `all` ],
			'object-curly-spacing': [ `error`, `always` ],
			'space-in-parens': [ `error`, `always` ],
			'array-bracket-spacing': [ `error`, `always` ],
			'arrow-spacing': [ `error`, { before: true, after: true } ],
			'arrow-parens': [ `error`, `as-needed` ],
			'block-spacing': [ `error`, `always` ],
			'brace-style': [ `error`, `1tbs` ],
			'comma-dangle': [ `error`, `always-multiline` ],
			'comma-spacing': [ `error`, { before: false, after: true } ],
			'computed-property-spacing': [ `error`, `always` ],
			'dot-location': [ `error`, `property` ],
			'eol-last': [ `error`, `always` ],
			'func-call-spacing': [ `error`, `never` ],
			'function-call-argument-newline': [ `error`, `consistent` ],
			'function-paren-newline': [ `error`, `multiline` ],
			indent: [ `error`, `tab` ],
			'jsx-quotes': [ `error`, `prefer-double` ],
			'key-spacing': [ `error`, { beforeColon: false, afterColon: true } ],
			'keyword-spacing': [ `error`, { before: true, after: true } ],
			'linebreak-style': [ `error`, `unix` ],
			'lines-around-comment': [
				`error`,
				{
					beforeBlockComment: true,
					afterBlockComment: false,
					beforeLineComment: true,
					afterLineComment: false,
					allowBlockStart: true,
					allowBlockEnd: true,
					allowObjectStart: true,
					allowObjectEnd: true,
					allowArrayStart: true,
					allowArrayEnd: true,
					allowClassStart: true,
					allowClassEnd: true,
				},
			],
			'max-len': [ `error`, { code: 120, tabWidth: 4 } ],
			'max-statements-per-line': [ `error`, { max: 1 } ],
			'multiline-ternary': [ `error`, `always-multiline` ],
			'no-confusing-arrow': [ `error`, { allowParens: true } ],
			'no-extra-semi': `error`,
			'no-multi-spaces': [ `error`, { ignoreEOLComments: true } ],
			'no-multiple-empty-lines': [ `error`, { max: 1 } ],
			'no-mixed-spaces-and-tabs': `error`,
			'no-trailing-spaces': `error`,
			'no-whitespace-before-property': `error`,
			'object-curly-newline': [ `error`, { multiline: true, consistent: true } ],
			'one-var-declaration-per-line': [ `error`, `always` ],
			'object-property-newline': [ `error`, { allowAllPropertiesOnSameLine: true } ],
			'padded-blocks': [ `error`, `never` ],
			'quote-props': [ `error`, `as-needed` ],
			quotes: [ `error`, `backtick` ],
			'rest-spread-spacing': [ `error`, `never` ],
			semi: [ `error`, `always` ],
			'semi-spacing': [ `error`, { before: false, after: true } ],
			'semi-style': [ `error`, `last` ],
		},
	},
];
