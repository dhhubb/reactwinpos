import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import {
  Product,
  CartItem,
  Customer,
  Transaction,
  Account,
  JournalEntry,
  Page,
  Shift,
  Employee,
  PayrollRun,
  User,
  BusinessProfile,
  DatabaseSnapshot,
  IndustryType,
} from './types';
import { DEFAULT_BUSINESS_PROFILE, INDUSTRY_PRESETS } from './utils/industryPresets';
import {
  initialProducts,
  initialCustomers,
  initialTransactions,
  initialAccounts,
  initialJournalEntries,
  initialShifts,
  initialEmployees,
  initialPayrollRuns,
  SEED_USERS,
} from './data/seed';
import { localDate, localDateTime, localTime, currentYearRange } from './utils/datetime';
import { applyCustomerBalance, applySaleToStock, restoreStockForItems } from './utils/sales';
import { applyJournalToAccounts } from './utils/ledger';
import { roundMoney } from './utils/currency';
import { createSalt, hashPassword, verifyPassword } from './utils/password';
import { LOCAL_STORE_CONFIG } from './config/database';
import {
  loadState,
  saveState,
  appendAudit,
  readLegacyLocalStorage,
  writeLegacyLocalStorage,
  clearState,
} from './utils/indexedDb';
import { validateBackupPayload } from './utils/backupValidation';
// Record ids are timestamp+random (see utils/ids.ts) so they can never collide with
// the seed ids (`p1`, `t1`) or with ids minted in an earlier session, which the old
// module-level counter did after every reload or restore.
import { makeId } from './utils/ids';

