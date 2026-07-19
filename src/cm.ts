import {StateEffect, StateField} from '@codemirror/state';
import {showTooltip, EditorView} from '@codemirror/view';
import type {TooltipView, Tooltip} from '@codemirror/view';
import type {Extension, EditorState, Facet} from '@codemirror/state';

declare interface SignatureHelp {
	signatures: unknown[];
}
declare interface SignatureEffect<T extends SignatureHelp> {
	signatureHelp?: T | undefined;
	class?: string | undefined;
	text: string;
	cursor: number;
}
declare interface SignatureHelpOptions<T extends SignatureHelp> {
	className?: Facet<string, string> | string | undefined;
	render(this: void, signatureHelp: T): string;
	update(
		this: void,
		view: EditorView,
		state: EditorState,
		effect: SignatureEffect<T>,
	): Promise<T | undefined> | T | undefined;
}

/**
 * 创建 TooltipView
 * @param view EditorView 实例
 * @param content 提示内容
 * @param className 提示样式类名
 * @param text 是否为纯文本
 */
export const createTooltipView = (view: EditorView, content: string, className = '', text?: boolean): TooltipView => {
	const inner = document.createElement('div'),
		dom = document.createElement('div');
	dom.style.font = getComputedStyle(view.contentDOM).font;
	if (className) {
		dom.className = className;
	}
	inner[text ? 'textContent' : 'innerHTML'] = content;
	dom.append(inner);
	return {dom};
};

/**
 * 创建 SignatureHelp 扩展
 * @param opts 设置
 * @param opts.render 渲染函数
 * @param opts.update 更新函数
 * @param opts.className 提示样式类名
 */
export const getSignatureHelpExtension = <T extends SignatureHelp>({
	render,
	update,
	className,
}: SignatureHelpOptions<T>): Extension => {
	const signatureEffect = StateEffect.define<SignatureEffect<T>>(),
		signatureField = StateField.define<SignatureEffect<T> | undefined>({
			create() {
				return undefined;
			},
			update(oldValue, {state: {doc, selection: {main: {head}}}, effects}) {
				const text = doc.toString();
				for (const effect of effects) {
					if (effect.is(signatureEffect)) {
						const {value} = effect;
						if (head === value.cursor && text === value.text) {
							return value;
						}
					}
				}
				return oldValue;
			},
			provide(f) {
				return showTooltip.from(f, (value): Tooltip | null => {
					if (!value) {
						return null;
					}
					const {cursor, signatureHelp, class: cls = className} = value;
					return signatureHelp?.signatures.length
						? {
							pos: cursor,
							above: true,
							create(view): TooltipView {
								return createTooltipView(view, render(signatureHelp), cls as string);
							},
						}
						: null;
				});
			},
		});

	const dispatchSignatureEffect = (view: EditorView, effect: SignatureEffect<T>): void => {
		view.dispatch({
			effects: signatureEffect.of(effect),
		});
	};

	return [
		signatureField,
		EditorView.updateListener.of(({view, state, docChanged, selectionSet}) => {
			if (docChanged || selectionSet && state.field(signatureField)?.signatureHelp?.signatures.length) {
				const {doc, selection: {main}} = state,
					effect: SignatureEffect<T> = {
						text: doc.toString(),
						cursor: main.head,
						class: typeof className === 'object' ? state.facet(className) : undefined,
					};
				if (!main.empty) {
					dispatchSignatureEffect(view, effect);
					return;
				}
				(async () => {
					effect.signatureHelp = await update(view, state, effect);
					dispatchSignatureEffect(view, effect);
				})();
			}
		}),
		EditorView.domEventHandlers({
			keydown({key}, view) {
				if (key === 'Escape') {
					const {doc, selection: {main: {head}}} = view.state;
					dispatchSignatureEffect(view, {text: doc.toString(), cursor: head});
				}
			},
		}),
	];
};
