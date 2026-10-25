package io.casehub.neocortex.workbench;

import io.casehub.neocortex.cognitive.index.CognitiveDefaultsRegistry;
import io.casehub.neocortex.cognitive.observability.CognitionApi;
import io.casehub.neocortex.memory.CaseMemoryStore;
import io.casehub.neocortex.memory.Memory;
import io.casehub.neocortex.memory.MemoryQuery;
import io.casehub.neocortex.memory.Subject;
import io.casehub.neocortex.mindmap.MindMapStore;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Path("/api/workbench")
@Produces(MediaType.APPLICATION_JSON)
public class WorkbenchApi {

    @Inject DatasetSession session;
    @Inject CognitionApi cognitionApi;
    @Inject MindMapStore mindMapStore;
    @Inject CaseMemoryStore memoryStore;
    @Inject jakarta.enterprise.inject.Instance<CognitiveDefaultsRegistry> cognitiveDefaultsRegistryInstance;
    @Inject
            jakarta.enterprise.inject.Instance<io.casehub.neocortex.caps.CapsEngine> capsEngine;
    @Inject
            jakarta.enterprise.inject.Instance<io.casehub.neocortex.caps.SituationClassifier> situationClassifier;


    private record RegionMapping(String functionalLabel, String anatomicalLabel, List<String> subgraphTypes) {}

    private static final Map<String, RegionMapping> REGION_MAP = Map.ofEntries(
            Map.entry("social", new RegionMapping("Social Cognition", "Temporal-Parietal Junction", List.of("person", "organisation"))),
            Map.entry("executive", new RegionMapping("Planning & Executive", "Prefrontal Cortex", List.of("goal", "project"))),
            Map.entry("episodic", new RegionMapping("Episodic Memory", "Hippocampal / Medial Temporal", List.of("activity", "place"))),
            Map.entry("semantic", new RegionMapping("Semantic Knowledge", "Anterior Temporal Lobe", List.of("concept", "research_area", "general"))),
            Map.entry("habitual", new RegionMapping("Habitual Response", "Basal Ganglia", List.of("behavioral"))),
            Map.entry("judgment", new RegionMapping("Belief & Judgment", "Dorsolateral Prefrontal", List.of("cognitive"))),
            Map.entry("categorical", new RegionMapping("Categorical Structure", "Cerebellum", List.of("type_system"))),
            Map.entry("normative", new RegionMapping("Norms & Values", "Ventromedial Prefrontal", List.of("cultural"))),
            Map.entry("limbic", new RegionMapping("Emotional State", "Limbic System", List.of()))
                                                                              );

    @GET
    @Path("/status")
    public Map<String, Object> status() {
        return Map.of(
                "tenantId", session.tenantId(),
                "agentId", session.agentId(),
                "seeded", session.isSeeded(),
                "subjectName", session.subjectName());
    }

