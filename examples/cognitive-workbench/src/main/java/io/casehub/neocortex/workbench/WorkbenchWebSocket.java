package io.casehub.neocortex.workbench;

import io.casehub.neocortex.cognitive.observability.GraphMutation;
import io.casehub.neocortex.cognitive.observability.GraphMutationRecorded;
import io.casehub.neocortex.mindmap.AttentionBriefing;
import io.casehub.neocortex.mindmap.CognitiveAttentionRequired;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.OpenConnections;
import io.quarkus.websockets.next.WebSocket;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

import java.util.Map;

@WebSocket(path = "/ws/workbench")
public class WorkbenchWebSocket {

    @Inject OpenConnections connections;

    @OnOpen
    public String onOpen() {
        return "{\"type\":\"connected\",\"message\":\"cognitive workbench stream active\"}";
    }

    @OnTextMessage
    public String onMessage(String message) {
        return "{\"type\":\"echo\",\"message\":\"" + message.replace("\"", "\\\"") + "\"}";
    }

    void broadcast(String json) {
        connections.forEach(c -> c.sendText(json).subscribe().asCompletionStage());
    }

    @ApplicationScoped
    public static class MutationBroadcaster {
        @Inject WorkbenchWebSocket webSocket;

        void onMutation(@Observes GraphMutationRecorded event) {
            GraphMutation mutation = event.mutation();
            String json = "{\"type\":\"mutation\",\"mutationType\":\"" + mutation.getClass().getSimpleName() + "\"}";
            webSocket.broadcast(json);
        }

        void onAttention(@Observes CognitiveAttentionRequired event) {
            AttentionBriefing briefing = event.briefing();
            String json = "{\"type\":\"attention\",\"signalCount\":" + briefing.signals().size()
                    + ",\"urgencyP75\":" + briefing.urgencyP75() + "}";
            webSocket.broadcast(json);
        }
    }
}
