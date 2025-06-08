import {
	Plugin,
	WorkspaceLeaf,
} from 'obsidian';

export default class FileExplorerBookmarks extends Plugin {
	override async onload() {
		this.addCommand({
			id: 'patch-file-explorer',
			name: 'Patch File Explorer',
			callback: () => {
				this.patchFileExplorer();
			}
		});

		// Wait for workspace to be fully loaded before patching
		if (this.app.workspace.layoutReady) {
			await this.patchFileExplorer();
		} else {
			this.app.workspace.onLayoutReady(() => {
				this.patchFileExplorer();
			});
		}
	}

	override onunload(): void {
		this.detachLeavesOfType(getShadowViewType("bookmarks"));
	}

	/**
	 * This method monkey patches the file explorer leaf to include content from the bookmarks leaf.
	 * In practice, this is accomplished by first creating a "shadow leaf" which renders the bookmarks
	 * content. Then, the HTML elements from this leaf are moved and injected into the file explorer
	 * leaf. The elements cannot simply be cloned, as they will no longer be interactive. There is
	 * surely a way to accomplish this without the shadow leaf, but this approach is robust in its hackiness.
	 */
	async patchFileExplorer() {
		// Clean up any existing shadow leaves
		this.detachLeavesOfType(getShadowViewType("bookmarks"));

		// Recreate the file explorer leaf
		this.detachLeavesOfType("file-explorer");
		const fileExplorerLeaf = await this.app.workspace.ensureSideLeaf("file-explorer", "left");

		// Create the bookmarks shadow leaf
		const bookmarksShadowLeaf = await this.makeShadowLeaf("bookmarks");
		const bookmarksContent = bookmarksShadowLeaf.view.containerEl.children[2];
		const shadowLeafDiv = bookmarksShadowLeaf.view.containerEl
			.createDiv("file-explorer-bookmarks-shadow-leaf-disclaimer");
		shadowLeafDiv.appendText(
			"This is a shadow leaf created by the File Explorer Bookmarks plugin - please ignore it!"
		);
		// File explorer will become nonfunctional if shadow leaf is detached, so best to close it
		bookmarksShadowLeaf.view.onunload = () => this.detachLeavesOfType("file-explorer");

		// Append the bookmarks content to the end of the file explorer content
		const fileExplorerContent = fileExplorerLeaf.view.containerEl.children[1];
		fileExplorerContent.createDiv("file-explorer-bookmarks-separator");
		// Remove existing styling from the bookmarks content
		bookmarksContent.className = "";
		fileExplorerContent.append(bookmarksContent);
	}

	async makeShadowLeaf(viewType: string): Promise<WorkspaceLeaf> {
		const leaf = this.app.workspace.getLeftLeaf(false)!;
		leaf.getDisplayText = () => "";
		leaf.getIcon = () => "";

		await leaf.setViewState({ type: viewType });
		const shadowViewType = getShadowViewType(viewType);
		leaf.view.getViewType = () => shadowViewType;

		return leaf;
	}

	detachLeavesOfType(viewType: string) {
		this.app.workspace.getLeavesOfType(viewType)
			.forEach(leaf => leaf.detach());
	}
}

const getShadowViewType = (viewType: string) => {
	return `shadow_${viewType}`;
}
