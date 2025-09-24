// src/Workspace.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, XCircle, Loader2, Download, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';

// --- COMPONENTES INTERNOS AUXILIARES ---

const PDFPreview = ({ file, placementWidth, placementHeight }) => {
    const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 });

    const onDocumentLoadSuccess = ({ _pdf }) => {
        _pdf.getPage(1).then(page => {
            const { width, height } = page.getViewport({ scale: 1 });
            setPdfSize({ width, height });
        });
    };

    const isPdfLandscape = pdfSize.width > pdfSize.height;
    const isPlacementLandscape = placementWidth > placementHeight;
    const rotation = isPdfLandscape !== isPlacementLandscape ? 90 : 0;

    return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <Document 
                file={file} 
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<Loader2 className="animate-spin text-white/50" />}
                error={<XCircle className="text-red-500" title="Error al cargar PDF" />}
            >
                <Page 
                    pageNumber={1} 
                    width={150} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false} 
                    rotate={rotation}
                />
            </Document>
        </div>
    );
};

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
                {fileForJob ? (
                    <PDFPreview 
                        file={fileForJob} 
                        placementWidth={item.w} 
                        placementHeight={item.h} 
                    />
                ) : (
                    <span className="text-xs text-white/40 p-1 text-center">{item.id}</span>
                )}
            </div>
        </div>
    );
};

const formatCurrency = (value) => '$' + new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
const formatNumber = (value) => new Intl.NumberFormat('es-UY').format(value || 0);

