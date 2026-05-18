import type {ConfigData} from 'wikiparser-node/dist/base';
export type * from './monaco.js';

export type Option = Record<string, unknown> | null | undefined;
export type LiveOption = (runtime?: boolean) => Option | Promise<Option>;

export interface MwConfig {
	readonly tags: Record<string, true>;
	tagModes: Record<string, string>;
	urlProtocols: string;
	functionSynonyms: [Record<string, string>, Record<string, string>];
	doubleUnderscore: [Record<string, string>, Record<string, string>];
	variableIDs?: string[];
	functionHooks?: string[];
	redirection?: string[];
	subst?: Record<string, string>;
	imageKeywords?: Record<string, string>;
}

export interface MagicWord {
	name: string;
	aliases: string[];
	'case-sensitive': boolean;
}
export type MagicRule = (word: MagicWord) => boolean;

export const otherParserFunctions = new Set(['msg', 'raw', 'subst', 'safesubst']);

/**
 * 获取Linter选项
 * @param opt Linter选项
 * @param runtime 是否为运行时选项
 */
export const getOpt = (opt: Option | LiveOption, runtime = true): Option | Promise<Option> =>
	typeof opt === 'function' ? opt(runtime) : opt;

/**
 * 是否为使用`__`的状态开关
 * @param s 状态开关
 */
export const isUnderscore = (s: string): boolean => !/^＿{2}.+＿{2}$/u.test(s);

/**
 * 移除以`：`结尾的无效别名
 * @param aliases 别名列表
 */
export const cleanAliases = (aliases: Record<string, string>): void => {
	for (const key in aliases) {
		if (/^[^#＃].*：$/u.test(key)) {
			delete aliases[key];
		}
	}
};

/**
 * 将魔术字信息转换为CodeMirror接受的设置
 * @param magicWords 完整魔术字列表
 * @param rule 过滤函数
 * @param flip 是否反向筛选对大小写敏感的魔术字
 */
export const getConfig = (magicWords: MagicWord[], rule: MagicRule, flip?: boolean): Record<string, string> => {
	const words = magicWords.filter(rule);
	return Object.fromEntries(
		(flip === undefined ? words : words.filter(({'case-sensitive': i}) => i !== flip))
			.flatMap(({aliases, name: n, 'case-sensitive': i}) => aliases.map(alias => ({
				alias: (i ? alias : alias.toLowerCase()).replace(/:$/u, ''),
				name: n,
			})))
			.map(({alias, name: n}) => [alias, n]),
	);
};

/**
 * 将MwConfig转换为Config
 * @param minConfig 基础Config
 * @param mwConfig MwConfig
 */
export const getParserConfig = (minConfig: ConfigData, mwConfig: MwConfig): ConfigData => {
	const {
			tags,
			doubleUnderscore,
			urlProtocols,
			functionSynonyms,
			variableIDs,
			functionHooks,
			redirection,
			subst,
			imageKeywords,
		} = mwConfig,
		[insensitive, sensitive] = functionSynonyms,
		behaviorSwitch = doubleUnderscore.map(
			(obj, i) => Object.entries(obj).map(([k, v]) => [
				isUnderscore(k) ? k.slice(2, -2) : k,
				i ? v.toUpperCase() : v,
			] as const),
		);
	cleanAliases(insensitive);
	cleanAliases(sensitive);
	for (const k in insensitive) {
		if (k in sensitive) {
			delete insensitive[k];
		} else {
			insensitive[k] = insensitive[k]!.toLowerCase();
		}
	}
	return {
		...minConfig,
		ext: Object.keys(tags),
		parserFunction: [{...insensitive}, {...sensitive, '=': '='}, [], subst ? Object.keys(subst) : []],
		doubleUnderscore: [
			...behaviorSwitch.map(
				entries => entries.filter(([k]) => isUnderscore(k)).map(([k]) => k),
			) as [string[], string[]],
			...behaviorSwitch.map(Object.fromEntries) as [Record<string, string>, Record<string, string>],
		],
		protocol: urlProtocols.replaceAll(/\|\\?\/\\?\/$|\\(?=[:/])/gu, ''),
		...variableIDs && {variable: [...new Set([...variableIDs, '='])]},
		...functionHooks && {functionHook: [...new Set([...functionHooks.map(s => s.toLowerCase()), 'msgnw'])]},
		...redirection && {redirection: redirection.map(s => s.toLowerCase())},
		...imageKeywords && {
			img: Object.fromEntries(
				Object.entries(imageKeywords).filter(([v, k]) => k !== 'alt' || v.includes('$1')),
			),
		},
	};
};

/**
 * 获取语言变体
 * @param variants 语言变体列表
 */
export const getVariants = (variants: {code: string}[] | undefined): string[] =>
	variants?.map(({code}) => code) ?? [];

/**
 * 获取图片和重定向关键字
 * @param magicwords 魔术字列表
 * @param web 是否用于网页
 */
export function getKeywords(magicwords: MagicWord[], web?: false): Pick<ConfigData, 'img' | 'redirection'>;
export function getKeywords(
	magicwords: MagicWord[],
	web: true,
): Required<Pick<MwConfig, 'imageKeywords' | 'redirection'>>;
export function getKeywords(
	magicwords: MagicWord[],
	web?: boolean,
): Required<Pick<MwConfig, 'imageKeywords' | 'redirection'>> | Pick<ConfigData, 'img' | 'redirection'> {
	return {
		[(web ? 'imageKeywords' : 'img') as 'img']: Object.fromEntries(
			magicwords.filter(({name: n}) => n.startsWith('img_') && n !== 'img_lossy')
				.flatMap(({name: n, aliases}) => {
					const k = n.slice(4).replaceAll('_', '-');
					return (k === 'alt' ? aliases.filter(alias => alias.includes('$1')) : aliases)
						.map(alias => [alias, k]);
				}),
		),
		redirection: magicwords.find(({name: n}) => n === 'redirect')!.aliases.map(s => s.toLowerCase()),
	};
}
