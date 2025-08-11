const { sql, poolPromise } = require('../config/dbp');
const buscarProducto = async (req, res) => {
  const { q } = req.query;
  console.log('Código recibido:', q);

  if (!q) {
    return res.status(400).json({ error: 'Parámetro de búsqueda "q" requerido.' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('codigo', sql.NVarChar, q) // 👈 usamos NVarChar
      .query(`
        SELECT 
          dc_codigo_barra AS codigo,
          dg_glosa_producto AS nombre,
          dq_precio_lista AS precio
        FROM dbo.tb_productos
        WHERE dc_codigo_barra = @codigo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error al buscar producto:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { buscarProducto };
