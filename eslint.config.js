import config, {browser, browserES10} from '@bhsd/code-standard';

export default [
	...config,
	browser,
	{
		files: ['src/cm.ts'],
		rules: browserES10.rules,
	},
];
