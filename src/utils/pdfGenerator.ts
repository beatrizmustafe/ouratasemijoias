import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order, BathService } from '../types/index.ts';

export function generateOrderPdf(order: Order): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colors
  const roseBrand = [180, 123, 142] as const; // #B47B8E
  const darkBrand = [34, 28, 30] as const; // #221C1E
  const grayMuted = [100, 90, 95] as const;
  const lightBg = [247, 239, 242] as const;

  // Header Background Bar
  doc.setFillColor(roseBrand[0], roseBrand[1], roseBrand[2]);
  doc.rect(0, 0, 210, 28, 'F');

  // Brand Name in Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('OURATA SEMIJÓIAS', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('CATÁLOGO, ATACADO & SERVIÇOS DE BANHO', 14, 21);
  doc.text('WhatsApp Oficial: +55 (19) 98806-4749', 125, 15);
  doc.text('www.ouratasemijoias.com.br', 125, 21);

  // Document Title & Order ID
  doc.setTextColor(darkBrand[0], darkBrand[1], darkBrand[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROVANTE DE PEDIDO', 14, 40);

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(125, 33, 71, 14, 2, 2, 'F');
  doc.setTextColor(roseBrand[0], roseBrand[1], roseBrand[2]);
  doc.setFontSize(11);
  doc.text(`Nº ${order.id}`, 130, 41);

  // Customer & Shipping Info Box
  doc.setDrawColor(220, 210, 215);
  doc.setFillColor(254, 252, 253);
  doc.roundedRect(14, 52, 182, 38, 2, 2, 'FD');

  doc.setTextColor(darkBrand[0], darkBrand[1], darkBrand[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE & ENTREGA', 18, 59);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(grayMuted[0], grayMuted[1], grayMuted[2]);

  doc.text(`Cliente: ${order.customerName}`, 18, 66);
  doc.text(`E-mail: ${order.customerEmail}`, 18, 72);
  doc.text(`Telefone: ${order.customerPhone}`, 18, 78);
  if (order.customerCpf) {
    doc.text(`CPF: ${order.customerCpf}`, 18, 84);
  }

  const addr = order.shippingAddress;
  const addressLine1 = addr ? `${addr.street}, ${addr.number} ${addr.complement || ''}` : 'A combinar';
  const addressLine2 = addr ? `${addr.neighborhood} - ${addr.city}/${addr.state} - CEP: ${addr.cep}` : '';

  doc.text(`Endereço: ${addressLine1}`, 105, 66);
  if (addressLine2) {
    doc.text(addressLine2, 105, 72);
  }
  doc.text(`Data do Pedido: ${new Date(order.createdAt).toLocaleString('pt-BR')}`, 105, 78);
  doc.text(`Status: ${order.status}`, 105, 84);

  // Items Table
  const tableRows = order.items.map((item) => [
    item.sku,
    item.productName,
    `R$ ${item.unitPrice.toFixed(2).replace('.', ',')}${item.isWholesaleApplied ? ' (Atacado)' : ''}`,
    item.quantity.toString(),
    `R$ ${item.subtotal.toFixed(2).replace('.', ',')}`,
  ]);

  autoTable(doc, {
    startY: 96,
    head: [['CÓDIGO (SKU)', 'PRODUTO', 'PREÇO UNIT.', 'QTD', 'SUBTOTAL']],
    body: tableRows,
    headStyles: {
      fillColor: [180, 123, 142],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 35, 38],
    },
    alternateRowStyles: {
      fillColor: [252, 248, 250],
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 78 },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Calculate final Y position after table
  const finalY = (doc as any).lastAutoTable?.finalY || 150;

  // Totals Box
  const totalsY = finalY + 8;
  doc.setFillColor(250, 244, 246);
  doc.roundedRect(110, totalsY, 86, 32, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setTextColor(grayMuted[0], grayMuted[1], grayMuted[2]);
  doc.text('Subtotal:', 116, totalsY + 7);
  doc.text(`R$ ${order.subtotal.toFixed(2).replace('.', ',')}`, 190, totalsY + 7, { align: 'right' });

  doc.text('Desconto:', 116, totalsY + 13);
  doc.text(`- R$ ${order.discount.toFixed(2).replace('.', ',')}`, 190, totalsY + 13, { align: 'right' });

  doc.text('Frete:', 116, totalsY + 19);
  doc.text(
    order.shippingFee === 0 ? 'Grátis' : `R$ ${order.shippingFee.toFixed(2).replace('.', ',')}`,
    190,
    totalsY + 19,
    { align: 'right' }
  );

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(roseBrand[0], roseBrand[1], roseBrand[2]);
  doc.text('TOTAL:', 116, totalsY + 27);
  doc.text(`R$ ${order.total.toFixed(2).replace('.', ',')}`, 190, totalsY + 27, { align: 'right' });

  // Payment note & terms
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(grayMuted[0], grayMuted[1], grayMuted[2]);
  doc.text('CONDIÇÕES COMERCIAIS & PAGAMENTO:', 14, totalsY + 8);
  doc.text('• Forma de pagamento: A combinar diretamente pelo WhatsApp (+55 19 98806-4749).', 14, totalsY + 14);
  doc.text('• As peças ficam temporariamente reservadas no sistema Ourata.', 14, totalsY + 19);
  doc.text('• O pedido é despachado após a confirmação do pagamento pela proprietária.', 14, totalsY + 24);

  // Footer notes
  doc.setDrawColor(220, 210, 215);
  doc.line(14, 275, 196, 275);
  doc.setFontSize(7.5);
  doc.setTextColor(140, 130, 135);
  doc.text('Ourata Semijoias — Qualidade, alta durabilidade e acabamento em joalheria fina.', 14, 280);
  doc.text(`Documento emitido em ${new Date().toLocaleString('pt-BR')}`, 196, 280, { align: 'right' });

  // Download
  doc.save(`pedido_${order.id}.pdf`);
}

export function generateBathServicePdf(service: BathService): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const roseBrand = [180, 123, 142] as const;
  const darkBrand = [34, 28, 30] as const;
  const grayMuted = [100, 90, 95] as const;

  // Header
  doc.setFillColor(roseBrand[0], roseBrand[1], roseBrand[2]);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('OURATA SEMIJÓIAS — ATELIÊ DE BANHOS', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('ORDEM DE SERVIÇO & PROTOCOLO DE BANHO', 14, 21);
  doc.text('WhatsApp: +55 (19) 98806-4749', 135, 15);

  // Document Title
  doc.setTextColor(darkBrand[0], darkBrand[1], darkBrand[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEM DE SERVIÇO DE BANHO', 14, 40);

  doc.setFillColor(247, 239, 242);
  doc.roundedRect(125, 33, 71, 14, 2, 2, 'F');
  doc.setTextColor(roseBrand[0], roseBrand[1], roseBrand[2]);
  doc.setFontSize(11);
  doc.text(`PROTOCOLO ${service.protocol}`, 128, 41);

  // Details
  autoTable(doc, {
    startY: 52,
    head: [['CAMPO', 'INFORMAÇÃO']],
    body: [
      ['Protocolo Único', service.protocol],
      ['Data de Solicitação', new Date(service.createdAt).toLocaleString('pt-BR')],
      ['Cliente', service.customerName],
      ['Telefone de Contato', service.customerPhone],
      ['E-mail', service.customerEmail || 'Não informado'],
      ['Tipo de Peça(s)', service.pieceType],
      ['Quantidade de Peças', `${service.quantity} unidade(s)`],
      ['Tipo de Banho Solicitado', service.bathType],
      ['Status Atual', service.status],
      ['Prazo Estimado', `${service.estimatedDays} dias úteis`],
      ['Valor do Orçamento', service.priceQuote ? `R$ ${service.priceQuote.toFixed(2).replace('.', ',')}` : 'A avaliar na recepção'],
      ['Observações do Cliente', service.observations || 'Nenhuma observação informada.'],
    ],
    headStyles: {
      fillColor: [180, 123, 142],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [40, 35, 38],
    },
    alternateRowStyles: {
      fillColor: [252, 248, 250],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 132 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 150;

  // Instructions
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(roseBrand[0], roseBrand[1], roseBrand[2]);
  doc.text('ORIENTAÇÕES DE ENVIO E CUIDADOS:', 14, finalY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(grayMuted[0], grayMuted[1], grayMuted[2]);
  doc.text('1. Embalar as peças individualmente em saquinhos plásticos ou veludo para evitar atrito.', 14, finalY + 18);
  doc.text('2. Identificar a embalagem externa com o número deste PROTOCOLO.', 14, finalY + 23);
  doc.text('3. O ateliê realiza inspeção inicial de peso, soldas e estado do metal base assim que recebido.', 14, finalY + 28);
  doc.text('4. Dúvidas e fotos complementares podem ser enviadas no WhatsApp oficial +55 (19) 98806-4749.', 14, finalY + 33);

  // Footer
  doc.setDrawColor(220, 210, 215);
  doc.line(14, 275, 196, 275);
  doc.setFontSize(7.5);
  doc.setTextColor(140, 130, 135);
  doc.text('Ourata Semijoias — Serviços Especializados de Galvanoplastia e Banhos Finos', 14, 280);
  doc.text(`Documento emitido em ${new Date().toLocaleString('pt-BR')}`, 196, 280, { align: 'right' });

  doc.save(`protocolo_${service.protocol}.pdf`);
}
