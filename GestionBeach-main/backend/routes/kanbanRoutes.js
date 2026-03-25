const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const c       = require('../controllers/kanbanController');

router.use(auth);

// Boards
router.get ('/',           c.getBoards);
router.post('/',           c.createBoard);
router.delete('/:id',      c.deleteBoard);

// Columnas
router.get ('/:boardId/columnas',    c.getColumnas);
router.post('/:boardId/columnas',    c.createColumna);

// Tareas
router.get ('/:boardId/tareas',      c.getTareas);
router.post('/:boardId/tareas',      c.createTarea);
router.put ('/tareas/:id',           c.updateTarea);
router.patch('/tareas/:id/mover',    c.moverTarea);
router.delete('/tareas/:id',         c.deleteTarea);

// Miembros
router.get ('/:boardId/miembros',          c.getMiembros);
router.post('/:boardId/miembros',          c.addMiembro);
router.delete('/:boardId/miembros/:userId', c.removeMiembro);

module.exports = router;
