import React, { useState, useEffect } from 'react';
import {
  Box, Typography, ToggleButtonGroup, ToggleButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  Collapse, IconButton
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import api from '../../api/api';

const periodOptions = [
  { label: 'Año', value: 'year' },
  { label: 'Mes', value: 'month' },
  { label: 'Semana', value: 'week' },
  { label: 'Día', value: 'day' },
];

export default function ComprasPorEmision() {
  const [period, setPeriod] = useState('year');
  const [rows, setRows] = useState([]);
  const [openRow, setOpenRow] = useState(null);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/compras/emision', { params: { period } });
      setRows(data);
    } catch (err) {
      console.error('Error cargando compras por emisión', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Compras por emisión</Typography>

      <ToggleButtonGroup
        value={period}
        exclusive
        onChange={(_, v) => v && setPeriod(v)}
        size="small"
        sx={{ mb: 2 }}
      >
        {periodOptions.map(o => (
          <ToggleButton key={o.value} value={o.value}>
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Emisión</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <React.Fragment key={i}>
              <TableRow hover>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => setOpenRow(openRow === i ? null : i)}
                  >
                    {openRow === i ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                  </IconButton>
                </TableCell>
                <TableCell>{r.label}</TableCell>
                <TableCell align="right">{r.total}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} sx={{ p: 0, border: 0 }}>
                  <Collapse in={openRow === i} timeout="auto" unmountOnExit>
                    {r.orders && (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>OC</TableCell>
                            <TableCell>Proveedor</TableCell>
                            <TableCell align="right">Monto</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {r.orders.map(o => (
                            <TableRow key={o.id}>
                              <TableCell>{o.numero}</TableCell>
                              <TableCell>{o.proveedor}</TableCell>
                              <TableCell align="right">{o.monto}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}