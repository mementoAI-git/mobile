import type { BillingProfile } from './billing-adapters';

export const BILLING_REFERENCE_FIXTURE: BillingProfile = Object.freeze({
  email: 'herrgroot@gmail.com',
  name: 'Herr Groot Danke',
  address: {
    line1: '25 Effiong Close, Off Col. Argan street, 4 lanes',
    city: 'Uyo',
    state: 'Akwa Ibom',
    postalCode: '520231',
    country: 'Nigeria',
  },
  paymentMethods: [
    {id: 'reference-mastercard-1', brand: 'mastercard', last4: '1312', isDefault: true},
    {id: 'reference-mastercard-2', brand: 'mastercard', last4: '1312', isDefault: false},
    {id: 'reference-mastercard-3', brand: 'mastercard', last4: '1312', isDefault: false},
  ],
  management: 'polar_portal',
});
