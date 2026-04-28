import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

// Тип даних для одного кроку симуляції
interface ChartDataPoint {
    time: number;
    vWater: number;
    qSource: number;
    qWaterHeating: number;
    deltaQTank: number;
    tTank: number;
    tPipeOut: number;
    qPipeLoss: number;
    qTankLoss: number;
    sourceOn: number;
    cop: number;
}

interface Props {
    isOpen: boolean;
    data: ChartDataPoint[] | null;
    onClose: () => void;
}

const SimulationResultsModal: React.FC<Props> = ({ isOpen, data, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0 z-10">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Результати симуляції
                    </h2>

                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                        Закрити
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {!data ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">

                            {/* Spinner */}
                            <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />

                            <p className="text-sm">Завантаження результатів...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Витрати води */}
                            <ChartContainer title="Витрати води">
                                <div className="h-72">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis label={{ value: "V (м³)", angle: -90, position: 'insideLeft' }} />
                                        <Tooltip />
                                        <Line dataKey="vWater" stroke="#3b82f6" dot={false} name="Обʼєм" />
                                    </LineChart>
                                </div>
                            </ChartContainer>

                            {/* Температури */}
                            <ChartContainer title="Температури">
                                <div className="h-72">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" />
                                        <YAxis label={{ value: "T (°C)", angle: -90, position: 'insideLeft' }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line dataKey="tTank" stroke="#1053b9" dot={false} strokeWidth={2} name="T баку" />
                                        <Line dataKey="tPipeOut" stroke="#d46306" dot={false} strokeWidth={2} name="T труба" />
                                    </LineChart>
                                </div>
                            </ChartContainer>

                            {/* Теплові потоки */}
                            <ChartContainer title="Теплові потоки">
                                <div className="h-72">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" />
                                        <YAxis label={{ value: "Q (кДж)", angle: -90, position: 'insideLeft' }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line dataKey="qSource" stroke="#f59e0b" dot={false} name="Джерело" />
                                        <Line dataKey="qWaterHeating" stroke="#ef4444" dot={false} name="Споживання" />
                                        <Line dataKey="deltaQTank" stroke="#3b82f6" dot={false} name="ΔQ баку" />
                                    </LineChart>
                                </div>
                            </ChartContainer>

                            {/* Втрати */}
                            <ChartContainer title="Теплові втрати">
                                <div className="h-72">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" />
                                        <YAxis label={{ value: "Q (кДж)", angle: -90, position: 'insideLeft' }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line dataKey="qPipeLoss" stroke="#55a1f7" dot={false} name="Труба" />
                                        <Line dataKey="qTankLoss" stroke="#64748b" dot={false} name="Бак" />
                                    </LineChart>
                                </div>
                            </ChartContainer>

                            {/* Стан */}
                            <ChartContainer title="Стан джерела">
                                <div className="h-56">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis domain={[0, 1]} ticks={[0, 1]} />
                                        <Tooltip />
                                        <Line dataKey="sourceOn" stroke="#22c55e" dot={false} strokeWidth={2} name="ON/OFF" />
                                    </LineChart>
                                </div>
                            </ChartContainer>

                            {/* COP */}
                            <ChartContainer title="COP теплового насоса">
                                <div className="h-56">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line dataKey="cop" stroke="#8b5cf6" dot={false} name="COP" />
                                    </LineChart>
                                </div>
                            </ChartContainer>

                        </div>
                    )}

            </div>
        </div>
        </div >
    );
};

// Допоміжний компонент для контейнера графіка
const ChartContainer: React.FC<{ title: string; children: React.ReactElement }> = ({ title, children }) => (
    <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wider">{title}</h3>
        <ResponsiveContainer width="100%" height={250}>
            {children}
        </ResponsiveContainer>
    </div>
);

export default SimulationResultsModal;
