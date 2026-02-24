'use client';

import {
    Users,
    BarChart3,
    Target,
    Eye,
    ChevronRight,
    Sparkles,
    Check
} from 'lucide-react';

interface BotDefinition {
    id: string;
    name: string;
    description: string;
    icon: any;
    color: string;
    category: string;
    sampleQuery: string;
    widgetType: string;
}

export const BOTS: BotDefinition[] = [
    {
        id: 'pm',
        name: 'Project Management BOT',
        description: 'Elite analyst for staffing, allocations, and availability. Direct resource allocation support.',
        icon: Users,
        color: '#6366f1',
        category: 'Core',
        sampleQuery: 'Analyze the AWL project staffing and recommended allocations.',
        widgetType: 'staffing'
    },
    {
        id: 'performance',
        name: 'Performance Review BOT',
        description: 'Comprehensive analysis of employee OKRs, skills directory, and growth recommendations.',
        icon: Target,
        color: '#10B981',
        category: 'Management',
        sampleQuery: 'Get the performance summary and skill profile for Abhishek Pandit.',
        widgetType: 'appraisal'
    },
    {
        id: 'reports',
        name: 'Reports BOT',
        description: 'Strategic reports, resource capacity heatmaps, and trend analytics.',
        icon: BarChart3,
        color: '#f59e0b',
        category: 'Strategic',
        sampleQuery: 'Show me the team allocation matrix and capacity trends.',
        widgetType: 'matrix'
    }
];

interface BotSelectorProps {
    onSelect: (botId: string) => void;
    onPreview: (botId: string) => void;
    activeBotId?: string;
    isDark?: boolean;
}

export default function BotSelector({ onSelect, onPreview, activeBotId, isDark = false }: BotSelectorProps) {
    const bg = isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff';
    const border = isDark ? 'rgba(59, 130, 246, 0.1)' : '#e2e8f0';
    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';

    return (
        <div className="w-full max-w-6xl mx-auto px-6 py-8">
            <div className="flex flex-col mb-8">
                <h2 style={{ color: textPrimary }} className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-blue-500" />
                    Select Your AI Analyst
                </h2>
                <p style={{ color: textSecondary }} className="mt-1 text-sm font-medium">
                    Choose a specialized bot to help you with resource management and strategy.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {BOTS.map((bot) => {
                    const isActive = activeBotId === bot.id;
                    const Icon = bot.icon;

                    return (
                        <div
                            key={bot.id}
                            style={{
                                background: bg,
                                border: isActive ? `2px solid ${bot.color}` : `1px solid ${border}`,
                                boxShadow: isActive ? `0 0 20px ${bot.color}20` : 'none'
                            }}
                            className={`relative group rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl cursor-pointer ${isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                            onClick={() => onSelect(bot.id)}
                        >
                            {isActive && (
                                <div
                                    style={{ background: bot.color }}
                                    className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                                >
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            )}

                            <div className="flex items-start gap-4 mb-4">
                                <div
                                    style={{
                                        background: `${bot.color}15`,
                                        color: bot.color,
                                    }}
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                                >
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <span
                                        style={{ color: bot.color, background: `${bot.color}10` }}
                                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md"
                                    >
                                        {bot.category}
                                    </span>
                                    <h3 style={{ color: textPrimary }} className="text-lg font-extrabold mt-1">
                                        {bot.name}
                                    </h3>
                                </div>
                            </div>

                            <p style={{ color: textSecondary }} className="text-sm leading-relaxed mb-6 h-12 overflow-hidden">
                                {bot.description}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(bot.id);
                                    }}
                                    style={{ background: isActive ? bot.color : 'transparent', border: isActive ? 'none' : `1px solid ${border}`, color: isActive ? '#fff' : textPrimary }}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    Activate
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPreview(bot.id);
                                    }}
                                    style={{ background: `${bot.color}10`, color: bot.color }}
                                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                                    title="View Sample Widget"
                                >
                                    <Eye className="w-4.5 h-4.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
