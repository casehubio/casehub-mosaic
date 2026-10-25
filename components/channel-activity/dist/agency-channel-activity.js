var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AgencyChannelActivityElement_1;
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LiveRegionMixin, KeyboardShortcutMixin } from '@casehubio/pages-primitives/a11y';
import { onPagesEvent } from '@casehubio/pages-data';
import { ChannelStateController } from './channel-state-controller.js';
import { MessagingController } from './messaging-controller.js';
import { MembershipController } from './membership-controller.js';
import { ReactionController } from './reaction-controller.js';
import { CommitmentController } from './commitment-controller.js';
import { ChannelEventTopics } from './events.js';
import './channel-feed.js';
import './channel-nav.js';
import './channel-input.js';
import './channel-topic-bar.js';
import '@casehubio/pages-ui-components/split-workbench';
const Base = KeyboardShortcutMixin(LiveRegionMixin(LitElement));
let AgencyChannelActivityElement = class AgencyChannelActivityElement extends Base {
    constructor() {
        super(...arguments);
        this.selectionTopic = 'channel';
        this.channelNavLayout = 'sidebar';
        this.sidebarOpen = false;
        this.channels = [];
        this.messages = [];
        this.members = [];
        this.presence = [];
        this.reactions = [];
        this.commitments = new Map();
        this.topics = [];
        this.autoScroll = true;
        this.staleCursorMinutes = 30;
        this.terminalDimming = true;
        this.eventStyling = true;
        this.viewMode = 'flat';
        this.messageHighlights = {};
        this.showTypeSelector = false;
        this.showTopicSelector = false;
        this.showCreate = true;
        this.showDelete = true;
        this._selectedChannelId = '';
        this._selectedTopicId = null;
        this._activeSidebarTab = 'members';
        this._unsubs = [];
        this._sidebarPanels = new Map();
        this._handleKeydown = (e) => {
            if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const target = e.target;
                if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')
                    return;
                e.preventDefault();
                this.sidebarOpen = !this.sidebarOpen;
                this.announce(this.sidebarOpen ? 'Sidebar opened' : 'Sidebar closed');
            }
            if (e.key === 'Escape') {
                if (this.sidebarOpen) {
                    this.sidebarOpen = false;
                    this.announce('Sidebar closed');
                }
            }
        };
    }
    static { AgencyChannelActivityElement_1 = this; }
    connectedCallback() {
        super.connectedCallback();
        this.setAttribute('role', 'region');
        this.setAttribute('aria-label', 'Channel activity');
        this.addEventListener('keydown', this._handleKeydown);
    }
    disconnectedCallback() {
        this.removeEventListener('keydown', this._handleKeydown);
        this._teardownControllers();
        super.disconnectedCallback();
    }
    updated(changed) {
        super.updated(changed);
        if (changed.has('pushController') || changed.has('messagingConfig') || changed.has('reactionConfig')) {
            this._teardownControllers();
            this._setupControllers();
        }
    }
    configure(props) {
        Object.assign(this, props);
        this.requestUpdate();
    }
    get _navChannels() {
        return this._channels?.channels ?? this.channels;
    }
    get _navChannelTree() {
        return this._channels?.channelTree ?? this.channelTree;
    }
    get _feedMessages() {
        return this._channels?.messages ?? this.messages;
    }
    get _feedReactions() {
        return this._reactions?.filteredReactions() ?? this.reactions;
    }
    get _feedTopics() {
        return this._channels?.topics ?? this.topics;
    }
    _setupControllers() {
        const push = this.pushController;
        if (!push)
            return;
        this._channels = new ChannelStateController(this, push);
        this._membership = new MembershipController(this, push, this._channels);
        this._commitmentCtrl = new CommitmentController(this, push, this._channels);
        if (this.messagingConfig) {
            this._messaging = new MessagingController(this, this._channels, this.messagingConfig);
        }
        if (this.reactionConfig) {
            this._reactions = new ReactionController(this, push, this._channels, this.reactionConfig);
        }
        this._wireEventRouting();
    }
    _teardownControllers() {
        for (const unsub of this._unsubs)
            unsub();
        this._unsubs = [];
        this._channels = undefined;
        this._messaging = undefined;
        this._membership = undefined;
        this._reactions = undefined;
        this._commitmentCtrl = undefined;
    }
    _wireEventRouting() {
        if (this._channels) {
            this._unsubs.push(onPagesEvent(document, ChannelEventTopics.SELECT_CHANNEL, (p) => {
                this._channels.handleEvent(ChannelEventTopics.SELECT_CHANNEL, p);
                this._selectedChannelId = p.channelId;
                this._selectedChannelName = this._channels.channels.find((c) => c.id === p.channelId)?.name;
                this._selectedTopicId = null;
                this._replyTo = undefined;
                this.announce(`Switched to ${this._selectedChannelName ?? p.channelId}`);
            }), onPagesEvent(document, ChannelEventTopics.SELECT_TOPIC, (p) => {
                this._channels.handleEvent(ChannelEventTopics.SELECT_TOPIC, p);
                this._selectedTopicId = p.topicId;
            }), onPagesEvent(document, ChannelEventTopics.VIEW_MODE, (p) => {
                this._channels.handleEvent(ChannelEventTopics.VIEW_MODE, p);
                this.viewMode = p.mode;
            }), onPagesEvent(document, ChannelEventTopics.CREATE_CHANNEL, p => this._channels.handleEvent(ChannelEventTopics.CREATE_CHANNEL, p)), onPagesEvent(document, ChannelEventTopics.DELETE_CHANNEL, p => this._channels.handleEvent(ChannelEventTopics.DELETE_CHANNEL, p)));
        }
        if (this._messaging) {
            this._unsubs.push(onPagesEvent(document, ChannelEventTopics.SEND_MESSAGE, p => this._messaging.handleEvent(ChannelEventTopics.SEND_MESSAGE, p)), onPagesEvent(document, ChannelEventTopics.MESSAGE_SELECTED, (p) => {
                this._messaging.handleEvent(ChannelEventTopics.MESSAGE_SELECTED, p);
                this._replyTo = this._messaging.replyTo;
                this.selectedMessageId = p.message.id;
            }), onPagesEvent(document, ChannelEventTopics.CURSOR_CATCHUP, (p) => {
                this._messaging.handleEvent(ChannelEventTopics.CURSOR_CATCHUP, p);
                this.announce('Catching up on messages');
            }), onPagesEvent(document, ChannelEventTopics.CURSOR_RELOAD, (p) => {
                this._messaging.handleEvent(ChannelEventTopics.CURSOR_RELOAD, p);
                this.announce('Reloading messages');
            }), onPagesEvent(document, ChannelEventTopics.CREATE_TOPIC, p => this._messaging.handleEvent(ChannelEventTopics.CREATE_TOPIC, p)), onPagesEvent(document, ChannelEventTopics.RESOLVE_TOPIC, p => this._messaging.handleEvent(ChannelEventTopics.RESOLVE_TOPIC, p)), onPagesEvent(document, ChannelEventTopics.REOPEN_TOPIC, p => this._messaging.handleEvent(ChannelEventTopics.REOPEN_TOPIC, p)), onPagesEvent(document, ChannelEventTopics.ARCHIVE_TOPIC, p => this._messaging.handleEvent(ChannelEventTopics.ARCHIVE_TOPIC, p)), onPagesEvent(document, ChannelEventTopics.RENAME_TOPIC, p => this._messaging.handleEvent(ChannelEventTopics.RENAME_TOPIC, p)), onPagesEvent(document, ChannelEventTopics.MERGE_TOPIC, p => this._messaging.handleEvent(ChannelEventTopics.MERGE_TOPIC, p)));
        }
        if (this._reactions) {
            this._unsubs.push(onPagesEvent(document, ChannelEventTopics.REACT, p => this._reactions.handleEvent(ChannelEventTopics.REACT, p)), onPagesEvent(document, ChannelEventTopics.UNREACT, p => this._reactions.handleEvent(ChannelEventTopics.UNREACT, p)));
        }
        if (this._commitmentCtrl) {
            this._unsubs.push(onPagesEvent(document, ChannelEventTopics.MESSAGE_SELECTED, p => this._commitmentCtrl.handleEvent(ChannelEventTopics.MESSAGE_SELECTED, p)));
        }
        this._unsubs.push(onPagesEvent(document, ChannelEventTopics.ARTEFACT_SELECTED, (p) => {
            this._selectedArtefactRef = p;
        }));
    }
    static { this.SIDEBAR_TABS = [
        { id: 'members', label: 'Members', tagName: 'agency-channel-member-panel' },
        { id: 'tasks', label: 'Tasks', tagName: 'agency-channel-task-panel' },
        { id: 'artifacts', label: 'Artifacts', tagName: 'agency-channel-artifact-panel' },
        { id: 'links', label: 'Links', tagName: 'agency-channel-correlation-panel' },
    ]; }
    _renderSidebar() {
        return html `
      <div class="sidebar" id="sidebar" ?hidden=${!this.sidebarOpen}>
        <div class="sidebar-tabs" role="tablist" aria-label="Panel tabs">
          ${AgencyChannelActivityElement_1.SIDEBAR_TABS.map(tab => html `
            <button class="sidebar-tab" role="tab"
              aria-selected=${this._activeSidebarTab === tab.id}
              aria-controls="sidebar-panel-${tab.id}"
              @click=${() => { this._activeSidebarTab = tab.id; this.announce(`${tab.label} tab`); }}>
              ${tab.label}
            </button>
          `)}
        </div>
        <div class="sidebar-content" role="tabpanel"
          id="sidebar-panel-${this._activeSidebarTab}">
          ${this._renderSidebarPanel()}
        </div>
      </div>
    `;
    }
    _renderSidebarPanel() {
        const tab = AgencyChannelActivityElement_1.SIDEBAR_TABS.find(t => t.id === this._activeSidebarTab);
        if (!tab)
            return html ``;
        let panel = this._sidebarPanels.get(tab.id);
        if (!panel) {
            panel = document.createElement(tab.tagName);
            this._sidebarPanels.set(tab.id, panel);
        }
        this._wireSidebarPanel(tab.id, panel);
        return html `${panel}`;
    }
    _wireSidebarPanel(tabId, panel) {
        const p = panel;
        switch (tabId) {
            case 'members':
                p.members = this._membership?.filteredMembers() ?? this.members;
                p.presence = this._membership?.presence ?? this.presence;
                break;
            case 'tasks':
            case 'links':
                p.messages = this._feedMessages;
                p.commitments = this._commitmentCtrl?.commitments ?? this.commitments;
                p.selectedMessageId = this.selectedMessageId;
                break;
            case 'artifacts':
                p.selectedArtefactRef = this._selectedArtefactRef;
                p.resolveArtifact = this.resolveArtifact;
                break;
        }
    }
    static { this.styles = css `
    :host { display: flex; flex-direction: column; height: 100%; }
    .detail-area { display: flex; height: 100%; }
    .main-column { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .sidebar { width: 280px; border-left: 1px solid var(--pages-neutral-4, #e0e0e0); display: flex; flex-direction: column; }
    .sidebar[hidden] { display: none; }
    .sidebar-tabs { display: flex; border-bottom: 1px solid var(--pages-neutral-4, #e0e0e0); }
    .sidebar-tab { flex: 1; padding: 8px 4px; text-align: center; cursor: pointer; background: none; border: none; font-size: 12px; color: var(--pages-neutral-11, #555); }
    .sidebar-tab[aria-selected="true"] { color: var(--pages-accent-color, #1a73e8); border-bottom: 2px solid var(--pages-accent-color, #1a73e8); }
    .sidebar-content { flex: 1; overflow-y: auto; }
    .toggle-btn { padding: 4px 8px; border-radius: 4px; border: 1px solid var(--pages-neutral-5, #ccc); background: var(--pages-surface-color, #fff); cursor: pointer; font-size: 12px; color: var(--pages-neutral-12, #333); }
  `; }
    render() {
        return html `
      <pages-split-workbench selection-topic=${this.selectionTopic}>
        <span slot="header">
          <button class="toggle-btn"
            aria-expanded=${this.sidebarOpen}
            aria-controls="sidebar"
            @click=${() => { this.sidebarOpen = !this.sidebarOpen; this.announce(this.sidebarOpen ? 'Sidebar opened' : 'Sidebar closed'); }}>
            ☰ Panels
          </button>
        </span>
        <agency-channel-nav slot="list"
          .channels=${this._navChannels}
          .channelTree=${this._navChannelTree}
          .layout=${this.channelNavLayout}
          .selectedChannelId=${this._selectedChannelId}
          .showCreate=${this.showCreate}
          .showDelete=${this.showDelete}>
        </agency-channel-nav>
        <div slot="detail" class="detail-area">
          <div class="main-column">
            <agency-channel-topic-bar
              .topics=${this._feedTopics}
              .selectedTopicId=${this._selectedTopicId}
              .viewMode=${this.viewMode}>
            </agency-channel-topic-bar>
            <agency-channel-feed
              .messages=${this._feedMessages}
              .reactions=${this._feedReactions}
              .channelId=${this._selectedChannelId}
              .channelName=${this._selectedChannelName}
              .currentActorId=${this.currentActorId}
              .autoScroll=${this.autoScroll}
              .staleCursorMinutes=${this.staleCursorMinutes}
              .terminalDimming=${this.terminalDimming}
              .eventStyling=${this.eventStyling}
              .viewMode=${this.viewMode}
              .topics=${this._feedTopics}
              .selectedMessageId=${this.selectedMessageId}
              .messageHighlights=${this.messageHighlights}
              .renderContextHeader=${this.renderContextHeader}
              .renderContent=${this.renderContent}
              .formatSender=${this.formatSender}>
            </agency-channel-feed>
            <agency-channel-input
              .channelId=${this._selectedChannelId}
              .replyTo=${this._replyTo}
              .showTypeSelector=${this.showTypeSelector}
              .showTopicSelector=${this.showTopicSelector}
              .topics=${this._feedTopics}
              .topicId=${this._selectedTopicId ?? ''}
              .messageTypes=${this.messageTypes ?? []}
              .allowedTypes=${this.allowedTypes}
              .deniedTypes=${this.deniedTypes}
              .renderError=${this.renderError}>
            </agency-channel-input>
          </div>
          ${this._renderSidebar()}
        </div>
      </pages-split-workbench>
    `;
    }
};
__decorate([
    property({ type: String, attribute: 'selection-topic' })
], AgencyChannelActivityElement.prototype, "selectionTopic", void 0);
__decorate([
    property({ type: String })
], AgencyChannelActivityElement.prototype, "channelNavLayout", void 0);
__decorate([
    property({ type: Boolean })
], AgencyChannelActivityElement.prototype, "sidebarOpen", void 0);
__decorate([
    property({ type: String })
], AgencyChannelActivityElement.prototype, "currentActorId", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "pushController", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "messagingConfig", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "reactionConfig", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "channels", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "messages", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "members", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "presence", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "reactions", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "commitments", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "channelTree", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "topics", void 0);
__decorate([
    property({ type: Boolean })
], AgencyChannelActivityElement.prototype, "autoScroll", void 0);
__decorate([
    property({ type: Number })
], AgencyChannelActivityElement.prototype, "staleCursorMinutes", void 0);
__decorate([
    property({ type: Boolean })
], AgencyChannelActivityElement.prototype, "terminalDimming", void 0);
__decorate([
    property({ type: Boolean })
], AgencyChannelActivityElement.prototype, "eventStyling", void 0);
__decorate([
    property({ type: String })
], AgencyChannelActivityElement.prototype, "viewMode", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "selectedMessageId", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "messageHighlights", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "renderContextHeader", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "renderContent", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "formatSender", void 0);
__decorate([
    property({ type: Boolean })
], AgencyChannelActivityElement.prototype, "showTypeSelector", void 0);
__decorate([
    property({ type: Boolean })
], AgencyChannelActivityElement.prototype, "showTopicSelector", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "messageTypes", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "allowedTypes", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "deniedTypes", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "renderError", void 0);
__decorate([
    property({ type: Boolean })
], AgencyChannelActivityElement.prototype, "showCreate", void 0);
__decorate([
    property({ type: Boolean })
], AgencyChannelActivityElement.prototype, "showDelete", void 0);
__decorate([
    property({ attribute: false })
], AgencyChannelActivityElement.prototype, "resolveArtifact", void 0);
__decorate([
    state()
], AgencyChannelActivityElement.prototype, "_selectedChannelId", void 0);
__decorate([
    state()
], AgencyChannelActivityElement.prototype, "_selectedChannelName", void 0);
__decorate([
    state()
], AgencyChannelActivityElement.prototype, "_selectedTopicId", void 0);
__decorate([
    state()
], AgencyChannelActivityElement.prototype, "_replyTo", void 0);
__decorate([
    state()
], AgencyChannelActivityElement.prototype, "_activeSidebarTab", void 0);
__decorate([
    state()
], AgencyChannelActivityElement.prototype, "_selectedArtefactRef", void 0);
AgencyChannelActivityElement = AgencyChannelActivityElement_1 = __decorate([
    customElement('agency-channel-activity')
], AgencyChannelActivityElement);
export { AgencyChannelActivityElement };
//# sourceMappingURL=agency-channel-activity.js.map