import type {EditorView, TooltipView} from '@codemirror/view';

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
