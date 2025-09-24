// src/ImpositionPage.jsx
import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('Escribe en el buscador para comenzar...');

    // Hook useEffect para la búsqueda automática (debouncing)
    useEffect(() => {
        // Si no hay término de búsqueda, limpiamos los resultados.
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setMessage('Escribe en el buscador para comenzar...');
            return;
        }

        setIsLoading(true);
        
        // Creamos un temporizador. La búsqueda solo se ejecutará si el usuario
        // deja de escribir por 500ms.
        const delayDebounceFn = setTimeout(() => {
            const handleSearch = async () => {
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

            handleSearch();
        }, 500);

        // Esta es la magia: si el usuario vuelve a escribir, el efecto se
        // vuelve a ejecutar, y limpiamos el temporizador anterior antes de
        // crear uno nuevo.
        return () => clearTimeout(delayDebounceFn);
        
    }, [searchTerm, supabase]); // Este efecto se ejecuta cada vez que 'searchTerm' cambia

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
                {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 animate-spin"/>}
            </div>
            
            {message && !isLoading && <p className="text-center text-gray-400">{message}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map(quote => <SearchResultCard key={quote.id} quote={quote} onSelect={onSelectQuote} />)}
            </div>
        </div>
    );
};