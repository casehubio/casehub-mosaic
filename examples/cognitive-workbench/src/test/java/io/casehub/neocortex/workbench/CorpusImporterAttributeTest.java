package io.casehub.neocortex.workbench;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CorpusImporterAttributeTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // --- #530: Formative experience attributes ---

    @Test
    void formativeMemory_storesAllFourAttributes() {
        var mem = memoryNode("Frida contracted polio at age 6", "experience", "formative-experience");
        mem.put("developmental_period", "childhood");
        mem.put("situation_types", "physical_threat,agency_denied");
        mem.put("salience_multiplier", 1.8);
        mem.put("reinforcement_schedule", "continuous");

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).containsEntry("developmental-period", "childhood");
        assertThat(attrs).containsEntry("situation-types", "physical_threat,agency_denied");
        assertThat(attrs).containsEntry("salience-multiplier", "1.8");
        assertThat(attrs).containsEntry("reinforcement-schedule", "continuous");
    }

    @Test
    void nonFormativeMemory_doesNotStoreFormativeAttributes() {
        var mem = memoryNode("Frida painted a self-portrait", "experience", "observation");
        mem.put("developmental_period", "adulthood");

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).doesNotContainKey("developmental-period");
    }

    @Test
    void formativeMemory_partialAttributes_storesWhatIsPresent() {
        var mem = memoryNode("Frida's bus accident at age 18", "experience", "formative-experience");
        mem.put("developmental_period", "adolescence");
        mem.put("salience_multiplier", 2.0);

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).containsEntry("developmental-period", "adolescence");
        assertThat(attrs).containsEntry("salience-multiplier", "2.0");
        assertThat(attrs).doesNotContainKey("situation-types");
        assertThat(attrs).doesNotContainKey("reinforcement-schedule");
    }

    // --- #532: Remaining corpus attributes ---

    @Test
    void gutFeeling_storedAsAttribute() {
        var mem = memoryNode("Something feels wrong", "experience", "observation");
        var gut = MAPPER.createObjectNode();
        gut.put("valence", "AVOID");
        gut.put("intensity", 0.7);
        gut.put("resonance", "echoes childhood isolation");
        mem.set("gut_feeling", gut);

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).containsEntry("gut-feeling-valence", "AVOID");
        assertThat(attrs).containsEntry("gut-feeling-intensity", "0.70");
        assertThat(attrs).containsEntry("gut-feeling-resonance", "echoes childhood isolation");
    }

    @Test
    void temporalPeriod_storedAsAttribute() {
        var mem = memoryNode("During her Paris years", "experience", "observation");
        mem.put("temporal_period", "1938-1939");

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).containsEntry("temporal-period", "1938-1939");
    }

    @Test
    void capsExpectedOutputs_storedAsAttribute() {
        var mem = memoryNode("Frida confronted Diego about his affair", "experience", "action");
        var caps = MAPPER.createObjectNode();
        caps.put("emotional_reactivity", 0.8);
        caps.put("approach_motivation", 0.6);
        mem.set("caps_expected_outputs", caps);

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).containsKey("caps-expected-outputs");
        assertThat(attrs.get("caps-expected-outputs")).contains("emotional_reactivity:0.80");
        assertThat(attrs.get("caps-expected-outputs")).contains("approach_motivation:0.60");
    }

    @Test
    void contradicts_storedAsAttribute() {
        var mem = memoryNode("Frida claimed she never painted dreams", "experience", "observation");
        mem.put("contradicts", "She painted surreal dreamscapes throughout her career");

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).containsEntry("contradicts", "She painted surreal dreamscapes throughout her career");
    }

    @Test
    void memoryWithoutOptionalFields_noSpuriousAttributes() {
        var mem = memoryNode("A simple observation", "experience", "observation");

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).doesNotContainKey("developmental-period");
        assertThat(attrs).doesNotContainKey("situation-types");
        assertThat(attrs).doesNotContainKey("salience-multiplier");
        assertThat(attrs).doesNotContainKey("reinforcement-schedule");
        assertThat(attrs).doesNotContainKey("gut-feeling-valence");
        assertThat(attrs).doesNotContainKey("temporal-period");
        assertThat(attrs).doesNotContainKey("caps-expected-outputs");
        assertThat(attrs).doesNotContainKey("contradicts");
    }
