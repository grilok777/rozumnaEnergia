import { useEdges } from '@xyflow/react';

export function EdgeHint() {
    const edges = useEdges();
    const isEdgeSelected = edges.some((e) => e.selected);

    return (
        <div
            className={`
    fixed bottom-4 right-4 z-[1000] pointer-events-none select-none
    transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
    ${isEdgeSelected
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-4 scale-90'}
  `}
        >
            <div className="bg-white/80 backdrop-blur-md text-gray-900 px-3 py-1.5 rounded-full shadow-lg border border-gray-200 flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                    {/* Клавіша Del */}
                    <kbd className="min-w-[20px] px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-medium text-gray-900 shadow-sm">
                        Del
                    </kbd>

                    <span className="text-gray-400 text-[10px]">/</span>

                    {/* Клавіша Backspace */}
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-medium text-gray-900 shadow-sm flex items-center justify-center">
                        <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                            <line x1="18" y1="9" x2="12" y2="15" />
                            <line x1="12" y1="9" x2="18" y2="15" />
                        </svg>
                    </kbd>

                    <span className="text-gray-700 ml-0.5 font-medium">to delete connection</span>
                </div>
            </div>
        </div>
    );
}