const DynamicLayoutVisualizer = ({ layoutData, jobFiles, onDrop, isInteractive = false }) => {
    const { parentSize, items, parentLabel, footerText, title } = layoutData;
    const itemLabelPrefix = parentLabel.includes('Pliego') ? "" : "Pliego";
    const containerSize = 250, padding = 10;
    const scale = Math.min((containerSize - padding) / (parentSize.width || 1), (containerSize - padding) / (parentSize.length || 1));
    const jobColors = useMemo(() => {
        const colors = ['#60a5fa80', '#4ade8080', '#facc1580', '#a78bfa80', '#fb923c80', '#f8717180'];
        const borderColors = ['#60a5fa', '#4ade80', '#facc15', '#a78bfa', '#fb923c', '#f87171'];
        const colorMap = {};
        const uniqueJobIds = [...new Set(items.map(j => j.id || 'item'))];
        uniqueJobIds.forEach((id, index) => { colorMap[id] = { bg: colors[index % colors.length], border: borderColors[index % borderColors.length] }; });
        return colorMap;
    }, [items]);

    return (
        <div className="bg-gray-900/50 p-3 rounded-md flex flex-col items-center justify-center h-full">
            <h4 className="font-semibold text-sm text-center text-white mb-2">{title}</h4>
            <div className={`p-2 border-2 border-dashed ${isInteractive ? 'border-transparent' : 'border-gray-600'} text-center`}>
                <div className="relative bg-gray-700 inline-block" style={{ width: parentSize.width * scale + padding, height: parentSize.length * scale + padding }}>
                    {!isInteractive && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-400 bg-slate-800/50 px-2">{parentLabel}</div>}
                    {items.map((item, i) => {
                        if (isInteractive) {
                            return <ImpositionItem key={`${item.id}-${i}`} item={item} scale={scale} padding={padding} onDrop={onDrop} fileForJob={jobFiles[item.id]} />;
                        }
                        const itemW = (item.width || item.w) * scale; const itemH = (item.length || item.h) * scale;
                        const fontSize = Math.min(itemH / 3, itemW / ((item.id || itemLabelPrefix).length * 0.6), 14);
                        const label = item.id ? item.id : `${itemLabelPrefix} ${i + 1}`;
                        return (<div key={i} className="absolute border flex items-center justify-center overflow-hidden bg-gray-200" style={{ left: item.x * scale + padding/2, top: item.y * scale + padding/2, width: itemW, height: itemH, backgroundColor: jobColors[item.id || 'item']?.bg, borderColor: jobColors[item.id || 'item']?.border, fontSize: `${Math.max(fontSize, 6)}px` }}> <span className="font-bold text-black text-center leading-tight p-0.5 break-all">{label}</span> </div>);
                    })}
                </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3 max-w-xs mx-auto" dangerouslySetInnerHTML={{ __html: footerText }} />
        </div>
    );
};

const CostAccordion = ({ title, value, formula, details, defaultOpen = false }) => { const [isOpen, setIsOpen] = useState(defaultOpen); return ( <div className="border-t border-gray-700 last:border-b-0"> <button onClick={() => details && setIsOpen(!isOpen)} className={`w-full text-left p-2.5 transition-colors ${details ? 'hover:bg-gray-700/50' : 'cursor-default'}`}> <div className="flex justify-between items-center"> <div> <p className="font-semibold text-gray-200 text-sm">{title}</p> {formula && <p className="text-xs text-gray-400 mt-0.5">{formula}</p>} </div> <div className="flex items-center gap-4"> <span className="font-bold text-sm text-gray-50">{formatCurrency(value)}</span> {details && <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />} </div> </div> </button> {isOpen && details && ( <div className="pl-4 border-l-2 border-cyan-700 ml-2 bg-black/20"> {details.map((item, index) => <CostAccordion key={index} {...item} />)} </div> )} </div> ); };

const ProductionSheet = ({ layout, dollarRate, jobFiles, onDrop }) => {
    const costDetails = useMemo(() => {
        const pCost = layout.costBreakdown.printingCost;
        const mNeeds = layout.materialNeeds;
        const pNeeds = layout.printNeeds;
        const machine = layout.machine;
        const chargeableImpressions = Math.max(layout.sheetsToPrint, machine.minImpressionsCharge || 0);
        return [ { title: "Costo de Impresión", value: pCost.totalPrintingCost, details: [ { title: "Costo de Postura", value: pCost.setupCost, formula: "Precio por Plancha × Planchas Totales", details: [{ title: "Cálculo", value: pCost.setupCost, formula: `${formatCurrency(machine.setupCost.price || 0)} × ${pNeeds.totalPlates} planchas` }] }, { title: "Costo de Lavado", value: pCost.washCost, formula: "Costo fijo por limpieza" }, { title: "Costo por Millar", value: pCost.impressionCost, formula: `Tiraje Mín. Cobrable × (Precio/1000) × Pasadas`, details: [{ title: "Cálculo", value: pCost.impressionCost, formula: `${formatNumber(chargeableImpressions)} pliegos × (${formatCurrency(machine.impressionCost.pricePerThousand || 0)} / 1000) × ${pNeeds.passes}` }] } ]}, { title: "Costo de Papel", value: mNeeds.totalMaterialCost, details: [ { title: mNeeds.factorySheets.name || 'Papel', value: mNeeds.totalMaterialCost, formula: `${formatNumber(mNeeds.factorySheets.quantityNeeded)} hojas × ${formatCurrency(mNeeds.totalMaterialCost / (mNeeds.factorySheets.quantityNeeded || 1))} p/hoja`, details: [{ title: 'Nivel Cálculo', value: mNeeds.totalMaterialCost, formula: `(${formatNumber(mNeeds.factorySheets.quantityNeeded)}h*${mNeeds.factorySheets.size.width/1000}m*${mNeeds.factorySheets.size.length/1000}m*${mNeeds.factorySheets.size.usdPerTon}USD/t*${layout.jobsInLayout[0]?.material?.grammage || 'N/A'}g)*$${dollarRate}` }] } ]} ];
    }, [layout, dollarRate]);

    const technicalDetails = useMemo(() => {
        const { printNeeds, materialNeeds, sheetsToPrint, machine, pressSheetSize } = layout;
        return [ { title: "Pliegos a Imprimir", value: `${formatNumber(sheetsToPrint)} en "${pressSheetSize.width/10}x${pressSheetSize.length/10}cm"` }, { title: "Máquina", value: machine.name }, { title: "Hojas de Fábrica", value: `${formatNumber(materialNeeds.factorySheets.quantityNeeded)} (${materialNeeds.factorySheets.size.width}x${materialNeeds.factorySheets.size.length})` }, { title: "Plan de Corte", value: `${materialNeeds.factorySheets.cuttingPlan.cutsPerSheet} pliegos por hoja` }, { title: "Técnica", value: printNeeds.technique }, { title: "Planchas Totales", value: printNeeds.totalPlates }, { title: "Pasadas en Máquina", value: printNeeds.passes }, ];
    }, [layout]);

    const panelA_Data = { title: "Panel A: Plan de Corte Gráfico", parentSize: layout.materialNeeds.factorySheets.size, items: layout.materialNeeds.factorySheets.cuttingPlan.positions, parentLabel: `Hoja Fábrica ${layout.materialNeeds.factorySheets.size.width}x${layout.materialNeeds.factorySheets.size.length}`, footerText: `Se necesitan <strong class="text-cyan-300">${formatNumber(layout.materialNeeds.factorySheets.quantityNeeded)}</strong> hojas, cortadas en <strong class="text-cyan-300">${layout.materialNeeds.factorySheets.cuttingPlan.cutsPerSheet}</strong>.`};
    const panelB_Data = { title: "Panel B: Imposición en Pliego (Interactivo)", parentSize: layout.pressSheetSize, items: layout.placements, parentLabel: `Pliego ${layout.pressSheetSize.width}x${layout.pressSheetSize.length}`, footerText: `Imprimir <strong class="text-cyan-300">${formatNumber(layout.sheetsToPrint)} + ${layout.machine.overage.amount} demasía</strong> en pliegos.`};

    return (
        <div className="bg-slate-800/50 border border-gray-700 rounded-lg mb-6 shadow-lg overflow-hidden">
            <div className="p-4 bg-black/20"><h3 className="font-bold text-lg text-white">Pliego: <span className="text-cyan-400">{layout.layoutId}</span></h3></div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-4">
                <div className="md:col-span-3 space-y-6">
                    <div>
                        <h4 className="font-semibold text-gray-300 mb-2">Desglose de Costos</h4>
                        <div className="bg-gray-900/50 rounded-md overflow-hidden border border-gray-700">{costDetails.map((item, i) => <CostAccordion key={i} {...item} defaultOpen={i===0}/>)}</div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-300 mb-2">Requerimientos Técnicos</h4>
                        <div className="bg-gray-900/50 rounded-md border border-gray-700 text-xs p-2 space-y-1.5">{technicalDetails.map((item, i) => (<div key={i} className="flex justify-between items-baseline gap-2 border-b border-gray-800 pb-1 last:border-b-0"><span className="text-gray-400 font-medium whitespace-nowrap">{item.title}</span><span className="text-gray-200 font-mono text-right">{item.value}</span></div>))}</div>
                    </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 gap-6">
                   <DynamicLayoutVisualizer layoutData={panelA_Data} isInteractive={false} />
                   <DynamicLayoutVisualizer layoutData={panelB_Data} jobFiles={jobFiles} onDrop={onDrop} isInteractive={true} />
                </div>
            </div>
        </div>
    );
};

export const Workspace = ({ apiResponse, onBack, onSaveQuote, onGenerateImposition, dollarRate, isLoading, setLoading }) => {
    const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(0);
    const [quoteNumber, setQuoteNumber] = useState(apiResponse.quote_number || '');
    const [jobFiles, setJobFiles] = useState({});
    const [message, setMessage] = useState('');

    const onDrop = useCallback(async (acceptedFiles, jobName) => {
        const file = acceptedFiles[0];
        if (!file || !apiResponse?.jobs) return;

        setMessage('');
        setLoading(true);

        try {

            console.log(`--- Iniciando procesamiento para: ${jobName} ---`);
            const fileBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjs.getDocument(fileBuffer).promise;
            const page = await pdfDoc.getPage(1);
            
            // --- DEPURACIÓN PROFUNDA ---
            // Mostramos el objeto 'page' completo para inspeccionarlo.
            console.log("Objeto 'page' completo recibido de pdf.js:");
            console.log(page);
            
            // Mostramos las claves (propiedades) que sí existen en el objeto.
            console.log("Propiedades disponibles en el objeto 'page':", Object.keys(page));
            // --- FIN DE LA DEPURACIÓN --
            const jobData = apiResponse.jobs.find(j => j.id === jobName);
            if (!jobData) throw new Error(`No se encontraron datos para el trabajo "${jobName}".`);

            const fileBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjs.getDocument(fileBuffer).promise;
            const page = await pdfDoc.getPage(1);
            
            // --- LÍNEAS DE DEPURACIÓN AÑADIDAS ---
            console.log(`--- Depurando PDF para trabajo: ${jobName} ---`);
            console.log("Valor de page.trimBox:", page.trimBox);
            console.log("Valor de page.mediaBox:", page.mediaBox);
            // --- FIN DE LÍNEAS DE DEPURACIÓN ---

            const trimBox = page.trimBox || page.mediaBox;

            if (!trimBox || trimBox.length !== 4) {
                throw new Error("El PDF no contiene un TrimBox o MediaBox válido. No se pueden verificar las dimensiones.");
            }
            const pdfWidthPt = trimBox[2] - trimBox[0];
            const pdfHeightPt = trimBox[3] - trimBox[1];
            
            const pdfWidthMm = pdfWidthPt * (25.4 / 72);
            const pdfHeightMm = pdfHeightPt * (25.4 / 72);

            const expectedWidth = jobData.width;
            const expectedHeight = jobData.length;

            const widthMatch = Math.abs(pdfWidthMm - expectedWidth) < 1;
            const heightMatch = Math.abs(pdfHeightMm - expectedHeight) < 1;
            const rotatedWidthMatch = Math.abs(pdfWidthMm - expectedHeight) < 1;
            const rotatedHeightMatch = Math.abs(pdfHeightMm - expectedWidth) < 1;
            
            if ((widthMatch && heightMatch) || (rotatedWidthMatch && rotatedHeightMatch)) {
                setJobFiles(prev => ({ ...prev, [jobName]: file }));
                setMessage(`Archivo para "${jobName}" cargado y verificado.`);
            } else {
                const errorMsg = `Error en "${jobName}": El tamaño del TrimBox del PDF (${pdfWidthMm.toFixed(1)}x${pdfHeightMm.toFixed(1)}mm) no coincide con el tamaño esperado del trabajo (${expectedWidth}x${expectedHeight}mm).`;
                alert(errorMsg);
                setMessage(errorMsg);
            }
        } catch (error) {
            console.error("Error al procesar el PDF:", error);
            setMessage(`Error al leer el archivo PDF: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [apiResponse, setLoading]);

    const { baselineSolution, gangedSolutions } = apiResponse;
    const solutions = useMemo(() => {
        if (!baselineSolution) return [];
        return [ { name: "Solución Base", data: baselineSolution }, ...(gangedSolutions || []).map((s, i) => ({ name: `Solución Ganging Optimizada #${i + 1}`, data: s })) ];
    }, [baselineSolution, gangedSolutions]);
    
    const selectedSolution = solutions[selectedSolutionIndex]?.data;

    const { requiredJobs, allFilesUploaded } = useMemo(() => {
        if (!selectedSolution) return { requiredJobs: [], allFilesUploaded: false };
        const layoutKey = selectedSolution.summary ? selectedSolution.productionPlan[0].id : Object.keys(selectedSolution.layouts)[0];
        const layout = selectedSolution.layouts[layoutKey];
        if (!layout || !layout.jobsInLayout) return { requiredJobs: [], allFilesUploaded: false };
        const jobCounts = {};
        layout.placements.forEach(p => { jobCounts[p.id] = (jobCounts[p.id] || 0) + 1; });
        const jobs = layout.jobsInLayout.map(j => ({ name: j.id, quantity: jobCounts[j.id] || 0 }));
        const allUploaded = jobs.length > 0 && jobs.every(job => !!jobFiles[job.name]);
        return { requiredJobs: jobs, allFilesUploaded: allUploaded };
    }, [selectedSolution, jobFiles]);

    const handleSaveClick = () => {
        if (!selectedSolution) return;

        // Calculamos el costo total a partir de la solución seleccionada
        const cost = selectedSolution.summary ? selectedSolution.summary.gangedTotalCost : selectedSolution.total_cost;

        // Llamamos a onSaveQuote enviando el objeto 'selectedSolution' completo
        onSaveQuote(quoteNumber, selectedSolution, cost);
    };

    const handleGenerateClick = () => {
        if (!selectedSolution) return;
        const layoutKey = selectedSolution.summary ? selectedSolution.productionPlan[0].id : Object.keys(selectedSolution.layouts)[0];
        const layout = selectedSolution.layouts[layoutKey];
        const allJobsInApiResponse = apiResponse.jobs;
        onGenerateImposition(layout, requiredJobs, jobFiles, allJobsInApiResponse, quoteNumber, setMessage);
    };

    if (!selectedSolution) return <div className="p-6 text-center text-gray-400">Cargando solución...</div>;
    
    const baseLayouts = Object.values(baselineSolution.layouts);
    const gangedPlan = selectedSolution.summary ? (selectedSolution.productionPlan || []).map(item => selectedSolution.layouts[item.id]).filter(Boolean) : [];

    return (
        <div className="p-4">
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
                        <h2 className="text-2xl font-bold">Costo Total: <span className="text-cyan-400">{formatCurrency(selectedSolution.summary ? selectedSolution.summary.gangedTotalCost : selectedSolution.total_cost)}</span></h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="text" value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} placeholder="Nº de Presupuesto" className="bg-slate-900 border border-gray-700 rounded-lg px-3 py-2 text-sm w-40"/>
                        <button onClick={handleSaveClick} disabled={!quoteNumber || isLoading} className="p-2 rounded bg-green-600 text-white font-semibold flex items-center gap-2 disabled:opacity-50"> <Save size={16}/> Guardar </button>
                    </div>
                </div>
            </div>
            
            {(selectedSolution.summary ? gangedPlan : baseLayouts).map((layout, index) => (
                <ProductionSheet key={layout.layoutId || index} layout={layout} dollarRate={dollarRate} jobFiles={jobFiles} onDrop={onDrop} />
            ))}

            <div className="bg-slate-800/50 border border-gray-700 rounded-lg mt-6 shadow-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                    <div className="md:col-span-4">
                        <h3 className="font-semibold mb-2">Archivos Requeridos para Imposición</h3>
                        <div className="flex flex-wrap gap-3">
                            {requiredJobs.map(job => (
                                <div key={job.name} className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-gray-600">
                                    {jobFiles[job.name] ? <CheckCircle2 className="text-green-500" /> : <XCircle className="text-red-500" />}
                                    <span className="font-semibold">{job.name}</span>
                                    <span className="text-sm text-gray-400">(x{job.quantity})</span>
                                </div>
                            ))}
                        </div>
                         {message && <p className={`text-left text-sm mt-3 ${message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
                    </div>
                    <div className="md:col-span-1">
                        <button onClick={handleGenerateClick} disabled={!allFilesUploaded || isLoading} className="w-full px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="animate-spin"/> : <Download />}
                            Generar Pliego
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};