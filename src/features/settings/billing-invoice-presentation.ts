import type {BillingInvoice} from './billing-adapters';

export function formatInvoiceAmount(invoice: BillingInvoice): string {
  if (!Number.isFinite(invoice.amount)) return '—';
  const raw = Number(invoice.amount);
  const major = Number.isInteger(raw) ? raw / 100 : raw;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: invoice.currency ?? 'USD',
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
  }).format(major);
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
