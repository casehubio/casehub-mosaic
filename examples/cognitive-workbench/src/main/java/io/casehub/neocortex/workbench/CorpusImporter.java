package io.casehub.neocortex.workbench;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.casehub.neocortex.cognitive.Confidence;
import io.casehub.neocortex.cognitive.ConfidenceOrigin;
import io.casehub.neocortex.cognitive.index.CognitiveDefaultsRegistry;
import io.casehub.neocortex.cognitive.index.CognitiveDerivationEngine;
import io.casehub.neocortex.cognitive.index.DescriptorView;
import io.casehub.neocortex.cognitive.index.DispositionAxes;
import io.casehub.neocortex.memory.CaseMemoryStore;
import io.casehub.neocortex.memory.MemoryDomain;
import io.casehub.neocortex.memory.MemoryInput;
import io.casehub.neocortex.memory.Subject;
import io.casehub.neocortex.memory.experience.SubThoughtAttributeKeys;
import io.casehub.neocortex.memory.mood.MoodEvents;
import io.casehub.neocortex.memory.mood.MoodState;
import io.casehub.neocortex.mindmap.EdgeInput;
import io.casehub.neocortex.mindmap.LifecycleResolver;
import io.casehub.neocortex.mindmap.MindMapStore;
import io.casehub.neocortex.mindmap.MindMapVocabulary;
import io.casehub.neocortex.mindmap.NodeInput;
import io.casehub.neocortex.mindmap.NodeUpdate;
import io.casehub.neocortex.mindmap.NodeRef;
import io.casehub.neocortex.mindmap.SubgraphInput;
import io.casehub.neocortex.mindmap.SubgraphTypes;
import io.casehub.neocortex.mindmap.VocabularyConflictException;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@ApplicationScoped
public class CorpusImporter {

    @Inject MindMapStore mindMapStore;
    @Inject CaseMemoryStore memoryStore;
    @Inject DatasetSession session;
    @Inject jakarta.enterprise.inject.Instance<CognitiveDefaultsRegistry> registryInstance;
    @Inject jakarta.enterprise.inject.Instance<io.casehub.neocortex.caps.CapsEngine> capsEngineInstance;

    @ConfigProperty(name = "workbench.corpus.path", defaultValue = "/corpus.json")
    String corpusPath;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    void onStartup(@Observes StartupEvent ev) {
        if (session.isSeeded()) return;
        try {
            importCorpus();
            session.markSeeded();
        } catch (Exception e) {
            throw new RuntimeException("Failed to import corpus: " + e.getMessage(), e);
        }
    }

    private void importCorpus() throws Exception {
        InputStream is = getClass().getResourceAsStream(corpusPath);
        if (is == null) {throw new IllegalStateException("Corpus not found: " + corpusPath);}

        JsonNode root = MAPPER.readTree(is);
        String   t    = session.tenantId();

        Map<String, String> subgraphIds = createSubgraphs(t);
        var                 importStats = new ImportStats();
        Map<String, String> nodeIds     = importNodes(root.get("nodes"), subgraphIds, t, importStats);
        Set<String>         edgeTypes   = new HashSet<>();
        int                 edgeCount   = importEdges(root.get("edges"), nodeIds, t, edgeTypes);
        registerVocabulary(edgeTypes);
        var nodeNames = new ArrayList<>(nodeIds.keySet());

        // #537: Resolve subject from corpus instead of hardcoding
        var subject  = resolveSubject(root);
        int memCount = importMemories(root.get("memories"), t, nodeNames, importStats, subject);

        // #684: Link subject person to all goal nodes
        int goalEdgeCount = linkSubjectToGoals(root, nodeIds, t, edgeTypes);
        edgeCount += goalEdgeCount;

        // #536: Import entity enrichments
        importEntityEnrichments(root.get("entity_enrichments"), t, nodeIds, subject, edgeTypes);

        JsonNode disposition = root.get("disposition_profile");
        if (disposition != null && disposition.isObject()) {
            importStats.profileDerived = deriveAndRegisterProfile(disposition);
        }
        initializeMoodBaseline(t, root.get("memories"));

        importStats.nodeCount = nodeIds.size();
        importStats.edgeCount = edgeCount;
        importStats.memCount  = memCount;
        printImportReport(importStats);
    }

    private Map<String, String> createSubgraphs(String tenantId) {
        var sgIds = new LinkedHashMap<String, String>();
        for (var type : new String[]{
                SubgraphTypes.PERSON, SubgraphTypes.PLACE, SubgraphTypes.ACTIVITY,
                SubgraphTypes.GOAL, SubgraphTypes.PROJECT, SubgraphTypes.CONCEPT,
                SubgraphTypes.ORGANISATION, SubgraphTypes.BEHAVIORAL}) {
            String label = type.substring(0, 1).toUpperCase() + type.substring(1);
            String name = label.endsWith("y") ? label.substring(0, label.length() - 1) + "ies"
                    : label.endsWith("s") ? label : label + "s";
            sgIds.put(type, mindMapStore.createSubgraph(new SubgraphInput(name, type, null), tenantId));
        }
        return sgIds;
    }