export interface AppState {
  currentPage: Page;
  sidebarCollapsed: boolean;
  products: Product[];
  cart: CartItem[];
  customers: Customer[];
  transactions: Transaction[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  searchQuery: string;
  reportDateFrom: string;
  reportDateTo: string;
  reportSortBy: 'date' | 'amount' | 'customer' | 'status';
  reportSortDir: 'asc' | 'desc';
  shifts: Shift[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  users: User[];
  currentUser: User | null;
  isLoggedIn: boolean;
  businessProfile: BusinessProfile;
  snapshots: DatabaseSnapshot[];
  aiOpen: boolean;
  /** False until IndexedDB has been read, so the UI never renders seed data over saved data. */
  hydrated: boolean;
}

type Action =
  | { type: 'SET_PAGE'; payload: Page }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QTY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_JOURNAL_ENTRY'; payload: JournalEntry }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_REPORT_DATE_FROM'; payload: string }
  | { type: 'SET_REPORT_DATE_TO'; payload: string }
  | { type: 'SET_REPORT_SORT'; payload: { by: 'date' | 'amount' | 'customer' | 'status'; dir: 'asc' | 'desc' } }
  | { type: 'ADD_SHIFT'; payload: Shift }
  | { type: 'UPDATE_SHIFT'; payload: Shift }
  | { type: 'DELETE_SHIFT'; payload: string }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
  | { type: 'DELETE_EMPLOYEE'; payload: string }
  | { type: 'ADD_PAYROLL_RUN'; payload: PayrollRun }
  | { type: 'UPDATE_PAYROLL_RUN'; payload: PayrollRun }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_BUSINESS_PROFILE'; payload: Partial<BusinessProfile> }
  | { type: 'APPLY_INDUSTRY_PRESET'; payload: { industry: IndustryType; loadSampleCatalog: boolean } }
  | { type: 'CREATE_SNAPSHOT'; payload: { name: string } }
  | { type: 'DELETE_SNAPSHOT'; payload: string }
  | { type: 'RESTORE_DATABASE'; payload: Partial<AppState> }
  | { type: 'RESET_DATABASE' }
  | { type: 'TOGGLE_AI'; payload?: boolean }
  | { type: 'HYDRATE'; payload: Partial<AppState> };

/** Rebuilds the persisted record-count used on the SQL studio KPI cards. */
function countRecords(state: Pick<AppState,
  'products' | 'customers' | 'transactions' | 'accounts' | 'journalEntries' |
  'shifts' | 'employees' | 'payrollRuns' | 'users'>): number {
  return (
    state.products.length +
    state.customers.length +
    state.transactions.length +
    state.accounts.length +
    state.journalEntries.length +
    state.shifts.length +
    state.employees.length +
    state.payrollRuns.length +
    state.users.length
  );
}

function buildSnapshot(state: AppState, name: string): DatabaseSnapshot {
  const data = {
    businessProfile: state.businessProfile,
    products: state.products,
    customers: state.customers,
    transactions: state.transactions,
    accounts: state.accounts,
    journalEntries: state.journalEntries,
    shifts: state.shifts,
    employees: state.employees,
    payrollRuns: state.payrollRuns,
    users: state.users,
  };
  const dataJson = JSON.stringify(data);
  return {
    id: makeId('snap-'),
    name: name || `Backup ${new Date().toLocaleString('en-ZA')}`,
    createdAt: new Date().toISOString(),
    sizeBytes: new Blob([dataJson]).size,
    recordCount: countRecords(state),
    dataJson,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, hydrated: true };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCT': {
      // Reject duplicate SKUs instead of creating two products with the same code.
      const code = action.payload.code.trim().toUpperCase();
      if (state.products.some(p => p.code.trim().toUpperCase() === code)) return state;
      return { ...state, products: [...state.products, { ...action.payload, id: makeId('p'), code }] };
    }
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'ADD_TO_CART': {
      const product = state.products.find(p => p.id === action.payload.id) ?? action.payload;
      const existing = state.cart.find(item => item.product.id === product.id);
      if (existing) {
        // Never let the cart exceed on-hand stock.
        if (existing.quantity >= product.stock) return state;
        return {
          ...state,
          cart: state.cart.map(item =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      if (product.stock <= 0) return state;
      return { ...state, cart: [...state.cart, { product, quantity: 1 }] };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(item => item.product.id !== action.payload) };
    case 'UPDATE_CART_QTY': {
      const target = state.cart.find(item => item.product.id === action.payload.productId);
      if (!target) return state;
      const capped = Math.min(Math.max(1, action.payload.quantity), Math.max(1, target.product.stock));
      return {
        ...state,
        cart: state.cart.map(item =>
          item.product.id === action.payload.productId ? { ...item, quantity: capped } : item
        ),
      };
    }
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload };
    case 'ADD_CUSTOMER': {
      const code = action.payload.code.trim().toUpperCase();
      if (state.customers.some(c => c.code.trim().toUpperCase() === code)) return state;
      return { ...state, customers: [...state.customers, { ...action.payload, id: makeId('c'), code }] };
    }
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.id !== action.payload) };
    case 'ADD_TRANSACTION': {
      // A sale must move stock and, when on credit, raise the customer's balance.
      const transaction: Transaction = {
        ...action.payload,
        // A caller-supplied id (POS generates one so the printed slip can show it)
        // is preserved; otherwise mint one here.
        id: action.payload.id || makeId('t'),
        time: action.payload.time ?? localTime(),
        total: roundMoney(action.payload.total),
        tax: roundMoney(action.payload.tax),
        amount: roundMoney(action.payload.amount),
      };
      return {
        ...state,
        transactions: [transaction, ...state.transactions],
        products: transaction.type === 'sale' && transaction.items
          ? applySaleToStock(state.products, transaction.items)
          : state.products,
        customers: applyCustomerBalance(state.customers, transaction),
      };
    }
    case 'UPDATE_TRANSACTION': {
      const previous = state.transactions.find(t => t.id === action.payload.id);
      if (!previous) return state;
      let products = state.products;
      let customers = state.customers;
      // Reversing the old transaction then applying the new one keeps stock and
      // receivables correct when a status or total changes.
      if (previous.type === 'sale' && previous.items) {
        products = restoreStockForItems(products, previous.items);
        customers = applyCustomerBalance(customers, previous, -1);
      }
      if (action.payload.type === 'sale' && action.payload.items) {
        products = applySaleToStock(products, action.payload.items);
        customers = applyCustomerBalance(customers, action.payload, 1);
      }
      return {
        ...state,
        transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t),
        products,
        customers,
      };
    }
    case 'DELETE_TRANSACTION': {
      const target = state.transactions.find(t => t.id === action.payload);
      if (!target) return state;
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload),
        products: target.type === 'sale' && target.items
          ? restoreStockForItems(state.products, target.items)
          : state.products,
        customers: applyCustomerBalance(state.customers, target, -1),
      };
    }
    case 'ADD_JOURNAL_ENTRY':
      // Posting an entry must also move the affected account balances.
      return {
        ...state,
        journalEntries: [{ ...action.payload, id: makeId('j') }, ...state.journalEntries],
        accounts: applyJournalToAccounts(state.accounts, action.payload),
      };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_REPORT_DATE_FROM':
      return { ...state, reportDateFrom: action.payload };
    case 'SET_REPORT_DATE_TO':
      return { ...state, reportDateTo: action.payload };
    case 'SET_REPORT_SORT':
      return { ...state, reportSortBy: action.payload.by, reportSortDir: action.payload.dir };
    case 'ADD_SHIFT':
      return { ...state, shifts: [{ ...action.payload, id: makeId('s') }, ...state.shifts] };
    case 'UPDATE_SHIFT':
      return { ...state, shifts: state.shifts.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SHIFT':
      return { ...state, shifts: state.shifts.filter(s => s.id !== action.payload) };
    case 'ADD_EMPLOYEE': {
      const code = action.payload.code.trim().toUpperCase();
      if (state.employees.some(e => e.code.trim().toUpperCase() === code)) return state;
      return { ...state, employees: [...state.employees, { ...action.payload, id: makeId('e'), code }] };
    }
    case 'UPDATE_EMPLOYEE':
      return { ...state, employees: state.employees.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EMPLOYEE':
      return { ...state, employees: state.employees.filter(e => e.id !== action.payload) };
    case 'ADD_PAYROLL_RUN':
      return { ...state, payrollRuns: [{ ...action.payload, id: makeId('pr') }, ...state.payrollRuns] };
    case 'UPDATE_PAYROLL_RUN':
      return { ...state, payrollRuns: state.payrollRuns.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'ADD_USER': {
      const username = action.payload.username.trim().toLowerCase();
      if (state.users.some(u => u.username.toLowerCase() === username)) return state;
      return {
        ...state,
        users: [...state.users, {
          ...action.payload,
          id: makeId('u'),
          username,
          password: '',
          passwordHash: action.payload.passwordHash ?? hashPassword(action.payload.password ?? ''),
        }],
      };
    }
    case 'UPDATE_USER': {
      const next = action.payload;
      // Only re-hash when the caller supplied a new plain-text password.
      const passwordChanged = typeof next.password === 'string' && next.password.length > 0 && !next.password.startsWith('sha256i$');
      const updated: User = passwordChanged
        ? { ...next, password: '', passwordHash: hashPassword(next.password) }
        : { ...next, password: next.passwordHash ? '' : next.password };
      return {
        ...state,
        users: state.users.map(u => u.id === next.id ? updated : u),
        currentUser: state.currentUser?.id === next.id ? updated : state.currentUser,
      };
    }
    case 'DELETE_USER':
      // Never allow deleting the account that is currently signed in.
      if (state.currentUser?.id === action.payload) return state;
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };
    case 'LOGIN': {
      const now = new Date().toISOString();
      return {
        ...state,
        // The login page upgrades legacy plain-text passwords on success.
        users: state.users.map(u => u.id === action.payload.id ? { ...u, lastLogin: now } : u),
        currentUser: { ...action.payload, lastLogin: now },
        isLoggedIn: true,
        currentPage: state.currentPage === 'dashboard' ? 'dashboard' : 'dashboard',
      };
    }
    case 'LOGOUT':
      return { ...state, currentUser: null, isLoggedIn: false, currentPage: 'dashboard', cart: [] };
    case 'UPDATE_BUSINESS_PROFILE':
      return {
        ...state,
        businessProfile: {
          ...state.businessProfile,
          ...action.payload,
          terminology: {
            ...state.businessProfile.terminology,
            ...(action.payload.terminology || {}),
          },
        },
      };
    case 'APPLY_INDUSTRY_PRESET': {
      const preset = INDUSTRY_PRESETS[action.payload.industry];
      if (!preset) return state;
      const updatedProfile: BusinessProfile = {
        ...state.businessProfile,
        industry: preset.id,
        defaultVatRate: preset.defaultVatRate,
        invoicePrefix: preset.invoicePrefix,
        receiptFooter: preset.receiptFooter,
        terminology: { ...preset.terminology },
      };
      return {
        ...state,
        businessProfile: updatedProfile,
        // Sample catalogs must be deep-copied so editing a product never mutates the preset.
        products:
          action.payload.loadSampleCatalog && preset.sampleProducts.length > 0
            ? preset.sampleProducts.map(p => ({ ...p }))
            : state.products,
        cart: [],
      };
    }
    case 'CREATE_SNAPSHOT':
      return { ...state, snapshots: [buildSnapshot(state, action.payload.name), ...state.snapshots] };
    case 'DELETE_SNAPSHOT':
      return { ...state, snapshots: state.snapshots.filter(s => s.id !== action.payload) };
    case 'RESTORE_DATABASE': {
      const incoming = action.payload;
      return {
        ...state,
        businessProfile: incoming.businessProfile || state.businessProfile,
        products: incoming.products || state.products,
        customers: incoming.customers || state.customers,
        transactions: incoming.transactions || state.transactions,
        accounts: incoming.accounts || state.accounts,
        journalEntries: incoming.journalEntries || state.journalEntries,
        shifts: incoming.shifts || state.shifts,
        employees: incoming.employees || state.employees,
        payrollRuns: incoming.payrollRuns || state.payrollRuns,
        users: incoming.users || state.users,
        // The signed-in account may no longer exist after a restore.
        currentUser: incoming.users
          ? incoming.users.find(u => u.id === state.currentUser?.id) ?? incoming.users.find(u => u.role === 'admin') ?? null
          : state.currentUser,
        cart: [],
      };
    }
    case 'RESET_DATABASE':
      return {
        ...initialState,
        hydrated: true,
        currentUser: state.currentUser,
        isLoggedIn: state.isLoggedIn,
        currentPage: state.currentPage,
        // Keep the user's own backups across a factory reset.
        snapshots: state.snapshots,
      };
    case 'TOGGLE_AI':
      return { ...state, aiOpen: action.payload !== undefined ? action.payload : !state.aiOpen };
    default:
      return state;
  }
}

