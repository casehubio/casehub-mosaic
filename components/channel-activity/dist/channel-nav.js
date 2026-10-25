var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { PagesConfirmDialog } from '@casehubio/pages-ui-components';
import { ChannelEventTopics } from './events.js';
import '@casehubio/pages-ui-components';
let ChannelNavElement = class ChannelNavElement extends LitElement {
    constructor() {
        super(...arguments);
        this.channels = [];
        this.layout = 'sidebar';
        this.showCreate = true;
        this.showDelete = true;
        this._focusedIndex = 0;
        this._expandedSpaces = new Set();
        this._spaceFilter = '';
        this._dropdownOpen = false;
        this._deleteTarget = null;
        this._showCreateDialog = false;
        this._contextMenu = null;
        this._renamingSpaceId = null;
        this._renameValue = '';
        this._showCreateSpaceDialog = false;
        this._showDeleteSpaceDialog = false;
        this._deleteSpaceTarget = null;
        this._createChannelInSpaceId = null;
        this._dragChannelId = null;
        this._dropTarget = null;
        this._closeDropdown = () => {
            this._dropdownOpen = false;
            document.removeEventListener('click', this._closeDropdown);
        };
        this._seenSpaces = new Set();
        this._dismissContextMenu = () => { this._contextMenu = null; };
    }
    static { this.styles = css `
    :host {
      display: block;
      padding: var(--pages-space-3, 12px);
      background: var(--pages-neutral-1, #ffffff);
      color: var(--pages-neutral-12, #1a1a1a);
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
    }
    .channel-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-1, 4px);
    }
    .channel-item {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-1, 4px);
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
    }
    .channel-item:hover { background: var(--pages-neutral-3, #f5f5f5); }
    .channel-item.selected { background: var(--pages-accent-3, #e0f2fe); }
    .channel-item.focused {
      outline: 2px solid var(--pages-accent-7, #818cf8);
      outline-offset: -2px;
    }
    .channel-icon {
      flex-shrink: 0;
      font-size: 14px;
      color: var(--pages-neutral-9, #999);
      margin-right: 2px;
    }
    .channel-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .delete-btn {
      flex-shrink: 0;
      background: transparent;
      border: none;
      color: var(--pages-neutral-8, #6b7280);
      cursor: pointer;
      padding: var(--pages-space-1, 4px);
      border-radius: var(--pages-radius-1, 4px);
      font-size: 14px;
      line-height: 1;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
    }
    .channel-item:hover .delete-btn { opacity: 1; }
    .delete-btn:hover {
      background: var(--pages-neutral-4, #e5e5e5);
      color: var(--pages-danger-1, #dc2626);
    }
    .create-channel-btn {
      margin-top: var(--pages-space-3, 12px);
      width: 100%;
      padding: var(--pages-space-2, 8px);
      background: var(--pages-accent-9, #0ea5e9);
      color: var(--pages-neutral-1, #fff);
      border: none;
      border-radius: var(--pages-radius-1, 4px);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .create-channel-btn:hover { background: var(--pages-accent-10, #0284c7); }
    pages-badge { flex-shrink: 0; }
    .space-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-1, 4px);
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
    }
    .space-header:hover { background: var(--pages-neutral-3, #f5f5f5); }
    .space-disclosure {
      flex-shrink: 0;
      font-size: 10px;
      color: var(--pages-neutral-9, #999);
      width: 12px;
      text-align: center;
    }
    .space-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .space-channels {
      list-style: none;
      margin: 0;
      padding: 0 0 0 var(--pages-space-4, 16px);
    }
    .ungrouped {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .space-filter {
      width: 100%;
      padding: var(--pages-space-2, 8px);
      margin-bottom: var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-1, 4px);
      background: var(--pages-neutral-1, #ffffff);
      color: var(--pages-neutral-12, #1a1a1a);
      font-size: 13px;
      cursor: pointer;
      box-sizing: border-box;
    }
    .space-filter:hover { border-color: var(--pages-neutral-7, #a3a3a3); }
    .dropdown-wrapper { position: relative; }
    .dropdown-trigger {
      width: 100%;
      padding: var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-1, 4px);
      background: var(--pages-neutral-1, #ffffff);
      color: var(--pages-neutral-12, #1a1a1a);
      font-size: 14px;
      cursor: pointer;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
    }
    .dropdown-trigger:hover { border-color: var(--pages-neutral-7, #a3a3a3); }
    .dropdown-arrow { font-size: 10px; color: var(--pages-neutral-8, #888); }
    .dropdown-panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 2px;
      background: var(--pages-neutral-1, #ffffff);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-1, 4px);
      box-shadow: var(--pages-shadow-3, 0 4px 12px rgba(0,0,0,0.1));
      z-index: 10;
      max-height: 200px;
      overflow-y: auto;
      list-style: none;
      margin-left: 0;
      padding: var(--pages-space-1, 4px);
    }
    .dropdown-option {
      padding: var(--pages-space-2, 8px);
      cursor: pointer;
      border-radius: var(--pages-radius-1, 4px);
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dropdown-option:hover { background: var(--pages-neutral-3, #f5f5f5); }
    .dropdown-option.selected { background: var(--pages-accent-3, #e0f2fe); }
    .dropdown-option.focused { outline: 2px solid var(--pages-accent-7, #818cf8); outline-offset: -2px; }
    .dropdown-count {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-8, #888);
    }
    .context-menu {
      position: fixed;
      background: var(--pages-neutral-1, #fff);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-1, 4px);
      box-shadow: var(--pages-shadow-3, 0 4px 12px rgba(0,0,0,0.1));
      z-index: 100;
      min-width: 180px;
      padding: var(--pages-space-1, 4px);
    }
    .context-menu-item {
      padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
      cursor: pointer;
      border-radius: var(--pages-radius-1, 4px);
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .context-menu-item:hover { background: var(--pages-neutral-3, #f5f5f5); }
    .context-menu-item.danger:hover { color: var(--pages-danger-1, #dc2626); }
    .context-menu-separator {
      height: 1px;
      background: var(--pages-neutral-4, #e5e5e5);
      margin: var(--pages-space-1, 4px) 0;
    }
    .channel-item[draggable="true"] { cursor: grab; }
    .channel-item.dragging { opacity: 0.4; }
    .drop-indicator {
      height: 2px;
      background: var(--pages-accent-9, #0ea5e9);
      margin: 0 var(--pages-space-2, 8px);
      border-radius: 1px;
    }
    .space-header.drop-target {
      background: var(--pages-accent-3, #e0f2fe);
      outline: 2px dashed var(--pages-accent-7, #818cf8);
      outline-offset: -2px;
    }
    .drop-placeholder {
      padding: var(--pages-space-3, 12px);
      text-align: center;
      font-size: 12px;
      color: var(--pages-neutral-8, #888);
      border: 2px dashed var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-1, 4px);
      list-style: none;
    }
    .submenu-trigger { position: relative; }
    .submenu-trigger .submenu { display: none; }
    .submenu-trigger:hover .submenu { display: block; }
    .submenu { position: absolute; left: 100%; top: 0; }
    .space-rename-input {
      flex: 1;
      font-weight: 600;
      font-size: 14px;
      border: 1px solid var(--pages-accent-7, #818cf8);
      border-radius: var(--pages-radius-1, 4px);
      padding: 2px 4px;
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #1a1a1a);
      outline: none;
    }
    .space-filter-row {
      display: flex;
      gap: var(--pages-space-1, 4px);
      align-items: center;
      margin-bottom: var(--pages-space-2, 8px);
    }
    .space-filter-row .space-filter { flex: 1; }
    .create-space-btn {
      width: 28px; height: 28px;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-1, 4px);
      background: var(--pages-neutral-1, #fff);
      cursor: pointer;
      font-size: 16px;
      color: var(--pages-neutral-9, #999);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .create-space-btn:hover {
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-12, #1a1a1a);
    }
  `; }
    getChannelIcon(_semantic) {
        return '#';
    }
    handleChannelClick(channelId) {
        emitPagesEvent(this, ChannelEventTopics.SELECT_CHANNEL, { channelId });
    }
    handleDeleteClick(event, channel) {
        event.stopPropagation();
        this._deleteTarget = channel;
    }
    _onDeleteConfirm() {
        if (this._deleteTarget) {
            emitPagesEvent(this, ChannelEventTopics.DELETE_CHANNEL, { channelId: this._deleteTarget.id });
        }
        this._deleteTarget = null;
    }
    _onDeleteCancel() {
        this._deleteTarget = null;
    }
    handleCreateChannel() {
        this._showCreateDialog = true;
    }
    _onCreateConfirm(e) {
        const name = e.detail?.reason?.trim();
        if (name) {
            const payload = { name };
            if (this._createChannelInSpaceId)
                payload.spaceId = this._createChannelInSpaceId;
            emitPagesEvent(this, ChannelEventTopics.CREATE_CHANNEL, payload);
        }
        this._showCreateDialog = false;
        this._createChannelInSpaceId = null;
    }
    _onCreateCancel() {
        this._showCreateDialog = false;
    }
    get _dropdownChannels() {
        return this.channelTree
            ? [...this.channelTree.ungrouped, ...this.channelTree.spaces.flatMap(s => s.channels)]
            : this.channels;
    }
    _toggleDropdown() {
        this._dropdownOpen = !this._dropdownOpen;
        if (this._dropdownOpen) {
            this._focusedIndex = Math.max(0, this._dropdownChannels.findIndex(c => c.id === this.selectedChannelId));
            document.addEventListener('click', this._closeDropdown);
        }
        else {
            document.removeEventListener('click', this._closeDropdown);
        }
    }
    _selectDropdownItem(channelId) {
        this._dropdownOpen = false;
        document.removeEventListener('click', this._closeDropdown);
        emitPagesEvent(this, ChannelEventTopics.SELECT_CHANNEL, { channelId });
    }
    _handleDropdownKeyDown(event) {
        const channels = this._dropdownChannels;
        if (channels.length === 0)
            return;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!this._dropdownOpen) {
                    this._toggleDropdown();
                    return;
                }
                this._focusedIndex = Math.min(this._focusedIndex + 1, channels.length - 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
                break;
            case 'Enter':
                event.preventDefault();
                if (this._dropdownOpen) {
                    const focused = channels[this._focusedIndex];
                    if (focused)
                        this._selectDropdownItem(focused.id);
                }
                else {
                    this._toggleDropdown();
                }
                break;
            case 'Escape':
                if (this._dropdownOpen) {
                    event.preventDefault();
                    this._closeDropdown();
                }
                break;
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this._closeDropdown);
    }
    handleKeyDown(event) {
        if (this.channels.length === 0)
            return;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this._focusedIndex = Math.min(this._focusedIndex + 1, this.channels.length - 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
                break;
            case 'Enter':
                event.preventDefault();
                const focused = this.channels[this._focusedIndex];
                if (focused) {
                    this.handleChannelClick(focused.id);
                }
                break;
        }
    }
    _ensureExpanded(tree) {
        for (const space of tree.spaces) {
            if (!this._seenSpaces.has(space.space.id)) {
                this._seenSpaces.add(space.space.id);
                this._expandedSpaces.add(space.space.id);
            }
            for (const child of space.children) {
                if (!this._seenSpaces.has(child.space.id)) {
                    this._seenSpaces.add(child.space.id);
                    this._expandedSpaces.add(child.space.id);
                }
            }
        }
    }
    _toggleSpace(spaceId) {
        const next = new Set(this._expandedSpaces);
        if (next.has(spaceId)) {
            next.delete(spaceId);
        }
        else {
            next.add(spaceId);
        }
        this._expandedSpaces = next;
    }
    _showContextMenu(e, type, target) {
        e.preventDefault();
        e.stopPropagation();
        const clampedX = Math.min(e.clientX, window.innerWidth - 200);
        const clampedY = Math.min(e.clientY, window.innerHeight - 200);
        this._contextMenu = { x: clampedX, y: clampedY, type, target };
        requestAnimationFrame(() => {
            document.addEventListener('click', this._dismissContextMenu, { once: true });
        });
    }
    _startRename(spaceId, currentName) {
        this._contextMenu = null;
        this._renamingSpaceId = spaceId;
        this._renameValue = currentName;
    }
    _commitRename() {
        if (this._renamingSpaceId && this._renameValue.trim()) {
            emitPagesEvent(this, ChannelEventTopics.RENAME_SPACE, {
                spaceId: this._renamingSpaceId, newName: this._renameValue.trim(),
            });
        }
        this._renamingSpaceId = null;
    }
    _handleRenameKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this._commitRename();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            this._renamingSpaceId = null;
        }
    }
    _handleCreateSpace() { this._showCreateSpaceDialog = true; }
    _onCreateSpaceConfirm(e) {
        const name = e.detail?.reason?.trim();
        if (name)
            emitPagesEvent(this, ChannelEventTopics.CREATE_SPACE, { name });
        this._showCreateSpaceDialog = false;
    }
    _handleDeleteSpace(node) {
        this._contextMenu = null;
        this._deleteSpaceTarget = node;
        this._showDeleteSpaceDialog = true;
    }
    _onDeleteSpaceConfirm() {
        if (this._deleteSpaceTarget) {
            emitPagesEvent(this, ChannelEventTopics.DELETE_SPACE, { spaceId: this._deleteSpaceTarget.space.id });
        }
        this._deleteSpaceTarget = null;
        this._showDeleteSpaceDialog = false;
    }
    _handleCreateChannelInSpace(spaceId) {
        this._contextMenu = null;
        this._createChannelInSpaceId = spaceId;
        this._showCreateDialog = true;
    }
    _onDragStart(e, channel) {
        this._dragChannelId = channel.id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', channel.id);
    }
    _onDragEnd() {
        this._dragChannelId = null;
        this._dropTarget = null;
    }
    _onChannelDragOver(e, spaceId, index) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        let position = e.clientY < midY ? index : index + 1;
        if (this._dragChannelId) {
            const sourceIndex = this._getDragSourceIndex(spaceId);
            if (sourceIndex !== -1 && sourceIndex < position) {
                position--;
            }
        }
        this._dropTarget = { spaceId, position };
    }
    _onSpaceHeaderDragOver(e, spaceId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this._dropTarget = { spaceId, position: -1 };
    }
    _onDragLeave(e) {
        const related = e.relatedTarget;
        if (!related || !e.currentTarget.contains(related)) {
            this._dropTarget = null;
        }
    }
    _onUngroupedAreaDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this._dropTarget = { spaceId: null, position: 0 };
    }
    _getDragSourceIndex(spaceId) {
        if (!this._dragChannelId || !this.channelTree)
            return -1;
        if (!spaceId) {
            return this.channelTree.ungrouped.findIndex(ch => ch.id === this._dragChannelId);
        }
        const findSpace = (nodes) => {
            for (const n of nodes) {
                if (n.space.id === spaceId)
                    return n;
                const child = findSpace(n.children);
                if (child)
                    return child;
            }
            return undefined;
        };
        const node = findSpace(this.channelTree.spaces);
        return node?.channels.findIndex(ch => ch.id === this._dragChannelId) ?? -1;
    }
    _onDrop(e) {
        e.preventDefault();
        if (!this._dragChannelId || !this._dropTarget)
            return;
        const { spaceId, position } = this._dropTarget;
        const pos = position === -1 ? undefined : position;
        emitPagesEvent(this, ChannelEventTopics.MOVE_CHANNEL_TO_SPACE, {
            channelId: this._dragChannelId, spaceId, position: pos,
        });
        this._dragChannelId = null;
        this._dropTarget = null;
    }
    _emitMoveChannel(channelId, spaceId) {
        emitPagesEvent(this, ChannelEventTopics.MOVE_CHANNEL_TO_SPACE, { channelId, spaceId });
    }
    _renderContextMenu() {
        if (!this._contextMenu)
            return nothing;
        const { x, y, type, target } = this._contextMenu;
        if (type === 'space') {
            const node = target;
            return html `
        <div class="context-menu" style="left:${x}px;top:${y}px" @click="${(e) => e.stopPropagation()}">
          <div class="context-menu-item" @click="${() => this._startRename(node.space.id, node.space.name)}">Rename</div>
          <div class="context-menu-item danger" @click="${() => this._handleDeleteSpace(node)}">Delete</div>
          <div class="context-menu-separator"></div>
          <div class="context-menu-item" @click="${() => this._handleCreateChannelInSpace(node.space.id)}">Create Channel Here</div>
        </div>`;
        }
        if (type === 'channel') {
            const channel = target;
            const spaces = this.channelTree?.spaces ?? [];
            return html `
        <div class="context-menu" style="left:${x}px;top:${y}px" @click="${(e) => e.stopPropagation()}">
          <div class="context-menu-item submenu-trigger">
            Move to Space ▸
            <div class="context-menu submenu">
              ${spaces.filter(s => s.space.id !== channel.spaceId).map(s => html `
                <div class="context-menu-item" @click="${() => { this._contextMenu = null; this._emitMoveChannel(channel.id, s.space.id); }}">${s.space.name}</div>
              `)}
              ${channel.spaceId ? html `
                <div class="context-menu-separator"></div>
                <div class="context-menu-item" @click="${() => { this._contextMenu = null; this._emitMoveChannel(channel.id, null); }}">No Space</div>
              ` : nothing}
            </div>
          </div>
        </div>`;
        }
        return nothing;
    }
    _renderChannelItem(channel, spaceId = null, index = 0) {
        const isDropBefore = this._dropTarget?.spaceId === spaceId && this._dropTarget?.position === index;
        const isDropAfter = this._dropTarget?.spaceId === spaceId && this._dropTarget?.position === index + 1;
        return html `
      ${isDropBefore ? html `<li class="drop-indicator"></li>` : nothing}
      <li class="channel-item ${this.selectedChannelId === channel.id ? 'selected' : ''} ${this._dragChannelId === channel.id ? 'dragging' : ''}"
          role="option"
          draggable="true"
          aria-selected="${this.selectedChannelId === channel.id}"
          @click="${() => this.handleChannelClick(channel.id)}"
          @contextmenu="${(e) => this._showContextMenu(e, 'channel', channel)}"
          @dragstart="${(e) => this._onDragStart(e, channel)}"
          @dragend="${this._onDragEnd}"
          @dragover="${(e) => this._onChannelDragOver(e, spaceId, index)}"
          @drop="${this._onDrop}">
        <span class="channel-icon">${this.getChannelIcon(channel.semantic)}</span>
        <span class="channel-name">${channel.name}</span>
        ${channel.unreadCount ? html `<pages-badge variant="neutral" size="sm" label="${channel.unreadCount}"></pages-badge>` : nothing}
        ${this.showDelete ? html `
          <pages-button variant="ghost" size="sm" class="delete-btn"
            aria-label="Delete channel ${channel.name}"
            @click="${(e) => this.handleDeleteClick(e, channel)}">✕</pages-button>
        ` : nothing}
      </li>
      ${isDropAfter ? html `<li class="drop-indicator"></li>` : nothing}
    `;
    }
    _renderSpaceGroup(node) {
        const expanded = this._expandedSpaces.has(node.space.id);
        const renaming = this._renamingSpaceId === node.space.id;
        return html `
      <div class="space-group">
        <div class="space-header ${this._dropTarget?.spaceId === node.space.id && this._dropTarget?.position === -1 ? 'drop-target' : ''}"
             @click="${renaming ? nothing : () => this._toggleSpace(node.space.id)}"
             @contextmenu="${(e) => this._showContextMenu(e, 'space', node)}"
             @dragover="${(e) => this._onSpaceHeaderDragOver(e, node.space.id)}"
             @drop="${this._onDrop}"
             @dragleave="${this._onDragLeave}"
             role="button" aria-expanded="${expanded}">
          <span class="space-disclosure">${expanded ? '▾' : '▸'}</span>
          ${renaming ? html `
            <input class="space-rename-input" type="text"
              .value="${this._renameValue}"
              @input="${(e) => { this._renameValue = e.target.value; }}"
              @keydown="${this._handleRenameKeyDown}"
              @blur="${this._commitRename}">
          ` : html `<span class="space-name">${node.space.name}</span>`}
          ${!renaming && node.unreadCount ? html `<pages-badge variant="neutral" size="sm" label="${node.unreadCount}"></pages-badge>` : nothing}
        </div>
        ${expanded ? html `
          <ul class="space-channels">
            ${node.channels.map((ch, i) => this._renderChannelItem(ch, node.space.id, i))}
          </ul>
          ${node.children.map(child => this._renderSpaceGroup(child))}
        ` : nothing}
      </div>
    `;
    }
    _onSpaceFilterChange(e) {
        this._spaceFilter = e.target.value;
    }
    _renderTree() {
        const tree = this.channelTree;
        this._ensureExpanded(tree);
        const filteredSpaces = this._spaceFilter
            ? tree.spaces.filter(s => s.space.id === this._spaceFilter)
            : tree.spaces;
        return html `
      <div class="space-filter-row">
        <select class="space-filter" @change="${this._onSpaceFilterChange}" .value="${this._spaceFilter}">
          <option value="">All Spaces</option>
          ${tree.spaces.map(s => html `<option value="${s.space.id}">${s.space.name}</option>`)}
        </select>
        ${this.showCreate ? html `
          <button class="create-space-btn" @click="${this._handleCreateSpace}" title="Create Space" aria-label="Create Space">+</button>
        ` : nothing}
      </div>
      <div class="channel-list" role="tree" tabindex="0" @keydown="${this._handleTreeKeyDown}">
        ${!this._spaceFilter && (tree.ungrouped.length > 0 || this._dragChannelId) ? html `
          <ul class="ungrouped">
            ${tree.ungrouped.map((ch, i) => this._renderChannelItem(ch, null, i))}
            ${tree.ungrouped.length === 0 && this._dragChannelId ? html `
              <li class="drop-placeholder"
                  @dragover="${this._onUngroupedAreaDragOver}"
                  @drop="${this._onDrop}"
                  @dragleave="${this._onDragLeave}">
                Drop here to remove from space
              </li>
            ` : nothing}
          </ul>
        ` : nothing}
        ${filteredSpaces.map(node => this._renderSpaceGroup(node))}
      </div>
      ${this.showCreate ? html `
        <pages-button class="create-channel-btn" variant="ghost" size="sm" @click="${this.handleCreateChannel}">
          Create Channel
        </pages-button>
      ` : nothing}
      <pages-confirm-dialog class="delete-dialog"
        .open=${!!this._deleteTarget}
        heading="Delete Channel"
        message=${this._deleteTarget ? `Delete channel "${this._deleteTarget.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        @confirm=${this._onDeleteConfirm}
        @cancel=${this._onDeleteCancel}
      ></pages-confirm-dialog>
      <pages-confirm-dialog class="create-dialog"
        .open=${this._showCreateDialog}
        heading="Create Channel"
        message="Enter a name for the new channel."
        confirmLabel="Create"
        confirmVariant="success"
        .showReason=${true}
        @confirm=${this._onCreateConfirm}
        @cancel=${this._onCreateCancel}
      ></pages-confirm-dialog>
      <pages-confirm-dialog class="create-space-dialog"
        .open=${this._showCreateSpaceDialog}
        heading="Create Space"
        message="Enter a name for the new space."
        confirmLabel="Create"
        confirmVariant="success"
        .showReason=${true}
        @confirm=${this._onCreateSpaceConfirm}
        @cancel=${() => { this._showCreateSpaceDialog = false; }}
      ></pages-confirm-dialog>
      <pages-confirm-dialog class="delete-space-dialog"
        .open=${this._showDeleteSpaceDialog}
        heading="Delete Space"
        message=${this._deleteSpaceTarget
            ? `Delete space "${this._deleteSpaceTarget.space.name}"? Its ${this._deleteSpaceTarget.channels.length} channel(s) will move to the top level.`
            : ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        @confirm=${this._onDeleteSpaceConfirm}
        @cancel=${() => { this._deleteSpaceTarget = null; this._showDeleteSpaceDialog = false; }}
      ></pages-confirm-dialog>
      ${this._renderContextMenu()}
    `;
    }
    _buildTraversalList() {
        if (!this.channelTree)
            return [];
        const items = [];
        for (const ch of this.channelTree.ungrouped) {
            items.push({ type: 'channel', channel: ch });
        }
        const addSpace = (node) => {
            items.push({ type: 'header', spaceId: node.space.id });
            if (this._expandedSpaces.has(node.space.id)) {
                for (const ch of node.channels)
                    items.push({ type: 'channel', channel: ch });
                for (const child of node.children)
                    addSpace(child);
            }
        };
        for (const space of this.channelTree.spaces)
            addSpace(space);
        return items;
    }
    _handleTreeKeyDown(event) {
        const items = this._buildTraversalList();
        if (items.length === 0)
            return;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this._focusedIndex = Math.min(this._focusedIndex + 1, items.length - 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
                break;
            case 'Enter':
            case ' ': {
                event.preventDefault();
                const item = items[this._focusedIndex];
                if (item?.type === 'channel')
                    this.handleChannelClick(item.channel.id);
                else if (item?.type === 'header')
                    this._toggleSpace(item.spaceId);
                break;
            }
        }
    }
    render() {
        if (this.layout === 'dropdown') {
            const channels = this._dropdownChannels;
            const selected = channels.find(c => c.id === this.selectedChannelId) ?? channels[0];
            const selectedCount = selected?.unreadCount;
            const triggerLabel = selected
                ? (selectedCount ? `${selected.name} (${selectedCount})` : selected.name)
                : '';
            return html `
        <div class="dropdown-wrapper" @click=${(e) => e.stopPropagation()}>
          <pages-button class="dropdown-trigger" variant="ghost"
                  role="combobox"
                  aria-expanded=${this._dropdownOpen}
                  aria-haspopup="listbox"
                  @click=${() => this._toggleDropdown()}
                  @keydown=${this._handleDropdownKeyDown}>
            <span>${triggerLabel}</span>
            <span class="dropdown-arrow">${this._dropdownOpen ? '▲' : '▼'}</span>
          </pages-button>
          ${this._dropdownOpen ? html `
            <ul class="dropdown-panel" role="listbox">
              ${channels.map((channel, index) => {
                const count = channel.unreadCount;
                return html `
                  <li class="dropdown-option ${channel.id === this.selectedChannelId ? 'selected' : ''} ${index === this._focusedIndex ? 'focused' : ''}"
                      role="option"
                      aria-selected=${channel.id === this.selectedChannelId}
                      @click=${() => this._selectDropdownItem(channel.id)}>
                    <span>${channel.name}</span>
                    ${count ? html `<span class="dropdown-count">${count}</span>` : nothing}
                  </li>
                `;
            })}
            </ul>
          ` : nothing}
        </div>
      `;
        }
        if (this.channelTree) {
            return this._renderTree();
        }
        return html `
      <ul class="channel-list" role="list" tabindex="0" @keydown="${this.handleKeyDown}">
        ${this.channels.map((channel, index) => html `
            <li
              class="channel-item ${this.selectedChannelId === channel.id ? 'selected' : ''} ${index === this._focusedIndex ? 'focused' : ''}"
              role="option"
              aria-selected="${this.selectedChannelId === channel.id}"
              @click="${() => this.handleChannelClick(channel.id)}"
            >
              <span class="channel-icon">${this.getChannelIcon(channel.semantic)}</span>
              <span class="channel-name">${channel.name}</span>
              ${channel.unreadCount ? html `<pages-badge variant="neutral" size="sm" label="${channel.unreadCount}"></pages-badge>` : nothing}
              ${this.showDelete ? html `
                <pages-button variant="ghost" size="sm"
                  class="delete-btn"
                  aria-label="Delete channel ${channel.name}"
                  @click="${(e) => this.handleDeleteClick(e, channel)}"
                >
                  ✕
                </pages-button>
              ` : nothing}
            </li>
          `)}
      </ul>
      ${this.showCreate ? html `
        <pages-button class="create-channel-btn" variant="ghost" size="sm" @click="${this.handleCreateChannel}">
          Create Channel
        </pages-button>
      ` : nothing}
      <pages-confirm-dialog class="delete-dialog"
        .open=${!!this._deleteTarget}
        heading="Delete Channel"
        message=${this._deleteTarget ? `Delete channel "${this._deleteTarget.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        @confirm=${this._onDeleteConfirm}
        @cancel=${this._onDeleteCancel}
      ></pages-confirm-dialog>
      <pages-confirm-dialog class="create-dialog"
        .open=${this._showCreateDialog}
        heading="Create Channel"
        message="Enter a name for the new channel."
        confirmLabel="Create"
        confirmVariant="success"
        .showReason=${true}
        @confirm=${this._onCreateConfirm}
        @cancel=${this._onCreateCancel}
      ></pages-confirm-dialog>
    `;
    }
};
__decorate([
    property({ type: Array })
], ChannelNavElement.prototype, "channels", void 0);
__decorate([
    property({ type: String })
], ChannelNavElement.prototype, "selectedChannelId", void 0);
__decorate([
    property({ type: String })
], ChannelNavElement.prototype, "layout", void 0);
__decorate([
    property({ type: Object })
], ChannelNavElement.prototype, "channelTree", void 0);
__decorate([
    property({ type: Boolean })
], ChannelNavElement.prototype, "showCreate", void 0);
__decorate([
    property({ type: Boolean })
], ChannelNavElement.prototype, "showDelete", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_focusedIndex", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_expandedSpaces", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_spaceFilter", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_dropdownOpen", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_deleteTarget", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_showCreateDialog", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_contextMenu", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_renamingSpaceId", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_renameValue", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_showCreateSpaceDialog", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_showDeleteSpaceDialog", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_deleteSpaceTarget", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_createChannelInSpaceId", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_dragChannelId", void 0);
__decorate([
    state()
], ChannelNavElement.prototype, "_dropTarget", void 0);
ChannelNavElement = __decorate([
    customElement('agency-channel-nav')
], ChannelNavElement);
export { ChannelNavElement };
//# sourceMappingURL=channel-nav.js.map