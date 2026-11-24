/**
 * Rutas del Módulo de Empleados y Equipo Técnico
 * Gestión de usuarios, roles, técnicos y asignaciones
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { 
  getCollection, 
  getDocument, 
  setDocument, 
  addDocument, 
  deleteDocument,
  queryDocuments 
} = require('../services/firestore.service');

router.use(authenticate, authorize(['SUPERADMIN', 'ADMIN']));

/**
 * GET /api/employees
 */
router.get('/', async (req, res, next) => {
  try {
    const { role } = req.query;
    let employees = await getCollection('employees', { orderBy: 'name', orderDirection: 'asc' });

    if (role) {
      employees = employees.filter(e => e.role === role);
    }

    // Ocultar contraseñas en el listado
    const safeList = employees.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone || '',
      role: e.role || 'TECNICO',
      specialty: e.specialty || '',
      active: e.active !== false,
      createdAt: e.createdAt
    }));

    res.json({ success: true, count: safeList.length, data: safeList });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employees/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const employee = await getDocument('employees', req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    // Buscar trabajos asignados si es técnico
    const assignedRepairs = await queryDocuments('repairs', { technicianId: req.params.id });

    res.json({
      success: true,
      data: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone || '',
        role: employee.role,
        specialty: employee.specialty || '',
        active: employee.active !== false,
        assignedRepairs
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, phone, role, specialty } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Nombre y correo electrónico son obligatorios.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await queryDocuments('employees', { email: cleanEmail });
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un usuario con ese correo electrónico.' });
    }

    const employeeData = {
      name: name.trim(),
      email: cleanEmail,
      password: password || 'Hidraulica2026!',
      phone: phone || '',
      role: role || 'TECNICO',
      specialty: specialty || 'Bombas y Cremalleras',
      active: true,
      createdAt: new Date().toISOString()
    };

    const doc = await addDocument('employees', employeeData);
    res.status(201).json({
      success: true,
      data: { id: doc.id, name: employeeData.name, email: employeeData.email, role: employeeData.role },
      message: 'Empleado creado correctamente.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/employees/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getDocument('employees', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    // No permitir que un usuario se quite a sí mismo el rol de SUPERADMIN si es el único
    if (req.user.uid === req.params.id && req.body.role && req.body.role !== 'SUPERADMIN' && existing.role === 'SUPERADMIN') {
      return res.status(400).json({ success: false, error: 'No puedes degradar tu propia cuenta de SUPERADMIN.' });
    }

    const updates = {
      name: req.body.name || existing.name,
      phone: req.body.phone !== undefined ? req.body.phone : existing.phone,
      role: req.body.role || existing.role,
      specialty: req.body.specialty !== undefined ? req.body.specialty : existing.specialty,
      active: req.body.active !== undefined ? req.body.active : existing.active
    };

    if (req.body.password && req.body.password.trim().length >= 6) {
      updates.password = req.body.password.trim();
    }

    const updated = await setDocument('employees', req.params.id, updates, true);
    res.json({ success: true, data: updated, message: 'Datos del empleado actualizados.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/employees/:id
 */
router.delete('/:id', authorize(['SUPERADMIN']), async (req, res, next) => {
  try {
    if (req.user.uid === req.params.id) {
      return res.status(400).json({ success: false, error: 'No puedes eliminar tu propia cuenta.' });
    }
    await deleteDocument('employees', req.params.id);
    res.json({ success: true, message: 'Empleado eliminado del sistema.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