    @GET
    @Path("/brain")
    public Map<String, Object> brain() {
        String t = session.tenantId();

        var allSubgraphsList = mindMapStore.listSubgraphs(t);
        var nodesByType      = new java.util.LinkedHashMap<String, List<WorkbenchDto.NodeDto>>();
        var allNodeIds       = new java.util.LinkedHashSet<String>();

        for (var sg : allSubgraphsList) {
            var    nodes = mindMapStore.nodesIn(sg.id(), t);
            String type  = (sg.type() != null ? sg.type() : "general").toLowerCase();
            nodesByType.computeIfAbsent(type, k -> new java.util.ArrayList<>())
                       .addAll(WorkbenchDto.NodeDto.fromList(nodes));
            nodes.forEach(n -> allNodeIds.add(n.id()));
        }

        var regions     = new java.util.ArrayList<WorkbenchDto.RegionDto>();
        var mappedTypes = new java.util.HashSet<String>();
        for (var entry : REGION_MAP.entrySet()) {
            var mapping = entry.getValue();
            mappedTypes.addAll(mapping.subgraphTypes());
            var regionNodes = new java.util.ArrayList<WorkbenchDto.NodeDto>();
            for (var sgType : mapping.subgraphTypes()) {
                regionNodes.addAll(nodesByType.getOrDefault(sgType, List.of()));
            }
            regions.add(new WorkbenchDto.RegionDto(
                    entry.getKey(), mapping.functionalLabel(), mapping.anatomicalLabel(),
                    mapping.subgraphTypes(), regionNodes));
        }

        // Fallback: unmapped types go to semantic
        for (var entry : nodesByType.entrySet()) {
            if (!mappedTypes.contains(entry.getKey())) {
                var semantic = regions.stream()
                                      .filter(r -> "semantic".equals(r.regionId())).findFirst().orElse(null);
                if (semantic != null) {
                    var merged = new java.util.ArrayList<>(semantic.nodes());
                    merged.addAll(entry.getValue());
                    int idx = regions.indexOf(semantic);
                    regions.set(idx, new WorkbenchDto.RegionDto(
                            semantic.regionId(), semantic.functionalLabel(),
                            semantic.anatomicalLabel(), semantic.subgraphTypes(), merged));
                }
            }
        }

        // Edges: bridge edges + per-node neighbors, deduped
        var edgeDedup = new java.util.LinkedHashMap<String, io.casehub.neocortex.mindmap.MindMapEdge>();
        for (var sg : allSubgraphsList) {
            for (var e : mindMapStore.bridgeEdges(sg.id(), t)) {
                if (allNodeIds.contains(e.sourceNodeId()) && allNodeIds.contains(e.targetNodeId())) {
                    edgeDedup.putIfAbsent(e.id(), e);
                }
            }
        }
        for (var nodeId : allNodeIds) {
            for (var e : mindMapStore.neighbors(nodeId, t)) {
                if (allNodeIds.contains(e.sourceNodeId()) && allNodeIds.contains(e.targetNodeId())) {
                    edgeDedup.putIfAbsent(e.id(), e);
                }
            }
        }

        // Mood snapshots
        var moodRequest = new io.casehub.neocortex.memory.MemoryScanRequest(
                t, "mood", null, null, 30, null);
        var moodMemories = memoryStore.scan(moodRequest);
        var moodSnapshots = moodMemories.stream().map(m -> new WorkbenchDto.MoodNodeDto(
                m.memoryId(),
                m.pleasure(), m.arousal(), m.dominance(),
                m.confidence() != null ? m.confidence().value() : null,
                m.createdAt() != null ? m.createdAt().toString() : null
        )).toList();

        // Affect projections: entities with PAD > 0.3 threshold
        double threshold         = 0.3;
        var    affectProjections = new java.util.ArrayList<WorkbenchDto.AffectProjectionDto>();
        for (var regionDto : regions) {
            if ("limbic".equals(regionDto.regionId())) {continue;}
            for (var node : regionDto.nodes()) {
                if (exceedsPadThreshold(node, threshold)) {
                    affectProjections.add(new WorkbenchDto.AffectProjectionDto(
                            "affect-" + node.id(), node.id(), node.name(),
                            regionDto.regionId(),
                            node.pleasure(), node.arousal(), node.dominance()));
                }
            }
        }

        // CAPS topology
        var capsNodes       = List.<WorkbenchDto.CapsNodeDto>of();
        var capsConnections = List.<WorkbenchDto.CapsConnectionDto>of();
        if (capsEngine.isResolvable()) {
            var topo = capsEngine.get().topology();
            capsNodes       = topo.nodes().values().stream()
                                  .map(WorkbenchDto.CapsNodeDto::from).toList();
            capsConnections = topo.connections().stream()
                                  .map(WorkbenchDto.CapsConnectionDto::from).toList();
        }

        int totalNodes = regions.stream().mapToInt(r -> r.nodes().size()).sum()
                         + capsNodes.size() + moodSnapshots.size() + affectProjections.size();

        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("regions", regions);
        result.put("edges", WorkbenchDto.EdgeDto.fromList(new java.util.ArrayList<>(edgeDedup.values())));
        result.put("moodSnapshots", moodSnapshots);
        result.put("affectProjections", affectProjections);
        result.put("capsNodes", capsNodes);
        result.put("capsConnections", capsConnections);
        result.put("nodeCount", totalNodes);
        result.put("capped", false);
        return result;
    }

    private static boolean exceedsPadThreshold(WorkbenchDto.NodeDto node, double threshold) {
        return (node.pleasure() != null && Math.abs(node.pleasure()) > threshold)
               || (node.arousal() != null && Math.abs(node.arousal()) > threshold)
               || (node.dominance() != null && Math.abs(node.dominance()) > threshold);
    }


    @GET
    @Path("/caps-topology")
    public Map<String, Object> capsTopology() {
        if (!capsEngine.isResolvable()) {
            return Map.of("error", "CAPS engine not available");
        }
        var topo = capsEngine.get().topology();
        var nodes = topo.nodes().values().stream()
                        .map(WorkbenchDto.CapsNodeDto::from).toList();
        var connections = topo.connections().stream()
                              .map(WorkbenchDto.CapsConnectionDto::from).toList();
        return Map.of("version", topo.version(),
                      "nodes", nodes,
                      "connections", connections);
    }

