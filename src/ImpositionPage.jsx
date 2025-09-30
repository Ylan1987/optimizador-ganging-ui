// Archivo: ImpositionPage.jsx

// CAMBIO #1: Se añaden 'useRef' y 'useCallback' para el scroll infinito.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
// CAMBIO #1: Se recomienda usar una librería de debounce para simplificar el código.
// Asegúrate de instalarla con: npm install use-debounce
import { useDebounce } from 'use-debounce';

const PAGE_SIZE = 20;

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

export const ImpositionPage = ({ supabase, onSelectQuote }) => {
    // CAMBIO #1: Corregida la sintaxis del useState.
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // CAMBIO #1: Se refactoriza el estado para manejar la paginación. Se inicializa 'results' como un array vacío.
    const [results, setResults]= useState();
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [message, setMessage] = useState('Escribe para buscar o desplázate para ver más presupuestos.');

    // CAMBIO #1: Función centralizada para obtener los datos de Supabase con paginación.
    const fetchQuotes = useCallback(async (term, pageToFetch) => {
        setIsLoading(true);
        if (pageToFetch === 0) {
            setMessage(''); // Limpiar mensaje en nueva búsqueda o carga inicial
        }

        const from = pageToFetch * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
           .from('quotes')
           .select('*')
           .order('created_at', { ascending: false });

        if (term) {
            query = query.ilike('quote_number', `%${term}%`);
        }

        const { data, error } = await query.range(from, to);

        if (error) {
            setMessage(`Error al buscar: ${error.message}`);
            setResults(); // Limpiar resultados en caso de error
        } else if (data) {
            // Si es la primera página, reemplaza los datos. Si no, los añade al final.
            setResults(prev => (pageToFetch === 0? data : [...prev,...data]));
            setHasMore(data.length === PAGE_SIZE);
            if (pageToFetch === 0 && data.length === 0) {
                setMessage('No se encontraron resultados para tu búsqueda.');
            }
        }

        setIsLoading(false);
    }, [supabase]);

    // CAMBIO #1: useEffect que reacciona a los cambios en el término de búsqueda (debounced).
    useEffect(() => {
        setResults(); // Limpia los resultados anteriores para la nueva búsqueda
        setPage(0);     // Resetea a la primera página
        setHasMore(true); // Asume que hay más resultados hasta que la API diga lo contrario
        fetchQuotes(debouncedSearchTerm, 0); // Inicia la búsqueda desde la página 0
    },);

    // CAMBIO #1: Lógica del Intersection Observer para el scroll infinito.
    const observer = useRef();
    const lastElementRef = useCallback(node => {
        if (isLoading) return; // No hacer nada si ya está cargando
        if (observer.current) observer.current.disconnect(); // Desconectar el observador anterior
        observer.current = new IntersectionObserver(entries => {
            if (entries.isIntersecting && hasMore) {
                // Si el último elemento es visible y hay más por cargar, pide la siguiente página.
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node); // Observar el nuevo último elemento
    }, [isLoading, hasMore]);

    // CAMBIO #1: useEffect que se dispara cuando cambia el número de página para cargar más resultados.
    useEffect(() => {
        // Solo se ejecuta para las páginas siguientes a la inicial (que ya se carga con el otro useEffect).
        if (page > 0) {
            fetchQuotes(debouncedSearchTerm, page);
        }
    },);


    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Buscar Cotización para Cargar</h1>
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Escribe el número de presupuesto..."
                    className="w-full bg-slate-800 border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-cyan-500"
                />
                {/* El loader principal se muestra solo en la carga inicial de una búsqueda. */}
                {isLoading && page === 0 && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />}
            </div>

            {message &&!isLoading && results.length === 0 && <p className="text-center text-gray-400">{message}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((quote, index) => {
                    // Asigna el ref al último elemento para disparar la carga de la siguiente página.
                    if (results.length === index + 1) {
                        return (
                            <div ref={lastElementRef} key={quote.id}>
                                <SearchResultCard quote={quote} onSelect={onSelectQuote} />
                            </div>
                        );
                    }
                    return <SearchResultCard key={quote.id} quote={quote} onSelect={onSelectQuote} />;
                })}
            </div>

            {/* Indicador de carga para cuando se hace scroll y se piden más datos. */}
            {isLoading && page > 0 && (
                <div className="col-span-full text-center p-4 flex justify-center items-center">
                    <Loader2 className="animate-spin text-cyan-400 mr-2" />
                    <span>Cargando más presupuestos...</span>
                </div>
            )}

            {/* Mensaje de fin de resultados. */}
            {!hasMore && results.length > 0 && (
                <p className="col-span-full text-center text-gray-500 mt-8">Has llegado al final de los resultados.</p>
            )}
        </div>
    );
};