export const MESSAGE_TYPES = [
    'QUERY', 'COMMAND', 'RESPONSE', 'STATUS', 'DONE',
    'FAILURE', 'DECLINE', 'HANDOFF', 'EVENT',
    'PROPOSE', 'JUDGMENT',
];
export const ACTOR_TYPES = ['HUMAN', 'AGENT', 'SYSTEM'];
export { COMMITMENT_STATES, commitmentStateCategory, isTerminalCommitmentState, } from '@casehubio/mosaic-core';
export const CHANNEL_SEMANTICS = [
    'APPEND', 'COLLECT', 'BARRIER', 'EPHEMERAL', 'LAST_WRITE',
];
export const ARTEFACT_TYPES = [
    'DOCUMENT', 'CODE', 'CASE', 'WORK_ITEM', 'CHANNEL',
    'DEBATE', 'MESSAGE', 'EXTERNAL',
];
export const TOPIC_STATES = ['ACTIVE', 'RESOLVED', 'ARCHIVED', 'MERGED'];
export function isTerminalMessageType(type) {
    return type === 'DONE' || type === 'FAILURE' || type === 'DECLINE' || type === 'HANDOFF';
}
export function isObligationCreating(type) {
    return type === 'COMMAND' || type === 'PROPOSE';
}
export function messageTypeCategory(type) {
    switch (type) {
        case 'QUERY':
        case 'RESPONSE':
        case 'STATUS': return 'info';
        case 'COMMAND':
        case 'PROPOSE': return 'obligation';
        case 'DONE': return 'success';
        case 'FAILURE': return 'danger';
        case 'DECLINE': return 'warning';
        case 'HANDOFF': return 'transfer';
        case 'EVENT': return 'telemetry';
        case 'JUDGMENT': return 'info';
    }
}
//# sourceMappingURL=types.js.map