// --- #533: Goal fields and trait_properties on nodes ---

    @Test
    void goalNode_storesAllGoalFieldsAsProperties() {
        var node = MAPPER.createObjectNode();
        node.put("name", "Artistic independence");
        node.put("subgraph_type", "goal");
        node.set("properties", MAPPER.createObjectNode());
        node.put("goal_tier", "thematic");
        node.put("goal_horizon", "aspirational");
        node.put("goal_status", "active");
        node.put("goal_urgency", 0.7);
        node.put("goal_need_tier", "SELF_EXPRESSION");
        node.put("goal_priority", 0.9);
        node.put("goal_feasibility", 0.6);
        node.put("goal_target_date", "1940");

        Map<String, String> props = CorpusImporter.buildNodeProperties(node);

        assertThat(props).containsEntry("goal.tier", "thematic");
        assertThat(props).containsEntry("goal.horizon", "aspirational");
        assertThat(props).containsEntry("goal.status", "active");
        assertThat(props).containsEntry("goal.urgency", "0.7");
        assertThat(props).containsEntry("goal.need-tier", "SELF_EXPRESSION");
        assertThat(props).containsEntry("goal.priority", "0.9");
        assertThat(props).containsEntry("goal.feasibility", "0.6");
        assertThat(props).containsEntry("goal.target-date", "1940");
    }

    @Test
    void traitProperties_storedWithPrefix() {
        var node = MAPPER.createObjectNode();
        node.put("name", "Frida Kahlo");
        node.put("subgraph_type", "person");
        node.set("properties", MAPPER.createObjectNode());
        var traitProps = MAPPER.createObjectNode();
        traitProps.put("role", "painter");
        traitProps.put("occupation", "artist");
        node.set("trait_properties", traitProps);

        Map<String, String> props = CorpusImporter.buildNodeProperties(node);

        assertThat(props).containsEntry("trait.role", "painter");
        assertThat(props).containsEntry("trait.occupation", "artist");
    }

    @Test
    void sourcePassages_storedAsProperty() {
        var node = MAPPER.createObjectNode();
        node.put("name", "Blue House");
        node.put("subgraph_type", "place");
        node.set("properties", MAPPER.createObjectNode());
        var passages = MAPPER.createArrayNode();
        passages.add("p-001");
        passages.add("p-005");
        node.set("source_passages", passages);

        Map<String, String> props = CorpusImporter.buildNodeProperties(node);

        assertThat(props).containsEntry("source-passages", "p-001,p-005");
    }

    @Test
    void nonGoalNode_noGoalProperties() {
        var node = MAPPER.createObjectNode();
        node.put("name", "Mexico City");
        node.put("subgraph_type", "place");
        node.set("properties", MAPPER.createObjectNode());

        Map<String, String> props = CorpusImporter.buildNodeProperties(node);

        assertThat(props.keySet().stream().filter(k -> k.startsWith("goal.")).count()).isZero();
    }

// --- #534: Edge metadata ---

    @Test
    void edge_storesConfidenceAndValidation() {
        var edge = MAPPER.createObjectNode();
        edge.put("source", "frida kahlo");
        edge.put("target", "diego rivera");
        edge.put("type", "married-to");
        edge.put("confidence_origin", "STATED");
        edge.put("validation_tier", "REGISTERED");
        edge.put("source_passage", "p-003");

        Map<String, String> edgeProps = CorpusImporter.buildEdgeProperties(edge);

        assertThat(edgeProps).containsEntry("confidence-origin", "STATED");
        assertThat(edgeProps).containsEntry("validation-tier", "REGISTERED");
        assertThat(edgeProps).containsEntry("source-passage", "p-003");
    }