    private Map<String, String> importNodes(JsonNode nodesArray, Map<String, String> subgraphIds,
                                            String tenantId, ImportStats stats) {
        var nodeIds = new HashMap<String, String>();
        if (nodesArray == null) {return nodeIds;}

        for (JsonNode node : nodesArray) {
            String name = node.get("name").asText();
            String type = node.has("subgraph_type") ? node.get("subgraph_type").asText() : "concept";
            String sgId = subgraphIds.getOrDefault(type, subgraphIds.get("concept"));
            if (sgId == null) {continue;}

            var input = NodeInput.of(name, sgId);

            JsonNode confNode = node.get("confidence");
            if (confNode != null && confNode.isObject()) {
                String origin = confNode.path("origin").asText("STATED");
                double value  = confNode.path("value").asDouble(0.8);
                try {
                    input = input.withConfidence(new Confidence(ConfidenceOrigin.valueOf(origin), value, null));
                } catch (Exception e) {
                    input = input.withConfidence(new Confidence(ConfidenceOrigin.STATED, value, null));
                }
            } else {
                input = input.withConfidence(new Confidence(ConfidenceOrigin.STATED, 0.8, null));
            }

            JsonNode traits = node.get("traits");
            if (traits != null && traits.isArray() && !traits.isEmpty()) {
                var traitSet = new HashSet<String>();
                for (JsonNode trait : traits) {traitSet.add(trait.asText());}
                input = input.withTraits(traitSet);
                stats.traitsAssigned++;
            }

            JsonNode nodePad = node.get("pad");
            if (nodePad != null && nodePad.isObject()) {
                double p = nodePad.path("pleasure").asDouble(0);
                double a = nodePad.path("arousal").asDouble(0);
                double d = nodePad.path("dominance").asDouble(0);
                input = input.withPad(p, a, d);
                stats.nodesWithPad++;
            }

            JsonNode nodeRef = node.get("node_ref");
            if (nodeRef != null && nodeRef.isObject()) {
                input = input.withRefs(Set.of(new NodeRef(
                        nodeRef.path("scheme").asText("biography"),
                        nodeRef.path("id").asText(""),
                        nodeRef.path("qualifier").asText(null))));
            }

            // #533: All properties including goal.*, trait.*, source-passages
            for (var entry : buildNodeProperties(node).entrySet()) {
                input = input.withProperty(entry.getKey(), entry.getValue());
            }

            // #531: LifecycleResolver for temporal bounds
            var bounds = resolveTemporalBounds(node);
            if (bounds.validFrom() != null) {
                input = input.withValidFrom(bounds.validFrom());
            } else if (node.has("valid_from")) {
                try {
                    String vf = node.get("valid_from").asText();
                    if (vf.length() == 10) {vf = vf + "T00:00:00Z";}
                    input = input.withValidFrom(java.time.Instant.parse(vf));
                } catch (Exception ignored) {}
            }
            if (bounds.validUntil() != null) {
                input = input.withValidUntil(bounds.validUntil());
            } else if (node.has("valid_until")) {
                try {
                    String vu = node.get("valid_until").asText();
                    if (vu.length() == 10) {vu = vu + "T00:00:00Z";}
                    input = input.withValidUntil(java.time.Instant.parse(vu));
                } catch (Exception ignored) {}
            }

            String nodeId = mindMapStore.addNode(input, tenantId);
            nodeIds.put(name.toLowerCase(), nodeId);
        }
        return nodeIds;
    }

    private int importEdges(JsonNode edgesArray, Map<String, String> nodeIds, String tenantId,
                            Set<String> edgeTypes) {
        if (edgesArray == null) {return 0;}
        int count = 0;
        for (JsonNode edge : edgesArray) {
            String source = edge.get("source").asText().toLowerCase();
            String target = edge.get("target").asText().toLowerCase();
            String type   = edge.get("type").asText();

            String sourceId = nodeIds.get(source);
            String targetId = nodeIds.get(target);
            if (sourceId == null || targetId == null) {continue;}

            var edgeInput = EdgeInput.of(sourceId, targetId, type);

            // #534: Edge metadata
            var edgeProps = buildEdgeProperties(edge);
            if (!edgeProps.isEmpty()) {
                edgeInput = edgeInput.withProperties(edgeProps);
            }
            String confOrigin = edge.path("confidence_origin").asText(null);
            if (confOrigin != null) {
                try {
                    edgeInput = edgeInput.withConfidence(
                            new Confidence(ConfidenceOrigin.valueOf(confOrigin), 0.8, null));
                } catch (Exception ignored) {}
            }

            mindMapStore.addEdge(edgeInput, tenantId);
            edgeTypes.add(type);
            count++;
        }
        return count;
    }