/** The persisted slice of state. Transient UI state is intentionally excluded. */
type PersistedState = Pick<AppState,
  | 'products' | 'customers' | 'transactions' | 'accounts' | 'journalEntries'
  | 'shifts' | 'employees' | 'payrollRuns' | 'users' | 'businessProfile' | 'snapshots'>;

function toPersisted(state: AppState): PersistedState {
  return {
    products: state.products,
    customers: state.customers,
    transactions: state.transactions,
    accounts: state.accounts,
    journalEntries: state.journalEntries,
    shifts: state.shifts,
    employees: state.employees,
    payrollRuns: state.payrollRuns,
    users: state.users,
    businessProfile: state.businessProfile,
    snapshots: state.snapshots,
  };
}

const yearRange = currentYearRange();

const initialState: AppState = {
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  products: initialProducts,
  cart: [],
  customers: initialCustomers,
  transactions: initialTransactions,
  accounts: initialAccounts,
  journalEntries: initialJournalEntries,
  searchQuery: '',
  reportDateFrom: yearRange.from,
  reportDateTo: yearRange.to,
  reportSortBy: 'date',
  reportSortDir: 'desc',
  shifts: initialShifts,
  employees: initialEmployees,
  payrollRuns: initialPayrollRuns,
  users: SEED_USERS,
  // The app starts signed out. The original build started signed in as the seeded
  // administrator, so anyone who opened the till had full access with no login.
  currentUser: null,
  isLoggedIn: false,
  businessProfile: DEFAULT_BUSINESS_PROFILE,
  snapshots: [
    {
      id: 'snap-initial',
      name: 'Factory Initial SQL Seed (ZAR)',
      createdAt: '2025-03-22T08:00:00.000Z',
      sizeBytes: 18420,
      recordCount:
        initialProducts.length +
        initialCustomers.length +
        initialTransactions.length +
        initialAccounts.length +
        initialJournalEntries.length +
        initialShifts.length +
        initialEmployees.length +
        initialPayrollRuns.length +
        SEED_USERS.length,
      dataJson: JSON.stringify({
        businessProfile: DEFAULT_BUSINESS_PROFILE,
        products: initialProducts,
        customers: initialCustomers,
        transactions: initialTransactions,
        accounts: initialAccounts,
        journalEntries: initialJournalEntries,
        shifts: initialShifts,
        employees: initialEmployees,
        payrollRuns: initialPayrollRuns,
        users: SEED_USERS,
      }),
    },
  ],
  aiOpen: false,
  hydrated: false,
};

