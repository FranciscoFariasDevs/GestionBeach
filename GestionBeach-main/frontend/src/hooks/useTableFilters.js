// frontend/src/hooks/useTableFilters.js
// Hook reutilizable para manejar filtros de tablas
//
// Uso básico:
//   const { filters, setFilter, resetFilters, filterFn } = useTableFilters({
//     searchText: '',
//     dateFrom: '',
//     dateTo: '',
//   });
//
//   // Filtrar un array (usa los campos que coincidan con los datos)
//   const datosFiltrados = data.filter(row => filterFn(row, {
//     searchFields: ['proveedor', 'numero_orden'],   // campos para buscar texto
//     dateField: 'fecha_vencimiento',                // campo de fecha para rango
//   }));
//
//   // En el componente:
//   <TextField value={filters.searchText} onChange={e => setFilter('searchText', e.target.value)} />
//   <Button onClick={resetFilters}>Limpiar</Button>

import { useState, useCallback } from 'react';

export function useTableFilters(initialFilters = {}) {
  const defaults = { searchText: '', dateFrom: '', dateTo: '', ...initialFilters };
  const [filters, setFilters] = useState(defaults);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaults);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función de filtrado genérica para usar en Array.filter()
  // options.searchFields: array de strings con los campos donde buscar searchText
  // options.dateField: string con el campo de fecha para filtrar por rango
  const filterFn = useCallback((row, options = {}) => {
    const { searchFields = [], dateField = null } = options;

    // Filtro de texto
    if (filters.searchText && searchFields.length > 0) {
      const texto = filters.searchText.toLowerCase();
      const coincide = searchFields.some(field => {
        const valor = row[field];
        return valor && String(valor).toLowerCase().includes(texto);
      });
      if (!coincide) return false;
    }

    // Filtro de fecha desde
    if (filters.dateFrom && dateField && row[dateField]) {
      if (row[dateField] < filters.dateFrom) return false;
    }

    // Filtro de fecha hasta
    if (filters.dateTo && dateField && row[dateField]) {
      if (row[dateField] > filters.dateTo) return false;
    }

    // Filtros extra (cualquier otro campo string en filters)
    for (const [key, value] of Object.entries(filters)) {
      if (['searchText', 'dateFrom', 'dateTo'].includes(key)) continue;
      if (!value) continue;
      if (row[key] === undefined) continue;
      if (String(row[key]).toLowerCase() !== String(value).toLowerCase()) return false;
    }

    return true;
  }, [filters]);

  return { filters, setFilter, resetFilters, filterFn };
}

export default useTableFilters;