    private int importMemories(JsonNode memoriesArray, String tenantId, List<String> nodeNames,
                               ImportStats stats, Subject subject) {
        if (memoriesArray == null) {return 0;}
        int count = 0;

        nodeNames.sort((a, b) -> b.length() - a.length());

        for (JsonNode mem : memoriesArray) {
            String text   = mem.get("text").asText();
            String domain = mem.has("domain") ? mem.get("domain").asText() : "experience";
            if (!"experience".equals(domain)) {stats.domainsSplit++;}

            var attrs     = buildMemoryAttributes(mem);
            var mentioned = detectMentionedEntities(text, attrs, nodeNames);
            if (!mentioned.isEmpty()) {attrs.put("mentioned-entities", String.join(",", mentioned));}

            var input = MemoryInput.of(subject, new MemoryDomain(domain), tenantId, text)
                                   .withAttributes(attrs);

            JsonNode cogNode = mem.get("cognitive");
            if (cogNode == null) {cogNode = mem;}

            JsonNode pad = cogNode.get("pad");
            if (pad == null) {pad = mem.get("pad");}
            if (pad != null && pad.isObject()) {
                double p = pad.path("pleasure").asDouble(0);
                double a = pad.path("arousal").asDouble(0);
                double d = pad.path("dominance").asDouble(0);
                input = input.withPad(p, a, d);
            }

            JsonNode conf = cogNode.get("confidence");
            if (conf == null) {conf = mem.get("confidence");}
            if (conf != null && conf.isObject()) {
                double value  = conf.path("value").asDouble(0.8);
                String origin = conf.path("origin").asText("STATED");
                try {
                    input = input.withConfidence(new Confidence(ConfidenceOrigin.valueOf(origin), value, null));
                } catch (Exception ignored) {
                    input = input.withConfidence(new Confidence(ConfidenceOrigin.STATED, value, null));
                }
            }

            memoryStore.store(input);
            count++;
        }
        return count;
    }

    private int linkSubjectToGoals(JsonNode root, Map<String, String> nodeIds, String tenantId,
                                   Set<String> edgeTypes) {
        String subjectName = session.subjectName();
        if (subjectName == null) return 0;
        String subjectId = nodeIds.get(subjectName.toLowerCase());
        if (subjectId == null) return 0;

        JsonNode nodesArray = root.get("nodes");
        if (nodesArray == null) return 0;
        int count = 0;
        for (JsonNode node : nodesArray) {
            String type = node.path("subgraph_type").asText("");
            if (!"goal".equals(type)) continue;
            String goalName = node.get("name").asText().toLowerCase();
            String goalId = nodeIds.get(goalName);
            if (goalId == null || goalId.equals(subjectId)) continue;
            mindMapStore.addEdge(EdgeInput.of(subjectId, goalId, "pursues")
                    .withConfidence(new Confidence(ConfidenceOrigin.INFERRED, 0.7, null)), tenantId);
            edgeTypes.add("pursues");
            count++;
        }
        return count;
    }

    private void importEntityEnrichments(JsonNode enrichments, String tenantId,
                                         Map<String, String> nodeIds, Subject subject,
                                         Set<String> edgeTypes) {
        if (enrichments == null || !enrichments.isObject()) {return;}

        var fields = enrichments.fields();
        while (fields.hasNext()) {
            var      entry      = fields.next();
            String   entityName = entry.getKey();
            JsonNode entityData = entry.getValue();
            if (!entityData.isObject()) {continue;}

            String nodeId = nodeIds.get(entityName.toLowerCase());

            // Store drive baselines as node properties if we have the node
            JsonNode driveBaselines = entityData.get("drive_baselines");
            if (driveBaselines != null && driveBaselines.isObject() && nodeId != null) {
                var driveFields = driveBaselines.fields();
                while (driveFields.hasNext()) {
                    var df = driveFields.next();
                    if (df.getValue().isNumber()) {
                        mindMapStore.updateNode(nodeId,
                                NodeUpdate.empty()
                                        .withPropertiesToSet(Map.of("drive." + df.getKey(), String.format("%.2f", df.getValue().asDouble()))),
                                tenantId);
                    }
                }
            }

            // #685: Seed CAPS weights from biographical patterns (subject only)
            JsonNode capsPatterns = entityData.get("caps_patterns");
            if (capsPatterns != null && capsPatterns.isArray()
                    && entityName.equalsIgnoreCase(session.subjectName())
                    && capsEngineInstance.isResolvable()) {
                seedCapsWeights(capsPatterns, tenantId);
            }

            // #686: Import behavioural attractors as BEHAVIORAL subgraph nodes (subject only)
            JsonNode attractors = entityData.get("behavioural_attractors");
            if (attractors != null && attractors.isArray()
                    && entityName.equalsIgnoreCase(session.subjectName())) {
                var behavioralSg = mindMapStore.listSubgraphs(tenantId).stream()
                        .filter(s -> "behavioral".equals(s.type())).findFirst().orElse(null);
                if (behavioralSg != null) {
                    for (JsonNode attractor : attractors) {
                        String aName = attractor.path("name").asText("unnamed-attractor");
                        var input = NodeInput.of(aName, behavioralSg.id())
                                .withConfidence(new Confidence(ConfidenceOrigin.INFERRED,
                                        attractor.path("strength").asDouble(0.7), null))
                                .withTraits(Set.of("CapsGenerated"))
                                .withProperty("provenance", "biographical-import")
                                .withProperty("attractor.strength", String.format("%.2f", attractor.path("strength").asDouble(0.7)))
                                .withProperty("attractor.trigger", attractor.path("trigger").asText(""))
                                .withProperty("attractor.response", attractor.path("response").asText(""));
                        if (attractor.has("description")) {
                            input = input.withProperty("description", attractor.get("description").asText());
                        }
                        String attractorId = mindMapStore.addNode(input, tenantId);
                        nodeIds.put(aName.toLowerCase(), attractorId);
                    }
                }
            }

            // #684: Import goal coherence as theme nodes + edges (subject only)
            JsonNode goalCoherence = entityData.get("goal_coherence");
            if (goalCoherence != null && goalCoherence.isObject()
                    && entityName.equalsIgnoreCase(session.subjectName())) {
                importGoalCoherence(goalCoherence, entityName, tenantId, nodeIds, edgeTypes, subject);
            }
        }
    }