    @GET
    @Path("/caps-experience-links")
    public Map<String, Object> capsExperienceLinks() {
        if (!situationClassifier.isResolvable()) {
            return Map.of("error", "SituationClassifier not available");
        }
        var request = new io.casehub.neocortex.memory.MemoryScanRequest(
                session.tenantId(), "experience", null, null, 500, null);
        var memories = memoryStore.scan(request);

        var links = new java.util.LinkedHashMap<String, java.util.LinkedHashMap<String, double[]>>();

        for (var m : memories) {
            var activations = situationClassifier.get().classify(m.text(), Map.of());
            if (activations.isEmpty()) continue;
            String mentioned = m.attributes().get("mentioned-entities");
            if (mentioned == null || mentioned.isBlank()) continue;
            var entities = java.util.Arrays.stream(mentioned.split(","))
                    .map(String::trim).filter(e -> !e.isEmpty()).toList();
            for (var a : activations) {
                for (var entity : entities) {
                    links.computeIfAbsent(a.nodeId(), k -> new java.util.LinkedHashMap<>())
                         .merge(entity, new double[]{a.confidence(), 1},
                                (old, v) -> new double[]{Math.max(old[0], v[0]), old[1] + 1});
                }
            }
        }

        var result = new java.util.ArrayList<Map<String, Object>>();
        links.forEach((capsNodeId, entityMap) ->
            entityMap.forEach((entity, stats) ->
                result.add(Map.of("capsNodeId", capsNodeId, "entity", entity,
                                  "confidence", Math.round(stats[0] * 100) / 100.0,
                                  "memoryCount", (int) stats[1]))));

        return Map.of("links", result, "memoriesScanned", memories.size());
    }

    @POST
    @Path("/evaluate")
    @jakarta.ws.rs.Consumes(MediaType.APPLICATION_JSON)
    public jakarta.ws.rs.core.Response evaluate(Map<String, String> request) {
        String text = request.get("text");
        if (text == null || text.isBlank()) {
            return jakarta.ws.rs.core.Response.status(400).entity(Map.of("error", "text required")).build();
        }
        if (!capsEngine.isResolvable() || !situationClassifier.isResolvable()) {
            return jakarta.ws.rs.core.Response.status(503).entity(Map.of("error", "CAPS not available")).build();
        }

        String t = session.tenantId();

        // 1. Entity extraction — word-boundary name matching against MindMap nodes
        var allNodes = new java.util.ArrayList<io.casehub.neocortex.mindmap.MindMapNode>();
        for (var sg : mindMapStore.listSubgraphs(t)) {
            allNodes.addAll(mindMapStore.nodesIn(sg.id(), t));
        }
        String textLower = text.toLowerCase();
        var mentioned = allNodes.stream()
                                .filter(n -> n.name().length() >= 4 && containsWord(textLower, n.name().toLowerCase()))
                                .map(n -> n.name().toLowerCase())
                                .sorted(java.util.Comparator.comparingInt(String::length).reversed())
                                .distinct()
                                .toList();

        // 2. Situation classification
        var activations = situationClassifier.get().classify(text, Map.of());
        var inputMap    = new java.util.LinkedHashMap<String, Double>();
        for (var a : activations) {inputMap.put(a.nodeId(), a.confidence());}

        // 3. CAPS settling
        var engine     = capsEngine.get();
        var agentState = engine.loadState(t, session.agentId());
        if (agentState == null) {
            io.casehub.neocortex.cognitive.index.DispositionAxes axes = null;
            if (cognitiveDefaultsRegistryInstance.isResolvable()) {
                var defaults = cognitiveDefaultsRegistryInstance.get().forAgent(session.agentId());
                if (defaults.isPresent() && defaults.get().descriptor() != null) {
                    axes = defaults.get().descriptor().disposition();
                }
            }
            if (axes == null) {
                axes = new io.casehub.neocortex.cognitive.index.DispositionAxes(
                        "cooperative", "moderate", "calculated", "moderate", "cooperative");
            }
            agentState = engine.initializeAgent(t, session.agentId(), axes);
        }
        var settling = engine.settle(agentState, inputMap);

        // 4. Cache evaluation result
        String evalId = "eval-" + java.util.UUID.randomUUID();
        var evalResult = new DatasetSession.EvaluationResult(
                evalId, text, mentioned, settling, activations, inputMap);
        session.cacheEvaluation(evalResult);

        // 5. Build response
        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("evaluationId", evalId);
        result.put("mentionedEntities", mentioned);
        result.put("caps", Map.of(
                "activations", settling.activations(),
                "iterations", settling.iterations(),
                "convergence", settling.convergence().name(),
                "saturationRatio", settling.saturationRatio(),
                "attractors", settling.attractors()));
        result.put("situationActivations", activations);
        result.put("appraisal", Map.of("available", false));

        return jakarta.ws.rs.core.Response.ok(result).build();
    }

