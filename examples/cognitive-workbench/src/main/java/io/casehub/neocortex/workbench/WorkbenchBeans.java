package io.casehub.neocortex.workbench;

import io.casehub.neocortex.cognitive.observability.CognitionApi;
import io.casehub.neocortex.cognitive.observability.CognitionService;
import io.casehub.neocortex.memory.CaseMemoryStore;
import io.casehub.neocortex.mindmap.MindMapStore;
import io.casehub.platform.api.identity.CurrentPrincipal;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;

import java.util.Set;

@ApplicationScoped
public class WorkbenchBeans {

    @Produces
    @ApplicationScoped
    public CurrentPrincipal currentPrincipal() {
        return new CurrentPrincipal() {
            @Override public String actorId() { return "workbench-researcher"; }
            @Override public Set<String> groups() { return Set.of("admin"); }
            @Override public String tenancyId() { return "frida-kahlo"; }
            @Override public boolean isCrossTenantAdmin() { return true; }
        };
    }

    @Produces
    @ApplicationScoped
    public CognitionApi cognitionApi(MindMapStore mindMapStore, CaseMemoryStore memoryStore) {
        return new CognitionService(mindMapStore, null, null, memoryStore, null, null, null);
    }

    @Produces
    @ApplicationScoped
    public io.casehub.neocortex.caps.CapsEngine capsEngine() {
        return new io.casehub.neocortex.caps.testing.InMemoryCapsEngine();
    }

    @Produces
    @ApplicationScoped
    public io.casehub.neocortex.caps.SituationClassifier situationClassifier(io.casehub.neocortex.caps.CapsEngine capsEngine) {
        return new io.casehub.neocortex.caps.engine.RuleBasedSituationClassifier(capsEngine.topology());
    }

}