    private void importGoalCoherence(JsonNode goalCoherence, String entityName, String tenantId,
                                     Map<String, String> nodeIds, Set<String> edgeTypes, Subject subject) {
        String subjectId = nodeIds.get(entityName.toLowerCase());
        var goalSubgraph = mindMapStore.listSubgraphs(tenantId).stream()
                .filter(s -> "goal".equals(s.type())).findFirst().orElse(null);
        if (goalSubgraph == null) return;

        // Create theme goal nodes for names that don't match existing goals
        JsonNode conflicts = goalCoherence.get("conflicts");
        JsonNode synergies = goalCoherence.get("synergies");
        var themeGoalNames = new java.util.LinkedHashSet<String>();
        if (conflicts != null) for (JsonNode c : conflicts) {
            JsonNode goals = c.get("goals");
            if (goals != null) for (JsonNode g : goals) themeGoalNames.add(g.asText());
        }
        if (synergies != null) for (JsonNode s : synergies) {
            JsonNode goals = s.get("goals");
            if (goals != null) for (JsonNode g : goals) themeGoalNames.add(g.asText());
        }

        for (String themeName : themeGoalNames) {
            if (nodeIds.containsKey(themeName.toLowerCase())) continue;
            var input = NodeInput.of(themeName, goalSubgraph.id())
                    .withConfidence(new Confidence(ConfidenceOrigin.INFERRED, 0.6, null))
                    .withProperty("goal.tier", "theme")
                    .withProperty("provenance", "goal-coherence-import");
            String themeId = mindMapStore.addNode(input, tenantId);
            nodeIds.put(themeName.toLowerCase(), themeId);
            if (subjectId != null) {
                mindMapStore.addEdge(EdgeInput.of(subjectId, themeId, "pursues")
                        .withConfidence(new Confidence(ConfidenceOrigin.INFERRED, 0.6, null)), tenantId);
                edgeTypes.add("pursues");
            }
        }

        // Create edges between conflicting goals
        if (conflicts != null) for (JsonNode c : conflicts) {
            JsonNode goals = c.get("goals");
            if (goals == null || goals.size() < 2) continue;
            for (int i = 0; i < goals.size(); i++) {
                for (int j = i + 1; j < goals.size(); j++) {
                    String aId = nodeIds.get(goals.get(i).asText().toLowerCase());
                    String bId = nodeIds.get(goals.get(j).asText().toLowerCase());
                    if (aId != null && bId != null) {
                        var props = new HashMap<String, String>();
                        if (c.has("nature")) props.put("conflict-nature", c.get("nature").asText());
                        mindMapStore.addEdge(EdgeInput.of(aId, bId, "blocks").withProperties(props)
                                .withConfidence(new Confidence(ConfidenceOrigin.INFERRED, 0.7, null)), tenantId);
                        edgeTypes.add("blocks");
                    }
                }
            }
        }

        // Create edges between synergistic goals
        if (synergies != null) for (JsonNode s : synergies) {
            JsonNode goals = s.get("goals");
            if (goals == null || goals.size() < 2) continue;
            for (int i = 0; i < goals.size(); i++) {
                for (int j = i + 1; j < goals.size(); j++) {
                    String aId = nodeIds.get(goals.get(i).asText().toLowerCase());
                    String bId = nodeIds.get(goals.get(j).asText().toLowerCase());
                    if (aId != null && bId != null) {
                        var props = new HashMap<String, String>();
                        if (s.has("nature")) props.put("synergy-nature", s.get("nature").asText());
                        mindMapStore.addEdge(EdgeInput.of(aId, bId, "enables").withProperties(props)
                                .withConfidence(new Confidence(ConfidenceOrigin.INFERRED, 0.7, null)), tenantId);
                        edgeTypes.add("enables");
                    }
                }
            }
        }

        // Still store the summary as a reflection memory for narrative access
        if (goalCoherence.has("summary")) {
            var attrs = new HashMap<String, String>();
            attrs.put("entity", entityName);
            attrs.put("enrichment-type", "goal-coherence");
            memoryStore.store(MemoryInput.of(subject, new MemoryDomain("reflection"), tenantId,
                    goalCoherence.get("summary").asText()).withAttributes(attrs));
        }
    }

