import { useEffect, type ReactElement } from 'react';
import { Handle, Position, useNodes, useReactFlow, type NodeProps } from '@xyflow/react';
import {
    type NodeData,
    isHeatPump,
    isTankNode,
    isHouseNode,
    type AppNode,
    type HouseNodeData,
    type TankNodeData,
    type HeatSourceNodeData
} from '../types/types';
import '../css/nodes.css';

const DeleteButton = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => (
    <button className="delete-button" onClick={onClick} title="Delete node">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    </button>
);

export function TankNode({ id, data, selected }: NodeProps): ReactElement {
    const { deleteElements } = useReactFlow();

    // Приведення типів (аналогічно HeatNode та HouseNode)
    const isTank = isTankNode({ data, id, type: 'tank' } as any);
    const tankData = data as unknown as TankNodeData;

    return (
        <div className={`custom-node tank-node group relative ${selected ? 'selected' : ''}`}>
            <DeleteButton onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }} />

            {/* Вхід зліва (від Heat Source) */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-2 h-2 !bg-emerald-400"
            />

            <div className="flex flex-col gap-1">
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded border border-emerald-200 leading-none w-fit">
                    Buffer Tank
                </span>

                <div className="text-sm font-bold text-gray-800">
                    {tankData.label || 'Storage Tank'}
                </div>

                <div className="mt-1 flex flex-col gap-0.5">
                    {/* Об'єм танку */}
                    <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded w-fit">
                        {tankData.vTank ?? 0} L
                    </div>
                    {/* Температура */}
                    <div className="text-[9px] text-gray-400 font-medium">
                        Target: {tankData.tWaterNorm ?? 55}°C
                    </div>
                </div>
            </div>

            {/* Вихід справа (до House/Consumer) */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-2 h-2 !bg-emerald-400"
            />

            <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100
                    transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-3
                    z-50 whitespace-nowrap bg-gray-900 text-white text-[10px]
                    px-2 py-2 rounded shadow-xl pointer-events-none">
                {`Capacity: ${tankData.vTank}L | ${tankData.tWaterNorm}°C`}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
        </div>
    );
}

// --- HOUSE NODE (Споживач) ---
export function HouseNode({ id, data, selected }: NodeProps): ReactElement {
    const { deleteElements } = useReactFlow();

    const isHouse = isHouseNode({ data, id, type: 'house' } as any);
    const houseData = data as unknown as HouseNodeData;

    return (
        <div className={`custom-node house-node group relative ${selected ? 'selected' : ''}`}>            <DeleteButton onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }} />

            {/* Target handle для вхідного зв'язку */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-2 h-2 !bg-blue-400"
            />

            <div className="flex flex-col">
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase rounded border border-blue-200 leading-none w-fit">
                    Consumer
                </span>

                <div className="text-sm font-bold text-gray-800">
                    {houseData.label || 'New House'}
                </div>

                <div className="flex flex-col gap-0.5">
                    <div className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 rounded w-fit">
                        Pipe: {houseData.lPipe ?? 0}m
                    </div>
                    {houseData.vFlowPipe !== undefined && (
                        <div className="text-[9px] text-gray-400">
                            Flow: {Number(houseData.vFlowPipe).toFixed(2)} m/s
                        </div>
                    )}
                </div>
            </div>



            <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100
                    transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-3
                    z-50 whitespace-nowrap bg-gray-900 text-white text-[10px]
                    px-2 py-2 rounded shadow-xl pointer-events-none">
                {`L: ${houseData.lPipe ?? 0}m | V: ${Number(houseData.vFlowPipe || 0).toFixed(2)}m/s`}
                {/* Стрілочка тултіпа */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-5 border-transparent border-t-gray-900"></div>
            </div>
        </div>
    );
}

// --- HEAT NODE (Джерело тепла) ---
export function HeatNode({ id, data, selected }: NodeProps): ReactElement {
    const { deleteElements } = useReactFlow();

    const isHeat = isHeatPump({ data } as AppNode);
    const heatData = data as unknown as HeatSourceNodeData;

    return (
        <div className={`custom-node heat-node ${selected ? 'selected' : ''}`}>
            <DeleteButton onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }} />

            <div className="flex flex-col gap-1">
                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black uppercase rounded border border-orange-200 leading-none w-fit">
                    Heat Source
                </span>

                <div className="text-sm font-bold text-gray-800">
                    {(data.label as string) || 'Unnamed Source'}
                </div>

                {heatData.pumpParams && (
                    <div className="mt-1 flex items-center gap-1.5">
                        <div className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1 rounded">
                            {heatData.pumpParams.qCop235} kW
                        </div>
                        <div className="text-[9px] text-gray-400">
                            COP: {heatData.pumpParams.cop235}
                        </div>
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-orange-400" />
        </div>
    );
}

export const nodeTypes = {
    house: HouseNode,
    heat: HeatNode,
    tank: TankNode,
};

export function createNodeData(type: string, index: number): NodeData {
    const label = `${type.charAt(0).toUpperCase() + type.slice(1)} ${index}`;

    switch (type) {
        case 'heat':
            return {
                type: 'heat',
                label,
                // default pump parameters for heat source (can be overridden in UI)
                pumpParams: {
                    qCop235: 1500.0,      // Номінальна потужність
                    cop235: 3.5,       // COP
                    electricPower: 4.57 // Електрична потужність
                }
            } as NodeData;

        case 'tank':
            return {
                type: 'tank',
                label,
                vTank: 30,            // літрів води у баку
                kLostTank: 0.027,     // кВт*год/℃
                tWaterNorm: 50,        // Номінальна температура
                deltaMax: 25,           // +5 градусів
                deltaMin: 25,          // -5 градусів
            } as NodeData;

        case 'house':
            return {
                type: 'house',
                label,
                connectedHeaters: [],
                // parameters for pipe calculations
                lPipe: 100,             // 20 метрів
                dOutPipe: 0.03,       // 32 мм
                sWallPipe: 0.003,      // 3 мм
                kThermalPipe: 70,    // Коефіцієнт теплопровідності
                epsilonPipe: 0.3,     // Ступінь чорноти
                vFlowPipe: 2.5,        //  м/с

                tOutside: -15,
                tWaterCold: 0,
                tBasement: 18,
            } as NodeData;

        default:
            return {
                type,
                label,
            } as NodeData;
    }
}
