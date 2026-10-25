package io.casehub.neocortex.workbench;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class DatasetSession {

    private static final String TENANT_ID = "frida-kahlo";
    private static final String AGENT_ID = "workbench-researcher";
    private static final String SUBJECT_NAME = "Frida";

    private volatile boolean seeded;

    public String tenantId() {
        return TENANT_ID;
    }

    public String agentId() {
        return AGENT_ID;
    }

    public String subjectName() {
        return SUBJECT_NAME;
    }

    public boolean isSeeded() {
        return seeded;
    }

    public void markSeeded() {
        this.seeded = true;
    }
// --- Evaluation cache ---

    private volatile EvaluationResult      cachedEvaluation;
    private final    java.util.Set<String> committedIds = java.util.concurrent.ConcurrentHashMap.newKeySet();

    public record EvaluationResult(
            String evaluationId,
            String text,
            java.util.List<String> mentionedEntities,
            io.casehub.neocortex.caps.SettlingResult settlingResult,
            java.util.List<io.casehub.neocortex.caps.SituationActivation> situationActivations,
            java.util.Map<String, Double> inputActivations) {}

    public void cacheEvaluation(EvaluationResult result) {
        this.cachedEvaluation = result;
    }

    public EvaluationResult getCachedEvaluation(String evaluationId) {
        var cached = cachedEvaluation;
        return cached != null && cached.evaluationId().equals(evaluationId) ? cached : null;
    }

    public boolean markCommitted(String evaluationId) {
        return committedIds.add(evaluationId);
    }

    public boolean isCommitted(String evaluationId) {
        return committedIds.contains(evaluationId);
    }

}