    private void seedCapsWeights(JsonNode capsPatterns, String tenantId) {
        var engine = capsEngineInstance.get();
        var agentId = session.agentId();

        var state = engine.loadState(tenantId, agentId);
        if (state == null) {
            io.casehub.neocortex.cognitive.index.DispositionAxes axes = null;
            if (registryInstance.isResolvable()) {
                var defaults = registryInstance.get().forAgent(agentId);
                if (defaults.isPresent() && defaults.get().descriptor() != null) {
                    axes = defaults.get().descriptor().disposition();
                }
            }
            if (axes == null) {
                axes = new io.casehub.neocortex.cognitive.index.DispositionAxes(
                        "cooperative", "moderate", "calculated", "moderate", "cooperative");
            }
            state = engine.initializeAgent(tenantId, agentId, axes);
        }

        var topoNodes = engine.topology().nodes();
        int patternsApplied = 0;
        for (JsonNode pattern : capsPatterns) {
            String desc = pattern.path("pattern").asText("");
            if (desc.isBlank()) continue;
            double confidence = pattern.path("confidence").asDouble(0.7);
            int frequency = pattern.path("frequency").asInt(1);

            // Extract CAPS node IDs directly from the pattern description
            var inputMap = new java.util.LinkedHashMap<String, Double>();
            for (var nodeId : topoNodes.keySet()) {
                if (desc.contains(nodeId)) {
                    inputMap.put(nodeId, confidence);
                }
            }
            // Also try underscore→space matching
            if (inputMap.isEmpty()) {
                String descLower = desc.toLowerCase().replace("/", "_").replace(" ", "_");
                for (var nodeId : topoNodes.keySet()) {
                    if (descLower.contains(nodeId)) {
                        inputMap.put(nodeId, confidence);
                    }
                }
            }

            if (inputMap.isEmpty()) continue;

            for (int i = 0; i < frequency; i++) {
                state = engine.updateWeights(state, inputMap, confidence, 0.0, 1.0, "continuous");
            }
            patternsApplied++;
        }

        if (patternsApplied > 0) {
            engine.saveState(state);
            System.out.println("  CAPS weights seeded: " + patternsApplied + " patterns applied");
        }
    }

    private static java.util.List<String> detectMentionedEntities(String text, Map<String, String> attrs, java.util.List<String> nodeNames) {
        var searchable = new StringBuilder();
        if (text != null) searchable.append(text);
        for (var v : attrs.values()) {
            if (v != null) searchable.append(' ').append(v);
        }
        String corpus = searchable.toString().toLowerCase();

        var mentioned = new java.util.LinkedHashSet<String>();
        for (var name : nodeNames) {
            if (name.length() < 4) continue;
            if (containsWord(corpus, name)) {
                mentioned.add(name);
            }
            String[] parts = name.split("\\s+");
            if (parts.length > 1) {
                for (var part : parts) {
                    if (part.length() >= 5 && containsWord(corpus, part)) {
                        mentioned.add(name);
                        break;
                    }
                }
            }
        }
        return new java.util.ArrayList<>(mentioned);
    }

    private static boolean containsWord(String text, String word) {
        int idx = 0;
        while ((idx = text.indexOf(word, idx)) >= 0) {
            boolean startOk = idx == 0 || !Character.isLetterOrDigit(text.charAt(idx - 1));
            boolean endOk = idx + word.length() >= text.length() || !Character.isLetterOrDigit(text.charAt(idx + word.length()));
            if (startOk && endOk) return true;
            idx++;
        }
        return false;
    }

