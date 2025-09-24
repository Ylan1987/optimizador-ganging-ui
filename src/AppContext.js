// src/AppContext.js
import { createContext } from 'react';

// #cambio1: Creamos el Context. Este es el "tablón de anuncios" central.
// Lo exportamos para que cualquier componente pueda usarlo.
export const AppContext = createContext(null);