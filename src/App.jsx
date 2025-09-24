import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, Plus, Trash2, RotateCcw, Upload, X, ArrowLeft, FileUp, Settings, Printer, Scissors, Calculator, Wand2, Loader2, Save } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { ImpositionPage } from './ImpositionPage';
import { Workspace } from './Workspace';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'; // Importa los estilos
import 'react-pdf/dist/esm/Page/TextLayer.css';     // Importa los estilos

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// --- SUPABASE CLIENT SETUP ---
// NOTE: These variables should be set in your hosting environment (e.g., Vercel).
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn("Supabase credentials not found. Make sure to set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your environment variables.");
}

// #################################################################################
// ####### COMPONENTE 0: COMPONENTES DE UI REUTILIZABLES #######
// #################################################################################
const EditableField = ({ value, onChange, placeholder, type = "text", onStartEdit, onEndEdit, isEditing, options, className = "" }) => { const handleKeyDown = (e) => { if (e.key === 'Enter' || e.key === 'Escape') { (e.target).blur(); } }; const commonClasses = `w-full bg-transparent px-1 py-0.5 rounded-sm transition-colors text-white/90 text-sm ${className}`; const viewClasses = `border-b border-transparent hover:border-white/30 cursor-pointer`; const editClasses = `border-b border-cyan-500 focus:border-cyan-400 focus:outline-none bg-black/30`; if (type === 'select') { return ( <div className="relative w-full"> <select value={value ?? ""} onChange={onChange} onBlur={onEndEdit} onKeyDown={handleKeyDown} className={`${commonClasses} ${editClasses} h-[28px] appearance-none custom-select pr-6`}> {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)} </select> <ChevronDown size={16} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" /> </div> ); } if (isEditing) { return <input type={type} value={value ?? ""} onChange={onChange} onBlur={onEndEdit} onKeyDown={handleKeyDown} placeholder={placeholder} className={`${commonClasses} ${editClasses}`} autoFocus />; } return ( <div className={`${commonClasses} ${viewClasses} min-h-[28px] flex items-center`} onClick={onStartEdit}> {value || <span className="text-white/40">{placeholder}</span>} </div> ); };
const LabeledField = ({ label, children, className = "" }) => ( <label className={`flex flex-col gap-1 text-sm ${className}`}> <span className="text-white/80 font-medium text-xs">{label}</span> {children} </label> );
const IconButton = ({ onClick, children, title, colorClass = "text-white/60 hover:text-white", className = "" }) => ( <button className={`p-1.5 rounded-md transition-colors ${colorClass} ${className}`} title={title} onClick={onClick}> {children} </button> );
const CostModeSelector = ({ value, onChange, options }) => ( <div className="flex items-center rounded-lg bg-slate-900/80 p-0.5 w-full max-w-[150px] border border-gray-700"> <button type="button" onClick={() => onChange(false)} className={`flex-1 text-xs px-1 py-1 rounded-md transition-colors ${!value ? 'bg-cyan-600 font-semibold' : 'hover:bg-slate-700'}`}>{options[0]}</button> <button type="button" onClick={() => onChange(true)} className={`flex-1 text-xs px-1 py-1 rounded-md transition-colors ${value ? 'bg-cyan-600 font-semibold' : 'hover:bg-slate-700'}`}>{options[1]}</button> </div> );
const ToggleSwitch = ({ label, enabled, onChange }) => ( <div className="flex items-center justify-between bg-black/20 p-2 rounded-md h-full"> <span className="text-sm font-medium text-white/80">{label}</span> <button onClick={() => onChange(!enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-cyan-600' : 'bg-slate-600'}`}> <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} /> </button> </div> );

// #################################################################################
// ####### COMPONENTE 1: VISUALIZADOR DE RESULTADOS (CORREGIDO) #######
// #################################################################################
/*const GangingOptimizerUI = ({ apiResponse, onBack, onSaveQuote, dollarRate }) => { // <--- Añadido onSaveQuote
    const { baselineSolution: baseSolution, gangedSolutions } = apiResponse;
    const formatCurrency = (value) => '$' + new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
    const formatNumber = (value) => new Intl.NumberFormat('es-UY').format(value || 0);

    const CostAccordion = ({ title, value, formula, details, defaultOpen = false }) => { const [isOpen, setIsOpen] = useState(defaultOpen); return ( <div className="border-t border-gray-700 last:border-b-0"> <button onClick={() => details && setIsOpen(!isOpen)} className={`w-full text-left p-2.5 transition-colors ${details ? 'hover:bg-gray-700/50' : 'cursor-default'}`}> <div className="flex justify-between items-center"> <div> <p className="font-semibold text-gray-200 text-sm">{title}</p> {formula && <p className="text-xs text-gray-400 mt-0.5">{formula}</p>} </div> <div className="flex items-center gap-4"> <span className="font-bold text-sm text-gray-50">{formatCurrency(value)}</span> {details && <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />} </div> </div> </button> {isOpen && details && ( <div className="pl-4 border-l-2 border-cyan-700 ml-2 bg-black/20"> {details.map((item, index) => <CostAccordion key={index} {...item} />)} </div> )} </div> ); };
    
    const DynamicLayoutVisualizer = ({ parentSize, items, parentLabel, itemLabelPrefix = "" }) => {
        const { width: parentW, length: parentL } = parentSize;

        const jobColors = useMemo(() => {
            const colors = ['#60a5fa80', '#4ade8080', '#facc1580', '#a78bfa80', '#fb923c80', '#f8717180'];
            const borderColors = ['#60a5fa', '#4ade80', '#facc15', '#a78bfa', '#fb923c', '#f87171'];
            const colorMap = {};
            const uniqueJobIds = [...new Set(items.map(j => j.id || 'item'))];
            uniqueJobIds.forEach((id, index) => { colorMap[id] = { bg: colors[index % colors.length], border: borderColors[index % borderColors.length] }; });
            return colorMap;
        }, [items]);

        const containerSize = 250, padding = 10;
        const scale = Math.min((containerSize - padding) / parentW, (containerSize - padding) / parentL);

        return (
            <div className="p-2 border-2 border-dashed border-gray-600 text-center">
                <div className="relative bg-gray-700 inline-block" style={{ width: parentW * scale + padding, height: parentL * scale + padding }}>
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-400 bg-slate-800/50 px-2">{parentLabel}</div>
                    {items.map((item, i) => {
                        const itemW = (item.width || item.w) * scale;
                        const itemH = (item.length || item.h) * scale;
                        const fontSize = Math.min(itemH / 3, itemW / ((item.id || itemLabelPrefix).length * 0.6), 14);
                        const label = item.id ? item.id : `${itemLabelPrefix} ${i + 1}`;
                        
                        return (
                            <div key={i} className="absolute border flex items-center justify-center overflow-hidden bg-gray-200" style={{ left: item.x * scale + padding/2, top: item.y * scale + padding/2, width: itemW, height: itemH, backgroundColor: jobColors[item.id || 'item']?.bg, borderColor: jobColors[item.id || 'item']?.border, fontSize: `${Math.max(fontSize, 6)}px` }}>
                                <span className="font-bold text-black text-center leading-tight p-0.5 break-all">{label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const ProductionSheet = ({ layout, dollarRate }) => {
        const costDetails = useMemo(() => {
            const pCost = layout.costBreakdown.printingCost;
            const mNeeds = layout.materialNeeds;
            const pNeeds = layout.printNeeds;
            const machine = layout.machine;
            const chargeableImpressions = Math.max(layout.sheetsToPrint, machine.minImpressionsCharge || 0);
            
            return [
                { title: "Costo de Impresión", value: pCost.totalPrintingCost, details: [
                    { title: "Costo de Postura", value: pCost.setupCost, formula: "Precio por Plancha × Planchas Totales", details: [{ title: "Cálculo", value: pCost.setupCost, formula: `${formatCurrency(machine.setupCost.price || 0)} × ${pNeeds.totalPlates} planchas` }] },
                    { title: "Costo de Lavado", value: pCost.washCost, formula: "Costo fijo por limpieza" },
                { title: "Costo por Millar", value: pCost.impressionCost, formula: `Tiraje Mín. Cobrable × (Precio/1000) × Pasadas`, details: [{ title: "Cálculo", value: pCost.impressionCost, formula: `${formatNumber(chargeableImpressions)} pliegos × (${formatCurrency(machine.impressionCost.pricePerThousand || 0)} / 1000) × ${pNeeds.passes}` }] }
                ]},
                { title: "Costo de Papel", value: mNeeds.totalMaterialCost, details: [
                    { title: mNeeds.factorySheets.name || 'Papel', value: mNeeds.totalMaterialCost, formula: `${formatNumber(mNeeds.factorySheets.quantityNeeded)} hojas × ${formatCurrency(mNeeds.totalMaterialCost / mNeeds.factorySheets.quantityNeeded)} p/hoja`,
                      details: [{ title: 'Nivel Cálculo', value: mNeeds.totalMaterialCost, formula: `(${formatNumber(mNeeds.factorySheets.quantityNeeded)}h*${mNeeds.factorySheets.size.width/1000}m*${mNeeds.factorySheets.size.length/1000}m*${mNeeds.factorySheets.size.usdPerTon}U$D/t*${layout.jobsInLayout[0]?.material?.grammage || 'N/A'}g/1M)*$${dollarRate}` }]
                    }
                ]}
            ];
        }, [layout, dollarRate]);

        const technicalDetails = useMemo(() => {
            const { printNeeds, materialNeeds, sheetsToPrint, machine, pressSheetSize } = layout;
            const factorySize = materialNeeds.factorySheets.size;
            return [
                { title: "Pliegos a Imprimir", value: `${formatNumber(sheetsToPrint)} en "${pressSheetSize.width/10}x${pressSheetSize.length/10}cm"` },
                { title: "Máquina", value: machine.name },
                { title: "Hojas de Fábrica", value: `${formatNumber(materialNeeds.factorySheets.quantityNeeded)} (${materialNeeds.factorySheets.size.width}x${materialNeeds.factorySheets.size.length})` },
                { title: "Plan de Corte", value: `${materialNeeds.factorySheets.cuttingPlan.cutsPerSheet} pliegos por hoja` },
                { title: "Técnica", value: printNeeds.technique },
                { title: "Planchas Totales", value: printNeeds.totalPlates },
                { title: "Pasadas en Máquina", value: printNeeds.passes },
            ];
        }, [layout]);

        return (
            <div className="bg-slate-800/50 border border-gray-700 rounded-lg mb-6 shadow-lg overflow-hidden">
                <div className="p-4 bg-black/20"><h3 className="font-bold text-lg text-white">Pliego: <span className="text-cyan-400">{layout.layoutId}</span></h3></div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-4">
                    <div className="md:col-span-2 space-y-4">
                        <div> <h4 className="font-semibold text-gray-300 mb-2">Desglose de Costos</h4> <div className="bg-gray-900/50 rounded-md overflow-hidden border border-gray-700">{costDetails.map((item, i) => <CostAccordion key={i} {...item} defaultOpen={i===0}/>)}</div> </div>
                        <div> <h4 className="font-semibold text-gray-300 mb-2">Requerimientos Técnicos</h4> <div className="bg-gray-900/50 rounded-md border border-gray-700 text-xs p-2 space-y-1.5">{technicalDetails.map((item, i) => (<div key={i} className="flex justify-between items-baseline gap-2 border-b border-gray-800 pb-1 last:border-b-0"><span className="text-gray-400 font-medium whitespace-nowrap">{item.title}</span><span className="text-gray-200 font-mono text-right">{item.value}</span></div>))}</div> </div>
                    </div>
                    <div className="md:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-900/50 p-3 rounded-md flex flex-col items-center justify-center">
                            <h4 className="font-semibold text-sm text-center text-white mb-2">Panel A: Plan de Corte Gráfico</h4>
                            <DynamicLayoutVisualizer 
                                parentSize={layout.materialNeeds.factorySheets.size}
                                items={layout.materialNeeds.factorySheets.cuttingPlan.positions}
                                parentLabel={`Hoja Fábrica ${layout.materialNeeds.factorySheets.size.width}x${layout.materialNeeds.factorySheets.size.length}`}
                                itemLabelPrefix="Pliego"
                            />
                            <p className="text-xs text-gray-400 text-center mt-3 max-w-xs">Se necesitan <strong className="text-cyan-300">{formatNumber(layout.materialNeeds.factorySheets.quantityNeeded)}</strong> hojas, cortadas en <strong className="text-cyan-300">{layout.materialNeeds.factorySheets.cuttingPlan.cutsPerSheet}</strong>.</p>
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-md flex flex-col items-center justify-center">
                            <h4 className="font-semibold text-sm text-center text-white mb-2">Panel B: Imposición en Pliego</h4>
                            <DynamicLayoutVisualizer
                                parentSize={layout.pressSheetSize}
                                items={layout.placements}
                                parentLabel={`Pliego ${layout.pressSheetSize.width}x${layout.pressSheetSize.length}`}
                            />
                            <p className="text-xs text-gray-400 text-center mt-3 max-w-xs mx-auto">Imprimir <strong className="text-cyan-300">{formatNumber(layout.sheetsToPrint)} + {layout.machine.overage.amount} demasía</strong> en pliegos.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const SolutionDisplay = ({ solution, baseCost, dollarRate }) => {
        const isBase = !solution.summary;
        const totalCost = isBase ? solution.total_cost : (solution.summary ? solution.summary.gangedTotalCost : 0);
        const saving = isBase ? 0 : baseCost - totalCost;
        const plan = useMemo(() => { if (!solution || !solution.layouts) return []; if (isBase) { return Object.values(solution.layouts); } return (solution.productionPlan || []).map(item => solution.layouts[item.id]).filter(Boolean); }, [solution, isBase]);
        const [quoteNumber, setQuoteNumber] = useState('');

        return (
            <div>
                <div className="bg-slate-800 p-4 rounded-lg mb-6 sticky top-0 z-10 border-b border-gray-700 shadow-md">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Costo Total: <span className="text-cyan-400">{formatCurrency(totalCost)}</span></h2>
                            {!isBase && saving > 0 && (<p className="text-green-400 text-sm">Ahorro de {formatCurrency(saving)} vs. Solución Base</p>)}
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="text" value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} placeholder="Nº de Presupuesto" className="bg-slate-900 border border-gray-700 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:border-cyan-500"/>
                            <button onClick={() => onSaveQuote(quoteNumber, solution, totalCost)} disabled={!quoteNumber} className="p-2 rounded bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/40 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <Save size={16}/> Guardar
                            </button>
                        </div>
                        <button onClick={onBack} className="p-2 rounded bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors font-semibold flex items-center gap-2"><ArrowLeft size={16}/> Volver a Trabajos</button>
                    </div>
                </div>
                <div className="px-1">
                    {plan.map((layout, index) => (<ProductionSheet key={layout.layoutId || index} layout={layout} dollarRate={dollarRate} />))}
                </div>
            </div>
        );
    };

    const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(0);
    const solutions = useMemo(() => {
        if (!baseSolution) return [];
        const ganged = gangedSolutions || [];
        return [ { name: "Solución Base", data: baseSolution }, ...ganged.map((s, i) => ({ name: `Solución Ganging Optimizada #${i + 1}`, data: s })) ];
    }, [baseSolution, gangedSolutions]);
    
    const selectedSolution = solutions[selectedSolutionIndex]?.data;
    
    return (
        <div className="p-4">
            <div className="mb-6">
                <div className="flex flex-wrap items-center gap-2 bg-slate-800 p-2 rounded-lg border border-gray-700">
                    <span className="font-semibold text-sm mr-2 text-gray-300">Ver Solución:</span>
                    {solutions.map((s, i) => (
                        <button key={s.name} onClick={() => setSelectedSolutionIndex(i)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${selectedSolutionIndex === i ? 'bg-cyan-600 text-white shadow-lg' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>
            {selectedSolution ? <SolutionDisplay onSaveQuote={onSaveQuote} solution={selectedSolution} baseCost={baseSolution.total_cost} dollarRate={dollarRate} /> : <div className="text-center py-10 text-gray-400">Seleccione una solución para ver los detalles.</div>}
        </div>
    );
};*/

// #################################################################################
// ####### COMPONENTE 2: PÁGINA DE CONFIGURACIÓN DE MÁQUINAS #######
// #################################################################################
const MachinesAdminPage = ({ initialData, onSave }) => {
    const [items, setItems] = useState([]); const [editingField, setEditingField] = useState(null); const [msg, setMsg] = useState("");
    useEffect(() => { setItems(initialData.map(m => ({...m, _dirty: false, _snapshot: undefined}))); setMsg(`${initialData.length} máquinas cargadas.`); }, [initialData]);
    const toNum = (s) => { const n = Number(s); return Number.isFinite(n) ? n : null; };
    const mut = (i, patch) => setItems(p => p.map((x, ix) => { if (ix !== i) return x; const snapshot = x._snapshot ?? JSON.parse(JSON.stringify(x)); return { ...x, ...patch, _dirty: true, _snapshot: snapshot }; }));
    const addMachine = () => { const newMachine = { id: `new-${Date.now()}`, name: "Nueva Máquina", is_offset: true, printingBodies: 4, sheetFeedOrientation: 'long_edge', margins: { clamp: 10, tail: 10, sides: 5 }, minSheetSize: { width: 210, length: 297 }, maxSheetSize: { width: 720, length: 1020 }, overage: { amount: 50, perInk: false }, minImpressionsCharge: 1000, setupCost: { price: 2000, perInk: false }, washCost: { price: 500, perInk: false }, impressionCost: { pricePerThousand: 300, perInkPass: false }, duplexChargePrice: 0, price_brackets: [], _dirty: true }; setItems(p => [newMachine, ...p]); setEditingField(`${newMachine.id}-name`); };
    const cancelCardChanges = (i) => { const snap = items[i]._snapshot; if (!snap) { setItems(p => p.filter((_, ix) => ix !== i)); return; } setItems(p => p.map((x, ix) => ix === i ? { ...JSON.parse(JSON.stringify(snap)), _dirty: false, _snapshot: undefined } : x)); };
    const saveCardChanges = async (i) => { const { _dirty, _snapshot, ...payload } = items[i]; setMsg(`Guardando "${payload.name}"...`); await onSave('machines', payload); setMsg(`Máquina "${payload.name}" guardada.`); mut(i, { _dirty: false, _snapshot: undefined }); };
    const deleteMachine = async (i) => { if (window.confirm("¿Eliminar máquina?")) { setMsg(`Eliminando...`); await onSave('machines', { id: items[i].id, _delete: true }); setMsg(`Máquina eliminada.`); setItems(p => p.filter((_, ix) => ix !== i)); }};
    const addBracket = (mi) => { const next = { constraints: { maxLen: 0, maxWid: 0 }, sheetCost: { unit: "per_sheet", value: 0 }}; mut(mi, { price_brackets: [ ...(items[mi].price_brackets || []), next] }); };
    const removeBracket = (mi, bi) => mut(mi, { price_brackets: items[mi].price_brackets.filter((_, idx) => idx !== bi) });
    const updBracket = (mi, bi, patch) => { const next = items[mi].price_brackets.map((b, i) => i === bi ? { ...b, ...patch } : b); mut(mi, { price_brackets: next }); };
    return ( <div className="space-y-5 p-4"> <header className="flex flex-wrap items-center gap-3"> <h1 className="text-2xl font-bold mr-auto">Configuración de Máquinas</h1> {msg && <span className="text-white/60 text-sm">{msg}</span>} <button title="Agregar Máquina" onClick={addMachine} className="p-2 rounded bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/40 transition-colors font-semibold"><Plus size={20}/></button> </header> <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"> {items.map((m, i) => ( <div key={m.id} className="rounded-xl border border-gray-700 bg-slate-800/50 p-4 flex flex-col gap-4"> <div className="flex items-center justify-between gap-2 border-b border-gray-700 pb-3"> <EditableField value={m.name} onChange={(e) => mut(i, {name: e.target.value})} isEditing={editingField === `${m.id}-name`} onStartEdit={() => setEditingField(`${m.id}-name`)} onEndEdit={() => setEditingField(null)} className="!text-lg !font-semibold" /> <div className="flex items-center gap-1.5"> {m._dirty && (<><IconButton title="Deshacer" onClick={() => cancelCardChanges(i)}><RotateCcw size={18} /></IconButton><IconButton title="Guardar" onClick={() => saveCardChanges(i)} colorClass="text-green-400"><Upload size={18} /></IconButton></>)} <IconButton title="Eliminar" onClick={()=>deleteMachine(i)} colorClass="text-red-500"><Trash2 size={18}/></IconButton> </div> </div> <div className="border-b border-gray-700 pb-4"> <h3 className="text-base font-semibold text-white/90 mb-3">Propiedades Físicas</h3> <div className="space-y-3"> <div className="grid grid-cols-2 gap-4"> <LabeledField label="Tipo de Máquina"><EditableField type="select" value={m.is_offset} onChange={(e) => mut(i, {is_offset: e.target.value === 'true'})} onEndEdit={()=>{}} options={[{value: true, label: 'Offset'}, {value: false, label: 'Digital'}]} /></LabeledField> <LabeledField label="Cuerpos de Impresión"><EditableField type="number" value={m.printingBodies} onChange={(e) => mut(i, {printingBodies: toNum(e.target.value)})} isEditing={editingField === `${m.id}-bodies`} onStartEdit={() => setEditingField(`${m.id}-bodies`)} onEndEdit={() => setEditingField(null)}/></LabeledField> </div> <LabeledField label="Márgenes (Pinza / Cola / Lados) en mm"><div className="grid grid-cols-3 gap-2"><EditableField type="number" placeholder="P" value={m.margins.clamp} onChange={(e) => mut(i, {margins: { ...m.margins, clamp: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-mClamp`} onStartEdit={()=>setEditingField(`${m.id}-mClamp`)} onEndEdit={()=>setEditingField(null)}/><EditableField type="number" placeholder="C" value={m.margins.tail} onChange={(e) => mut(i, {margins: { ...m.margins, tail: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-mTail`} onStartEdit={()=>setEditingField(`${m.id}-mTail`)} onEndEdit={()=>setEditingField(null)} /><EditableField type="number" placeholder="L" value={m.margins.sides} onChange={(e) => mut(i, {margins: { ...m.margins, sides: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-mSides`} onStartEdit={()=>setEditingField(`${m.id}-mSides`)} onEndEdit={()=>setEditingField(null)} /></div></LabeledField> <div className="grid grid-cols-2 gap-4"> <LabeledField label="Tam. Mín. Pliego (Ancho x Largo) en mm"><div className="flex gap-2"><EditableField type="number" value={m.minSheetSize.width} onChange={(e) => mut(i, {minSheetSize: { ...m.minSheetSize, width: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-minW`} onStartEdit={()=>setEditingField(`${m.id}-minW`)} onEndEdit={()=>setEditingField(null)}/><EditableField type="number" value={m.minSheetSize.length} onChange={(e) => mut(i, {minSheetSize: { ...m.minSheetSize, length: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-minL`} onStartEdit={()=>setEditingField(`${m.id}-minL`)} onEndEdit={()=>setEditingField(null)} /></div></LabeledField> <LabeledField label="Tam. Máx. Pliego (Ancho x Largo) en mm"><div className="flex gap-2"><EditableField type="number" value={m.maxSheetSize.width} onChange={(e) => mut(i, {maxSheetSize: { ...m.maxSheetSize, width: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-maxW`} onStartEdit={()=>setEditingField(`${m.id}-maxW`)} onEndEdit={()=>setEditingField(null)}/><EditableField type="number" value={m.maxSheetSize.length} onChange={(e) => mut(i, {maxSheetSize: { ...m.maxSheetSize, length: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-maxL`} onStartEdit={()=>setEditingField(`${m.id}-maxL`)} onEndEdit={()=>setEditingField(null)} /></div></LabeledField> </div> </div> </div> <div className="border-b border-gray-700 pb-4"> <h3 className="text-base font-semibold text-white/90 mb-3">Reglas de Costeo</h3> <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> <LabeledField label="Demasía (Pliegos Extra)"><div className="flex items-center gap-2"><EditableField type="number" value={m.overage.amount} onChange={(e) => mut(i, {overage: { ...m.overage, amount: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-overage`} onStartEdit={()=>setEditingField(`${m.id}-overage`)} onEndEdit={()=>setEditingField(null)}/><CostModeSelector value={m.overage.perInk} onChange={c => mut(i, {overage: { ...m.overage, perInk: c}})} options={['Fija', 'Por Tinta']} /></div></LabeledField> <LabeledField label="Mínimo de Impresión"><EditableField type="number" value={m.minImpressionsCharge} onChange={(e) => mut(i, {minImpressionsCharge: toNum(e.target.value)})} isEditing={editingField===`${m.id}-minImp`} onStartEdit={()=>setEditingField(`${m.id}-minImp`)} onEndEdit={()=>setEditingField(null)}/></LabeledField> <LabeledField label="Costo de Postura"><div className="flex items-center gap-2"><EditableField type="number" value={m.setupCost.price} onChange={(e) => mut(i, {setupCost: { ...m.setupCost, price: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-setup`} onStartEdit={()=>setEditingField(`${m.id}-setup`)} onEndEdit={()=>setEditingField(null)}/><CostModeSelector value={m.setupCost.perInk} onChange={c => mut(i, {setupCost: { ...m.setupCost, perInk: c}})} options={['Fijo', 'Por Tinta']} /></div></LabeledField> <LabeledField label="Costo de Lavado"><div className="flex items-center gap-2"><EditableField type="number" value={m.washCost.price} onChange={(e) => mut(i, {washCost: { ...m.washCost, price: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-wash`} onStartEdit={()=>setEditingField(`${m.id}-wash`)} onEndEdit={()=>setEditingField(null)}/><CostModeSelector value={m.washCost.perInk} onChange={c => mut(i, {washCost: { ...m.washCost, perInk: c}})} options={['Fijo', 'Por Tinta']} /></div></LabeledField> <LabeledField label="Costo por Millar"><div className="flex items-center gap-2"><EditableField type="number" value={m.impressionCost.pricePerThousand} onChange={(e) => mut(i, {impressionCost: { ...m.impressionCost, pricePerThousand: toNum(e.target.value)}})} isEditing={editingField===`${m.id}-imp`} onStartEdit={()=>setEditingField(`${m.id}-imp`)} onEndEdit={()=>setEditingField(null)}/><CostModeSelector value={m.impressionCost.perInkPass} onChange={c => mut(i, {impressionCost: { ...m.impressionCost, perInkPass: c}})} options={['Por Pliego', 'Por Tinta']} /></div></LabeledField> <LabeledField label="Costo Extra por Frente y Dorso"><EditableField type="number" value={m.duplexChargePrice} onChange={(e) => mut(i, {duplexChargePrice: toNum(e.target.value)})} isEditing={editingField === `${m.id}-duplex`} onStartEdit={() => setEditingField(`${m.id}-duplex`)} onEndEdit={() => setEditingField(null)}/></LabeledField> </div> </div> <div> <div className="flex items-center justify-between mb-1"><h3 className="text-base text-white/90 font-semibold">Costos por Formato (Price Brackets)</h3><IconButton title="Añadir Tramo" onClick={() => addBracket(i)} className="bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300"><Plus size={16}/></IconButton></div> <div className="space-y-1 mt-2"> {(m.price_brackets ?? []).map((b, bi) => ( <div key={bi} className="relative rounded-lg p-2 transition-colors border border-transparent hover:bg-black/20"> <div className="grid grid-cols-2 gap-x-4 gap-y-2 pr-8"> <LabeledField label="Tamaño Máx. (Ancho × Largo) en mm"><div className="flex items-center gap-2"><EditableField type="number" value={b.constraints.maxWid} onChange={(e)=>updBracket(i,bi,{constraints:{...b.constraints, maxWid:toNum(e.target.value)}})} isEditing={editingField===`${m.id}-b${bi}-wid`} onStartEdit={()=>setEditingField(`${m.id}-b${bi}-wid`)} onEndEdit={()=>setEditingField(null)} /><span className="text-white/50">×</span><EditableField type="number" value={b.constraints.maxLen} onChange={(e)=>updBracket(i,bi,{constraints:{...b.constraints, maxLen:toNum(e.target.value)}})} isEditing={editingField===`${m.id}-b${bi}-len`} onStartEdit={()=>setEditingField(`${m.id}-b${bi}-len`)} onEndEdit={()=>setEditingField(null)} /></div></LabeledField> <LabeledField label="Unidad y Precio"><div className="flex items-center gap-2"><EditableField type="select" value={b.sheetCost.unit} onChange={(e)=>updBracket(i,bi,{sheetCost:{...b.sheetCost, unit:e.target.value}})} options={[{value: "per_sheet", label: "por hoja"}, {value: "per_thousand", label: "por millar"}]} onEndEdit={()=>{}} /><EditableField type="number" value={b.sheetCost.value} onChange={(e)=>updBracket(i,bi,{sheetCost:{...b.sheetCost, value:toNum(e.target.value)}})} isEditing={editingField===`${m.id}-b${bi}-price`} onStartEdit={()=>setEditingField(`${m.id}-b${bi}-price`)} onEndEdit={()=>setEditingField(null)} /></div></LabeledField> </div> <IconButton title="Eliminar tramo" onClick={() => removeBracket(i, bi)} className="absolute top-1 right-1" colorClass="text-red-500 hover:text-red-400 opacity-50 hover:opacity-100"><Trash2 size={16}/></IconButton> </div> ))} {(m.price_brackets ?? []).length === 0 && <div className="text-xs text-white/60 py-2 text-center bg-black/20 rounded-md">Sin tramos de precios definidos</div>} </div> </div> </div> ))} </div> </div> );
};

// #################################################################################
// ####### COMPONENTE 3: PÁGINA DE CONFIGURACIÓN DE MATERIALES #######
// #################################################################################
const MaterialsAdminPage = ({ initialData, onSave }) => {
    const [items, setItems] = useState([]); const [msg, setMsg] = useState(""); const [editingField, setEditingField] = useState(null); const [newGramValue, setNewGramValue] = useState("");
    useEffect(() => { setItems(initialData.map(m => ({...m, _dirty: false, _snapshot: undefined}))); setMsg(`${initialData.length} tipos de materiales cargados.`); }, [initialData]);
    const toNum = (s) => { const n = Number(s); return Number.isFinite(n) && n > 0 ? n : null; };
    const mut = (i, patch) => setItems(p => p.map((x, ix) => ix === i ? { ...x, ...patch, _dirty: true, _snapshot: x._snapshot ?? JSON.parse(JSON.stringify(x)) } : x));
    const mutGrade = (i, gi, patch) => { const grades = [...items[i].grades]; grades[gi] = {...grades[gi], ...patch}; mut(i, {grades}); };
    const mutSize = (i, gi, si, patch) => { const sizes = [...items[i].grades[gi].sizes]; sizes[si] = {...sizes[si], ...patch}; mutGrade(i, gi, {sizes}); };
    const addType = () => setItems(p=>[{ id: `new-${Date.now()}`, name:"Nuevo tipo de papel", grades:[{ id: `g-new-${Date.now()}`, grams: [90], sizes:[], isSpecialMaterial: false }], _dirty:true }, ...p]);
    const cancelCardChanges = (i) => { const snap = items[i]._snapshot; if (!snap) { setItems(p => p.filter((_, ix) => ix !== i)); return; } setItems(p => p.map((x, ix) => ix === i ? { ...JSON.parse(JSON.stringify(snap)), _dirty: false, _snapshot: undefined } : x)); };
    const saveCardChanges = async (i) => { const { _dirty, _snapshot, ...payload } = items[i]; setMsg(`Guardando "${payload.name}"...`); await onSave('materials', payload); setMsg(`Material "${payload.name}" guardado.`); mut(i, { _dirty: false, _snapshot: undefined }); };
    const deleteType = async (i) => { if (window.confirm("¿Eliminar tipo de material y todos sus gramajes?")) { setMsg(`Eliminando...`); await onSave('materials', { id: items[i].id, _delete: true }); setMsg(`Material eliminado.`); setItems(p => p.filter((_, ix) => ix !== i)); }};
    const addGrade = (i) => { const grades = [{id: `g-new-${Date.now()}`, grams:[], sizes:[], isSpecialMaterial: false}, ...(items[i].grades||[])]; mut(i, {grades}); };
    const delGrade = (i, gi) => { if (window.confirm("¿Eliminar este bloque de gramajes y tamaños?")) { const grades = items[i].grades.filter((_, gix) => gix !== gi); mut(i, {grades}); }};
    const addSize = (i, gi) => { const sizes = [{id: `s-new-${Date.now()}`, length_mm:0,width_mm:0,usd_per_ton:0}, ...(items[i].grades[gi].sizes||[])]; mutGrade(i,gi,{sizes}); };
    const delSize = (i, gi, si) => { const sizes = items[i].grades[gi].sizes.filter((_, six) => six !== si); mutGrade(i,gi,{sizes}); };
    const addGramChip = (ti, gi, gram) => { const num = toNum(gram); if(num) { const g = items[ti].grades[gi]; const grams = Array.from(new Set([...g.grams, num])).sort((a,b)=>a-b); mutGrade(ti, gi, {grams}); } setNewGramValue(""); setEditingField(null); };
    const removeGramChip = (ti, gi, gram) => { const g = items[ti].grades[gi]; const grams = g.grams.filter(gVal => gVal !== gram); mutGrade(ti, gi, {grams}); };
    return ( <div className="space-y-4 p-4"> <header className="flex flex-wrap items-center gap-3"> <h1 className="text-2xl font-bold mr-auto">Configuración de Materiales</h1> {msg && <span className="text-white/60 text-sm">{msg}</span>} <button title="Agregar Tipo de Material" onClick={addType} className="p-2 rounded bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/40 transition-colors font-semibold"><Plus size={20}/></button> </header> <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"> {items.map((t, ti) => ( <div key={t.id} className="rounded-xl border border-gray-700 bg-slate-800/50 p-4"> <div className="flex items-center justify-between mb-2 pb-3 border-b border-gray-700"> <EditableField value={t.name} onChange={(e) => mut(ti, {name: e.target.value})} isEditing={editingField === `${t.id}-name`} onStartEdit={() => setEditingField(`${t.id}-name`)} onEndEdit={() => setEditingField(null)} className="!text-lg !font-semibold" placeholder="Nombre del Tipo" /> <div className="flex items-center gap-1.5"> {t._dirty && ( <><IconButton title="Deshacer" onClick={() => cancelCardChanges(ti)}><RotateCcw size={18} /></IconButton><IconButton title="Guardar" onClick={() => saveCardChanges(ti)} colorClass="text-green-400"><Upload size={18} /></IconButton></> )} <IconButton title="Eliminar tipo" onClick={()=>deleteType(ti)} colorClass="text-red-500"><Trash2 size={18}/></IconButton> </div> </div> <div className="mt-1 space-y-3"> <div className="flex items-center justify-between"><span className="text-sm text-white/80 font-semibold">Grupos de Tamaños / Gramajes</span><IconButton title="Añadir grupo" onClick={()=>addGrade(ti)} className="bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300"><Plus size={14}/></IconButton></div> {(t.grades||[]).map((g, gi) => ( <div key={g.id} className="relative rounded-lg border border-gray-700/50 bg-black/30 p-3"> <IconButton title="Eliminar este bloque" onClick={()=>delGrade(ti,gi)} colorClass="text-red-500/70 hover:text-red-500" className="absolute top-2 right-2"><Trash2 size={16}/></IconButton> <div className="flex items-start justify-between flex-wrap gap-2 mb-2"> <div className="flex-grow"> <label className="text-white/80 font-medium text-xs mb-1">Gramajes</label> <div className="flex flex-wrap items-center gap-2 mt-1 p-1 bg-black/20 rounded-md min-h-[34px]"> {g.grams.map(gram => (<span key={gram} className="inline-flex items-center gap-2 bg-slate-700 text-slate-100 rounded-full px-2.5 py-0.5 text-sm font-medium"> {gram}g <button onClick={() => removeGramChip(ti, gi, gram)}><X size={14}/></button> </span>))} {editingField === g.id ? <input type="number" value={newGramValue} onChange={e => setNewGramValue(e.target.value)} onKeyDown={e => {if(e.key === 'Enter') addGramChip(ti, gi, newGramValue)}} onBlur={() => addGramChip(ti, gi, newGramValue)} placeholder="g" autoFocus className="bg-transparent w-16 focus:outline-none"/> : <button onClick={() => setEditingField(g.id)} className="p-1 rounded-full bg-slate-600 hover:bg-slate-500"><Plus size={12}/></button>} </div> </div> <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer pt-5"><input type="checkbox" checked={g.isSpecialMaterial} onChange={() => mutGrade(ti, gi, { isSpecialMaterial: !g.isSpecialMaterial })} className="accent-cyan-500 w-4 h-4" /><span>Especial?</span></label> </div> <div className="space-y-2"> {(g.sizes||[]).map((s,si) => ( <div key={s.id} className="relative rounded-lg p-1.5 transition-colors border border-transparent hover:bg-black/20"> <div className="grid grid-cols-3 gap-3 pr-8"> <LabeledField label="Ancho (mm)"><EditableField type="number" value={s.width_mm} onChange={(e) => mutSize(ti,gi,si,{width_mm: toNum(e.target.value)})} isEditing={editingField === `${s.id}-w`} onStartEdit={() => setEditingField(`${s.id}-w`)} onEndEdit={() => setEditingField(null)} /></LabeledField> <LabeledField label="Largo (mm)"><EditableField type="number" value={s.length_mm} onChange={(e) => mutSize(ti,gi,si,{length_mm: toNum(e.target.value)})} isEditing={editingField === `${s.id}-l`} onStartEdit={() => setEditingField(`${s.id}-l`)} onEndEdit={() => setEditingField(null)} /></LabeledField> <LabeledField label="USD/Ton"><EditableField type="number" value={s.usd_per_ton} onChange={(e) => mutSize(ti,gi,si,{usd_per_ton: toNum(e.target.value)})} isEditing={editingField === `${s.id}-usd`} onStartEdit={() => setEditingField(`${s.id}-usd`)} onEndEdit={() => setEditingField(null)} /></LabeledField> </div> <IconButton title="Eliminar tamaño" onClick={()=>delSize(ti,gi,si)} className="absolute top-1/2 -translate-y-1/2 right-1" colorClass="text-red-500/60 hover:text-red-500"><Trash2 size={16}/></IconButton> </div> ))} <div className="flex justify-end"><button className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 mt-2 flex items-center gap-1" onClick={()=>addSize(ti,gi)}><Plus size={12}/> Añadir tamaño</button></div> </div> </div> ))} </div> </div> ))} </div> </div> );
};

// #################################################################################
// ####### COMPONENTE 4: PÁGINA DE CONFIGURACIÓN DE CORTES #######
// #################################################################################
const CutsAdminPage = ({ initialData, onSave }) => {
    const [groups, setGroups] = useState([]); const [msg, setMsg] = useState(""); const [editingField, setEditingField] = useState(null);
    useEffect(() => { setGroups(initialData.map(g => ({...g, _dirty: false, _snapshot: undefined}))); setMsg(`${initialData.length} grupos de cortes cargados.`); }, [initialData]);
    const toNum = (s) => Number(s) || 0;
    const mut = (i, patch) => setGroups(p => p.map((x, ix) => ix === i ? { ...x, ...patch, _dirty: true, _snapshot: x._snapshot ?? JSON.parse(JSON.stringify(x)) } : x));
    const mutRow = (i, ri, patch) => { const list = [...(groups[i].sheetSizes || [])]; list[ri] = {...list[ri], ...patch}; mut(i,{sheetSizes:list}); };
    const addGroup = () => setGroups(p => [{ id: `new-${Date.now()}`, forPaperSize:{length:720,width:1020}, sheetSizes:[], _dirty:true }, ...p]);
    const cancelCardChanges = (i) => { const snap = groups[i]._snapshot; if (!snap) { setGroups(p => p.filter((_, ix) => ix !== i)); return; } setGroups(p => p.map((x, ix) => ix === i ? { ...JSON.parse(JSON.stringify(snap)), _dirty: false, _snapshot: undefined } : x)); };
    const saveCardChanges = async (i) => { const { _dirty, _snapshot, ...payload } = groups[i]; setMsg(`Guardando grupo...`); await onSave('cuts', payload); setMsg('Grupo guardado.'); mut(i, { _dirty: false, _snapshot: undefined }); };
    const deleteGroup = async (i) => { if (window.confirm("¿Eliminar este grupo de cortes?")) { setMsg("Eliminando..."); await onSave('cuts', { id: groups[i].id, _delete: true }); setMsg("Grupo eliminado."); setGroups(p => p.filter((_, ix) => ix !== i)); }};
    const addRow = (i) => mut(i,{sheetSizes:[{id:`s-new-${Date.now()}`, length:0,width:0,preferred:false}, ...(groups[i].sheetSizes||[])]});
    const delRow = (i, ri) => mut(i,{sheetSizes:(groups[i].sheetSizes||[]).filter((_,rx)=>rx!==ri)});
    return ( <div className="space-y-4 p-4"> <header className="flex flex-wrap items-center gap-3"> <h1 className="text-2xl font-bold mr-auto">Configuración de Cortes</h1> {msg && <span className="text-white/60 text-sm">{msg}</span>} <button title="Agregar Grupo de Corte" onClick={addGroup} className="p-2 rounded bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/40 transition-colors font-semibold"><Plus size={20}/></button> </header> <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"> {groups.map((g,gi)=>( <div key={g.id} className="rounded-xl border border-gray-700 bg-slate-800/50 p-4"> <div className="flex items-center justify-between gap-2 mb-3 border-b border-gray-700 pb-3"> <div className="flex items-center gap-2 text-base font-semibold"> <span>Papel Fábrica (mm):</span> <EditableField type="number" value={g.forPaperSize.width} onChange={e=>mut(gi,{forPaperSize:{...g.forPaperSize,width:toNum(e.target.value)}})} isEditing={editingField===`${g.id}-w`} onStartEdit={()=>setEditingField(`${g.id}-w`)} onEndEdit={()=>setEditingField(null)} className="!w-20"/> <span>×</span> <EditableField type="number" value={g.forPaperSize.length} onChange={e=>mut(gi,{forPaperSize:{...g.forPaperSize,length:toNum(e.target.value)}})} isEditing={editingField===`${g.id}-l`} onStartEdit={()=>setEditingField(`${g.id}-l`)} onEndEdit={()=>setEditingField(null)} className="!w-20"/> </div> <div className="flex items-center gap-1.5"> {g._dirty && <> <IconButton title="Deshacer" onClick={()=>cancelCardChanges(gi)}><RotateCcw size={18}/></IconButton> <IconButton title="Guardar" onClick={()=>saveCardChanges(gi)} colorClass="text-green-400"><Upload size={18}/></IconButton> </>} <IconButton title="Eliminar Grupo" onClick={()=>deleteGroup(gi)} colorClass="text-red-500"><Trash2 size={18}/></IconButton> </div> </div> <div className="flex items-center justify-between"><span className="text-white/80 font-semibold text-sm">Cortes Resultantes (pliegos) en mm</span><IconButton onClick={()=>addRow(gi)} title="Añadir corte" className="bg-cyan-600/30 text-cyan-300"><Plus size={14}/></IconButton></div> <div className="mt-2 space-y-2"> {(g.sheetSizes||[]).map((s,si)=>( <div key={s.id || si} className="relative rounded-lg p-1.5 transition-colors border border-transparent hover:bg-black/20"> <div className="grid grid-cols-12 gap-2 items-center pr-8"> <div className="col-span-5"><EditableField type="number" value={s.width} onChange={e=>mutRow(gi,si,{width:toNum(e.target.value)})} placeholder="Ancho" isEditing={editingField===`${g.id}-${si}-w`} onStartEdit={()=>setEditingField(`${g.id}-${si}-w`)} onEndEdit={()=>setEditingField(null)} /></div> <span className="text-white/50 col-span-2 text-center">×</span> <div className="col-span-5"><EditableField type="number" value={s.length} onChange={e=>mutRow(gi,si,{length:toNum(e.target.value)})} placeholder="Largo" isEditing={editingField===`${g.id}-${si}-l`} onStartEdit={()=>setEditingField(`${g.id}-${si}-l`)} onEndEdit={()=>setEditingField(null)} /></div> </div> <button onClick={()=>delRow(gi,si)} title="Borrar" className="absolute top-1/2 -translate-y-1/2 right-1 p-1.5 rounded-md text-red-500/60 hover:text-red-500"><Trash2 size={16}/></button> </div> ))} {(g.sheetSizes||[]).length===0 && <div className="text-xs text-center text-white/60 bg-black/20 rounded p-2 mt-2">Sin cortes definidos</div>} </div> </div> ))} </div> </div> );
};


// #################################################################################
// ####### COMPONENTE 5: PÁGINA DE AJUSTES GENERALES #######
// #################################################################################
const GeneralSettingsPage = ({ initialData, onSave }) => {
    const [settings, setSettings] = useState({ timeoutSeconds: 120, numberOfSolutions: 4, dollarRate: 40.5, penalties: { differentPressSheetPenalty: 10, differentFactorySheetPenalty: 10, differentMachinePenalty: 25 }, _dirty: false, _snapshot: null });
    const [msg, setMsg] = useState("");
    const [editingField, setEditingField] = useState(null);

    useEffect(() => {
        const initialSettings = initialData || { timeoutSeconds: 120, numberOfSolutions: 4, dollarRate: 40.5, penalties: { differentPressSheetPenalty: 10, differentFactorySheetPenalty: 10, differentMachinePenalty: 25 }};
        setSettings(s => ({...initialSettings, _dirty: false, _snapshot: JSON.parse(JSON.stringify(initialSettings))}));
        setMsg("Ajustes cargados.");
    }, [initialData]);

    const handleSettingChange = (key, value) => setSettings(s => ({ ...s, [key]: Number(value) || 0, _dirty: true }));
    const handlePenaltyChange = (key, value) => setSettings(s => ({ ...s, penalties: { ...s.penalties, [key]: Number(value) || 0 }, _dirty: true }));
    
    const saveSettings = async () => { setMsg("Guardando..."); const { _dirty, _snapshot, ...payload } = settings; await onSave('general_settings', payload); setMsg("Ajustes guardados."); setSettings(s => ({...s, _dirty: false, _snapshot: JSON.parse(JSON.stringify(payload))})); };
    const cancelChanges = () => { setSettings(s => ({...s._snapshot, _dirty: false, _snapshot: s._snapshot})); setMsg("Cambios deshechos."); };

    const LabeledSetting = ({ id, label, description, value, onChange }) => ( <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center border-b border-gray-700/50 py-3"> <div> <label className="font-semibold text-gray-200">{label}</label> <p className="text-sm text-gray-400">{description}</p> </div> <div className="md:text-right"> <EditableField type="number" value={value} onChange={e => onChange(e.target.value)} isEditing={editingField === id} onStartEdit={() => setEditingField(id)} onEndEdit={() => setEditingField(null)} className="!w-32 md:ml-auto" /> </div> </div> );
    return ( <div className="p-4"> <header className="flex flex-wrap items-center gap-3 mb-6"> <h1 className="text-2xl font-bold mr-auto">Ajustes Generales</h1> {msg && <span className="text-white/60 text-sm">{msg}</span>} {settings._dirty && <div className="flex items-center gap-2"><IconButton onClick={cancelChanges} title="Deshacer cambios"><RotateCcw size={18}/></IconButton><IconButton onClick={saveSettings} title="Guardar cambios" colorClass="text-green-400"><Upload size={18}/></IconButton></div>} </header> <div className="max-w-4xl mx-auto space-y-8"> <div className="p-6 rounded-xl border border-gray-700 bg-slate-800/50"> <h2 className="text-lg font-bold mb-2">Parámetros del Optimizador</h2> <LabeledSetting id="timeout" label="Tiempo Máx. de Ejecución (s)" description="Segundos máximos para la búsqueda de soluciones." value={settings.timeoutSeconds} onChange={(v) => handleSettingChange('timeoutSeconds', v)}/> <LabeledSetting id="solutions" label="Número de Soluciones" description="Cantidad de gangings alternativos a generar." value={settings.numberOfSolutions} onChange={(v) => handleSettingChange('numberOfSolutions', v)}/> </div> <div className="p-6 rounded-xl border border-gray-700 bg-slate-800/50"> <h2 className="text-lg font-bold mb-2">Penalizaciones (%)</h2> <LabeledSetting id="pen-machine" label="Por Máquina Diferente" description="Penalización por usar más de una máquina." value={settings.penalties.differentMachinePenalty} onChange={(v) => handlePenaltyChange('differentMachinePenalty', v)} /> <LabeledSetting id="pen-press" label="Por Pliego Diferente" description="Penalización por usar más de un tamaño de pliego." value={settings.penalties.differentPressSheetPenalty} onChange={(v) => handlePenaltyChange('differentPressSheetPenalty', v)} /> <LabeledSetting id="pen-factory" label="Por Papel de Fábrica Diferente" description="Penalización por usar más de un papel de fábrica." value={settings.penalties.differentFactorySheetPenalty} onChange={(v) => handlePenaltyChange('differentFactorySheetPenalty', v)} /> </div> <div className="p-6 rounded-xl border border-gray-700 bg-slate-800/50"> <h2 className="text-lg font-bold mb-2">Finanzas</h2> <LabeledSetting id="dollar" label="Cotización del Dólar" description="Tipo de cambio para convertir costos." value={settings.dollarRate} onChange={(v) => handleSettingChange('dollarRate', v)} /> </div> </div> </div> );
};

// #################################################################################
// ####### COMPONENTE 6: PÁGINA DE ENTRADA DE TRABAJOS (COTIZADOR) #######
// #################################################################################
const JobsInputPage = ({ onOptimize, materialsData }) => {
    const [jobs, setJobs] = useState([]); const [editingField, setEditingField] = useState(null); const toNum = (s) => { const n = Number(s); return Number.isFinite(n) ? n : null; };
    const addJob = () => { const lastJob = jobs[0]; const newJob = { id: `job-${Date.now()}`, name: `Trabajo Nuevo ${jobs.length + 1}`, width: 148, length: 210, quantity: 1000, rotatable: lastJob ? lastJob.rotatable : true, samePlatesForBack: lastJob ? lastJob.samePlatesForBack : false, material: lastJob ? lastJob.material : { name: '', grammage: '' }, frontInks: lastJob ? lastJob.frontInks : 4, backInks: lastJob ? lastJob.backInks : 0, }; setJobs(p => [newJob, ...p]); };
    const removeJob = (id) => setJobs(p => p.filter(j => j.id !== id));
    const updateJob = (id, patch) => setJobs(p => p.map(j => j.id === id ? {...j, ...patch} : j));
    const materialOptions = materialsData.map(m => ({value: m.name, label: m.name}));
    return ( <div className="p-4 space-y-6"> <header className="flex flex-wrap items-center gap-3"> <h1 className="text-2xl font-bold mr-auto">Cotizador de Trabajos</h1> <button title="Agregar Trabajo" onClick={addJob} className="p-2 rounded bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/40 transition-colors font-semibold flex items-center gap-2"><Plus size={20}/> Agregar Trabajo</button> </header> <div className="space-y-4"> {jobs.map(job => { const selectedMaterial = materialsData.find(m => m.name === job.material.name); const grammageOptions = selectedMaterial ? selectedMaterial.grades.flatMap(g => g.grams).map(gr => ({value: gr, label: `${gr}g`})) : []; return ( <div key={job.id} className="rounded-xl border border-gray-700 bg-slate-800/50 p-4"> <div className="flex items-center justify-between gap-2 border-b border-gray-700 pb-3 mb-4"> <EditableField value={job.name} onChange={e => updateJob(job.id, {name: e.target.value})} isEditing={editingField === `${job.id}-name`} onStartEdit={() => setEditingField(`${job.id}-name`)} onEndEdit={() => setEditingField(null)} className="!text-lg !font-semibold" /> <IconButton title="Eliminar Trabajo" onClick={() => removeJob(job.id)} colorClass="text-red-500"><Trash2 size={18}/></IconButton> </div> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end"> <div className="grid grid-cols-3 gap-2"> <LabeledField label="Ancho (mm)"><EditableField type="number" value={job.width} onChange={e => updateJob(job.id, {width: toNum(e.target.value)})} isEditing={editingField === `${job.id}-w`} onStartEdit={()=>setEditingField(`${job.id}-w`)} onEndEdit={()=>setEditingField(null)} /></LabeledField> <LabeledField label="Largo (mm)"><EditableField type="number" value={job.length} onChange={e => updateJob(job.id, {length: toNum(e.target.value)})} isEditing={editingField === `${job.id}-l`} onStartEdit={()=>setEditingField(`${job.id}-l`)} onEndEdit={()=>setEditingField(null)} /></LabeledField> <LabeledField label="Cantidad"><EditableField type="number" value={job.quantity} onChange={e => updateJob(job.id, {quantity: toNum(e.target.value)})} isEditing={editingField === `${job.id}-q`} onStartEdit={()=>setEditingField(`${job.id}-q`)} onEndEdit={()=>setEditingField(null)} /></LabeledField> </div> <div className="grid grid-cols-2 gap-2"> <LabeledField label="Material"><EditableField type="select" value={job.material.name} onChange={e => updateJob(job.id, {material: {name: e.target.value, grammage: ''}})} options={[{value:'', label: 'Seleccionar...'},...materialOptions]} onEndEdit={()=>{}} /></LabeledField> <LabeledField label="Gramaje"><EditableField type="select" value={job.material.grammage} onChange={e => updateJob(job.id, {material: {...job.material, grammage: toNum(e.target.value)}})} options={[{value:'', label: '...'},...grammageOptions]} onEndEdit={()=>{}} /></LabeledField> </div> <div className="grid grid-cols-2 gap-2"> <LabeledField label="Tintas Frente"><EditableField type="number" value={job.frontInks} onChange={e => updateJob(job.id, {frontInks: toNum(e.target.value)})} isEditing={editingField === `${job.id}-f`} onStartEdit={()=>setEditingField(`${job.id}-f`)} onEndEdit={()=>setEditingField(null)} /></LabeledField> <LabeledField label="Tintas Dorso"><EditableField type="number" value={job.backInks} onChange={e => updateJob(job.id, {backInks: toNum(e.target.value)})} isEditing={editingField === `${job.id}-b`} onStartEdit={()=>setEditingField(`${job.id}-b`)} onEndEdit={()=>setEditingField(null)} /></LabeledField> </div> <div className="grid grid-cols-2 gap-2"> <ToggleSwitch label="Rotable" enabled={job.rotatable} onChange={v => updateJob(job.id, {rotatable: v})}/> <ToggleSwitch label="Mismas Planchas F/D" enabled={job.samePlatesForBack} onChange={v => updateJob(job.id, {samePlatesForBack: v})}/> </div> </div> </div> ) })} </div> {jobs.length > 0 && ( <div className="mt-6 flex justify-end"> <button onClick={() => onOptimize(jobs)} className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"> <Wand2 size={20} /> Optimizar Cotización </button> </div> )} </div> );
};


// #################################################################################
// ####### FUNCIÓN ADAPTADORA: TRADUCE LA RESPUESTA DE LA API #######
// #################################################################################
const adaptApiResponse = (apiResult) => {
    const adaptLayout = (layout) => {
        if (!layout) return null;

        // 1. Unificar nombres de propiedades inconsistentes (snake_case vs camelCase)
        layout.layoutId = layout.layout_id || layout.layoutId;
        layout.sheetsToPrint = layout.net_sheets || layout.sheetsToPrint;
        layout.pressSheetSize = layout.printing_sheet || layout.printingSheet;
        
        // 2. Unificar la estructura de `jobsInLayout` para que siempre sea un Array
        if (layout.jobs_in_layout && typeof layout.jobs_in_layout === 'object' && !Array.isArray(layout.jobs_in_layout)) {
            layout.jobsInLayout = Object.entries(layout.jobs_in_layout).map(([id, qty]) => ({ id, quantityPerSheet: qty }));
        } else if (!layout.jobsInLayout) {
             layout.jobsInLayout = [];
        }

        // 3. Normalizar 'placements' para que usen w y h
        if (layout.placements && Array.isArray(layout.placements)) {
            layout.placements = layout.placements.map(p => ({
                ...p,
                w: p.width,
                h: p.length,
            }));
        }

        // 4. Limpiar los campos originales para evitar redundancia
        delete layout.layout_id;
        delete layout.net_sheets;
        delete layout.printing_sheet;
        delete layout.printingSheet;
        delete layout.jobs_in_layout;

        return layout;
    };
    
    if (apiResult.baselineSolution && apiResult.baselineSolution.layouts) {
        Object.values(apiResult.baselineSolution.layouts).forEach(adaptLayout);
    }

    if (apiResult.gangedSolutions && Array.isArray(apiResult.gangedSolutions)) {
        apiResult.gangedSolutions.forEach(solution => {
            if (solution.layouts) {
                Object.values(solution.layouts).forEach(adaptLayout);
            }
        });
    }
    
    return apiResult;
};


// #################################################################################
// ####### COMPONENTE PRINCIPAL DE LA APP Y NAVEGACIÓN #######
// #################################################################################
export default function App() {
    const [currentPage, setCurrentPage] = useState('cotizador');
    const [optimizationResult, setOptimizationResult] = useState(null);
    const [config, setConfig] = useState({ machines: [], materials: [], cuts: [], settings: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadConfig = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!supabase) throw new Error("Cliente de Supabase no inicializado. Revisa las variables de entorno.");
            const { data: machines, error: machinesError } = await supabase.from('machines').select('*');
            if (machinesError) throw machinesError;
            const { data: materials, error: materialsError } = await supabase.from('materials').select('*');
            if (materialsError) throw materialsError;
            const { data: cuts, error: cutsError } = await supabase.from('cuts').select('*');
            if (cutsError) throw cutsError;
            const { data: settingsData, error: settingsError } = await supabase.from('general_settings').select('settings').eq('id', 1).single();
            if (settingsError) throw settingsError;

            setConfig({ machines: machines || [], materials: materials || [], cuts: cuts || [], settings: settingsData ? settingsData.settings : {} });
        } catch (error) {
            console.error("Error al cargar la configuración desde Supabase:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const handleLoadQuote = (quote) => {
        // La información del armado está en la columna 'ganging_result'
        setOptimizationResult(quote.ganging_result);
        // Cambiamos a la página 'workspace' para mostrar el resultado cargado
        setCurrentPage('workspace');
    };

    const handleGenerateImposition = async (layout, requiredJobs, jobFiles, allJobsInApiResponse, quoteNumber, localSetMessage) => {
        localSetMessage('Validando y generando pliego...');
        setLoading(true);
        
        try {
            const layoutData = {
                sheet_config: layout.pressSheetSize,
                jobs: requiredJobs.map(job => {
                    const jobDetails = allJobsInApiResponse.find(j => j.id === job.name);
                    return {
                        job_name: job.name,
                        trim_box: { width: jobDetails.width, height: jobDetails.length },
                        placements: layout.placements.filter(p => p.id === job.name)
                    };
                })
            };

            const formData = new FormData();
            formData.append('layout_data', JSON.stringify(layoutData));
            requiredJobs.forEach(job => {
                formData.append('files', jobFiles[job.name], job.name);
            });

            const pythonApiUrl = 'https://preprensa-api-git-main-ylan1987.vercel.app/api'; // O la URL de tu API de Python
            const response = await fetch(`${pythonApiUrl}/generate-imposition`, { method: 'POST', body: formData });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error en la API de imposición.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `imposicion_${quoteNumber || 'pliego'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            localSetMessage('Pliego generado con éxito.');

        } catch (error) {
            localSetMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

     const handleSaveQuote = async (quoteNumber, solutionData, totalCost) => {
        setLoading(true);
        try {
            const { data: existing, error: checkError } = await supabase
                .from('quotes')
                .select('id')
                .eq('quote_number', quoteNumber)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
                throw checkError;
            }
            if (existing) {
                alert(`Error: El número de presupuesto '${quoteNumber}' ya existe.`);
                return;
            }

            const payload = {
                quote_number: quoteNumber,
                ganging_result: optimizationResult, // Guardamos el resultado completo
                chosen_solution_name: solutionData.summary ? solutionData.layouts[solutionData.productionPlan[0].id].layoutId : Object.keys(solutionData.layouts)[0],
                total_cost: totalCost,
            };
            
            const { error } = await supabase.from('quotes').insert(payload);
            if (error) throw error;
            
            alert(`Cotización #${quoteNumber} guardada con éxito.`);
        } catch (error) {
            console.error("Error al guardar la cotización:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (tableName, data) => {
        try {
            if (data._delete) {
                const { error } = await supabase.from(tableName).delete().eq('id', data.id);
                if (error) throw error;
            } else if (data.id && String(data.id).startsWith('new-')) {
                const { id, ...insertData } = data;
                const { error } = await supabase.from(tableName).insert([insertData]).select();
                if (error) throw error;
            } else if (tableName === 'general_settings') {
                const { error } = await supabase.from('general_settings').update({ settings: data }).eq('id', 1);
                 if (error) throw error;
            }
            else {
                const { error } = await supabase.from(tableName).update(data).eq('id', data.id);
                if (error) throw error;
            }
            await loadConfig(); // Recargar toda la configuración para mantener la consistencia
        } catch (error) {
            console.error(`Error guardando en ${tableName}:`, error);
            alert(`Error al guardar: ${error.message}`);
        }
    };

 const handleOptimize = async (jobs) => {
        setLoading(true);
        // Limpiar el campo 'preferred' de los datos de cortes antes de enviar a la API
        const cleanedCuts = config.cuts.map(cutGroup => ({
            forPaperSize: cutGroup.forPaperSize,
            sheetSizes: (cutGroup.sheetSizes || []).map(({ width, length }) => ({ width, length }))
        }));

        const apiPayload = {
            options: { timeoutSeconds: config.settings.timeoutSeconds, numberOfSolutions: config.settings.numberOfSolutions, penalties: config.settings.penalties },
            commonDetails: { dollarRate: config.settings.dollarRate },
            jobs: jobs.map(j => {
                const materialConfig = config.materials.find(m => m.name === j.material.name);
                const gradeConfig = materialConfig?.grades.find(g => g.grams.includes(j.material.grammage));

                // Asumimos que cada 'grade' tiene un 'id' numérico único que podemos encontrar.
                // Si no, usamos un placeholder. En un caso real, la DB debería proveer esto.
                const materialId = gradeConfig?.id || null; 

                return {
                    id: j.name.replace(/\s+/g, '-').toLowerCase(), 
                    width: j.width, 
                    length: j.length, 
                    quantity: j.quantity, 
                    rotatable: j.rotatable, 
                    material: { 
                        id: materialId, 
                        name: j.material.name, 
                        grammage: j.material.grammage, 
                        isSpecialMaterial: gradeConfig?.isSpecialMaterial || false, 
                        factorySizes: gradeConfig?.sizes?.map(s => ({width: s.width_mm, length: s.length_mm, usdPerTon: s.usd_per_ton})) || [] 
                    }, 
                    frontInks: j.frontInks, 
                    backInks: j.backInks, 
                    isDuplex: j.backInks > 0, 
                    samePlatesForBack: j.samePlatesForBack 
                };
            }),
            machines: config.machines,
            availableCuts: cleanedCuts // Usar los datos limpios
        };
        try {
            const response = await fetch('https://ganging-optimizer.vercel.app/api/optimize', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-vercel-protection-bypass': '9NcyUFK5OAlsMPdCOKD9FgttJzd9G7Op' }, body: JSON.stringify(apiPayload) });
            if (!response.ok) { const errorText = await response.text(); throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`); }
            const result = await response.json();
            const adaptedResult = adaptApiResponse(result); // Aquí ocurre la magia
            setOptimizationResult(adaptedResult);
            setCurrentPage('workspace');
        } catch (error) { console.error("Error calling optimizer API:", error); alert("Error al llamar al optimizador: " + error.message);
        } finally { setLoading(false); }
    };
    
    const renderPage = () => {
        const pythonApiUrl = 'https://preprensa-api.vercel.app/api'; // O la URL de tu API
        if (loading) { return <div className="flex items-center justify-center h-full w-full"><Loader2 className="animate-spin text-cyan-400" size={48} /></div>; }
        if (error) { return <div className="text-center p-4 text-red-400"><h1>Error de Conexión</h1><p>{error}</p></div>; }
        switch (currentPage) {
            case 'cotizador':
                return <JobsInputPage onOptimize={handleOptimize} materialsData={config.materials} />;
            case 'workspace':
                return <Workspace 
                            apiResponse={optimizationResult}
                            onBack={() => { setOptimizationResult(null); setCurrentPage('cotizador'); }}
                            onSaveQuote={handleSaveQuote}
                            onGenerateImposition={handleGenerateImposition}
                            dollarRate={config.settings.dollarRate}
                            isLoading={loading}
                            setLoading={setLoading}
                        />;
            case 'imposicion':
                return <ImpositionPage supabase={supabase} onSelectQuote={handleLoadQuote} />;
            case 'maquinas':
                return <MachinesAdminPage initialData={config.machines} onSave={handleSave} />;
            
            case 'materiales':
                return <MaterialsAdminPage initialData={config.materials} onSave={handleSave} />;
            
            case 'cortes':
                return <CutsAdminPage initialData={config.cuts} onSave={handleSave} />;
            
            case 'general':
                return <GeneralSettingsPage initialData={config.settings} onSave={handleSave} />;
            default:
                return <div>Página no encontrada</div>;
        }
    };
    
    const NavItem = ({ page, label, icon: Icon }) => ( <button onClick={() => setCurrentPage(page)} className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors ${ currentPage === page ? 'bg-cyan-600/20 text-cyan-300' : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'}`}> <Icon size={20} /> <span className="font-semibold">{label}</span> </button> );
    return ( 
        <div className="bg-slate-900 text-gray-50 min-h-screen font-sans flex"> 
            <aside className="w-64 bg-slate-800/30 border-r border-gray-700 p-4 flex flex-col"> 
                <div className="mb-8 flex items-center gap-3"> <img src="https://i.imgur.com/r42B5p2.png" alt="Logo Diagonal" className="h-10 opacity-80"/> <div>
        <h1 className="font-bold text-xl text-white">Optimizador</h1><p className="text-xs text-gray-400">Imprenta Diagonal</p></div> </div> 
            <nav className="flex flex-col gap-2"> 
            <NavItem page="cotizador" label="Cotizador" icon={Calculator} /> <NavItem page="imposicion" label="Imposición" icon={Wand2} /><h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mt-4 mb-1">Configuración</h2> <NavItem page="maquinas" label="Máquinas" icon={Printer} /> 
            <NavItem page="materiales" label="Materiales" icon={FileUp} /> <NavItem page="cortes" label="Cortes" icon={Scissors} /> <NavItem page="general" label="Ajustes Generales" icon={Settings} /> </nav> </aside> 
            <main className="flex-1 overflow-y-auto bg-slate-900"> {renderPage()} </main> 
            <style>{` .custom-select option 
            { background-color: 
            #1f2f37;
             color: #F9FAFB; } `}
            </style> </div> );
}
export default App;