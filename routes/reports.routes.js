/**
 * Rutas del Módulo de Reportes y Estadísticas del Dashboard
 * Cálculos en tiempo real basados en datos de Firestore
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const { getCollection } = require('../services/firestore.service');

router.use(authenticate, authorize(['SUPERADMIN', 'ADMIN', 'CONTADOR']));

/**
 * GET /api/reports/dashboard
 * Métricas clave consolidadas para el Dashboard
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const clients = await getCollection('clients');
    const repairs = await getCollection('repairs');
    const budgets = await getCollection('budgets');
    const payments = await getCollection('payments');
    const quotes = await getCollection('quotes');
    const inventory = await getCollection('inventory');

    // 1. Conteo de Estados de Reparaciones
    const activeRepairs = repairs.filter(r => 
      !['Entregado', 'Cancelado'].includes(r.status)
    );
    const finishedRepairs = repairs.filter(r => 
      ['Reparado', 'Listo para entregar', 'Entregado'].includes(r.status)
    );
    const pendingApproval = repairs.filter(r => 
      r.status === 'Esperando aprobación'
    );

    // 2. Solicitudes web nuevas
    const newQuotes = quotes.filter(q => q.status === 'Nueva solicitud');

    // 3. Finanzas del mes actual
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthPrefix = `${currentYear}-${currentMonth}`;

    let totalIncomeMonth = 0;
    let totalExpenseMonth = 0;
    let totalIncomeAll = 0;
    let totalExpenseAll = 0;

    payments.forEach(p => {
      const amt = Number(p.amount) || 0;
      const isThisMonth = p.date && p.date.startsWith(currentMonthPrefix);

      if (p.type === 'ingreso') {
        totalIncomeAll += amt;
        if (isThisMonth) totalIncomeMonth += amt;
      } else if (p.type === 'egreso') {
        totalExpenseAll += amt;
        if (isThisMonth) totalExpenseMonth += amt;
      }
    });

    // 4. Dinero pendiente de cobro en reparaciones activas o terminadas
    let pendingCollections = 0;
    repairs.forEach(r => {
      if (r.status !== 'Cancelado') {
        const total = Number(r.budgetTotal) || 0;
        const paid = Number(r.totalPaid) || 0;
        if (total > paid) {
          pendingCollections += (total - paid);
        }
      }
    });

    // 5. Presupuestos pendientes
    const pendingBudgets = budgets.filter(b => b.status === 'Pendiente');

    // 6. Alertas de stock crítico
    const stockAlerts = inventory.filter(i => 
      Number(i.stock || 0) <= Number(i.minStock || 0)
    ).slice(0, 5);

    // 7. Reparaciones atrasadas (fecha estimada menor a hoy y no entregada)
    const todayStr = now.toISOString().slice(0, 10);
    const overdueRepairs = repairs.filter(r => 
      r.estimatedDeliveryDate && 
      r.estimatedDeliveryDate < todayStr && 
      !['Entregado', 'Cancelado', 'Listo para entregar'].includes(r.status)
    );

    // 8. Gráfico de Reparaciones por Estado
    const statusCounts = {};
    const possibleStatuses = [
      'Recibido', 'En diagnóstico', 'Esperando aprobación', 'Aprobado',
      'Esperando repuestos', 'En reparación', 'En pruebas', 'Reparado',
      'Listo para entregar', 'Entregado'
    ];
    possibleStatuses.forEach(s => statusCounts[s] = 0);
    repairs.forEach(r => {
      if (statusCounts[r.status] !== undefined) {
        statusCounts[r.status]++;
      } else {
        statusCounts[r.status] = 1;
      }
    });

    // 9. Facturación de los últimos 6 meses
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleString('es-AR', { month: 'short' }).toUpperCase();
      
      let income = 0;
      payments.forEach(p => {
        if (p.type === 'ingreso' && p.date && p.date.startsWith(prefix)) {
          income += Number(p.amount) || 0;
        }
      });
      monthlyRevenue.push({ month: monthName, income });
    }

    // 10. Servicios / Componentes más solicitados
    const componentCounts = {};
    repairs.forEach(r => {
      const comp = r.componentType || 'Otros';
      componentCounts[comp] = (componentCounts[comp] || 0) + 1;
    });

    const topComponents = Object.entries(componentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 11. Últimos registros
    const latestRepairs = repairs.slice(0, 6);
    const latestClients = clients.slice(0, 5);

    res.json({
      success: true,
      kpis: {
        totalClients: clients.length,
        newQuotesCount: newQuotes.length,
        activeRepairsCount: activeRepairs.length,
        finishedRepairsCount: finishedRepairs.length,
        pendingApprovalCount: pendingApproval.length,
        pendingBudgetsCount: pendingBudgets.length,
        monthIncome: totalIncomeMonth,
        monthExpense: totalExpenseMonth,
        monthProfit: totalIncomeMonth - totalExpenseMonth,
        totalIncomeAll,
        totalExpenseAll,
        pendingCollections,
        overdueCount: overdueRepairs.length
      },
      charts: {
        monthlyRevenue,
        statusCounts,
        topComponents
      },
      stockAlerts,
      overdueRepairs: overdueRepairs.slice(0, 5),
      latestRepairs,
      latestClients
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/export/csv
 * Exportar reporte a formato CSV
 */
router.get('/export/csv', async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query; // 'repairs' | 'payments' | 'inventory'

    let filename = `reporte-${type || 'datos'}-${Date.now()}.csv`;
    let csvContent = '';

    if (type === 'repairs') {
      let list = await getCollection('repairs');
      if (startDate) list = list.filter(r => r.createdAt >= startDate);
      if (endDate) list = list.filter(r => r.createdAt <= endDate);

      csvContent = 'Numero Orden,Cliente,Telefono,Componente,Marca,Modelo,Estado,Fecha Ingreso,Total Presupuesto,Pagado\n';
      list.forEach(r => {
        csvContent += `"${r.orderNumber}","${r.clientName}","${r.clientPhone}","${r.componentType}","${r.brand || ''}","${r.model || ''}","${r.status}","${r.receivedDate || ''}",${r.budgetTotal || 0},${r.totalPaid || 0}\n`;
      });
    } else if (type === 'payments') {
      let list = await getCollection('payments');
      if (startDate) list = list.filter(p => p.date >= startDate);
      if (endDate) list = list.filter(p => p.date <= endDate);

      csvContent = 'Numero Movimiento,Tipo,Categoria,Concepto,Metodo,Monto,Fecha,Cliente\n';
      list.forEach(p => {
        csvContent += `"${p.movementNumber}","${p.type}","${p.category}","${p.concept}","${p.method}",${p.amount},"${p.date}","${p.clientName || ''}"\n`;
      });
    } else {
      let list = await getCollection('inventory');
      csvContent = 'Codigo,Nombre,Categoria,Stock Actual,Stock Minimo,Costo,Precio Venta,Ubicacion\n';
      list.forEach(i => {
        csvContent += `"${i.code}","${i.name}","${i.category}",${i.stock},${i.minStock},${i.cost},${i.salePrice},"${i.location || ''}"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent); // BOM para compatibilidad con Excel
  } catch (err) {
    next(err);
  }
});

module.exports = router;