    static Map<String, String> buildMemoryAttributes(JsonNode mem) {
        var attrs = new HashMap<String, String>();

        if (mem.has("event_type")) {attrs.put("event-type", mem.get("event_type").asText());}
        if (mem.has("period")) {attrs.put("period", mem.get("period").asText());}
        if (mem.has("source_passage")) {attrs.put("source-passage", mem.get("source_passage").asText());}
        if (mem.has("enrichment_version")) {attrs.put("enrichment-version", mem.get("enrichment_version").asText());}
        if (mem.has("extraction_method")) {attrs.put("extraction-method", mem.get("extraction_method").asText());}
        if (mem.has("extraction_pass")) {attrs.put("extraction-pass", mem.get("extraction_pass").asText());}
        if (mem.has("enrichment_timestamp")) {
            attrs.put("enrichment-timestamp", mem.get("enrichment_timestamp").asText());
        }

        // #530: Formative experience attributes
        if ("formative-experience".equals(mem.path("event_type").asText(null))) {
            if (mem.has("developmental_period")) {
                attrs.put("developmental-period", mem.get("developmental_period").asText());
            }
            if (mem.has("situation_types")) {attrs.put("situation-types", mem.get("situation_types").asText());}
            if (mem.has("salience_multiplier")) {
                attrs.put("salience-multiplier", mem.get("salience_multiplier").asText());
            }
            if (mem.has("reinforcement_schedule")) {
                attrs.put("reinforcement-schedule", mem.get("reinforcement_schedule").asText());
            }
        }

        JsonNode cogNode = mem.get("cognitive");
        if (cogNode == null) {cogNode = mem;}

        JsonNode emotions = cogNode.get("occ_emotions");
        if (emotions != null && emotions.isArray() && !emotions.isEmpty()) {
            var sb = new StringBuilder();
            for (JsonNode e : emotions) {
                if (sb.length() > 0) {sb.append(",");}
                String eName     = e.has("type") ? e.get("type").asText() : e.has("emotion") ? e.get("emotion").asText() : "";
                double intensity = e.has("intensity") ? e.get("intensity").asDouble() : 0;
                sb.append(eName).append(":").append(String.format("%.2f", intensity));
                if (e.has("source")) {sb.append(":").append(e.get("source").asText());}
            }
            attrs.put("occ-emotions", sb.toString());
        }

        JsonNode tendencies = cogNode.get("action_tendencies");
        if (tendencies != null) {
            if (tendencies.isObject() && tendencies.has("dominant")) {
                JsonNode dom       = tendencies.get("dominant");
                String   tName     = dom.path("type").asText("");
                double   intensity = dom.path("intensity").asDouble(0);
                var      sb        = new StringBuilder(tName).append(":").append(String.format("%.2f", intensity));
                JsonNode sec       = tendencies.get("secondary");
                if (sec != null && sec.isArray()) {
                    for (JsonNode s : sec) {
                        sb.append(",").append(s.path("type").asText("")).append(":").append(String.format("%.2f", s.path("intensity").asDouble(0)));
                    }
                }
                attrs.put("action-tendencies", sb.toString());
            } else if (tendencies.isArray() && !tendencies.isEmpty()) {
                var sb = new StringBuilder();
                for (JsonNode at : tendencies) {
                    if (sb.length() > 0) {sb.append(",");}
                    if (at.isTextual()) {
                        sb.append(at.asText());
                    } else {
                        sb.append(at.path("type").asText(""));
                        if (at.has("intensity")) {
                            sb.append(":").append(String.format("%.2f", at.get("intensity").asDouble()));
                        }
                    }
                }
                attrs.put("action-tendencies", sb.toString());
            }
        }

        JsonNode distortions = cogNode.get("cognitive_distortions");
        if (distortions != null && distortions.isArray() && !distortions.isEmpty()) {
            var sb = new StringBuilder();
            for (JsonNode d : distortions) {
                if (sb.length() > 0) {sb.append(",");}
                if (d.isTextual()) {
                    sb.append(d.asText());
                } else {
                    sb.append(d.path("type").asText(""));
                    if (d.has("strength")) {sb.append(":").append(String.format("%.2f", d.get("strength").asDouble()));}
                }
            }
            attrs.put("cognitive-distortions", sb.toString());
        }

        JsonNode secNode = cogNode.get("sec");
        if (secNode == null) {secNode = cogNode.get("sec_appraisal");}
        if (secNode != null && secNode.isObject()) {
            var fields = secNode.fields();
            while (fields.hasNext()) {
                var f = fields.next();
                if (f.getValue().isNumber()) {
                    attrs.put("sec-" + f.getKey(), String.format("%.2f", f.getValue().asDouble()));
                }
            }
        }

        JsonNode drives = cogNode.get("drive_impact");
        if (drives != null && drives.isObject()) {
            var sb     = new StringBuilder();
            var fields = drives.fields();
            while (fields.hasNext()) {
                var f = fields.next();
                if (f.getValue().isNumber()) {
                    if (sb.length() > 0) {sb.append(",");}
                    sb.append(f.getKey()).append(":").append(String.format("%.2f", f.getValue().asDouble()));
                }
            }
            if (sb.length() > 0) {attrs.put("drive-impact", sb.toString());}
        }

        JsonNode subThoughts = cogNode.get("sub_thoughts");
        if (subThoughts != null && subThoughts.isArray() && !subThoughts.isEmpty()) {
            attrs.put(SubThoughtAttributeKeys.COUNT, String.valueOf(subThoughts.size()));
            for (int i = 0; i < subThoughts.size(); i++) {
                JsonNode st       = subThoughts.get(i);
                String   stType   = st.isTextual() ? st.asText() : st.path("type").asText("");
                String   stText   = st.path("text").asText(st.path("content").asText(""));
                String   stEntity = st.path("entity").asText("");
                attrs.put(SubThoughtAttributeKeys.type(i), stType);
                if (!stText.isEmpty()) {attrs.put(SubThoughtAttributeKeys.text(i), stText);}
                if (!stEntity.isEmpty()) {attrs.put(SubThoughtAttributeKeys.entity(i), stEntity);}
            }
        }

        JsonNode hab = cogNode.get("habituation");
        if (hab == null) {hab = mem.get("habituation");}
        if (hab != null && hab.isObject()) {
            if (hab.has("novelty")) {attrs.put("habituation-novelty", hab.get("novelty").asText());}
            if (hab.has("score")) {attrs.put("habituation-score", String.format("%.2f", hab.get("score").asDouble()));}
            if (hab.has("echoes")) {attrs.put("habituation-echoes", hab.get("echoes").asText());}
        }

        JsonNode caps = cogNode.get("caps_inputs");
        if (caps == null) {caps = mem.get("caps_inputs");}
        if (caps != null && caps.isObject()) {
            var sb     = new StringBuilder();
            var fields = caps.fields();
            while (fields.hasNext()) {
                var f = fields.next();
                if (sb.length() > 0) {sb.append(",");}
                sb.append(f.getKey()).append(":").append(String.format("%.2f", f.getValue().asDouble()));
            }
            if (sb.length() > 0) {attrs.put("caps-inputs", sb.toString());}
        }

        JsonNode goalImpacts = cogNode.get("goal_impacts");
        if (goalImpacts == null) {goalImpacts = mem.get("goal_impacts");}
        if (goalImpacts != null && goalImpacts.isArray() && !goalImpacts.isEmpty()) {
            var sb = new StringBuilder();
            for (JsonNode g : goalImpacts) {
                if (sb.length() > 0) {sb.append("|");}
                sb.append(g.path("goal").asText()).append(":").append(g.path("relationship").asText());
            }
            attrs.put("goal-impacts", sb.toString());
        }

        JsonNode rel = cogNode.get("relationship");
        if (rel == null) {rel = mem.get("relationship");}
        if (rel != null && rel.isObject()) {
            if (rel.has("quality_signal")) {attrs.put("quality-signal", rel.get("quality_signal").asText());}
            if (rel.has("other_agent")) {attrs.put("other-agent", rel.get("other_agent").asText());}
            if (rel.has("trust_trajectory")) {attrs.put("trust-trajectory", rel.get("trust_trajectory").asText());}
        }

        if (mem.has("pad_justification")) {attrs.put("pad-justification", mem.get("pad_justification").asText());}
        if (mem.has("drive_justification")) {attrs.put("drive-justification", mem.get("drive_justification").asText());}
        if (mem.has("confidence_justification")) {
            attrs.put("confidence-justification", mem.get("confidence_justification").asText());
        }

        // #532: Remaining corpus attributes
        JsonNode gutFeeling = mem.get("gut_feeling");
        if (gutFeeling == null) {gutFeeling = cogNode.get("gut_feeling");}
        if (gutFeeling != null && gutFeeling.isObject()) {
            if (gutFeeling.has("valence")) {attrs.put("gut-feeling-valence", gutFeeling.get("valence").asText());}
            if (gutFeeling.has("intensity")) {
                attrs.put("gut-feeling-intensity", String.format("%.2f", gutFeeling.get("intensity").asDouble()));
            }
            if (gutFeeling.has("resonance")) {attrs.put("gut-feeling-resonance", gutFeeling.get("resonance").asText());}
        }

        if (mem.has("temporal_period")) {attrs.put("temporal-period", mem.get("temporal_period").asText());}

        JsonNode capsExpected = mem.get("caps_expected_outputs");
        if (capsExpected == null) {capsExpected = cogNode.get("caps_expected_outputs");}
        if (capsExpected != null && capsExpected.isObject()) {
            var sb     = new StringBuilder();
            var fields = capsExpected.fields();
            while (fields.hasNext()) {
                var f = fields.next();
                if (f.getValue().isNumber()) {
                    if (sb.length() > 0) {sb.append(",");}
                    sb.append(f.getKey()).append(":").append(String.format("%.2f", f.getValue().asDouble()));
                }
            }
            if (sb.length() > 0) {attrs.put("caps-expected-outputs", sb.toString());}
        }

        if (mem.has("contradicts")) {attrs.put("contradicts", mem.get("contradicts").asText());}

        // #535: Memory provenance fields
        JsonNode relatedEntities = mem.get("related_entities");
        if (relatedEntities != null && relatedEntities.isArray() && !relatedEntities.isEmpty()) {
            var sb = new StringBuilder();
            for (JsonNode re : relatedEntities) {
                if (sb.length() > 0) sb.append(",");
                sb.append(re.asText());
            }
            attrs.put("related-entities", sb.toString());
        }
        if (mem.has("source_start")) attrs.put("source-start", mem.get("source_start").asText());
        if (mem.has("source_end")) attrs.put("source-end", mem.get("source_end").asText());
        if (mem.has("reflection_level")) attrs.put("reflection-level", mem.get("reflection_level").asText());
        JsonNode sourceIndices = mem.get("source_memory_indices");
        if (sourceIndices != null && sourceIndices.isArray() && !sourceIndices.isEmpty()) {
            var sb = new StringBuilder();
            for (JsonNode idx : sourceIndices) {
                if (sb.length() > 0) sb.append(",");
                sb.append(idx.asText());
            }
            attrs.put("source-memory-indices", sb.toString());
        }

        return attrs;
    }