    @POST
    @Path("/evaluate/commit")
    @jakarta.ws.rs.Consumes(MediaType.APPLICATION_JSON)
    public jakarta.ws.rs.core.Response commitEvaluation(Map<String, String> request) {
        String evalId = request.get("evaluationId");
        if (evalId == null) {
            return jakarta.ws.rs.core.Response.status(400).entity(Map.of("error", "evaluationId required")).build();
        }
        if (session.isCommitted(evalId)) {
            return jakarta.ws.rs.core.Response.status(409).entity(Map.of("error", "already committed")).build();
        }
        var cached = session.getCachedEvaluation(evalId);
        if (cached == null) {
            return jakarta.ws.rs.core.Response.status(404).entity(Map.of("error", "evaluation not found or superseded")).build();
        }
        if (!capsEngine.isResolvable()) {
            return jakarta.ws.rs.core.Response.status(503).entity(Map.of("error", "CAPS not available")).build();
        }

        // 1. Persist as experience memory
        String subject = cached.mentionedEntities().isEmpty() ? "workbench-scenario" : cached.mentionedEntities().get(0);
        String memoryId = memoryStore.store(
                new io.casehub.neocortex.memory.MemoryInput(
                        new io.casehub.neocortex.memory.Subject("scenario", subject),
                        new io.casehub.neocortex.memory.MemoryDomain("experience"),
                        session.tenantId(),
                        "workbench-eval",
                        cached.text(),
                        Map.of("source", "workbench-evaluation", "evaluationId", evalId),
                        new io.casehub.neocortex.cognitive.Confidence(io.casehub.neocortex.cognitive.ConfidenceOrigin.STATED, 1.0, java.time.Instant.now()),
                        null, null, null, null, null));

        // 2. Update CAPS weights
        var    engine     = capsEngine.get();
        var    state      = engine.loadState(session.tenantId(), session.agentId());
        double intensity  = 0.5;
        double valence    = 0.0;
        var    attractors = cached.settlingResult().attractors();
        if (!attractors.isEmpty()) {
            intensity = attractors.stream().mapToDouble(a -> a.strength()).average().orElse(0.5);
            valence   = attractors.stream()
                                  .mapToDouble(a -> a.category().contains("approach") ? a.strength() : -a.strength())
                                  .average().orElse(0.0);
        }
        var updatedState = engine.updateWeights(state, cached.inputActivations(),
                                                intensity, valence, 1.0, "continuous");
        engine.saveState(updatedState);

        session.markCommitted(evalId);

        return jakarta.ws.rs.core.Response.ok(Map.of(
                "memoryId", memoryId,
                "capsGeneration", updatedState.generation(),
                "weightUpdated", true)).build();
    }


    @GET
    @Path("/reference-overlay")
    public jakarta.ws.rs.core.Response referenceOverlay() {
        var is = getClass().getResourceAsStream("/reference-overlay.json");
        if (is == null) return jakarta.ws.rs.core.Response.ok(Map.of("entries", Map.of())).build();
        try {
            return jakarta.ws.rs.core.Response.ok(new String(is.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))
                    .type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return jakarta.ws.rs.core.Response.ok(Map.of("entries", Map.of())).build();
        }
    }

    @GET
    @Path("/subgraphs")
    public List<WorkbenchDto.SubgraphDto> subgraphs() {
        return WorkbenchDto.SubgraphDto.fromList(mindMapStore.listSubgraphs(session.tenantId()));
    }

    @GET
    @Path("/subgraphs/{id}/nodes")
    public List<WorkbenchDto.NodeDto> nodesInSubgraph(@PathParam("id") String subgraphId) {
        return WorkbenchDto.NodeDto.fromList(mindMapStore.nodesIn(subgraphId, session.tenantId()));
    }

    @GET
    @Path("/nodes/{nodeId}/neighbors")
    public List<WorkbenchDto.EdgeDto> neighbors(@PathParam("nodeId") String nodeId) {
        return WorkbenchDto.EdgeDto.fromList(
                mindMapStore.neighbors(nodeId, session.tenantId(), (io.casehub.platform.api.identity.PrincipalId) null));
    }

    @GET
    @Path("/graph/{nodeId}")
    public Map<String, Object> graph(@PathParam("nodeId") String nodeId,
                                      @QueryParam("depth") Integer maxDepth) {
        var result = cognitionApi.graph(session.tenantId(), nodeId, maxDepth != null ? maxDepth : 2, null, null);
        if (result == null) return Map.of("totalNodes", 0);
        return Map.of("focusNodeId", result.focusNodeId(), "totalNodes", result.totalNodes());
    }

