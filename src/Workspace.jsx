// src/Workspace.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, FileText, CheckCircle2, XCircle, Loader2, Download, Save, ArrowLeft } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// --- COMPONENTES INTERNOS DEL WORKSPACE ---

const PDFPreview = ({ file }) => (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <Document file={file} loading={<Loader2 className="animate-spin text-white/50" />}>
            <Page pageNumber={1} width={150} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
    </div>
);

const ImpositionItem = ({ item, scale, padding, onDrop, fileForJob }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => onDrop(acceptedFiles, item.id),
        noClick: true, noKeyboard: true
    });
    const itemStyle = { left: item.x * scale + padding/2, top: item.y * scale + padding/2, width: item.w * scale, height: item.h * scale };
    const activeClass = isDragActive ? 'border-cyan-400 bg-cyan-500/30' : 'border-gray-500 hover:border-cyan-400 hover:bg-cyan-500/10';

    return (
        <div {...getRootProps()} className={`absolute border-2 border-dashed transition-colors ${activeClass}`} style={itemStyle}>
            <input {...getInputProps()} />
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
                {fileForJob ? <PDFPreview file={fileForJob} /> : <span className="text-xs text-white/40 p-1 text-center">{item.id}</span>}
            </div>
        </div>
    );
};

const DynamicLayoutVisualizer = ({ layout, jobFiles, onDrop, isInteractive = false }) => {
    // ... (Este componente es el mismo que ya tenías en App.jsx, pero ahora unificado aquí) ...
    // ... lo adaptamos para que sea interactivo o no según un prop.
    const parentSize = layout.pressSheetSize || layout.materialNeeds.factorySheets.size;
    const items = layout.placements || layout.materialNeeds.factorySheets.cuttingPlan.positions;
    const parentLabel = layout.pressSheetSize ? `Pliego ${parentSize.width}x${parentSize.length}` : `Hoja Fábrica ${parentSize.width}x${parentSize.length}`;
    const itemLabelPrefix = layout.pressSheetSize ? "" : "Pliego";

    const jobColors = useMemo(() => {
        const colors = ['#60a5fa80', '#4ade8080', '#facc1580', '#a78bfa80', '#fb923c80', '#f8717180'];
        const borderColors = ['#60a5fa', '#4ade80', '#facc15', '#a78bfa', '#fb923c', '#f87171'];
        const colorMap = {};
        const uniqueJobIds = [...new Set(items.map(j => j.id || 'item'))];
        uniqueJobIds.forEach((id, index) => { colorMap[id] = { bg: colors[index % colors.length], border: borderColors[index % borderColors.length] }; });
        return colorMap;
    }, [items]);

    const containerSize = 250, padding = 10;
    const scale = Math.min((containerSize - padding) / (parentSize.width || 1), (containerSize - padding) / (parentSize.length || 1));

    if (isInteractive) {
        return (
            <div className="p-4 border-2 border-dashed rounded-lg border-gray-600">
                <div className="relative bg-gray-700 inline-block" style={{ width: parentSize.width * scale + padding, height: parentSize.length * scale + padding }}>
                    {items.map((item, i) => (
                        <ImpositionItem key={`${item.id}-${i}`} item={item} scale={scale} padding={padding} onDrop={onDrop} fileForJob={jobFiles[item.id]} />
                    ))}
                </div>
            </div>
        );
    }
    
    // Versión no interactiva (como la tenías antes)
    return (
        <div className="p-2 border-2 border-dashed border-gray-600 text-center">
             <div className="relative bg-gray-700 inline-block" style={{ width: parentSize.width * scale + padding, height: parentSize.length * scale + padding }}>
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-400 bg-slate-800/50 px-2">{parentLabel}</div>
                {items.map((item, i) => {
                    const itemW = (item.width || item.w) * scale; const itemH = (item.length || item.h) * scale;
                    const fontSize = Math.min(itemH / 3, itemW / ((item.id || itemLabelPrefix).length * 0.6), 14);
                    const label = item.id ? item.id : `${itemLabelPrefix} ${i + 1}`;
                    return (<div key={i} className="absolute border flex items-center justify-center overflow-hidden bg-gray-200" style={{ left: item.x * scale + padding/2, top: item.y * scale + padding/2, width: itemW, height: itemH, backgroundColor: jobColors[item.id || 'item']?.bg, borderColor: jobColors[item.id || 'item']?.border, fontSize: `${Math.max(fontSize, 6)}px` }}> <span className="font-bold text-black text-center leading-tight p-0.5 break-all">{label}</span> </div>);
                })}
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DEL WORKSPACE ---
export const Workspace = ({ apiResponse, onBack, onSaveQuote, onGenerateImposition, dollarRate, isLoading }) => {
    const { baselineSolution, gangedSolutions } = apiResponse;
    const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(0);
    const [quoteNumber, setQuoteNumber] = useState('');
    const [jobFiles, setJobFiles] = useState({});
    const [message, setMessage] = useState('');

    const solutions = useMemo(() => {
        if (!baselineSolution) return [];
        return [ { name: "Solución Base", data: baselineSolution }, ...(gangedSolutions || []).map((s, i) => ({ name: `Solución Ganging Optimizada #${i + 1}`, data: s })) ];
    }, [baselineSolution, gangedSolutions]);
    
    const selectedSolution = solutions[selectedSolutionIndex]?.data;

    const onDrop = useCallback((acceptedFiles, jobName) => {
        const file = acceptedFiles[0];
        if (file) { setJobFiles(prev => ({ ...prev, [jobName]: file })); }
    }, []);

    const requiredJobs = useMemo(() => {
        if (!selectedSolution) return [];
        const layoutKey = selectedSolution.summary ? selectedSolution.productionPlan[0].id : Object.keys(selectedSolution.layouts)[0];
        const layout = selectedSolution.layouts[layoutKey];
        if (!layout || !layout.jobsInLayout) return [];

        const jobCounts = {};
        layout.placements.forEach(p => { jobCounts[p.id] = (jobCounts[p.id] || 0) + 1; });
        return layout.jobsInLayout.map(j => ({ name: j.id, quantity: jobCounts[j.id] || 0 }));
    }, [selectedSolution]);

    const allFilesUploaded = requiredJobs.length > 0 && requiredJobs.every(job => !!jobFiles[job.name]);

    const handleSaveClick = () => {
        const layoutKey = selectedSolution.summary ? selectedSolution.productionPlan[0].id : Object.keys(selectedSolution.layouts)[0];
        const cost = selectedSolution.summary ? selectedSolution.summary.gangedTotalCost : selectedSolution.total_cost;
        onSaveQuote(quoteNumber, layoutKey, cost);
    };

    const handleGenerateClick = () => {
        const layoutKey = selectedSolution.summary ? selectedSolution.productionPlan[0].id : Object.keys(selectedSolution.layouts)[0];
        const layout = selectedSolution.layouts[layoutKey];
        onGenerateImposition(layout, requiredJobs, jobFiles, setMessage);
    };

    if (!selectedSolution) return <div className="p-6">Cargando solución...</div>;

    const CostAccordion = ({ title, value, ...rest }) => { /* ... (puedes copiar este componente de App.jsx) ... */ };
    const ProductionSheet = ({ layout, ...rest }) => { /* ... (puedes copiar este componente de App.jsx) ... */ };
    
    return (
        <div className="p-4">
            {/* --- Barra de Selección de Solución y Acciones --- */}
            <div className="bg-slate-800 p-4 rounded-lg mb-6 sticky top-0 z-10 border-b border-gray-700 shadow-md">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm mr-2 text-gray-300">Ver Solución:</span>
                        {solutions.map((s, i) => <button key={s.name} onClick={() => setSelectedSolutionIndex(i)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedSolutionIndex === i ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{s.name}</button>)}
                    </div>
                    <button onClick={onBack} className="p-2 rounded bg-white/10 text-white hover:bg-white/20"><ArrowLeft size={16}/> Volver</button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Costo Total: <span className="text-cyan-400">${(selectedSolution.summary ? selectedSolution.summary.gangedTotalCost : selectedSolution.total_cost).toLocaleString('es-UY')}</span></h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="text" value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} placeholder="Nº de Presupuesto" className="bg-slate-900 border border-gray-700 rounded-lg px-3 py-2 text-sm w-40"/>
                        <button onClick={handleSaveClick} disabled={!quoteNumber || isLoading} className="p-2 rounded bg-green-600 text-white font-semibold flex items-center gap-2 disabled:opacity-50"> <Save size={16}/> Guardar </button>
                    </div>
                </div>
            </div>

            {/* --- Área de Trabajo Principal --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <h3 className="font-semibold mb-2">Arrastra los PDFs sobre los trabajos en el pliego:</h3>
                    <DynamicLayoutVisualizer layout={selectedSolution.layouts[selectedSolution.summary ? selectedSolution.productionPlan[0].id : Object.keys(selectedSolution.layouts)[0]]} jobFiles={jobFiles} onDrop={onDrop} isInteractive={true} />
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Archivos Requeridos:</h3>
                    <div className="space-y-3">
                        {requiredJobs.map(job => (
                            <div key={job.name} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {jobFiles[job.name] ? <CheckCircle2 className="text-green-500" /> : <XCircle className="text-red-500" />}
                                    <span className="font-semibold">{job.name}</span>
                                </div>
                                <span className="text-sm text-gray-400">x{job.quantity} en pliego</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <button onClick={handleGenerateClick} disabled={!allFilesUploaded || isLoading} className="w-full px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="animate-spin"/> : <Download />}
                            Generar Pliego de Impresión
                        </button>
                        {message && <p className={`text-center text-sm mt-3 ${message.startsWith('Error') ? 'text-red-400' : 'text-gray-400'}`}>{message}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};