    static LifecycleResolver.TemporalBounds resolveTemporalBounds(JsonNode node) {
        String   type  = node.has("subgraph_type") ? node.get("subgraph_type").asText() : "concept";
        JsonNode props = node.get("properties");
        if (props == null || !props.isObject()) {
            return new LifecycleResolver.TemporalBounds(null, null);
        }
        var properties = new HashMap<String, String>();
        var fields     = props.fields();
        while (fields.hasNext()) {
            var f = fields.next();
            properties.put(f.getKey(), f.getValue().asText());
        }
        return LifecycleResolver.resolve(properties, type);
    }

    static Map<String, String> buildNodeProperties(JsonNode node) {
        var props = new HashMap<String, String>();

        JsonNode existingProps = node.get("properties");
        if (existingProps != null && existingProps.isObject()) {
            var fields = existingProps.fields();
            while (fields.hasNext()) {
                var field = fields.next();
                props.put(field.getKey(), field.getValue().asText());
            }
        }

        // #533: Goal fields stored as goal.* properties
        for (String gk : new String[]{"goal_tier", "goal_horizon", "goal_status", "goal_urgency",
                                      "goal_need_tier", "goal_priority", "goal_feasibility", "goal_target_date"}) {
            if (node.has(gk)) {
                String propKey = "goal." + gk.substring(5).replace('_', '-');
                props.put(propKey, node.get(gk).asText());
            }
        }

        // #533: Trait properties stored as trait.* properties
        JsonNode traitProps = node.get("trait_properties");
        if (traitProps != null && traitProps.isObject()) {
            var fields = traitProps.fields();
            while (fields.hasNext()) {
                var f = fields.next();
                props.put("trait." + f.getKey(), f.getValue().asText());
            }
        }

        // #533: Source passages provenance
        JsonNode sourcePassages = node.get("source_passages");
        if (sourcePassages != null && sourcePassages.isArray() && !sourcePassages.isEmpty()) {
            var sb = new StringBuilder();
            for (JsonNode sp : sourcePassages) {
                if (sb.length() > 0) {sb.append(",");}
                sb.append(sp.asText());
            }
            props.put("source-passages", sb.toString());
        }

        return props;
    }