    @GET
    @Path("/ego/{nodeId}")
    public Map<String, Object> ego(@PathParam("nodeId") String nodeId,
                                   @QueryParam("depth") Integer depth,
                                   @QueryParam("maxNodes") Integer maxNodes) {
        String t = session.tenantId();
        var    focalNode = mindMapStore.getNode(nodeId, t);
        if (focalNode == null) {return Map.of("error", "not found");}

        int maxDepth = depth != null ? Math.min(depth, 3) : 1;
        int limit    = maxNodes != null ? maxNodes : 60;
        var depthMap = new java.util.LinkedHashMap<String, Integer>();
        var allEdges = new java.util.ArrayList<io.casehub.neocortex.mindmap.MindMapEdge>();
        var frontier = new java.util.LinkedHashSet<String>();
        frontier.add(nodeId);
        depthMap.put(nodeId, 0);
        boolean capped = false;

        for (int d = 0; d < maxDepth; d++) {
            var nextFrontier = new java.util.LinkedHashSet<String>();
            for (var nid : frontier) {
                if (depthMap.size() >= limit) {
                    capped = true;
                    break;
                }
                var edges = mindMapStore.neighbors(nid, t, (io.casehub.platform.api.identity.PrincipalId) null);
                for (var e : edges) {
                    var otherId = e.sourceNodeId().equals(nid) ? e.targetNodeId() : e.sourceNodeId();
                    allEdges.add(e);
                    if (!depthMap.containsKey(otherId) && depthMap.size() < limit) {
                        depthMap.put(otherId, d + 1);
                        nextFrontier.add(otherId);
                    }
                }
            }
            if (capped) {break;}
            frontier = nextFrontier;
        }

        var nodes = new java.util.ArrayList<WorkbenchDto.NodeDto>();
        for (var nid : depthMap.keySet()) {
            var n = mindMapStore.getNode(nid, t);
            if (n != null) {nodes.add(WorkbenchDto.NodeDto.from(n).withBfsDepth(depthMap.get(nid)));}
        }

        var edgeDedup = new java.util.LinkedHashMap<String, io.casehub.neocortex.mindmap.MindMapEdge>();
        for (var e : allEdges) {
            if (depthMap.containsKey(e.sourceNodeId()) && depthMap.containsKey(e.targetNodeId())) {
                edgeDedup.putIfAbsent(e.id(), e);
            }
        }

        var result = new java.util.HashMap<String, Object>();
        result.put("focusNodeId", nodeId);
        result.put("depth", maxDepth);
        result.put("nodes", nodes);
        result.put("edges", WorkbenchDto.EdgeDto.fromList(new java.util.ArrayList<>(edgeDedup.values())));
        result.put("capped", capped);
        result.put("maxNodes", limit);
        return result;
    }

    @GET
    @Path("/health")
    public Map<String, Object> health() {
        var result = cognitionApi.health(session.tenantId(), null, 30, 0.3);
        if (result == null) return Map.of();
        return Map.of(
                "orphanCount", result.orphanNodes().size(),
                "contradictionCount", result.contradictions().size(),
                "unvalidatedEdgeCount", result.unvalidatedEdgeRatios().size());
    }

