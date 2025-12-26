'use client';

import { useState, useEffect } from 'react';

export default function DosageCalculation({ question, onChange }: { question: any; onChange: (q: any) => void }) {
    const [unit, setUnit] = useState(question.dosageData?.unit || '');
    const [correctValue, setCorrectValue] = useState(question.dosageData?.correctValue || '');
    const [tolerance, setTolerance] = useState(question.dosageData?.tolerance || 0);
    const [decimalPlaces, setDecimalPlaces] = useState(question.dosageData?.decimalPlaces || 1);

    useEffect(() => {
        updateData(unit, correctValue, tolerance, decimalPlaces);
    }, []);

    const updateData = (newUnit: string, newValue: string, newTol: number, newDec: number) => {
        const dosageData = {
            unit: newUnit,
            correctValue: newValue,
            tolerance: newTol,
            decimalPlaces: newDec
        };
        // For Dosage, the "correctAnswer" is the value itself.
        onChange({
            ...question,
            dosageData,
            correctAnswer: newValue
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm text-yellow-300">
                    <strong>Dosage Calculation:</strong> The student must calculate a numeric value. You can specify a tolerance (range) and the required unit.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Correct Numerical Value
                    </label>
                    <input
                        type="number"
                        value={correctValue}
                        onChange={(e) => {
                            setCorrectValue(e.target.value);
                            updateData(unit, e.target.value, tolerance, decimalPlaces);
                        }}
                        placeholder="e.g. 5.5"
                        className="w-full px-4 py-2.5 bg-[#11131a] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all font-mono"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Unit (Label)
                    </label>
                    <input
                        type="text"
                        value={unit}
                        onChange={(e) => {
                            setUnit(e.target.value);
                            updateData(e.target.value, correctValue, tolerance, decimalPlaces);
                        }}
                        placeholder="e.g. mL, tabs, mg"
                        className="w-full px-4 py-2.5 bg-[#11131a] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Accepted Tolerance (±)
                    </label>
                    <input
                        type="number"
                        value={tolerance}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setTolerance(val);
                            updateData(unit, correctValue, val, decimalPlaces);
                        }}
                        placeholder="0"
                        className="w-full px-4 py-2.5 bg-[#11131a] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">Allowable margin of error (e.g. 0.1).</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Decimal Places Displayed
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="4"
                        value={decimalPlaces}
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setDecimalPlaces(val);
                            updateData(unit, correctValue, tolerance, val);
                        }}
                        className="w-full px-4 py-2.5 bg-[#11131a] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
                    />
                </div>
            </div>
        </div>
    );
}
