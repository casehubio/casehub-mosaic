import { describe, it, expect, afterEach } from 'vitest';
import './channel-member-panel.js';
describe('channel-member-panel', () => {
    let element;
    afterEach(() => { element?.remove(); });
    it('renders member list sorted by presence', async () => {
        element = document.createElement('channel-member-panel');
        element.members = [
            { channelId: 'c1', memberId: 'm1', displayName: 'Alice', role: 'PARTICIPANT' },
            { channelId: 'c1', memberId: 'm2', displayName: 'Bob', role: 'PARTICIPANT' },
            { channelId: 'c1', memberId: 'm3', displayName: 'Charlie', role: 'PARTICIPANT' },
        ];
        element.presence = [
            { memberId: 'm1', status: 'OFFLINE' },
            { memberId: 'm2', status: 'ONLINE' },
            { memberId: 'm3', status: 'AWAY' },
        ];
        document.body.appendChild(element);
        await element.updateComplete;
        const items = element.shadowRoot.querySelectorAll('.member-item');
        const names = Array.from(items).map(i => i.querySelector('.member-name')?.textContent?.trim());
        expect(names).toEqual(['Bob', 'Charlie', 'Alice']);
    });
    it('shows presence dots with correct classes', async () => {
        element = document.createElement('channel-member-panel');
        element.members = [
            { channelId: 'c1', memberId: 'm1', displayName: 'Online', role: 'PARTICIPANT' },
            { channelId: 'c1', memberId: 'm2', displayName: 'Away', role: 'PARTICIPANT' },
            { channelId: 'c1', memberId: 'm3', displayName: 'Offline', role: 'PARTICIPANT' },
        ];
        element.presence = [
            { memberId: 'm1', status: 'ONLINE' },
            { memberId: 'm2', status: 'AWAY' },
            { memberId: 'm3', status: 'OFFLINE' },
        ];
        document.body.appendChild(element);
        await element.updateComplete;
        const dots = element.shadowRoot.querySelectorAll('.presence-dot');
        expect(dots[0].classList.contains('dot-online')).toBe(true);
        expect(dots[1].classList.contains('dot-away')).toBe(true);
        expect(dots[2].classList.contains('dot-offline')).toBe(true);
    });
    it('shows role badges for MODERATOR and OBSERVER', async () => {
        element = document.createElement('channel-member-panel');
        element.members = [
            { channelId: 'c1', memberId: 'm1', displayName: 'Mod', role: 'MODERATOR' },
            { channelId: 'c1', memberId: 'm2', displayName: 'Obs', role: 'OBSERVER' },
            { channelId: 'c1', memberId: 'm3', displayName: 'Part', role: 'PARTICIPANT' },
        ];
        element.presence = [
            { memberId: 'm1', status: 'ONLINE' },
            { memberId: 'm2', status: 'ONLINE' },
            { memberId: 'm3', status: 'ONLINE' },
        ];
        document.body.appendChild(element);
        await element.updateComplete;
        const badges = element.shadowRoot.querySelectorAll('.role-badge');
        expect(badges[0].textContent).toBe('🛡️');
        expect(badges[1].textContent).toBe('👁️');
        expect(badges[2].textContent).toBe('');
    });
    it('groups under section headers', async () => {
        element = document.createElement('channel-member-panel');
        element.members = [
            { channelId: 'c1', memberId: 'm1', displayName: 'A', role: 'PARTICIPANT' },
            { channelId: 'c1', memberId: 'm2', displayName: 'B', role: 'PARTICIPANT' },
            { channelId: 'c1', memberId: 'm3', displayName: 'C', role: 'PARTICIPANT' },
        ];
        element.presence = [
            { memberId: 'm1', status: 'ONLINE' },
            { memberId: 'm2', status: 'AWAY' },
            { memberId: 'm3', status: 'OFFLINE' },
        ];
        document.body.appendChild(element);
        await element.updateComplete;
        const headers = element.shadowRoot.querySelectorAll('.section-header');
        expect(headers.length).toBe(3);
        expect(headers[0].textContent?.trim()).toBe('Online');
        expect(headers[1].textContent?.trim()).toBe('Away');
        expect(headers[2].textContent?.trim()).toBe('Offline');
    });
    it('handles empty member list', async () => {
        element = document.createElement('channel-member-panel');
        element.members = [];
        element.presence = [];
        document.body.appendChild(element);
        await element.updateComplete;
        const emptyState = element.shadowRoot.querySelector('.empty-state');
        expect(emptyState?.textContent?.trim()).toBe('No members');
    });
    it('members without presence default to OFFLINE', async () => {
        element = document.createElement('channel-member-panel');
        element.members = [
            { channelId: 'c1', memberId: 'm1', displayName: 'Alice', role: 'PARTICIPANT' },
            { channelId: 'c1', memberId: 'm2', displayName: 'Bob', role: 'PARTICIPANT' },
        ];
        element.presence = [{ memberId: 'm1', status: 'ONLINE' }];
        document.body.appendChild(element);
        await element.updateComplete;
        const names = Array.from(element.shadowRoot.querySelectorAll('.member-item'))
            .map(i => i.querySelector('.member-name')?.textContent?.trim());
        expect(names).toEqual(['Alice', 'Bob']);
        const dots = element.shadowRoot.querySelectorAll('.presence-dot');
        expect(dots[0].classList.contains('dot-online')).toBe(true);
        expect(dots[1].classList.contains('dot-offline')).toBe(true);
    });
    it('shows status message when present', async () => {
        element = document.createElement('channel-member-panel');
        element.members = [{ channelId: 'c1', memberId: 'm1', displayName: 'Alice', role: 'PARTICIPANT' }];
        element.presence = [{ memberId: 'm1', status: 'BUSY', statusMessage: 'In a meeting' }];
        document.body.appendChild(element);
        await element.updateComplete;
        expect(element.shadowRoot.querySelector('.status-message')?.textContent?.trim()).toBe('In a meeting');
    });
    it('sorts alphabetically within same group', async () => {
        element = document.createElement('channel-member-panel');
        element.members = [
            { channelId: 'c1', memberId: 'm1', displayName: 'Charlie', role: 'PARTICIPANT' },
            { channelId: 'c1', memberId: 'm2', displayName: 'Alice', role: 'PARTICIPANT' },
            { channelId: 'c1', memberId: 'm3', displayName: 'Bob', role: 'PARTICIPANT' },
        ];
        element.presence = [
            { memberId: 'm1', status: 'ONLINE' },
            { memberId: 'm2', status: 'ONLINE' },
            { memberId: 'm3', status: 'ONLINE' },
        ];
        document.body.appendChild(element);
        await element.updateComplete;
        const names = Array.from(element.shadowRoot.querySelectorAll('.member-item'))
            .map(i => i.querySelector('.member-name')?.textContent?.trim());
        expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });
});
//# sourceMappingURL=channel-member-panel.test.js.map