import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, XCircle, Loader2, Download, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

// Esta función carga una imagen en memoria para leer sus dimensiones reales.
const getImageDimensions = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = (err) => reject(err);
        img.src = url;
    });
};

const ImpositionItem = ({ item, scale, padding, onDrop, fileForJob, originalJob }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => onDrop(acceptedFiles, item.id, item.width, item.length, originalJob.bleed),
        noClick: true, noKeyboard: true,
        disabled: !originalJob
    });

    const containerStyle = {
        left: item.x * scale + padding/2,
        top: item.y * scale + padding/2,
        width: item.width * scale,  // <-- Usamos item.width
        height: item.length * scale // <-- Usamos item.length
    };
    const activeClass = isDragActive ? 'border-cyan-400 bg-cyan-500/30' : 'border-gray-500 hover:border-cyan-400 hover:bg-cyan-500/10';

    let imageStyle = {};
    let imageClasses = "transition-transform duration-300";

    if (fileForJob && fileForJob.imgWidth) {
        const containerWidth = item.width * scale;  // <-- Usamos item.width
        const containerHeight = item.length * scale; // <-- Usamos item.length

        const isImageLandscape = fileForJob.imgWidth > fileForJob.imgHeight;
        const isPlacementLandscape = containerWidth > containerHeight;
        const needsRotation = isImageLandscape !== isPlacementLandscape;
        
        if (needsRotation) {
            imageStyle = {
                height: `${containerWidth}px`,
                width: `${containerHeight}px`,
                transform: 'rotate(90deg)',
                maxWidth: 'unset',
                padding: '3%'
            };
        } else {
            const imageAspectRatio = fileForJob.imgWidth / fileForJob.imgHeight;
            let displayWidth, displayHeight;
            if (containerWidth / containerHeight > imageAspectRatio) {
                displayHeight = containerHeight;
                displayWidth = displayHeight * imageAspectRatio;
            } else {
                displayWidth = containerWidth;
                displayHeight = displayWidth / imageAspectRatio;
            }
            imageStyle = {
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
            };
            imageClasses += " object-contain";
        }
    }

    return (
        <div {...getRootProps()}
             className={`absolute border-2 border-dashed transition-colors flex justify-center items-center ${activeClass}`}
             style={containerStyle}>
            <input {...getInputProps()} />
            {fileForJob?.previewUrl ? (
                <img
                    src={fileForJob.previewUrl}
                    alt="Previsualización"
                    className={imageClasses}
                    style={imageStyle}
                />
            ) : (
                <span className="text-xs text-white/40 p-1 text-center">{item.id}</span>
            )}
        </div>
    );
};

const formatCurrency = (value) => '$' + new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
const formatNumber = (value) => new Intl.NumberFormat('es-UY').format(value || 0);

