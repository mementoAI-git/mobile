import type {BillingInvoice} from './billing-adapters';

export function formatInvoiceAmount(invoice: BillingInvoice): string {
  const amount = Number.isFinite(invoice.amount) ? Number(invoice.amount) / 100 : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: invoice.currency ?? 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatInvoiceDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
