export type BillingTab = 'overview' | 'refer-earn' | 'subscription' | 'payment-method' | 'invoices' | 'payment-history';
export type BillingCycle = 'monthly' | 'annual';

export interface TabDef {
  key: BillingTab;
  label: string;
}

export interface Kpi {
  label: string;
  value: string;
  valueColor: string;
}

export interface UsageItem {
  label: string;
  used: number;
  total: string;
  pct: number;
}

export interface CreditPack {
  credits: string;
  price: string;
  sub: string;
}

export interface OverviewAddon {
  tag: string;
  color: string;
  name: string;
  desc: string;
  price: string;
  unit: string;
  vat: string;
  btn: string;
}

export interface ModuleAddon {
  tag: string;
  color: string;
  name: string;
  price: number;
}

export interface PricingPlan {
  name: string;
  price: string;
  isFree: boolean;
  isCurrent: boolean;
  users: string;
  storage: string;
  credits: string;
  projects: string;
}

export interface StepperStep {
  num: number;
  label: string;
}

export interface PaymentMethodCard {
  title: string;
  sub: string;
}

export interface Invoice {
  id: string;
  plan: string;
  amount: string;
  tax: string;
  status: string;
}