/** Normalises a persisted blob so missing/older fields can never crash a page. */
function normalisePersisted(raw: unknown): Partial<AppState> {
  if (!raw || typeof raw !== 'object') return {};
  const parsed = raw as Record<string, unknown>;
  const patch: Partial<AppState> = {};

  const arrays: (keyof PersistedState)[] = [
    'products', 'customers', 'transactions', 'accounts', 'journalEntries',
    'shifts', 'employees', 'payrollRuns', 'users', 'snapshots',
  ];
  for (const key of arrays) {
    const value = parsed[key as string];
    if (Array.isArray(value)) {
      (patch as Record<string, unknown>)[key] = value;
    }
  }

  if (parsed.businessProfile && typeof parsed.businessProfile === 'object') {
    patch.businessProfile = {
      ...DEFAULT_BUSINESS_PROFILE,
      ...(parsed.businessProfile as BusinessProfile),
      terminology: {
        ...DEFAULT_BUSINESS_PROFILE.terminology,
        ...((parsed.businessProfile as BusinessProfile).terminology || {}),
      },
    };
  }

  return patch;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimer = useRef<number | null>(null);

  // One-time hydration: IndexedDB first, then the legacy localStorage blob.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const fromDb = await loadState<unknown>(LOCAL_STORE_CONFIG);
      const legacy = fromDb ?? readLegacyLocalStorage<unknown>(LOCAL_STORE_CONFIG);
      if (cancelled) return;
      const patch = normalisePersisted(legacy);
      if (fromDb === null && legacy) {
        // Migrate the legacy blob into IndexedDB so the next start is fast.
        await saveState(legacy, LOCAL_STORE_CONFIG);
        appendAudit('migrate', 'Imported legacy localStorage dataset into IndexedDB.');
      }
      dispatch({ type: 'HYDRATE', payload: patch });
    })();

    return () => { cancelled = true; };
  }, []);

  // Debounced persistence: a busy till would otherwise hit storage on every keystroke.
  useEffect(() => {
    if (!state.hydrated) return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    const payload = toPersisted(state);
    saveTimer.current = window.setTimeout(() => {
      saveState(payload, LOCAL_STORE_CONFIG).then(ok => {
        // Keep localStorage in sync only as a fallback copy.
        if (!ok) writeLegacyLocalStorage(payload, LOCAL_STORE_CONFIG);
      });
    }, 250);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [
    state.hydrated,
    state.products,
    state.customers,
    state.transactions,
    state.accounts,
    state.journalEntries,
    state.shifts,
    state.employees,
    state.payrollRuns,
    state.users,
    state.businessProfile,
    state.snapshots,
  ]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export { verifyPassword, hashPassword, createSalt, validateBackupPayload, clearState, localDate, localDateTime };
