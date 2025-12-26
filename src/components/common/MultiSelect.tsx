import { useState, useRef, useEffect } from 'react';

interface Option {
    label: string;
    value: string;
    count?: number;
}

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
    placeholder?: string;
    className?: string;
}

export default function MultiSelect({
    options,
    selected,
    onChange,
    label,
    placeholder = 'Select options...',
    className = '',
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter(v => v !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const handleSelectAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(o => o.value));
        }
    };

    const handleRemove = (e: React.MouseEvent, value: string) => {
        e.stopPropagation();
        onChange(selected.filter(v => v !== value));
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <label className="block text-sm font-medium text-nurse-silver-400 mb-1">
                {label}
            </label>

            {/* Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="min-h-[46px] w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg cursor-pointer flex flex-wrap gap-2 items-center hover:border-white/20 transition-colors"
            >
                {selected.length === 0 ? (
                    <span className="text-nurse-silver-500">{placeholder}</span>
                ) : (
                    selected.map(value => {
                        const option = options.find(o => o.value === value);
                        return (
                            <span
                                key={value}
                                className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md text-sm border border-blue-500/30"
                            >
                                {option?.label || value}
                                <button
                                    onClick={(e) => handleRemove(e, value)}
                                    className="hover:text-blue-100"
                                >
                                    ×
                                </button>
                            </span>
                        );
                    })
                )}
                <div className="flex-1"></div>
                <div className="text-nurse-silver-500 pointer-events-none">
                    ▼
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-white/10 rounded-lg shadow-xl max-h-80 flex flex-col">
                    <div className="p-3 border-b border-white/10">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                    <div className="p-2 border-b border-white/10 flex justify-between">
                        <button
                            onClick={handleSelectAll}
                            className="text-xs text-blue-400 hover:text-blue-300"
                        >
                            {selected.length === options.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="text-xs text-nurse-silver-500">
                            {selected.length} selected
                        </span>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="text-center py-4 text-nurse-silver-500 text-sm">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map(option => (
                                <div
                                    key={option.value}
                                    onClick={() => toggleOption(option.value)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${selected.includes(option.value)
                                            ? 'bg-blue-500/20 text-blue-200'
                                            : 'hover:bg-white/5 text-nurse-silver-300'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected.includes(option.value)
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-nurse-silver-500'
                                        }`}>
                                        {selected.includes(option.value) && (
                                            <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="flex-1 text-sm">{option.label}</span>
                                    {option.count !== undefined && (
                                        <span className="text-xs text-nurse-silver-500 bg-white/5 px-2 py-0.5 rounded">
                                            {option.count}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