// --- #535: Memory provenance ---

    @Test
    void memory_storesRelatedEntities() {
        var mem     = memoryNode("Frida and Diego visited Paris", "experience", "observation");
        var related = MAPPER.createArrayNode();
        related.add("Diego Rivera");
        related.add("Paris");
        mem.set("related_entities", related);

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).containsEntry("related-entities", "Diego Rivera,Paris");
    }

    @Test
    void memory_storesSourceOffsets() {
        var mem = memoryNode("Frida painted", "experience", "observation");
        mem.put("source_start", 1024);
        mem.put("source_end", 2048);

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).containsEntry("source-start", "1024");
        assertThat(attrs).containsEntry("source-end", "2048");
    }

    @Test
    void reflectionMemory_storesLevelAndSources() {
        var mem = memoryNode("Frida's art was her survival mechanism", "reflection", "reflection");
        mem.put("reflection_level", 2);
        var indices = MAPPER.createArrayNode();
        indices.add(5);
        indices.add(12);
        mem.set("source_memory_indices", indices);

        Map<String, String> attrs = CorpusImporter.buildMemoryAttributes(mem);

        assertThat(attrs).containsEntry("reflection-level", "2");
        assertThat(attrs).containsEntry("source-memory-indices", "5,12");
    }

// --- #537: Subject parameterization ---

    @Test
    void resolveSubject_readsFromCorpus() {
        var root = MAPPER.createObjectNode();
        root.put("subject", "napoleon-bonaparte");

        var subject = CorpusImporter.resolveSubject(root);

        assertThat(subject.type()).isEqualTo("person");
        assertThat(subject.id()).isEqualTo("napoleon-bonaparte");
    }

    @Test
    void resolveSubject_fallsBackToDefault() {
        var root = MAPPER.createObjectNode();

        var subject = CorpusImporter.resolveSubject(root);

        assertThat(subject.type()).isEqualTo("person");
        assertThat(subject.id()).isEqualTo("unknown");
    }


    // --- #531: LifecycleResolver integration ---

    @Test
    void nodeWithLifecycleProperties_resolvesTemporalBounds() {
        var node = MAPPER.createObjectNode();
        node.put("name", "The Two Fridas");
        node.put("subgraph_type", "project");
        var props = MAPPER.createObjectNode();
        props.put("lifecycle.completed", "1939");
        props.put("lifecycle.first-exhibited", "1947");
        node.set("properties", props);

        var bounds = CorpusImporter.resolveTemporalBounds(node);

        assertThat(bounds.validFrom()).isNotNull();
        assertThat(bounds.validUntil()).isNull();
    }

    @Test
    void personNodeWithBornDied_resolvesBothBounds() {
        var node = MAPPER.createObjectNode();
        node.put("name", "Frida Kahlo");
        node.put("subgraph_type", "person");
        var props = MAPPER.createObjectNode();
        props.put("lifecycle.born", "1907-07-06");
        props.put("lifecycle.died", "1954-07-13");
        node.set("properties", props);

        var bounds = CorpusImporter.resolveTemporalBounds(node);

        assertThat(bounds.validFrom()).isNotNull();
        assertThat(bounds.validUntil()).isNotNull();
    }

    @Test
    void nodeWithNoLifecycleProperties_noTemporalBounds() {
        var node = MAPPER.createObjectNode();
        node.put("name", "Surrealism");
        node.put("subgraph_type", "concept");
        var props = MAPPER.createObjectNode();
        props.put("description", "Art movement");
        node.set("properties", props);

        var bounds = CorpusImporter.resolveTemporalBounds(node);

        assertThat(bounds.validFrom()).isNull();
        assertThat(bounds.validUntil()).isNull();
    }

    @Test
    void nodeWithApproximateDate_resolves() {
        var node = MAPPER.createObjectNode();
        node.put("name", "Blue House");
        node.put("subgraph_type", "place");
        var props = MAPPER.createObjectNode();
        props.put("lifecycle.built", "1904~");
        node.set("properties", props);

        var bounds = CorpusImporter.resolveTemporalBounds(node);

        assertThat(bounds.validFrom()).isNotNull();
    }

    // --- Helpers ---

    private ObjectNode memoryNode(String text, String domain, String eventType) {
        var node = MAPPER.createObjectNode();
        node.put("text", text);
        node.put("domain", domain);
        node.put("event_type", eventType);
        return node;
    }
}
