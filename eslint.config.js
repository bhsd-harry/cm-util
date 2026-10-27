import config, {browser, browserES10, getOxlintConfig} from '@bhsd/code-standard';

const oxlintConfig = getOxlintConfig([
	...config,
	browser,
	{
		files: ['src/cm.ts'],
		rules: browserES10.rules,
	},
]);

export default oxlintConfig;
