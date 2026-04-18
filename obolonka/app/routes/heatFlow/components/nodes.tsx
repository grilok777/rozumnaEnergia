import { type ReactElement } from 'react';
import { Handle, Position, useNodes, useReactFlow, type NodeProps } from '@xyflow/react';
import type { NodeData } from './types';
import '../css/nodes.css';

// House Node Component
export function HouseNode({ id, data }: NodeProps): ReactElement {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteElements({ nodes: [{ id }] });
    };

    const allNodes = useNodes();

    const label = data.label as string;
    const connectedHeaters = (data.connectedHeaters as string[]) || [];

    const connectedLabels = connectedHeaters.map(id => {
        const sourceNode = allNodes.find(n => n.id === id);
        return sourceNode?.data?.label || id;
    });

    return (
        <div className="custom-node house-node">
            <button className="delete-button" onClick={onDelete} title="Delete node">
                ×
            </button>

            <Handle type="target" position={Position.Left} style={{ borderRadius: '2px' }} />

            <div style={{ fontWeight: 'bold', color: '#007acc' }}>
                HOUSE: {label}
            </div>

            {connectedHeaters.length > 0 && (
                <div style={{ fontSize: '11px', color: '#444' }}>
                    Sources: {connectedLabels.join(', ')}
                </div>
            )}

            <div className="custom-tooltip">
                ID: {label} • {connectedHeaters.length} sources
            </div>
        </div>
    );
}

// Heat Node Component
export function HeatNode({ id, data }: NodeProps): ReactElement {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteElements({ nodes: [{ id }] });
    };

    const { label } = data as unknown as NodeData;

    return (
        <div className="custom-node heat-node">
            <button className="delete-button" onClick={onDelete} title="Delete node">
                ×
            </button>

            <div style={{ fontWeight: 'bold', color: '#e34c26' }}>
                HEAT SRC: {label}
            </div>

            <Handle type="source" position={Position.Right} style={{ borderRadius: '2px', background: '#e34c26' }} />

            <div className="custom-tooltip">
                Click and drag to connect
            </div>
        </div>
    );
}

// Node types export
export const nodeTypes = {
    house: HouseNode,
    heat: HeatNode,
};
