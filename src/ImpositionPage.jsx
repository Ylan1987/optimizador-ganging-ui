// src/ImpositionPage.jsx
import React, { useState, useCallback, useMemo } from 'react';
import { Search, Upload, FileText, CheckCircle2, XCircle, Loader2, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuración de pdf.js (necesaria para react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const SearchResultCard = ({ quote, onSelect }) => (
    <div onClick={() => onSelect(quote)} className="p-4 bg-slate-800 rounded-lg border border-gray-700 hover:border-cyan-500 cursor-pointer transition-colors">
        <div className="flex justify-between items-center">
            <p className="font-bold text-cyan-400">Presupuesto #{quote.quote_number}</p>
            <p className="text-xs text-gray-400">{new Date(quote.created_at).toLocaleDateString()}</p>
        </div>
        <p className="text-sm text-gray-300 mt-2">Solución: {quote.chosen_solution_name}</p>
        <p className="text-lg font-semibold text-white mt-1">${quote.total_cost.toLocaleString('es-UY')}</p>
    </div>
);

const PDFPreview = ({ file }) => {
    if (!file) return <div className="w-full h-full bg-black/20 flex items-center justify-center"><FileText size={24} className="text-white/30"/></div>;
    return (
        <div className="w-full h-full">
            <Document file={file} loading={<Loader2 className="animate-spin" />}>
                <Page pageNumber={1} width={150} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
        </div>
    );
};

export const ImpositionPage = ({ supabase, pythonApiUrl }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [jobFiles, setJobFiles] = useState({}); // { job_name: File }
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('Busca un número de presupuesto para comenzar.');

    const handleSearch = async () => {
        if (!searchTerm) return;
        setIsLoading(true);
        setMessage('');
        const { data, error } = await supabase
            .from('quotes')
            .select('*')
            .ilike('quote_number', `%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) {
            setMessage(`Error al buscar: ${error.message}`);
        } else {
            setSearchResults(data);
            if(data.length === 0) setMessage('No se encontraron resultados.');
        }
        setIsLoading(false);
    };

    const onDrop = useCallback((acceptedFiles, jobName) => {
        const file = acceptedFiles[0];
        if (file) {
            setJobFiles(prev => ({ ...prev, [jobName]: file }));
        }
    }, []);
    
    // Extraemos la lista única de trabajos del armado
    const requiredJobs = useMemo(() => {
        if (!selectedQuote) return [];
        const jobs = selectedQuote.ganging_result.baselineSolution.layouts[selectedQuote.chosen_solution_name]?.jobsInLayout || [];
        // En tu estructura, jobsInLayout es un array de {id, quantityPerSheet}
        return jobs.map(j => ({ name: j.id, quantity: j.quantityPerSheet }));
    }, [selectedQuote]);

    const allFilesUploaded = requiredJobs.length > 0 && requiredJobs.every(job => !!jobFiles[job.name]);

    const handleGenerateImposition = async () => {
        setIsLoading(true);
        setMessage('Validando y generando pliego...');
        
        const layoutData = {
            sheet_config: selectedQuote.ganging_result.baselineSolution.layouts[selectedQuote.chosen_solution_name].pressSheetSize,
            jobs: requiredJobs.map(job => {
                const jobDetails = selectedQuote.ganging_result.jobs.find(j => j.id === job.name);
                return {
                    job_name: job.name,
                    trim_box: { width: jobDetails.width, height: jobDetails.length },
                    placements: selectedQuote.ganging_result.baselineSolution.layouts[selectedQuote.chosen_solution_name].placements.filter(p => p.id === job.name)
                };
            })
        };

        const formData = new FormData();
        formData.append('layout_data', JSON.stringify(layoutData));
        requiredJobs.forEach(job => {
            formData.append('files', jobFiles[job.name], job.name);
        });

        try {
            const response = await fetch(`${pythonApiUrl}/generate-imposition`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error en la API de imposición.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `imposicion_${selectedQuote.quote_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setMessage('Pliego generado con éxito.');

        } catch (error) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Lógica para el visualizador interactivo
    const DynamicLayoutVisualizer = ({ layout, jobFiles }) => {
        const parentSize = layout.pressSheetSize;
        const items = layout.placements;
        const containerSize = 400, padding = 10;
        const scale = Math.min((containerSize - padding) / parentSize.width, (containerSize - padding) / parentSize.length);
        const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: (files) => {
            // Este es un drop genérico, necesitamos manejar el drop por cada item
            console.log("Archivo soltado en el área general, se necesita soltar sobre un trabajo.");
        }});

        return (
            <div {...getRootProps()} className={`p-4 border-2 border-dashed rounded-lg transition-colors ${isDragActive ? 'border-cyan-500 bg-cyan-900/20' : 'border-gray-600'}`}>
                <input {...getInputProps()} />
                <div className="relative bg-gray-700 inline-block" style={{ width: parentSize.width * scale + padding, height: parentSize.length * scale + padding }}>
                    {items.map((item, i) => {
                        const { getRootProps: itemGetRootProps, getInputProps: itemGetInputProps } = useDropzone({ onDrop: (files) => onDrop(files, item.id) });
                        const fileForJob = jobFiles[item.id];
                        return (
                            <div key={i} {...itemGetRootProps()} className="absolute border-2 border-dashed border-gray-500 hover:border-cyan-400 hover:bg-cyan-500/20" style={{ left: item.x * scale + padding/2, top: item.y * scale + padding/2, width: item.w * scale, height: item.h * scale }}>
                                <input {...itemGetInputProps()} />
                                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                {fileForJob ? <PDFPreview file={fileForJob} /> : <span className="text-xs text-white/40 p-1 text-center">{item.id}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };


    if (selectedQuote) {
        return (
            <div className="p-6">
                <button onClick={() => { setSelectedQuote(null); setJobFiles({}); }} className="text-cyan-400 mb-4">&larr; Volver a la búsqueda</button>
                <h2 className="text-2xl font-bold mb-4">Imposición para Presupuesto #{selectedQuote.quote_number}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <h3 className="font-semibold mb-2">Arrastra los PDFs sobre los trabajos en el pliego:</h3>
                        <DynamicLayoutVisualizer layout={selectedQuote.ganging_result.baselineSolution.layouts[selectedQuote.chosen_solution_name]} jobFiles={jobFiles} />
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
                            <button onClick={handleGenerateImposition} disabled={!allFilesUploaded || isLoading} className="w-full px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {isLoading ? <Loader2 className="animate-spin"/> : <Download />}
                                Generar Pliego de Impresión
                            </button>
                            {message && <p className="text-center text-sm text-gray-400 mt-3">{message}</p>}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Buscar Cotización para Imponer</h1>
            <div className="flex gap-2 mb-6">
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                    placeholder="Número de presupuesto..."
                    className="flex-grow bg-slate-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                />
                <button onClick={handleSearch} disabled={isLoading} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-600">
                    {isLoading ? <Loader2 className="animate-spin"/> : <Search />}
                </button>
            </div>
            {message && <p className="text-center text-gray-400">{message}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map(quote => <SearchResultCard key={quote.id} quote={quote} onSelect={setSelectedQuote} />)}
            </div>
        </div>
    );
};