    @GET
    @Path("/cognitive-profile/{name}")
    public Map<String, Object> cognitiveProfile(@PathParam("name") String name) {
        String nameLower = name.toLowerCase();
        var allMemories = new java.util.ArrayList<Memory>();
        for (var domain : java.util.List.of("experience", "relationship", "reflection", "mood")) {
            var request = new io.casehub.neocortex.memory.MemoryScanRequest(
                    session.tenantId(), domain, null, null, 200, null);
            allMemories.addAll(memoryStore.scan(request));
        }
        var matching = allMemories.stream()
                .filter(m -> {
                    String mentioned = m.attributes().get("mentioned-entities");
                    if (mentioned == null) return false;
                    for (var e : mentioned.split(",")) { if (e.trim().equals(nameLower)) return true; }
                    return false;
                })
                .toList();

        if (matching.isEmpty()) return Map.of("memoryCount", 0);

        double padP = 0, padA = 0, padD = 0;
        int padCount = 0;
        var emotions = new java.util.LinkedHashMap<String, double[]>();
        var tendencies = new java.util.LinkedHashMap<String, Integer>();
        var distortions = new java.util.LinkedHashMap<String, Integer>();
        var drives = new java.util.LinkedHashMap<String, double[]>();
        var secTotals = new java.util.LinkedHashMap<String, double[]>();

        for (var m : matching) {
            if (m.pleasure() != null) { padP += m.pleasure(); padA += m.arousal(); padD += m.dominance(); padCount++; }
            var attrs = m.attributes();
            String emoStr = attrs.get("occ-emotions");
            if (emoStr != null) {
                for (var pair : emoStr.split(",")) {
                    var parts = pair.split(":");
                    if (parts.length == 2) {
                        String eName = parts[0].trim();
                        try {
                            double intensity = Double.parseDouble(parts[1].trim());
                            emotions.computeIfAbsent(eName, k -> new double[]{0, 0});
                            emotions.get(eName)[0] += intensity;
                            emotions.get(eName)[1]++;
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
            String tenStr = attrs.get("action-tendencies");
            if (tenStr != null) { for (var t : tenStr.split(",")) { String k = t.trim(); if (!k.isEmpty()) tendencies.merge(k, 1, Integer::sum); } }
            String disStr = attrs.get("cognitive-distortions");
            if (disStr != null) { for (var d : disStr.split(",")) { String k = d.trim(); if (!k.isEmpty()) distortions.merge(k, 1, Integer::sum); } }
            String driveStr = attrs.get("drive-impact");
            if (driveStr != null) {
                for (var pair : driveStr.split(",")) {
                    var parts = pair.split(":");
                    if (parts.length == 2) {
                        try {
                            drives.computeIfAbsent(parts[0].trim(), k -> new double[]{0, 0});
                            drives.get(parts[0].trim())[0] += Double.parseDouble(parts[1].trim());
                            drives.get(parts[0].trim())[1]++;
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
            for (var secDim : java.util.List.of("relevance", "novelty", "urgency", "conduciveness", "controllability", "adjustability", "internal_standards", "external_standards")) {
                String v = attrs.get("sec-" + secDim);
                if (v != null) {
                    try {
                        secTotals.computeIfAbsent(secDim, k -> new double[]{0, 0});
                        secTotals.get(secDim)[0] += Double.parseDouble(v);
                        secTotals.get(secDim)[1]++;
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        var result = new java.util.HashMap<String, Object>();
        result.put("memoryCount", matching.size());
        if (padCount > 0) result.put("pad", Map.of("pleasure", padP/padCount, "arousal", padA/padCount, "dominance", padD/padCount, "sampleCount", padCount));

        var emoList = new java.util.ArrayList<Map<String, Object>>();
        emotions.entrySet().stream().sorted((a, b) -> Double.compare(b.getValue()[0]/b.getValue()[1], a.getValue()[0]/a.getValue()[1]))
                .forEach(e -> emoList.add(Map.of("emotion", e.getKey(), "avgIntensity", Math.round(e.getValue()[0]/e.getValue()[1]*100)/100.0, "occurrences", (int)e.getValue()[1])));
        result.put("emotions", emoList);

        var tenList = new java.util.ArrayList<Map<String, Object>>();
        tendencies.entrySet().stream().sorted((a, b) -> b.getValue() - a.getValue())
                .forEach(e -> tenList.add(Map.of("tendency", e.getKey(), "count", e.getValue())));
        result.put("tendencies", tenList);

        var disList = new java.util.ArrayList<Map<String, Object>>();
        distortions.entrySet().stream().sorted((a, b) -> b.getValue() - a.getValue())
                .forEach(e -> disList.add(Map.of("distortion", e.getKey(), "count", e.getValue())));
        result.put("distortions", disList);

        var driveMap = new java.util.HashMap<String, Object>();
        drives.forEach((k, v) -> driveMap.put(k, Map.of("avgImpact", Math.round(v[0]/v[1]*100)/100.0, "sampleCount", (int)v[1])));
        result.put("drives", driveMap);

        var secMap = new java.util.HashMap<String, Object>();
        secTotals.forEach((k, v) -> secMap.put(k, Math.round(v[0]/v[1]*100)/100.0));
        result.put("sec", secMap);

        return result;
    }

    @GET
    @Path("/entities-by-dimension/{type}/{value}")
    public Map<String, Object> entitiesByDimension(@PathParam("type") String type,
                                                    @PathParam("value") String value) {
        var allMemories = new java.util.ArrayList<Memory>();
        for (var domain : java.util.List.of("experience", "relationship", "reflection", "mood")) {
            var request = new io.casehub.neocortex.memory.MemoryScanRequest(
                    session.tenantId(), domain, null, null, 200, null);
            allMemories.addAll(memoryStore.scan(request));
        }

        String attrKey;
        switch (type) {
            case "emotion" -> attrKey = "occ-emotions";
            case "tendency" -> attrKey = "action-tendencies";
            case "distortion" -> attrKey = "cognitive-distortions";
            default -> { return Map.of("error", "unknown type: " + type); }
        }

        String valueLower = value.toLowerCase().trim();
        var entityScores = new java.util.LinkedHashMap<String, double[]>();

        for (var m : allMemories) {
            String attrVal = m.attributes().get(attrKey);
            if (attrVal == null) continue;

            boolean found = false;
            double score = 1.0;
            if ("emotion".equals(type)) {
                for (var pair : attrVal.split(",")) {
                    var parts = pair.split(":");
                    if (parts.length == 2 && parts[0].trim().toLowerCase().equals(valueLower)) {
                        found = true;
                        try { score = Double.parseDouble(parts[1].trim()); } catch (NumberFormatException ignored) {}
                        break;
                    }
                }
            } else {
                for (var item : attrVal.split(",")) {
                    if (item.trim().toLowerCase().equals(valueLower)) { found = true; break; }
                }
            }
            if (!found) continue;

            String mentioned = m.attributes().get("mentioned-entities");
            if (mentioned == null) continue;
            for (var entity : mentioned.split(",")) {
                String e = entity.trim();
                if (!e.isEmpty()) {
                    entityScores.computeIfAbsent(e, k -> new double[]{0, 0});
                    entityScores.get(e)[0] += score;
                    entityScores.get(e)[1]++;
                }
            }
        }

        var entities = new java.util.ArrayList<Map<String, Object>>();
        entityScores.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue()[0], a.getValue()[0]))
                .forEach(e -> entities.add(Map.of(
                        "name", e.getKey(),
                        "totalScore", Math.round(e.getValue()[0] * 100) / 100.0,
                        "occurrences", (int) e.getValue()[1])));

        return Map.of("dimension", type, "value", value, "entities", entities, "totalEntities", entities.size());
    }

    @GET
    @Path("/attention")
    public Map<String, Object> attention(@QueryParam("topN") Integer topN) {
        var result = cognitionApi.attention(session.tenantId(), session.agentId(), topN != null ? topN : 10);
        if (result == null) return Map.of("signals", List.of());
        return Map.of(
                "principalId", result.principalId(),
                "signalCount", result.signals().size(),
                "urgencyP75", result.urgencyP75());
    }

    @GET
    @Path("/personality")
    public Map<String, Object> personality() {
        if (!cognitiveDefaultsRegistryInstance.isResolvable()) {return Map.of("available", false);}
        var defaults = cognitiveDefaultsRegistryInstance.get().forAgent(session.agentId());
        if (defaults.isEmpty()) {return Map.of("available", false);}

        var d      = defaults.get();
        var result = new LinkedHashMap<String, Object>();
        result.put("available", true);
        result.put("agentId", d.agentId());

        if (d.descriptor() != null && d.descriptor().disposition() != null) {
            var axes = d.descriptor().disposition();
            result.put("disposition", Map.of(
                    "socialOrient", axes.socialOrient() != null ? axes.socialOrient() : "",
                    "ruleFollowing", axes.ruleFollowing() != null ? axes.ruleFollowing() : "",
                    "riskAppetite", axes.riskAppetite() != null ? axes.riskAppetite() : "",
                    "autonomy", axes.autonomy() != null ? axes.autonomy() : "",
                    "conflictMode", axes.conflictMode() != null ? axes.conflictMode() : ""));
        }

        if (d.descriptor() != null && !d.descriptor().dispositionProfile().isEmpty()) {
            var terms = new java.util.ArrayList<Map<String, Object>>();
            for (var t : d.descriptor().dispositionProfile()) {
                terms.add(Map.of("term", t.term(), "weight", t.weight()));
            }
            result.put("dispositionProfile", terms);
        }

        if (d.personality() != null) {
            var weights = new LinkedHashMap<String, Double>();
            d.personality().domainWeights().forEach((domain, weight) ->
                                                            weights.put(domain.name(), weight));
            result.put("personalityWeights", weights);
        }

        if (d.moodBaseline() != null) {
            result.put("moodBaseline", Map.of(
                    "pleasure", d.moodBaseline().pleasure(),
                    "arousal", d.moodBaseline().arousal(),
                    "dominance", d.moodBaseline().dominance()));
        }

        if (d.appraisalWeights() != null) {
            result.put("appraisalWeights", Map.of(
                    "urgencyWeight", d.appraisalWeights().urgencyWeight(),
                    "relationshipWeight", d.appraisalWeights().relationshipWeight(),
                    "fearOnsetThreshold", d.appraisalWeights().fearOnsetThreshold(),
                    "selfStandardsStrictness", d.appraisalWeights().selfStandardsStrictness(),
                    "otherStandardsStrictness", d.appraisalWeights().otherStandardsStrictness()));
        }

        if (d.habituationConfig() != null) {
            result.put("habituation", Map.of(
                    "habituationRate", d.habituationConfig().habituationRate(),
                    "noveltyThreshold", d.habituationConfig().noveltyThreshold(),
                    "repetitionTolerance", d.habituationConfig().repetitionTolerance()));
        }

        if (d.cbrStrategy() != null) {
            result.put("cbrStrategy", Map.of(
                    "minSimilarity", d.cbrStrategy().minSimilarity(),
                    "temporalDecayDays", d.cbrStrategy().temporalDecayDays(),
                    "retrievalMode", d.cbrStrategy().retrievalMode().name()));
        }

        if (d.socialCognition() != null) {
            result.put("socialCognition", Map.of(
                    "trustFormationRate", d.socialCognition().trustFormationRate(),
                    "conflictInterpretation", d.socialCognition().conflictInterpretation().name()));
        }

        if (d.graphStructure() != null) {
            result.put("graphStructure", Map.of(
                    "inferenceStyle", d.graphStructure().inferenceStyle().name(),
                    "connectiveBias", d.graphStructure().connectiveBias()));
        }

        if (d.extractionBias() != null) {
            result.put("extractionBias", Map.of(
                    "relationshipBias", d.extractionBias().relationshipBias(),
                    "affectSensitivity", d.extractionBias().affectSensitivity()));
        }

        return result;
    }


    @GET
    @Path("/memories/{entityName}")
    public List<Map<String, Object>> memoriesByEntity(@PathParam("entityName") String entityName,
                                                      @QueryParam("domain") String domain) {
        var subject = new Subject("person", entityName.toLowerCase().replace(' ', '-'));
        var memDomain = new io.casehub.neocortex.memory.MemoryDomain(domain != null ? domain : "experience");
        var query = MemoryQuery.forSubject(subject, memDomain, session.tenantId()).withLimit(50);
        return toMemoryList(memoryStore.query(query));
    }

    @GET
    @Path("/memories-mentioning/{name}")
    public List<Map<String, Object>> memoriesMentioning(@PathParam("name") String name) {
        String nameLower = name.toLowerCase();
        var allMemories = new java.util.ArrayList<Memory>();
        for (var domain : java.util.List.of("experience", "relationship", "reflection", "mood")) {
            var request = new io.casehub.neocortex.memory.MemoryScanRequest(
                    session.tenantId(), domain, null, null, 200, null);
            allMemories.addAll(memoryStore.scan(request));
        }
        var matching = allMemories.stream()
                .filter(m -> {
                    String mentioned = m.attributes().get("mentioned-entities");
                    if (mentioned == null) return false;
                    for (var entity : mentioned.split(",")) {
                        if (entity.trim().equals(nameLower)) return true;
                    }
                    return false;
                })
                .toList();
        return toMemoryList(matching);
    }

    @GET
    @Path("/memories")
    public Map<String, Object> allMemories(@QueryParam("domain") String domain,
                                            @QueryParam("limit") Integer limit) {
        var domains = domain != null
                ? java.util.List.of(domain)
                : java.util.List.of("experience", "relationship", "reflection", "mood");
        var allMemories = new java.util.ArrayList<Map<String, Object>>();
        var domainCounts = new java.util.LinkedHashMap<String, Integer>();
        for (var d : domains) {
            var request = new io.casehub.neocortex.memory.MemoryScanRequest(
                    session.tenantId(), d, null, null, limit != null ? limit : 50, null);
            var results = memoryStore.scan(request);
            domainCounts.put(d, results.size());
            allMemories.addAll(toMemoryList(results));
        }
        return Map.of("memories", allMemories, "domainCounts", domainCounts, "total", allMemories.size());
    }

    private static boolean containsWord(String text, String word) {
        if (text == null || word == null) return false;
        String lower = text.toLowerCase();
        int idx = 0;
        while ((idx = lower.indexOf(word, idx)) >= 0) {
            boolean startOk = idx == 0 || !Character.isLetterOrDigit(lower.charAt(idx - 1));
            boolean endOk = idx + word.length() >= lower.length() || !Character.isLetterOrDigit(lower.charAt(idx + word.length()));
            if (startOk && endOk) return true;
            idx++;
        }
        return false;
    }

    private List<Map<String, Object>> toMemoryList(java.util.List<Memory> memories) {
        return memories.stream().map(m -> {
            Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("id", m.memoryId());
            entry.put("text", m.text());
            entry.put("domain", m.domain().name());
            entry.put("confidence", m.confidence() != null ? m.confidence().value() : 0.0);
            entry.put("attributes", m.attributes());
            if (m.pleasure() != null) {
                entry.put("pleasure", m.pleasure());
                entry.put("arousal", m.arousal());
                entry.put("dominance", m.dominance());
            }
            entry.put("subject", m.subject() != null ? m.subject().id() : null);
            return entry;
        }).toList();
    }
}
