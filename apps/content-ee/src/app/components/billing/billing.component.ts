import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BillingTab, BillingCycle, TabDef, Kpi, UsageItem, CreditPack, OverviewAddon, ModuleAddon, PricingPlan, StepperStep, PaymentMethodCard, Invoice } from '../../interface/billing';

@Component({
  selector: 'acs-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent {
  readonly tabs: TabDef[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'refer-earn', label: 'Refer & Earn' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'payment-method', label: 'Payment method' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'payment-history', label: 'Payment history' }
  ];

  activeTab: BillingTab = 'overview';

  // Overview
  readonly overviewKpis: Kpi[] = [
    { label: 'CURRENT PLAN', value: 'Free', valueColor: '#F59E0B' },
    { label: 'MONTHLY BILL', value: 'Free', valueColor: '#F59E0B' },
    { label: 'NEXT RENEWAL', value: '—', valueColor: '#374151' },
    { label: 'AI CREDITS LEFT', value: '50 / 50', valueColor: '#111827' }
  ];

  readonly usageItems: UsageItem[] = [
    { label: 'Users', used: 0, total: 'Unlimited', pct: 0 },
    { label: 'AI models', used: 0, total: '50 credits', pct: 0 }
  ];

  readonly creditPacks: CreditPack[] = [
    { credits: '100 Credits', price: '₹1,999', sub: '100 credits' },
    { credits: '500 Credits', price: '₹7,999', sub: '500 credits' },
    { credits: '1000 Credits', price: '₹13,999', sub: '1000 credits' },
    { credits: '5000 Credits', price: '₹49,999', sub: '5000 credits' }
  ];

  readonly overviewModuleAddons: OverviewAddon[] = [
    { tag: 'ENG', color: '#3B82F6', name: 'Engineering Progress (EPM)', desc: 'Discipline-wise progress tracking, IFC/IFR/IFA progress, discipline progress tracking, milestone progress tracking, review cycle activity.', price: '₹14,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'PROJ', color: '#8B5CF6', name: 'Construction Schedule', desc: 'Integrated S-curve management, 3D tiling, resource levelling, baseline & deviation management, automated monthly progress report.', price: '₹18,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'PROJ_CTRL', color: '#6366F1', name: 'Project Controls', desc: 'EVM, cost variance analysis, schedule variance, CPI/SPI tracking, risk-adjusted forecasting, CPM/PERT analysis.', price: '₹19,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'FLD', color: '#10B981', name: 'Field Operation (POM)', desc: 'Mobile-first field management, NCR test management, punch list, site audit, associated log, staff/daily digital.', price: '₹12,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'HSE', color: '#EF4444', name: 'HSE — AI & IoT Driven Safety Platform', desc: 'HAZOP action tracker, IoT sensor integration, AI safety prediction, real-time alerts, near-miss reporting, TBTK, stop work authority.', price: '₹74,990', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'QMS', color: '#F59E0B', name: 'Quality Management (QMS)', desc: 'Process-led NCR categories, ITF library, factory inspection, hold point gatekeeper, baseline deviation, inspection auto-completion.', price: '₹8,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'COM', color: '#0EA5E9', name: 'Contracts & Commercial (CCM)', desc: 'Contract lifecycle management, change order tracking, AI contract clause analysis, change register, cost code CPM tracking, contract analytics.', price: '₹21,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'FCA', color: '#84CC16', name: 'Finance & Cost Control (FCA)', desc: 'Budget tracking, cost codes & WBS, earned value, cost-at-completion forecasting, multi-currency, SAP/Oracle integration.', price: '₹25,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'PROC', color: '#F97316', name: 'Procurement & Materials Management', desc: 'RFQ/RFP management, vendor negotiations, purchase order tracking, MR management, expediting, material tracking, log, delivery.', price: '₹9,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'VEND', color: '#A855F7', name: 'Vendor Management', desc: 'Vendor registration, evaluation, performance scoring, approved vendor list, vendor risk management, PO tracking.', price: '₹9,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'VENDOR_PORTAL', color: '#06B6D4', name: 'Vendor Portal / Document Management', desc: 'Vendor-facing Document Management Portal Ltd (DMS), vendor requesting studio, automated installation, per-vendor PO tracking.', price: '₹5,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'COMM', color: '#14B8A6', name: 'Interface & Commissioning Management', desc: 'Interface register, tracking system options, commissioning schedules, per-system installation, punch list generation from tag lists.', price: '₹11,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'EPCM', color: '#64748B', name: 'EPCM Module', desc: 'EPCM project controls, multi-client management, sub-contractor coordination.', price: 'Custom', unit: '', vat: '', btn: 'Request Quote' },
    { tag: 'EARTH', color: '#78716C', name: 'Earth Intelligence', desc: 'GIS-based project tracking, satellite imagery, BRDM/BIM, terrain analysis, geospatial data generation, labour.', price: 'Custom', unit: '', vat: '', btn: 'Request Quote' },
    { tag: 'METRO', color: '#475569', name: 'Metro Railway', desc: 'Metro-specific progress tracking, systems integration, BRDM/BIM, track work scheduling, BRDM level forward AAC.', price: 'Custom', unit: '', vat: '', btn: 'Request Quote' },
    { tag: 'ROAD', color: '#57534E', name: 'Road and Bridges', desc: 'Large-scale CPM/PERT/PRIMAVERA integration, road-specific progress, bridge construction, chainage-based tracking.', price: 'Custom', unit: '', vat: '', btn: 'Request Quote' },
    { tag: 'I&E', color: '#7C3AED', name: 'I&E Manufacturing', desc: 'Factory production billing, production tracking, quality inspection, delivery scheduling, PPAP, SPC, MSA.', price: '₹9,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'LCM', color: '#0284C7', name: 'Live Construction (LCM) — Software Only', desc: 'AI-based construction intelligence, digital twin, real-time site monitoring, drone integration, labour analytics.', price: 'Custom', unit: '', vat: '', btn: 'Request Quote' },
    { tag: 'LCMS', color: '#0369A1', name: 'Live Construction LCMS', desc: 'Advanced construction monitoring, AI-driven site analytics, labour management, BRDM level forward AAC.', price: 'Custom', unit: '', vat: '', btn: 'Request Quote' },
    { tag: 'PEM', color: '#BE185D', name: 'Process Equipment Manufacturing', desc: 'Equipment manufacturing tracking, inspection milestones, factory acceptance tests, ASME/PED compliance, hydro test, 3D model generation.', price: '₹24,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'FAB', color: '#B45309', name: 'Fabrication Intelligence', desc: 'All-in-one fabrication billing, production tracking, quality inspection, delivery scheduling — from raw subcontract only.', price: '₹9,999', unit: '/mo', vat: '18% GST · cancel anytime', btn: 'Add to Plan' },
    { tag: 'SHOP', color: '#065F46', name: 'Subcontract Shop Management', desc: 'Shop order management, work order tracking, production scheduling, quality control, delivery management.', price: 'Custom', unit: '', vat: '', btn: 'Request Quote' }
  ];

  readonly moduleAddons: ModuleAddon[] = [
    { tag: 'EPM', color: '#B45309', name: 'Engineering Progress (EPM)', price: 14999 },
    { tag: 'CPM', color: '#B45309', name: 'Construction Schedule (CPM)', price: 18999 },
    { tag: 'PROJECT CONTROLS', color: '#B45309', name: 'Project Controls', price: 19999 },
    { tag: 'FOM', color: '#B45309', name: 'Field Operations (FOM)', price: 17999 },
    { tag: 'HSE', color: '#B45309', name: 'HSE — AI & IoT Driven Safety Platform', price: 74999 },
    { tag: 'QMS', color: '#B45309', name: 'Quality Management (QMS)', price: 5999 },
    { tag: 'COM', color: '#B45309', name: 'Contracts & Commercial (COM)', price: 21999 },
    { tag: 'FCA', color: '#B45309', name: 'Finance & Cost Control (FCA)', price: 25999 },
    { tag: 'PROCUREMENT', color: '#B45309', name: 'Procurement & Materials Management', price: 24999 },
    { tag: 'VENDOR', color: '#B45309', name: 'Vendor Management', price: 9999 },
    { tag: 'VENDOR PORTAL', color: '#B45309', name: 'Vendor Portal / Document Management', price: 5999 },
    { tag: 'COMMISSIONING', color: '#B45309', name: 'Interface & Commissioning Management', price: 11999 },
    { tag: 'EPCM', color: '#B45309', name: 'EPCM Module', price: 14000 },
    { tag: 'EARTH', color: '#B45309', name: 'Earth Intelligence', price: 10000 },
    { tag: 'FAT', color: '#B45309', name: 'FAT / Manufacturing', price: 5999 },
    { tag: 'LCM', color: '#B45309', name: 'Live Construction (LCM) — Software Only', price: 100000 },
    { tag: 'LCM2', color: '#B45309', name: 'Live Construction Management (LCM2)', price: 35000 },
    { tag: 'PEM', color: '#B45309', name: 'Process Equipment Manufacturing', price: 24999 },
    { tag: 'FAB', color: '#B45309', name: 'Fabrication Intelligence', price: 49999 },
    { tag: 'SHOP', color: '#B45309', name: 'Fabrication Shop Management', price: 19999 }
  ];

  readonly pricingPlans: PricingPlan[] = [
    { name: 'Free', price: 'Free', isFree: true, isCurrent: true, users: 'Unlimited', storage: '5 GB', credits: '50 credits (warm-up)', projects: 'Unlimited projects' },
    { name: 'Foundation', price: '₹14,999', isFree: false, isCurrent: false, users: '5 users', storage: '10 GB', credits: 'Top-up only', projects: 'Unlimited projects' },
    { name: 'Framework', price: '₹19,999', isFree: false, isCurrent: false, users: '10 users', storage: '10 GB', credits: 'Top-up only', projects: 'Unlimited projects' },
    { name: 'Structure', price: '₹24,999', isFree: false, isCurrent: false, users: '25 users', storage: '20 GB', credits: 'Top-up only', projects: 'Unlimited projects' },
    { name: 'Execution', price: '₹54,999', isFree: false, isCurrent: false, users: '75 users', storage: '50 GB', credits: 'Top-up only', projects: 'Unlimited projects' },
    { name: 'Blueprint', price: '₹69,999', isFree: false, isCurrent: false, users: 'Unlimited', storage: '512 GB', credits: 'Top-up only', projects: 'Unlimited projects' },
    { name: 'MegaBuild', price: '₹1,09,999', isFree: false, isCurrent: false, users: '200 users', storage: '200 GB', credits: 'Top-up only', projects: 'Unlimited projects' },
    { name: 'EPC Master', price: '₹5,00,000', isFree: false, isCurrent: false, users: 'Unlimited', storage: '24 TB', credits: 'Top-up only', projects: 'Unlimited projects' }
  ];

  // Subscription tab
  billingCycle: BillingCycle = 'monthly';
  activeStep = 2;

  readonly steps: StepperStep[] = [
    { num: 1, label: 'Choose Plan' },
    { num: 2, label: 'Choose Modules' },
    { num: 3, label: 'Review & Pay' }
  ];

  // Payment method tab
  readonly subscriptionRows: { label: string; value: string }[] = [
    { label: 'Plan', value: 'Free' },
    { label: 'Status', value: 'trialing' },
    { label: 'Billing cycle', value: 'monthly' },
    { label: 'Next renewal', value: '---' }
  ];

  readonly paymentMethods: PaymentMethodCard[] = [
    { title: 'Cards', sub: 'Visa, Mastercard, RuPay' },
    { title: 'UPI', sub: 'GPay, PhonePe, Paytm' },
    { title: 'Net Banking', sub: 'All major banks' },
    { title: 'EMI', sub: 'Credit card EMI' },
    { title: 'Corporate', sub: 'NEFT / RTGS' },
    { title: 'GST', sub: 'Auto GST invoices' }
  ];

  // Invoices tab
  legalName = 'Twor India Private Limited';
  gstin = '27AABCT1234A1Z5';
  billingAddress = 'Mumbai 400037';

  readonly invoices: Invoice[] = [
    { id: 'TCEPL-1010', plan: 'Free', amount: '₹0', tax: 'zero_rated', status: 'paid' },
    { id: 'TCEPL-1011', plan: 'Free', amount: '₹0', tax: 'zero_rated', status: 'paid' }
  ];

  readonly invoiceColumns = ['Invoice', 'Plan', 'Amount', 'Tax', 'Status', ''];
  readonly historyColumns = ['Date', 'Description', 'Amount', 'Method', 'Reference', 'Status'];

  get firstRowPlans(): PricingPlan[] {
    return this.pricingPlans.slice(0, 6);
  }

  get secondRowPlans(): PricingPlan[] {
    return this.pricingPlans.slice(6);
  }

  get step2Modules(): ModuleAddon[] {
    return this.moduleAddons.slice(0, 12);
  }

  get subtotal(): number {
    return this.step2Modules.reduce((sum, m) => sum + m.price, 0);
  }

  get gst(): number {
    return Math.round(this.subtotal * 0.18);
  }

  get total(): number {
    return this.subtotal + this.gst;
  }

  formatINR(n: number): string {
    return '₹' + n.toLocaleString('en-IN');
  }

  displayPrice(plan: PricingPlan): string {
    if (plan.isFree) {
      return 'Free';
    }
    if (this.billingCycle === 'annual') {
      return plan.price.replace(/(\d[\d,]*)/g, (m) => {
        const num = parseInt(m.replace(/,/g, ''), 10);
        return Math.round(num * 0.85).toLocaleString('en-IN');
      });
    }
    return plan.price;
  }

  setTab(key: BillingTab): void {
    this.activeTab = key;
  }

  goToStep(num: number): void {
    if (num < this.activeStep) {
      this.activeStep = num;
    }
  }

  trackByKey(_index: number, item: TabDef): string {
    return item.key;
  }

  trackByTag(_index: number, item: ModuleAddon): string {
    return item.tag;
  }

  trackByName(_index: number, item: { name: string }): string {
    return item.name;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
