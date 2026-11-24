/**
 * Servicio de Generación de Documentos PDF Profesionales
 * Presupuestos de Reparación, Órdenes de Trabajo y Reportes
 */
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Genera el PDF oficial de un presupuesto
 */
function generateBudgetPDF(budget, company = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const primaryGold = '#D4AF37';
      const darkBlack = '#090909';
      const textGray = '#404040';

      // Encabezado superior
      doc.rect(40, 40, 515, 75).fill('#141414');

      // Título y Nombre Empresa
      doc.fillColor(primaryGold).fontSize(16).font('Helvetica-Bold')
         .text(company.name || 'BENGOECHEA HIDRÁULICA & CREMALLERAS', 55, 52);

      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica')
         .text(`Especialistas en Bombas Hidráulicas, Cremalleras y Cajas de Dirección`, 55, 72)
         .text(`Tel: ${company.phone || '+54 9 11 0000-0000'} | Correo: ${company.email || 'contacto@hidraulica.com'}`, 55, 86)
         .text(`${company.address || 'Av. Industrial 1234, Taller Central'}`, 55, 98);

      // Recuadro del Presupuesto (Derecha)
      doc.rect(380, 48, 165, 58).strokeColor(primaryGold).lineWidth(1.5).stroke();
      doc.fillColor(primaryGold).fontSize(12).font('Helvetica-Bold')
         .text('PRESUPUESTO', 390, 56, { width: 145, align: 'center' });
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica')
         .text(budget.number || `PRE-${Date.now().toString().slice(-6)}`, 390, 72, { width: 145, align: 'center' });
      doc.fontSize(8).fillColor('#A5A5A5')
         .text(`Fecha: ${budget.date || new Date().toLocaleDateString('es-AR')}`, 390, 88, { width: 145, align: 'center' });

      // Datos del Cliente y Componente
      let currentY = 130;
      doc.rect(40, currentY, 515, 65).fill('#F8F8F8').strokeColor('#E0E0E0').lineWidth(1).stroke();
      doc.fillColor(darkBlack).fontSize(10).font('Helvetica-Bold').text('DATOS DEL CLIENTE Y COMPONENTE', 55, currentY + 10);
      
      doc.font('Helvetica').fontSize(9).fillColor(textGray)
         .text(`Cliente: ${budget.clientName || 'Cliente Particular'}`, 55, currentY + 28)
         .text(`Teléfono: ${budget.clientPhone || 'No informado'}`, 55, currentY + 44)
         .text(`Componente: ${budget.componentType || 'Bomba / Cremallera'} - ${budget.brand || ''} ${budget.model || ''}`, 280, currentY + 28)
         .text(`Validez Presupuesto: ${budget.validDays || 15} días`, 280, currentY + 44);

      // Tabla de Ítems / Trabajos y Repuestos
      currentY = 210;
      doc.rect(40, currentY, 515, 22).fill('#202020');
      doc.fillColor(primaryGold).fontSize(9).font('Helvetica-Bold')
         .text('DESCRIPCIÓN DEL TRABAJO / REPUESTOS', 50, currentY + 6)
         .text('CANT.', 360, currentY + 6, { width: 40, align: 'center' })
         .text('UNITARIO', 410, currentY + 6, { width: 65, align: 'right' })
         .text('SUBTOTAL', 485, currentY + 6, { width: 60, align: 'right' });

      currentY += 22;
      const currency = company.currency || '$';
      const items = budget.items && budget.items.length > 0 ? budget.items : [
        { description: 'Diagnóstico en banco de pruebas y desarme completo', quantity: 1, unitPrice: budget.subtotal || 0, subtotal: budget.subtotal || 0 }
      ];

      doc.font('Helvetica').fontSize(9).fillColor(textGray);

      items.forEach((item, index) => {
        const bg = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
        doc.rect(40, currentY, 515, 22).fill(bg).strokeColor('#EEEEEE').stroke();
        doc.fillColor(textGray)
           .text(item.description || 'Detalle de servicio', 50, currentY + 6, { width: 300, ellipsis: true })
           .text(String(item.quantity || 1), 360, currentY + 6, { width: 40, align: 'center' })
           .text(`${currency} ${(Number(item.unitPrice) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 410, currentY + 6, { width: 65, align: 'right' })
           .text(`${currency} ${(Number(item.subtotal) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 485, currentY + 6, { width: 60, align: 'right' });
        currentY += 22;
      });

      // Recuadro de Totales
      currentY += 15;
      const subtotal = Number(budget.subtotal) || 0;
      const discount = Number(budget.discount) || 0;
      const taxAmount = Number(budget.taxAmount) || 0;
      const total = Number(budget.total) || (subtotal - discount + taxAmount);

      doc.rect(340, currentY, 215, 80).fill('#F8F8F8').strokeColor('#D4AF37').lineWidth(1).stroke();

      doc.fontSize(9).font('Helvetica').fillColor(textGray)
         .text('Subtotal:', 355, currentY + 8)
         .text(`${currency} ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 450, currentY + 8, { width: 95, align: 'right' })
         .text(`Descuento:`, 355, currentY + 24)
         .text(`- ${currency} ${discount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 450, currentY + 24, { width: 95, align: 'right' })
         .text(`IVA / Impuestos:`, 355, currentY + 40)
         .text(`${currency} ${taxAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 450, currentY + 40, { width: 95, align: 'right' });

      doc.rect(340, currentY + 56, 215, 24).fill('#141414');
      doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryGold)
         .text('TOTAL:', 355, currentY + 63)
         .text(`${currency} ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 440, currentY + 63, { width: 105, align: 'right' });

      // Condiciones de Garantía y Términos
      currentY += 95;
      doc.rect(40, currentY, 515, 85).fill('#FFFFFF').strokeColor('#CCCCCC').lineWidth(0.8).stroke();
      doc.fillColor(darkBlack).fontSize(9).font('Helvetica-Bold')
         .text('TÉRMINOS Y CONDICIONES DE GARANTÍA', 50, currentY + 8);

      doc.fillColor('#666666').fontSize(8).font('Helvetica')
         .text(budget.warrantyText || company.warrantyConditions || 
          '1. Garantía de 6 (seis) meses sujeta a la utilización del fluido hidráulico homologado por el fabricante.\n' +
          '2. No cubre roturas por contaminación del circuito, presencia de virutas metálicas en cañerías o golpes externos.\n' +
          '3. Se requiere purgado profesional del sistema hidráulico previo a la puesta en marcha definitiva.\n' +
          '4. Todo trabajo se entrega probado rigurosamente en nuestro banco de pruebas hidráulico.',
          50, currentY + 24, { width: 495, lineGap: 2 }
         );

      // Pie de Página
      doc.fontSize(8).fillColor('#999999').font('Helvetica')
         .text(`Documento emitido por Bengoechea Hidráulica - Presupuesto Técnico Interno - No válido como factura fiscal AFIP/ARCA`, 40, 770, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateBudgetPDF
};