    static Map<String, String> buildEdgeProperties(JsonNode edge) {
        var props = new HashMap<String, String>();
        if (edge.has("confidence_origin")) {props.put("confidence-origin", edge.get("confidence_origin").asText());}
        if (edge.has("validation_tier")) {props.put("validation-tier", edge.get("validation_tier").asText());}
        if (edge.has("source_passage")) {props.put("source-passage", edge.get("source_passage").asText());}
        return props;
    }

    static Subject resolveSubject(JsonNode root) {
        String subjectId = root.has("subject") ? root.get("subject").asText() : "unknown";
        return new Subject("person", subjectId);
    }


    private void registerVocabulary(Set<String> edgeTypes) {
        if (edgeTypes.isEmpty()) return;
        var builder = MindMapVocabulary.builder();
        for (String type : edgeTypes) {
            builder.edgeType(type);
        }
        try {
            mindMapStore.registerVocabulary(builder.build());
        } catch (VocabularyConflictException e) {
            System.out.println("Vocabulary registration conflict (safe to ignore): " + e.getMessage());
        }
    }

    private boolean deriveAndRegisterProfile(JsonNode disposition) {
        if (registryInstance.isUnsatisfied()) {
            System.out.println("CognitiveDefaultsRegistry not available — skipping profile derivation");
            return false;
        }
        try {
            String socialOrient = disposition.path("socialOrient").asDouble(0.5) > 0.5 ? "extrovert" : "introvert";
            String ruleFollowing = disposition.path("ruleFollowing").asDouble(0.5) > 0.5 ? "strict" : "flexible";
            String riskAppetite = disposition.path("riskAppetite").asDouble(0.5) > 0.5 ? "bold" : "cautious";
            String autonomy = disposition.path("autonomy").asDouble(0.5) > 0.5 ? "high" : "low";
            String conflictMode = disposition.path("conflictMode").asDouble(0.5) > 0.5 ? "confrontational" : "avoidant";

            var axes = new DispositionAxes(socialOrient, ruleFollowing, riskAppetite, autonomy, conflictMode);
            var descriptor = DescriptorView.of(session.agentId(), axes, List.of(), List.of());
            var defaults = CognitiveDerivationEngine.derive(descriptor);
            registryInstance.get().register(defaults);
            return true;
        } catch (Exception e) {
            System.out.println("Profile derivation failed: " + e.getMessage());
            return false;
        }
    }

    private void initializeMoodBaseline(String tenantId, JsonNode memoriesArray) {
        if (memoriesArray == null) return;
        double sumP = 0, sumA = 0, sumD = 0;
        int count = 0;
        for (JsonNode mem : memoriesArray) {
            JsonNode pad = mem.path("pad");
            if (pad.isMissingNode()) pad = mem.path("cognitive").path("pad");
            if (!pad.isMissingNode() && pad.isObject()) {
                sumP += pad.path("pleasure").asDouble(0);
                sumA += pad.path("arousal").asDouble(0);
                sumD += pad.path("dominance").asDouble(0);
                count++;
            }
        }
        if (count > 0) {
            var mood = new MoodState(session.agentId(), tenantId, java.time.Instant.now(),
                    sumP / count, sumA / count, sumD / count,
                    "baseline from biography", null, null, Map.of());
            memoryStore.store(MoodEvents.toMemoryInput(mood));
        }
    }

    private void printImportReport(ImportStats s) {
        System.out.println("=== Import Coverage Report ===");
        System.out.printf("Nodes: %d imported%n", s.nodeCount);
        System.out.printf("  Traits assigned: %d/%d%n", s.traitsAssigned, s.nodeCount);
        System.out.printf("  PAD set: %d/%d%n", s.nodesWithPad, s.nodeCount);
        System.out.printf("Edges: %d imported%n", s.edgeCount);
        System.out.printf("Memories: %d imported%n", s.memCount);
        System.out.printf("  Domain-split: %d non-experience%n", s.domainsSplit);
        System.out.printf("Vocabulary: registered%n");
        System.out.printf("Derivations:%n");
        System.out.printf("  CognitiveDefaults: %s%n", s.profileDerived ? "registered" : "NOT registered");
        System.out.printf("  MoodBaseline: initialized%n");
    }

    private static class ImportStats {
        int nodeCount;
        int edgeCount;
        int memCount;
        int traitsAssigned;
        int nodesWithPad;
        int domainsSplit;
        boolean profileDerived;
    }
}