const DynamicLayoutVisualizer = ({ layoutData, jobFiles, onDrop, isInteractive = false, originalJobs = [] }) => {
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
                            const originalJob = originalJobs.find(j => j.id === item.id);
                            return <ImpositionItem
                                key={`${item.id}-${i}`}
                                item={item}
                                scale={scale}
                                padding={padding}
                                onDrop={onDrop}
                                fileForJob={jobFiles[item.id]}
                                originalJob={originalJob}
                            />;
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

const CostAccordion = ({ title, value, formula, details, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-t border-gray-700 last:border-b-0">
            <button onClick={() => details && setIsOpen(!isOpen)} className={`w-full text-left p-2.5 transition-colors ${details ? 'hover:bg-gray-700/50' : 'cursor-default'}`}>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-gray-200 text-sm">{title}</p>
                        {formula && <p className="text-xs text-gray-400 mt-0.5">{formula}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-gray-50">{formatCurrency(value)}</span>
                        {details && <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                    </div>
                </div>
            </button>
            {isOpen && details && (
                <div className="pl-4 border-l-2 border-cyan-700 ml-2 bg-black/20">
                    {details.map((item, index) => <CostAccordion key={index} {...item} />)}
                </div>
            )}
        </div>
    );
};

const ProductionSheet = ({ layout, dollarRate, jobFiles, onDrop, apiResponse }) => {
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
                   <DynamicLayoutVisualizer layoutData={panelB_Data} jobFiles={jobFiles} onDrop={onDrop} isInteractive={true} originalJobs={apiResponse.jobs} />
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

    const onDrop = useCallback(async (acceptedFiles, jobName, expectedWidth, expectedHeight, bleed) => {
        const file = acceptedFiles[0];
        if (!jobName || !file) return;

        setMessage(`Validando "${jobName}"...`);
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('expected_width', expectedWidth);
        formData.append('expected_height', expectedHeight);
        formData.append('bleed', bleed);

        try {
            const response = await fetch('https://ganging-optimizer.vercel.app/api/validate-and-preview-pdf', {
                method: 'POST',
                headers: {
                    'x-vercel-protection-bypass': '9NcyUFK5OAlsMPdCOKD9FgttJzd9G7Op'
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                // Si la respuesta no es 200 OK, intentamos leer el error.
                const errorResult = await response.json();
                throw new Error(errorResult.errorMessage || 'Error de comunicación con el servidor.');
            }

            if (!result.isValid) {
                // Si la respuesta es 200 OK pero la validación falló, mostramos el mensaje específico.
                throw new Error(result.errorMessage);
            }
            
            const imageDimensions = await getImageDimensions(result.previewImage);
            
            setJobFiles(prev => ({ 
                ...prev, 
                [jobName]: { 
                    file: file, 
                    previewUrl: result.previewImage,
                    imgWidth: imageDimensions.width,
                    imgHeight: imageDimensions.height
                }
            }));
            setMessage(`Archivo para "${jobName}" validado y cargado.`);

        } catch (error) {
            console.error("Error en la validación del PDF:", error);
            alert(`Error en "${jobName}": ${error.message}`);
            setMessage(`Error en "${jobName}": ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [setLoading]);

    const { baselineSolution, gangedSolutions } = apiResponse;
    const solutions = useMemo(() => {
        if (!baselineSolution) return [];
        return [ { name: "Solución Base", data: baselineSolution }, ...(gangedSolutions || []).map((s, i) => ({ name: `Solución Ganging Optimizada #${i + 1}`, data: s })) ];
    }, [baselineSolution, gangedSolutions]);
    
    const selectedSolution = solutions[selectedSolutionIndex]?.data;

    const { requiredJobs, allFilesUploaded } = useMemo(() => {
        if (!selectedSolution) return { requiredJobs: [], allFilesUploaded: false };
        const allJobsInPlan = [...new Set(selectedSolution.layouts ? Object.values(selectedSolution.layouts).flatMap(l => l.jobsInLayout.map(j => j.id)) : [])];
        const jobs = allJobsInPlan.map(jobId => {
            const layout = selectedSolution.layouts ? Object.values(selectedSolution.layouts).find(l => l.jobsInLayout.some(j => j.id === jobId)) : null;
            const quantity = layout ? layout.placements.filter(p => p.id === jobId).length : 0;
            return { name: jobId, quantity };
        });
        const allUploaded = jobs.length > 0 && jobs.every(job => !!jobFiles[job.name]);
        return { requiredJobs: jobs, allFilesUploaded: allUploaded };
    }, [selectedSolution, jobFiles]);

    const handleSaveClick = () => {
        if (!selectedSolution) return;
        const cost = selectedSolution.summary ? selectedSolution.summary.gangedTotalCost : selectedSolution.total_cost;
        onSaveQuote(quoteNumber, selectedSolution, cost);
    };
    
    const handleGenerateClick = () => {
        if (!selectedSolution) return;
        const allJobsInApiResponse = apiResponse.jobs;
        onGenerateImposition(selectedSolution.layouts, requiredJobs, jobFiles, allJobsInApiResponse, quoteNumber, setMessage);
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
                <ProductionSheet key={layout.layoutId || index} layout={layout} dollarRate={dollarRate} jobFiles={jobFiles} onDrop={onDrop} apiResponse={apiResponse} />
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