import { LitElement } from 'lit';
import type { QhorusChannel } from './types.js';
import type { ChannelTree } from './channel-state-controller.js';
import '@casehubio/pages-ui-components';
export declare class ChannelNavElement extends LitElement {
    channels: QhorusChannel[];
    selectedChannelId?: string;
    layout: 'sidebar' | 'dropdown';
    channelTree?: ChannelTree;
    showCreate: boolean;
    showDelete: boolean;
    private _focusedIndex;
    private _expandedSpaces;
    private _spaceFilter;
    private _dropdownOpen;
    private _deleteTarget;
    private _showCreateDialog;
    private _contextMenu;
    private _renamingSpaceId;
    private _renameValue;
    private _showCreateSpaceDialog;
    private _showDeleteSpaceDialog;
    private _deleteSpaceTarget;
    private _createChannelInSpaceId;
    private _dragChannelId;
    private _dropTarget;
    static readonly styles: import("lit").CSSResult;
    private getChannelIcon;
    private handleChannelClick;
    private handleDeleteClick;
    private _onDeleteConfirm;
    private _onDeleteCancel;
    private handleCreateChannel;
    private _onCreateConfirm;
    private _onCreateCancel;
    private get _dropdownChannels();
    private _toggleDropdown;
    private _closeDropdown;
    private _selectDropdownItem;
    private _handleDropdownKeyDown;
    disconnectedCallback(): void;
    private handleKeyDown;
    private _seenSpaces;
    private _ensureExpanded;
    private _toggleSpace;
    private _showContextMenu;
    private _dismissContextMenu;
    private _startRename;
    private _commitRename;
    private _handleRenameKeyDown;
    private _handleCreateSpace;
    private _onCreateSpaceConfirm;
    private _handleDeleteSpace;
    private _onDeleteSpaceConfirm;
    private _handleCreateChannelInSpace;
    private _onDragStart;
    private _onDragEnd;
    private _onChannelDragOver;
    private _onSpaceHeaderDragOver;
    private _onDragLeave;
    private _onUngroupedAreaDragOver;
    private _getDragSourceIndex;
    private _onDrop;
    private _emitMoveChannel;
    private _renderContextMenu;
    private _renderChannelItem;
    private _renderSpaceGroup;
    private _onSpaceFilterChange;
    private _renderTree;
    private _buildTraversalList;
    private _handleTreeKeyDown;
    render(): unknown;
}
declare global {
    interface HTMLElementTagNameMap {
        'agency-channel-nav': ChannelNavElement;
    }
}
//# sourceMappingURL=channel-nav.d.ts.map