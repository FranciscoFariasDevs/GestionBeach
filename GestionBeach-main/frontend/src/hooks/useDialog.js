// frontend/src/hooks/useDialog.js
// Hook reutilizable para manejar el estado de modales/diálogos
// Elimina el patrón repetido: const [open, setOpen] = useState(false) + [loading, setLoading] + [data, setData]
//
// Uso básico:
//   const modal = useDialog();
//   <Button onClick={() => modal.openDialog(rowData)}>Abrir</Button>
//   <Dialog open={modal.open} onClose={modal.closeDialog}>
//     {modal.loading ? <Spinner/> : <Content data={modal.data}/>}
//   </Dialog>
//
// Con datos iniciales:
//   const modal = useDialog({ loading: true });

import { useState, useCallback } from 'react';

export function useDialog(initial = {}) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(initial.loading ?? false);
  const [data,    setData]    = useState(initial.data    ?? null);

  const openDialog = useCallback((newData = null) => {
    if (newData !== null) setData(newData);
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
  }, []);

  const reset = useCallback(() => {
    setOpen(false);
    setLoading(false);
    setData(null);
  }, []);

  return { open, loading, data, openDialog, closeDialog, setLoading, setData, reset };
}

export default useDialog;
