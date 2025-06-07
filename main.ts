import {
	Plugin,
	WorkspaceLeaf,
	ItemView,
} from 'obsidian';

const STACKED_SIDEBAR_VIEW_TYPE = 'stacked-sidebar-view';

export default class StackedSidebarPlugin extends Plugin {
	async onload() {
		this.registerView(
			STACKED_SIDEBAR_VIEW_TYPE,
			(leaf) => new StackedSidebarView(leaf)
		);

		this.addCommand({
			id: 'open-stacked-sidebar',
			name: 'Open Stacked Sidebar',
			callback: async () => {
				await this.app.workspace.ensureSideLeaf(STACKED_SIDEBAR_VIEW_TYPE, "left", { active: true });
			}
		});
	}
}

class StackedSidebarView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	override getViewType() {
		return STACKED_SIDEBAR_VIEW_TYPE;
	}

	override getDisplayText() {
		return 'Files (Stacked Sidebar)';
	}

	override getIcon() {
		return 'folder-tree';
	}

	// Now an array of objects with viewType and optional label
	private embeddedViews = [
		{ viewType: "file-explorer", label: undefined },
		{ viewType: "bookmarks", label: "Bookmarks" }
	];

	override async onOpen() {
		this.initialize();
	}

	async initialize() {
		const container = this.containerEl;
		container.empty();
		const wrapper = container.createDiv('stacked-sidebar-wrapper');
		const combinedBody = wrapper.createDiv('stacked-sidebar-body');
		const combinedFooter = wrapper.createDiv('stacked-sidebar-footer');

		let mainButtonsContainer: HTMLElement | null = null;

		for (const { viewType, label } of this.embeddedViews) {
			const shadowLeaf = await this.makeShadowLeaf(viewType);
			const shadowContainerEl = shadowLeaf.view.containerEl;
			shadowContainerEl.className = ""; // remove all formatting

			const header = shadowContainerEl.querySelector('.nav-header') as HTMLElement | null;
			const buttonsContainer = header?.querySelector('.nav-buttons-container') as HTMLElement | null;

			// Combine nav-buttons-containers into the header
			if (buttonsContainer) {
				if (!mainButtonsContainer) {
					mainButtonsContainer = buttonsContainer;
					combinedFooter.replaceWith(header!);
					combinedFooter.addClass("stacked-sidebar-footer");
				} else {
					// For subsequent views, add their buttons to the main container
					// while (buttonsContainer.firstChild) {
					// 	mainButtonsContainer.appendChild(buttonsContainer.firstChild);
					// }
					header?.remove();
				}
			}

			// Add section label if defined
			if (label) {
				const sectionLabel = document.createElement('div');
				sectionLabel.className = 'stacked-sidebar-section-label';
				sectionLabel.textContent = label;
				combinedBody.appendChild(sectionLabel);
			}

			// Add the full view content to the combined body
			combinedBody.appendChild(shadowContainerEl);
		}
	}

	override async onClose() {
		this.embeddedViews.forEach(({ viewType }) => {
			const shadowViewType = getShadowViewType(viewType)
			this.app.workspace.getLeavesOfType(shadowViewType).forEach(leaf => {
				leaf.detach()
			});
		});
	}

	async makeShadowLeaf(viewType: string): Promise<WorkspaceLeaf> {
		const leaf = this.app.workspace.getLeftLeaf(false)!;
		leaf.getDisplayText = () => "stacked-sidebar-helper";
		leaf.getIcon = () => "";

		await leaf.setViewState({ type: viewType });
		const shadowViewType = getShadowViewType(viewType);
		leaf.view.getViewType = () => shadowViewType;
		// If this shadow is closed, close the whole thing.
		leaf.view.onunload = () => this.leaf.detach();

		return leaf;
	}
}

const getShadowViewType = (viewType: string) => {
	return `shadow_${viewType}`;
}
