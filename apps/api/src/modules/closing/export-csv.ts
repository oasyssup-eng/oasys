/**
 * CSV export for daily closing reports.
 * UTF-8 with BOM for Excel compatibility, PT-BR number formatting.
 */

import type { RevenueResult, PaymentSummary, HourlyRevenueEntry } from './consolidation';
import type { Divergence } from './reconciliation';

interface ExportableReport {
  date: string | Date;
  revenue: RevenueResult;
  paymentSummary: PaymentSummary;
  hourlyData: HourlyRevenueEntry[];
  divergences: Divergence[];
}

const BOM = '\uFEFF';
const SEP = ';'; // PT-BR Excel uses semicolon

function formatCurrency(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function generateClosingCSV(
  report: ExportableReport,
  unitName: string,
): string {
  const lines: string[] = [];

  // Header
  lines.push(`${BOM}Relatório de Fechamento - ${unitName}`);
  lines.push(`Data${SEP}${formatDate(report.date)}`);
  lines.push('');

  // Section 1: Resumo Financeiro
  lines.push('=== RESUMO FINANCEIRO ===');
  lines.push(`Descrição${SEP}Valor (R$)`);
  lines.push(`Faturamento Bruto${SEP}${formatCurrency(report.revenue.grossRevenue)}`);
  lines.push(`Taxa de Serviço${SEP}${formatCurrency(report.revenue.serviceFees)}`);
  lines.push(`Gorjetas${SEP}${formatCurrency(report.revenue.tips)}`);
  lines.push(`Descontos${SEP}${formatCurrency(report.revenue.discounts)}`);
  lines.push(`Cancelamentos${SEP}${formatCurrency(report.revenue.cancellationAmount)}`);
  lines.push(`Cortesias${SEP}${formatCurrency(report.revenue.courtesyAmount)}`);
  lines.push(`Consumo Interno${SEP}${formatCurrency(report.revenue.staffMealAmount)}`);
  lines.push(`Faturamento Líquido${SEP}${formatCurrency(report.revenue.netRevenue)}`);
  lines.push('');

  // Section 2: Pagamentos
  lines.push('=== PAGAMENTOS ===');
  lines.push(`Método${SEP}Valor (R$)`);
  for (const [method, amount] of Object.entries(report.paymentSummary.byMethod)) {
    lines.push(`${method}${SEP}${formatCurrency(amount)}`);
  }
  lines.push(`Total Confirmado${SEP}${formatCurrency(report.paymentSummary.totalConfirmed)}`);
  if (report.paymentSummary.pendingCount > 0) {
    lines.push(`Pendente (${report.paymentSummary.pendingCount})${SEP}${formatCurrency(report.paymentSummary.pendingAmount)}`);
  }
  lines.push('');

  // Section 3: Faturamento por Hora
  lines.push('=== FATURAMENTO POR HORA ===');
  lines.push(`Hora${SEP}Faturamento (R$)${SEP}Pedidos${SEP}Contas`);
  for (const h of report.hourlyData) {
    lines.push(`${String(h.hour).padStart(2, '0')}:00${SEP}${formatCurrency(h.revenue)}${SEP}${h.orderCount}${SEP}${h.checkCount}`);
  }
  lines.push('');

  // Section 4: Divergências
  if (report.divergences.length > 0) {
    lines.push('=== DIVERGÊNCIAS ===');
    lines.push(`Tipo${SEP}Severidade${SEP}Descrição${SEP}Valor (R$)`);
    for (const d of report.divergences) {
      lines.push(`${d.type}${SEP}${d.severity}${SEP}${d.description}${SEP}${formatCurrency(Math.abs(d.amount))}`);
    }
  } else {
    lines.push('=== SEM DIVERGÊNCIAS ===');
  }

  lines.push('');
  lines.push(`Gerado em${SEP}${new Date().toLocaleString('pt-BR')}`);

  return lines.join('\r\n');
}
