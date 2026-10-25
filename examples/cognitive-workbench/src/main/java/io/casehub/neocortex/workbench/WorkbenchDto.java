package io.casehub.neocortex.workbench;

import io.casehub.neocortex.mindmap.MindMapEdge;
import io.casehub.neocortex.mindmap.MindMapNode;
import io.casehub.neocortex.mindmap.MindMapSubgraph;

import java.util.List;
import java.util.Map;

public final class WorkbenchDto {

    private WorkbenchDto() {}

    public record NodeDto(
            String id, String name, String subgraphType,
            Double pleasure, Double arousal, Double dominance,
            Double confidenceValue, String confidenceOrigin,
            String validFrom, String validUntil,
            Map<String, String> properties,
            Integer bfsDepth) {

        static NodeDto from(MindMapNode n) {
            return new NodeDto(
                    n.id(), n.name(), n.subgraphType(),
                    n.pleasure(), n.arousal(), n.dominance(),
                    n.confidence() != null ? n.confidence().value() : null,
                    n.confidence() != null ? n.confidence().origin().name() : null,
                    n.validFrom() != null ? n.validFrom().toString() : null,
                    n.validUntil() != null ? n.validUntil().toString() : null,
                    n.properties(),
                    null);
        }

        NodeDto withBfsDepth(int depth) {
            return new NodeDto(id, name, subgraphType, pleasure, arousal, dominance,
                               confidenceValue, confidenceOrigin, validFrom, validUntil, properties, depth);
        }

        static List<NodeDto> fromList(List<? extends MindMapNode> nodes) {
            return nodes.stream().map(NodeDto::from).toList();
        }
    }

    public record EdgeDto(
            String id, String sourceNodeId, String targetNodeId,
            String edgeType, String tier,
            Double confidenceValue) {

        static EdgeDto from(MindMapEdge e) {
            return new EdgeDto(
                    e.id(), e.sourceNodeId(), e.targetNodeId(),
                    e.edgeType(), e.tier() != null ? e.tier().name() : null,
                    e.confidence() != null ? e.confidence().value() : null);
        }

        static List<EdgeDto> fromList(List<? extends MindMapEdge> edges) {
            return edges.stream().map(EdgeDto::from).toList();
        }
    }

    public record SubgraphDto(String id, String name, String type) {
        static SubgraphDto from(MindMapSubgraph sg) {
            return new SubgraphDto(sg.id(), sg.name(), sg.type());
        }

        static List<SubgraphDto> fromList(List<MindMapSubgraph> subgraphs) {
            return subgraphs.stream().map(SubgraphDto::from).toList();
        }
    }

    public record CapsNodeDto(String id, String type, String range, String category,
                              List<String> sourceModels, List<String> keywords, String description) {
        static CapsNodeDto from(io.casehub.neocortex.caps.CapsNode n) {
            return new CapsNodeDto(n.id(), n.type().name(), n.range().name(),
                                   n.category(), n.sourceModels(),
                                   n.vocabulary() != null ? new java.util.ArrayList<>(n.vocabulary().keySet()) : List.of(),
                                   n.description());
        }
    }

    public record CapsConnectionDto(String id, String from, String to, double weight,
                                    String provenance, String psychologicalSource,
                                    List<String> tags) {
        static CapsConnectionDto from(io.casehub.neocortex.caps.CapsConnection c) {
            return new CapsConnectionDto(c.id(), c.from(), c.to(), c.defaultWeight(),
                                         c.provenance().name(), c.source(), c.tags());
        }
    }

    public record RegionDto(
            String regionId, String functionalLabel, String anatomicalLabel,
            List<String> subgraphTypes, List<NodeDto> nodes) {}

    public record MoodNodeDto(
            String id, Double pleasure, Double arousal, Double dominance,
            Double confidence, String timestamp) {}

    public record AffectProjectionDto(
            String id, String sourceNodeId, String sourceName,
            String sourceRegion, Double pleasure, Double arousal, Double dominance) {}


}
