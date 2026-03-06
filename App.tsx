
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  ArrowLeft, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Upload, 
  Moon, 
  Sun,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  X,
  RefreshCw,
  Edit2,
  MoreHorizontal,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  AppState, 
  GoldCategory, 
  GoldRecord, 
  FixedDeposit, 
  NavigationPage, 
  SortField, 
  SortOrder,
  TransactionType
} from './types.ts';

const STORAGE_KEY = 'ios_invest_tracker_v21';
const PHYSICAL_GOLD_NAME = "实体黄金";

// 格式化数值工具
const f2 = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface DataState {
  goldCategories: GoldCategory[];
  fixedDeposits: FixedDeposit[];
  referenceGoldPrice: number;
  referenceUsdRate: number;
}

const App: React.FC = () => {
  const [data, setData] = useState<DataState>({
    goldCategories: [],
    fixedDeposits: [],
    referenceGoldPrice: 550,
    referenceUsdRate: 7.0,
  });
  const [history, setHistory] = useState<DataState[]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);

  const [currentPage, setCurrentPage] = useState<NavigationPage>('home');
  const [darkMode, setDarkMode] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [tempPrice, setTempPrice] = useState('');
  const [showUsdRateModal, setShowUsdRateModal] = useState(false);
  const [tempUsdRate, setTempUsdRate] = useState('');
  const [fdSort, setFdSort] = useState<{ field: SortField, order: SortOrder }>({ field: 'startDate', order: 'desc' });
  const [isInitialized, setIsInitialized] = useState(false);

  // Modals state
  const [recordMenu, setRecordMenu] = useState<{ catId: string, record: GoldRecord } | null>(null);
  const [editForm, setEditForm] = useState<{ catId: string, record: GoldRecord } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ catId: string, recordId: string } | null>(null);
  const [fdMenu, setFdMenu] = useState<FixedDeposit | null>(null);
  const [fdEditForm, setFdEditForm] = useState<FixedDeposit | null>(null);
  const [fdDeleteConfirm, setFdDeleteConfirm] = useState<string | null>(null);
  const [withdrawMenu, setWithdrawMenu] = useState<FixedDeposit | null>(null);
  const [editCat, setEditCat] = useState<GoldCategory | null>(null);
  const [entryModal, setEntryModal] = useState<{
    show: boolean;
    type: 'GOLD_CAT' | 'GOLD_REC' | 'FD';
    title: string;
    catId?: string;
    recType?: TransactionType;
    currency?: 'CNY' | 'USD';
  }>({ show: false, type: 'GOLD_CAT', title: '' });

  // 手势支持
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const edgeThreshold = 44; 
    const swipeThreshold = 80;
    const isModalOpen = showSettings || showPriceModal || entryModal.show || recordMenu || editForm || deleteConfirm || fdMenu || fdEditForm || fdDeleteConfirm || withdrawMenu || editCat;
    if (!isModalOpen && currentPage !== 'home' && touchStartX.current < edgeThreshold && deltaX > swipeThreshold) {
      if (currentPage === 'expiredFd') setCurrentPage('fd');
      else setCurrentPage('home');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let initialData: DataState;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initialData = {
          goldCategories: parsed.goldCategories || [],
          fixedDeposits: parsed.fixedDeposits || [],
          referenceGoldPrice: parsed.referenceGoldPrice ?? 550,
          referenceUsdRate: parsed.referenceUsdRate ?? 7.0,
        };
        setDarkMode(parsed.darkMode ?? true);
        setFdSort(parsed.fixedDepositSort ?? { field: 'startDate', order: 'desc' });
      } catch (e) {
        initialData = { goldCategories: [], fixedDeposits: [], referenceGoldPrice: 550, referenceUsdRate: 7.0 };
      }
    } else {
      initialData = { goldCategories: [], fixedDeposits: [], referenceGoldPrice: 550, referenceUsdRate: 7.0 };
    }
    if (!initialData.goldCategories.find(c => c.name === PHYSICAL_GOLD_NAME)) {
      initialData.goldCategories.unshift({ id: 'physical-gold-default', name: PHYSICAL_GOLD_NAME, records: [], isExpanded: true });
    }
    setData(initialData);
    setHistory([initialData]);
    setHistoryPointer(0);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      const currentFullState = { ...data, darkMode, fixedDepositSort: fdSort };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentFullState));
    }
  }, [data, darkMode, fdSort, isInitialized]);

  // 同步系统 UI 颜色
  useEffect(() => {
    const meta = document.getElementById('theme-color-meta');
    if (darkMode) {
      document.documentElement.classList.add('dark');
      meta?.setAttribute('content', '#000000');
    } else {
      document.documentElement.classList.remove('dark');
      meta?.setAttribute('content', '#f2f2f7');
    }
  }, [darkMode]);

  const updateData = useCallback((updater: DataState | ((prev: DataState) => DataState)) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const newHistory = history.slice(0, historyPointer + 1);
      newHistory.push(next);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryPointer(newHistory.length - 1);
      return next;
    });
  }, [history, historyPointer]);

  const undo = () => { if (historyPointer > 0) { const next = historyPointer - 1; setData(history[next]); setHistoryPointer(next); } };
  const redo = () => { if (historyPointer < history.length - 1) { const next = historyPointer + 1; setData(history[next]); setHistoryPointer(next); } };

  const goldAnalysis = useMemo(() => {
    return data.goldCategories.map(cat => {
      let weight = 0; let realizedProfit = 0; let costBasis = 0;
      const sorted = [...cat.records].sort((a,b) => a.date.localeCompare(b.date));
      sorted.forEach(r => {
        if (r.type === 'BUY') {
          const newWeight = weight + r.weight;
          costBasis = newWeight > 0 ? (costBasis * weight + r.total) / newWeight : 0;
          weight = newWeight;
        } else {
          const profit = (r.price - costBasis) * r.weight;
          const fee = r.fee || 0;
          realizedProfit += profit - fee;
          weight -= r.weight;
        }
      });
      const displayProfit = cat.name === PHYSICAL_GOLD_NAME ? (weight > 0 ? (data.referenceGoldPrice - costBasis) * weight : 0) : realizedProfit;
      return { id: cat.id, name: cat.name, currentWeight: weight, realizedProfit: displayProfit, valuation: weight * data.referenceGoldPrice };
    });
  }, [data.goldCategories, data.referenceGoldPrice]);

  const goldTotalValue = useMemo(() => goldAnalysis.reduce((acc, curr) => acc + curr.valuation, 0), [goldAnalysis]);
  const activeFd = useMemo(() => data.fixedDeposits.filter(f => !f.isWithdrawn), [data.fixedDeposits]);
  const fdTotalValue = useMemo(() => activeFd.reduce((acc, curr) => acc + curr.amount, 0), [activeFd]);
  const totalAssets = useMemo(() => goldTotalValue + fdTotalValue, [goldTotalValue, fdTotalValue]);

  const assetRatios = useMemo(() => {
    if (totalAssets === 0) return { gold: 0, fd: 0 };
    return { gold: (goldTotalValue / totalAssets) * 100, fd: (fdTotalValue / totalAssets) * 100 };
  }, [goldTotalValue, fdTotalValue, totalAssets]);

  const getPageStyle = (page: NavigationPage): React.CSSProperties => {
    const levels: Record<NavigationPage, number> = {
      home: 0,
      gold: 1,
      fd: 1,
      usdFd: 1,
      expiredFd: 2
    };
    const curLevel = levels[currentPage];
    const targetLevel = levels[page];
    
    let transform = 'translateX(100%)';
    let zIndex = 10;
    let pointerEvents: 'auto' | 'none' = 'none';

    if (page === currentPage) {
      transform = 'translateX(0)';
      zIndex = 30;
      pointerEvents = 'auto';
    } else if (targetLevel < curLevel) {
      // 背景层级逻辑：确保上一级页面保持在 -30%
      if (currentPage === 'expiredFd') {
        if (page === 'fd' || page === 'usdFd') {
          transform = 'translateX(-30%)';
          zIndex = 20;
        } else if (page === 'home') {
          transform = 'translateX(-60%)';
          zIndex = 10;
        }
      } else if (curLevel === 1 && page === 'home') {
        transform = 'translateX(-30%)';
        zIndex = 20;
      }
    }
    return { transform, zIndex, pointerEvents, position: 'absolute', inset: 0, width: '100%', height: '100%', transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)' };
  };

  const inputStyle = "w-full box-border block bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl outline-none text-main border-none text-left appearance-none min-h-[56px] text-base pr-16";

  const SuffixInput = ({ value, onChange, placeholder, suffix, type = "text", autoFocus = false }: any) => (
    <div className="relative flex items-center">
      <input value={value} onChange={onChange} type={type} placeholder={placeholder} className={inputStyle} autoFocus={autoFocus} />
      <span className="absolute right-4 text-xs font-bold text-tertiary pointer-events-none uppercase">{suffix}</span>
    </div>
  );

  const DataEntryModal = () => {
    const [v1, setV1] = useState(''); const [v2, setV2] = useState(''); 
    const [v3, setV3] = useState(''); const [v4, setV4] = useState('');
    const [v5, setV5] = useState(new Date().toISOString().split('T')[0]); const [v6, setV6] = useState('');
    const isPhysicalGold = entryModal.catId && data.goldCategories.find(c => c.id === entryModal.catId)?.name === PHYSICAL_GOLD_NAME;
    const currency = entryModal.currency || 'CNY';
    if (!entryModal.show) return null;
    const handleSave = () => {
      if (entryModal.type === 'GOLD_CAT') {
        if (!v1) return;
        updateData(d => ({ ...d, goldCategories: [...d.goldCategories, { id: crypto.randomUUID(), name: v1, records: [], isExpanded: true }] }));
      } else if (entryModal.type === 'GOLD_REC') {
        if (entryModal.recType === 'BUY') {
          let w = parseFloat(v2); let p = parseFloat(v3); let t = parseFloat(v4);
          if (isPhysicalGold) {
            if (isNaN(w) || isNaN(p) || !v5) return;
            t = w * p;
          } else {
            if ((isNaN(w) && isNaN(p) && isNaN(t)) || !v5) return;
            if (!isNaN(w) && !isNaN(p)) {
              t = w * p;
            } else if (!isNaN(w) && !isNaN(t)) {
              p = t / w;
            } else if (!isNaN(p) && !isNaN(t)) {
              w = t / p;
            }
          }
          updateData(d => ({ ...d, goldCategories: d.goldCategories.map(c => c.id === entryModal.catId ? { ...c, records: [...c.records, { id: crypto.randomUUID(), type: entryModal.recType!, weight: w, price: p, date: v5, total: t }] } : c) }));
        } else {
          let w = parseFloat(v2); let p = parseFloat(v3); let t = parseFloat(v4); let fee = parseFloat(v6) || 0;
          if (isPhysicalGold) {
            if (isNaN(w) || isNaN(p) || !v5) return;
            t = w * p;
          } else {
            if ((isNaN(w) && isNaN(t)) || !v5) return;
            if (!isNaN(w) && !isNaN(p)) {
              t = w * p;
            } else if (!isNaN(w) && !isNaN(t)) {
              p = t / w;
            } else if (!isNaN(p) && !isNaN(t)) {
              w = t / p;
            }
          }
          updateData(d => ({ ...d, goldCategories: d.goldCategories.map(c => c.id === entryModal.catId ? { ...c, records: [...c.records, { id: crypto.randomUUID(), type: entryModal.recType!, weight: w, price: p, date: v5, total: t, fee }] } : c) }));
        }
      } else if (entryModal.type === 'FD') {
        const amt = parseFloat(v2); const rate = parseFloat(v3); const months = parseInt(v4);
        if (!v1 || isNaN(amt) || isNaN(rate) || isNaN(months) || !v5) return;
        const d_end = new Date(v5); d_end.setMonth(d_end.getMonth() + months);
        updateData(d => ({ ...d, fixedDeposits: [...d.fixedDeposits, { id: crypto.randomUUID(), bank: v1, amount: amt, annualRate: rate, durationMonths: months, startDate: v5, endDate: d_end.toISOString().split('T')[0], interest: amt * (rate/100) * (months/12), currency }] }));
      }
      setEntryModal({ ...entryModal, show: false });
    };
    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/60 ios-blur" onClick={() => setEntryModal({ ...entryModal, show: false })}></div>
        <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative transition-all flex flex-col items-stretch">
          <h3 className="text-xl font-bold mb-6 text-main text-center">{entryModal.title}</h3>
          <div className="flex flex-col gap-4 w-full overflow-hidden">
            {(entryModal.type === 'GOLD_CAT' || entryModal.type === 'FD') && (
              <SuffixInput value={v1} onChange={(e: any) => setV1(e.target.value)} placeholder={entryModal.type === 'FD' ? "银行名称" : "模块名称 (如: ETF)"} suffix={entryModal.type === 'FD' ? "BANK" : "TAG"} autoFocus />
            )}
            {(entryModal.type === 'GOLD_REC' || entryModal.type === 'FD') && (
              <SuffixInput value={v2} onChange={(e: any) => setV2(e.target.value)} type="number" placeholder={entryModal.type === 'FD' ? "存入金额" : (entryModal.recType === 'BUY' ? "买入克重" : "卖出克重")} suffix={entryModal.type === 'FD' ? (currency === 'USD' ? "USD" : "元") : "克(g)"} />
            )}
            {(entryModal.type === 'GOLD_REC' || entryModal.type === 'FD') && (
              <SuffixInput value={v3} onChange={(e: any) => setV3(e.target.value)} type="number" step="0.01" placeholder={entryModal.type === 'FD' ? "年化利率" : "单价"} suffix={entryModal.type === 'FD' ? "%" : "元/g"} />
            )}
            {entryModal.type === 'GOLD_REC' && !isPhysicalGold && (
              <SuffixInput value={v4} onChange={(e: any) => setV4(e.target.value)} type="number" step="0.01" placeholder={entryModal.recType === 'BUY' ? "买入总价" : "卖出金额"} suffix="元" />
            )}
            {entryModal.type === 'GOLD_REC' && entryModal.recType === 'SELL' && !isPhysicalGold && (
              <SuffixInput value={v6} onChange={(e: any) => setV6(e.target.value)} type="number" step="0.01" placeholder="手续费" suffix="元" />
            )}
            {entryModal.type === 'FD' && ( <SuffixInput value={v4} onChange={(e: any) => setV4(e.target.value)} type="number" placeholder="存期 (月)" suffix="月" /> )}
            {(entryModal.type === 'GOLD_REC' || entryModal.type === 'FD') && ( <SuffixInput value={v5} onChange={(e: any) => setV5(e.target.value)} type="date" suffix="DATE" /> )}
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={() => setEntryModal({ ...entryModal, show: false })} className="flex-1 py-4 rounded-2xl font-bold text-secondary bg-gray-100 dark:bg-gray-800 active:scale-[0.98]">取消</button>
            <button onClick={handleSave} className="flex-1 py-4 rounded-2xl font-bold text-white bg-blue-600 active:scale-[0.98]">确认</button>
          </div>
        </div>
      </div>
    );
  };

  const GoldRecordModals = () => {
    const [editW, setEditW] = useState(''); const [editP, setEditP] = useState(''); const [editD, setEditD] = useState('');
    const [editT, setEditT] = useState(''); const [editFee, setEditFee] = useState('');
    const isPhysicalGold = editForm && data.goldCategories.find(c => c.id === editForm.catId)?.name === PHYSICAL_GOLD_NAME;
    useEffect(() => { 
      if (editForm) { 
        setEditW(editForm.record.weight.toString()); 
        setEditP(editForm.record.price.toString()); 
        setEditD(editForm.record.date);
        setEditT(editForm.record.total.toString());
        setEditFee(editForm.record.fee?.toString() || '');
      } 
    }, [editForm]);
    const handleUpdateRecord = () => {
      if (!editForm) return;
      if (editForm.record.type === 'BUY') {
        let w = parseFloat(editW); let p = parseFloat(editP); let t = parseFloat(editT);
        if (isPhysicalGold) {
          if (isNaN(w) || isNaN(p) || !editD) return;
          t = w * p;
        } else {
          if ((isNaN(w) && isNaN(p) && isNaN(t)) || !editD) return;
          if (!isNaN(w) && !isNaN(p)) {
            t = w * p;
          } else if (!isNaN(w) && !isNaN(t)) {
            p = t / w;
          } else if (!isNaN(p) && !isNaN(t)) {
            w = t / p;
          }
        }
        updateData(d => ({ ...d, goldCategories: d.goldCategories.map(c => c.id === editForm.catId ? { ...c, records: c.records.map(r => r.id === editForm.record.id ? { ...r, weight: w, price: p, date: editD, total: t } : r) } : c) }));
      } else {
        let w = parseFloat(editW); let p = parseFloat(editP); let t = parseFloat(editT); let fee = parseFloat(editFee) || 0;
        if (isPhysicalGold) {
          if (isNaN(w) || isNaN(p) || !editD) return;
          t = w * p;
        } else {
          if ((isNaN(w) && isNaN(t)) || !editD) return;
          if (!isNaN(w) && !isNaN(p)) {
            t = w * p;
          } else if (!isNaN(w) && !isNaN(t)) {
            p = t / w;
          } else if (!isNaN(p) && !isNaN(t)) {
            w = t / p;
          }
        }
        updateData(d => ({ ...d, goldCategories: d.goldCategories.map(c => c.id === editForm.catId ? { ...c, records: c.records.map(r => r.id === editForm.record.id ? { ...r, weight: w, price: p, date: editD, total: t, fee } : r) } : c) }));
      }
      setEditForm(null);
    };
    const handleDeleteRecord = () => {
      if (!deleteConfirm) return;
      updateData(d => ({ ...d, goldCategories: d.goldCategories.map(c => c.id === deleteConfirm.catId ? { ...c, records: c.records.filter(r => r.id !== deleteConfirm.recordId) } : c) }));
      setDeleteConfirm(null); setRecordMenu(null);
    };
    return (
      <>
        {recordMenu && !editForm && !deleteConfirm && (
          <div className="fixed inset-0 z-[600] flex items-end justify-center pb-12 px-6">
            <div className="absolute inset-0 bg-black/60 ios-blur" onClick={() => setRecordMenu(null)}></div>
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
              <button onClick={() => setRecordMenu(null)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-secondary"><X size={20}/></button>
              <h3 className="text-xl font-bold mb-6 text-main text-center">记录详情</h3>
              <div className="space-y-3">
                <button onClick={() => setEditForm(recordMenu)} className="w-full flex items-center justify-between p-5 bg-gray-50 dark:bg-[#2c2c2e] rounded-2xl active:scale-[0.98]">
                  <div className="flex items-center gap-3"><Edit2 size={20} className="text-blue-500"/><span className="font-bold text-main">修改记录</span></div>
                  <ChevronRight size={20} className="text-tertiary"/>
                </button>
                <button onClick={() => setDeleteConfirm({ catId: recordMenu.catId, recordId: recordMenu.record.id })} className="w-full flex items-center justify-between p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl active:scale-[0.98]">
                  <div className="flex items-center gap-3"><Trash2 size={20} className="text-red-500"/><span className="font-bold text-red-500">删除记录</span></div>
                  <ChevronRight size={20} className="text-red-300"/>
                </button>
              </div>
            </div>
          </div>
        )}
        {editForm && (
          <div className="fixed inset-0 z-[601] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 ios-blur" onClick={() => setEditForm(null)}></div>
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
              <h3 className="text-xl font-bold mb-6 text-main text-center">修改交易</h3>
              <div className="flex flex-col gap-4">
                <SuffixInput value={editW} onChange={(e: any) => setEditW(e.target.value)} type="number" placeholder="重量" suffix="克(g)" />
                <SuffixInput value={editP} onChange={(e: any) => setEditP(e.target.value)} type="number" step="0.01" placeholder="单价" suffix="元/g" />
                {!isPhysicalGold && (
                  <SuffixInput value={editT} onChange={(e: any) => setEditT(e.target.value)} type="number" step="0.01" placeholder={editForm.record.type === 'BUY' ? "买入总价" : "卖出金额"} suffix="元" />
                )}
                {editForm.record.type === 'SELL' && !isPhysicalGold && (
                  <SuffixInput value={editFee} onChange={(e: any) => setEditFee(e.target.value)} type="number" step="0.01" placeholder="手续费" suffix="元" />
                )}
                <SuffixInput value={editD} onChange={(e: any) => setEditD(e.target.value)} type="date" suffix="DATE" />
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setEditForm(null)} className="flex-1 py-4 rounded-2xl font-bold text-secondary bg-gray-100 dark:bg-gray-800 active:scale-[0.98]">取消</button>
                <button onClick={handleUpdateRecord} className="flex-1 py-4 rounded-2xl font-bold text-white bg-blue-600 active:scale-[0.98]">保存</button>
              </div>
            </div>
          </div>
        )}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[602] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 ios-blur" onClick={() => setDeleteConfirm(null)}></div>
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-xs rounded-[32px] p-6 shadow-2xl relative text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><Trash2 size={32}/></div>
              <h3 className="text-lg font-bold text-main mb-2">确认删除？</h3>
              <p className="text-xs text-secondary mb-8">删除后数据将无法恢复。</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDeleteRecord} className="w-full py-4 rounded-2xl font-bold text-white bg-red-500 active:scale-[0.98]">确认删除</button>
                <button onClick={() => setDeleteConfirm(null)} className="w-full py-4 rounded-2xl font-bold text-secondary bg-gray-100 dark:bg-gray-800 active:scale-[0.98]">取消</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const FDModals = () => {
    const [vBank, setVBank] = useState(''); const [vAmt, setVAmt] = useState(''); const [vRate, setVRate] = useState(''); const [vDur, setVDur] = useState(''); const [vDate, setVDate] = useState('');
    useEffect(() => { if (fdEditForm) { setVBank(fdEditForm.bank); setVAmt(fdEditForm.amount.toString()); setVRate(fdEditForm.annualRate.toString()); setVDur(fdEditForm.durationMonths.toString()); setVDate(fdEditForm.startDate); } }, [fdEditForm]);
    const handleUpdateFD = () => {
      if (!fdEditForm) return;
      const amt = parseFloat(vAmt); const rate = parseFloat(vRate); const months = parseInt(vDur);
      if (!vBank || isNaN(amt) || isNaN(rate) || isNaN(months) || !vDate) return;
      const d_end = new Date(vDate); d_end.setMonth(d_end.getMonth() + months);
      updateData(d => ({ ...d, fixedDeposits: d.fixedDeposits.map(f => f.id === fdEditForm.id ? { ...f, bank: vBank, amount: amt, annualRate: rate, durationMonths: months, startDate: vDate, endDate: d_end.toISOString().split('T')[0], interest: amt * (rate/100) * (months/12) } : f) }));
      setFdEditForm(null);
    };
    const handleDeleteFD = () => { if (fdDeleteConfirm) { updateData(d => ({ ...d, fixedDeposits: d.fixedDeposits.filter(f => f.id !== fdDeleteConfirm) })); setFdDeleteConfirm(null); setFdMenu(null); } };
    const handleWithdrawn = () => { if (withdrawMenu) { updateData(d => ({ ...d, fixedDeposits: d.fixedDeposits.map(f => f.id === withdrawMenu.id ? { ...f, isWithdrawn: true } : f) })); setWithdrawMenu(null); } };
    return (
      <>
        {fdMenu && !fdEditForm && !fdDeleteConfirm && (
          <div className="fixed inset-0 z-[600] flex items-end justify-center pb-12 px-6">
            <div className="absolute inset-0 bg-black/60 ios-blur" onClick={() => setFdMenu(null)}></div>
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
              <button onClick={() => setFdMenu(null)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-secondary"><X size={20}/></button>
              <h3 className="text-xl font-bold mb-6 text-main text-center">存单详情</h3>
              <div className="space-y-3">
                <button onClick={() => setFdEditForm(fdMenu)} className="w-full flex items-center justify-between p-5 bg-gray-50 dark:bg-[#2c2c2e] rounded-2xl active:scale-[0.98]">
                  <div className="flex items-center gap-3"><Edit2 size={20} className="text-blue-500"/><span className="font-bold text-main">修改存单</span></div>
                  <ChevronRight size={20} className="text-tertiary"/>
                </button>
                <button onClick={() => setFdDeleteConfirm(fdMenu.id)} className="w-full flex items-center justify-between p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl active:scale-[0.98]">
                  <div className="flex items-center gap-3"><Trash2 size={20} className="text-red-500"/><span className="font-bold text-red-500">删除存单</span></div>
                  <ChevronRight size={20} className="text-red-300"/>
                </button>
              </div>
            </div>
          </div>
        )}
        {withdrawMenu && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 ios-blur" onClick={() => setWithdrawMenu(null)}></div>
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-xs rounded-[32px] p-6 shadow-2xl relative text-center">
              <AlertTriangle className="mx-auto text-yellow-500 mb-4" size={48} />
              <h3 className="text-xl font-bold text-main mb-2">是否已取出？</h3>
              <p className="text-xs text-secondary mb-8 leading-relaxed">存单已到期，确认取出后将移至存档页面并扣除资产估值。</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleWithdrawn} className="w-full py-4 rounded-2xl font-bold text-white bg-blue-600 active:scale-[0.98]">已取出</button>
                <button onClick={() => setWithdrawMenu(null)} className="w-full py-4 rounded-2xl font-bold text-secondary bg-gray-100 dark:bg-gray-800 active:scale-[0.98]">取消</button>
              </div>
            </div>
          </div>
        )}
        {fdEditForm && (
          <div className="fixed inset-0 z-[601] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 ios-blur" onClick={() => setFdEditForm(null)}></div>
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
              <h3 className="text-xl font-bold mb-6 text-main text-center">修改存单</h3>
              <div className="flex flex-col gap-4">
                <SuffixInput value={vBank} onChange={(e: any) => setVBank(e.target.value)} placeholder="银行名称" suffix="BANK" />
                <SuffixInput value={vAmt} onChange={(e: any) => setVAmt(e.target.value)} type="number" placeholder="金额" suffix={fdEditForm.currency === 'CNY' ? "元" : "$"} />
                <SuffixInput value={vRate} onChange={(e: any) => setVRate(e.target.value)} type="number" step="0.01" placeholder="利率" suffix="%" />
                <SuffixInput value={vDur} onChange={(e: any) => setVDur(e.target.value)} type="number" placeholder="存期" suffix="月" />
                <SuffixInput value={vDate} onChange={(e: any) => setVDate(e.target.value)} type="date" suffix="DATE" />
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setFdEditForm(null)} className="flex-1 py-4 rounded-2xl font-bold text-secondary bg-gray-100 dark:bg-gray-800 active:scale-[0.98]">取消</button>
                <button onClick={handleUpdateFD} className="flex-1 py-4 rounded-2xl font-bold text-white bg-blue-600 active:scale-[0.98]">保存</button>
              </div>
            </div>
          </div>
        )}
        {fdDeleteConfirm && (
          <div className="fixed inset-0 z-[602] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 ios-blur" onClick={() => setFdDeleteConfirm(null)}></div>
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-xs rounded-[32px] p-6 shadow-2xl relative text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><Trash2 size={32}/></div>
              <h3 className="text-lg font-bold text-main mb-2">确认删除？</h3>
              <p className="text-xs text-secondary mb-8">删除后数据将无法恢复。</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDeleteFD} className="w-full py-4 rounded-2xl font-bold text-white bg-red-500 active:scale-[0.98]">确认删除</button>
                <button onClick={() => setFdDeleteConfirm(null)} className="w-full py-4 rounded-2xl font-bold text-secondary bg-gray-100 dark:bg-gray-800 active:scale-[0.98]">取消</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const GoldCatModals = () => {
    const [newName, setNewName] = useState('');
    useEffect(() => { if (editCat) setNewName(editCat.name); }, [editCat]);
    const handleRename = () => { if (editCat && newName) { updateData(d => ({ ...d, goldCategories: d.goldCategories.map(c => c.id === editCat.id ? { ...c, name: newName } : c) })); setEditCat(null); } };
    if (!editCat) return null;
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/60 ios-blur" onClick={() => setEditCat(null)}></div>
        <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
          <h3 className="text-xl font-bold mb-6 text-main text-center">板块管理</h3>
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-2 ml-1">修改名称</p>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl outline-none text-main font-bold border-none" placeholder="板块名称"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { if (confirm("确定删除整个板块及其所有记录？")) { updateData(d => ({ ...d, goldCategories: d.goldCategories.filter(c => c.id !== editCat.id) })); setEditCat(null); } }} className="flex-1 py-4 rounded-2xl font-bold text-red-500 bg-red-50 dark:bg-red-900/20 active:scale-[0.98] flex items-center justify-center gap-2"><Trash2 size={18}/>删除</button>
              <button onClick={handleRename} className="flex-1 py-4 rounded-2xl font-bold text-white bg-blue-600 active:scale-[0.98]">确认修改</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NavBar = ({ title, back, onBack }: { title: string; back?: boolean; onBack?: () => void }) => (
    <div className="flex-none safe-top bg-white/80 dark:bg-black/80 ios-blur border-b border-gray-200 dark:border-gray-800 transition-colors z-[100]">
      <div className="px-6 py-4 flex items-center justify-between min-h-[64px]">
        <div className="flex items-center gap-2">
          {back && <button onClick={onBack || (() => setCurrentPage('home'))} className="text-blue-500 p-1 -ml-2 active:scale-95 active:opacity-40 transition-all"><ArrowLeft size={24} /></button>}
          <h1 className="text-2xl font-black text-main tracking-tight">{title}</h1>
          <button onClick={() => setIsPrivate(!isPrivate)} className="text-secondary ml-1 p-1 active:scale-90 transition-transform"> {isPrivate ? <EyeOff size={18} /> : <Eye size={18} />} </button>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={undo} disabled={historyPointer <= 0} className="text-blue-500 disabled:opacity-20 active:scale-95"><RotateCcw size={22} /></button>
          <button onClick={redo} disabled={historyPointer >= history.length - 1} className="text-blue-500 disabled:opacity-20 active:scale-95"><RotateCw size={22} /></button>
          <button onClick={() => setShowSettings(true)} className="text-blue-500 active:scale-95 active:opacity-40"><Settings size={22} /></button>
        </div>
      </div>
    </div>
  );

  const Home = () => {
    const cnyFd = useMemo(() => data.fixedDeposits.filter(f => f.currency === 'CNY' && !f.isWithdrawn), [data.fixedDeposits]);
    const usdFd = useMemo(() => data.fixedDeposits.filter(f => f.currency === 'USD' && !f.isWithdrawn), [data.fixedDeposits]);
    const cnyFdTotalValue = useMemo(() => cnyFd.reduce((acc, curr) => acc + curr.amount, 0), [cnyFd]);
    const usdFdTotalValue = useMemo(() => usdFd.reduce((acc, curr) => acc + curr.amount, 0), [usdFd]);
    const usdFdTotalValueCny = useMemo(() => usdFdTotalValue * data.referenceUsdRate, [usdFdTotalValue, data.referenceUsdRate]);
    const totalFdValue = useMemo(() => cnyFdTotalValue + usdFdTotalValueCny, [cnyFdTotalValue, usdFdTotalValueCny]);
    const totalAssets = useMemo(() => goldTotalValue + totalFdValue, [goldTotalValue, totalFdValue]);
    const assetRatios = useMemo(() => {
      if (totalAssets === 0) return { gold: 0, cnyFd: 0, usdFd: 0 };
      return { 
        gold: (goldTotalValue / totalAssets) * 100, 
        cnyFd: (cnyFdTotalValue / totalAssets) * 100,
        usdFd: (usdFdTotalValueCny / totalAssets) * 100
      };
    }, [goldTotalValue, cnyFdTotalValue, usdFdTotalValueCny, totalAssets]);
    const goldDashArray = useMemo(() => {
      const radius = 35;
      const circumference = 2 * Math.PI * radius;
      return `${(assetRatios.gold / 100) * circumference} ${circumference}`;
    }, [assetRatios.gold]);
    const cnyFdDashArray = useMemo(() => {
      const radius = 35;
      const circumference = 2 * Math.PI * radius;
      return `${(assetRatios.cnyFd / 100) * circumference} ${circumference}`;
    }, [assetRatios.cnyFd]);
    const usdFdDashArray = useMemo(() => {
      const radius = 35;
      const circumference = 2 * Math.PI * radius;
      return `${(assetRatios.usdFd / 100) * circumference} ${circumference}`;
    }, [assetRatios.usdFd]);
    return (
      <div className="h-full flex flex-col bg-[#f2f2f7] dark:bg-black">
        <NavBar title="资产组合" />
        <div className="flex-1 overflow-y-auto p-5 space-y-7 pb-24 no-scrollbar">
          <div className="bg-white dark:bg-[#1c1c1e] p-7 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3"> <p className="text-xs text-secondary font-bold uppercase tracking-widest">已登记资产估值 (CNY)</p> </div>
                <div className={`flex items-baseline gap-1.5 mb-6 transition-all duration-300 ${isPrivate ? 'blur-lg' : ''}`}>
                  <span className="text-xl font-black text-tertiary">¥</span>
                  <p className="text-4xl font-black tracking-tighter text-main leading-tight"> {f2(totalAssets)} </p>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-[11px] font-bold text-secondary">黄金板块</span>
                    <span className={`text-[11px] font-black text-main ml-auto ${isPrivate ? 'blur-[3px]' : ''}`}>{f2(assetRatios.gold)}%</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-[11px] font-bold text-secondary">人民币存款</span>
                    <span className={`text-[11px] font-black text-main ml-auto ${isPrivate ? 'blur-[3px]' : ''}`}>{f2(assetRatios.cnyFd)}%</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-[11px] font-bold text-secondary">美元存款</span>
                    <span className={`text-[11px] font-black text-main ml-auto ${isPrivate ? 'blur-[3px]' : ''}`}>{f2(assetRatios.usdFd)}%</span>
                  </div>
                </div>
              </div>
              <div className={`relative w-32 h-32 flex items-center justify-center flex-shrink-0 transition-all duration-500 ${isPrivate ? 'blur-xl' : ''}`}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="35" fill="transparent" strokeWidth="15" className="stroke-gray-300 dark:stroke-gray-700" />
                  {/* Gold segment */}
                  <circle cx="50" cy="50" r="35" fill="transparent" strokeWidth="15" 
                    strokeDasharray={`${(assetRatios.gold / 100) * 2 * Math.PI * 35} ${2 * Math.PI * 35}`} 
                    strokeLinecap="round" className="stroke-amber-500 dark:stroke-amber-600 transition-all duration-700" 
                  />
                  {/* CNY FD segment */}
                  <circle cx="50" cy="50" r="35" fill="transparent" strokeWidth="15" 
                    strokeDasharray={`${(assetRatios.cnyFd / 100) * 2 * Math.PI * 35} ${2 * Math.PI * 35}`} 
                    strokeLinecap="round" className="stroke-blue-500 dark:stroke-blue-600 transition-all duration-700" 
                    style={{ strokeDashoffset: `-${(assetRatios.gold / 100) * 2 * Math.PI * 35}` }} 
                  />
                  {/* USD FD segment */}
                  <circle cx="50" cy="50" r="35" fill="transparent" strokeWidth="15" 
                    strokeDasharray={`${(assetRatios.usdFd / 100) * 2 * Math.PI * 35} ${2 * Math.PI * 35}`} 
                    strokeLinecap="round" className="stroke-green-500 dark:stroke-green-600 transition-all duration-700" 
                    style={{ strokeDashoffset: `-${((assetRatios.gold + assetRatios.cnyFd) / 100) * 2 * Math.PI * 35}` }} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center"> <span className="text-[8px] font-black text-tertiary uppercase tracking-tighter">RATIO</span> </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <p className="px-1 text-[11px] font-black text-secondary uppercase tracking-widest">版块概览</p>
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[34px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
              <button onClick={() => setCurrentPage('gold')} className="w-full p-6 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-900 transition-all active:scale-[0.99]">
                <div className="flex items-center gap-5 text-left">
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 font-black text-lg shadow-sm shadow-amber-500/10">Au</div>
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-xl text-main leading-none">黄金投资</p>
                    <div className="flex"> <div onClick={(e) => { e.stopPropagation(); setTempPrice(''); setShowPriceModal(true); }} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg text-[10px] font-black active:scale-95 transition-all">¥{f2(data.referenceGoldPrice)}/g</div> </div>
                    <p className={`text-xs text-secondary font-bold transition-all ${isPrivate ? 'blur-[4px]' : ''}`}>持仓: {f2(goldAnalysis.reduce((a,c)=>a+c.currentWeight, 0))}g</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-black text-2xl text-main transition-all tracking-tighter ${isPrivate ? 'blur-md' : ''}`}>¥{f2(goldTotalValue)}</p>
                  <ChevronRight className="text-tertiary" size={20} />
                </div>
              </button>
              <div className="mx-6 h-[1px] bg-gray-100 dark:bg-gray-800"></div>
              <button onClick={() => setCurrentPage('fd')} className="w-full p-6 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-900 transition-all active:scale-[0.99]">
                <div className="flex items-center gap-5 text-left">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg shadow-sm shadow-blue-500/10">CNY</div>
                  <div> <p className="font-bold text-xl text-main leading-none">人民币存款</p> <p className={`text-xs text-secondary font-bold mt-1 transition-all ${isPrivate ? 'blur-[4px]' : ''}`}>{cnyFd.length} 笔存单</p> </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-black text-2xl text-main transition-all tracking-tighter ${isPrivate ? 'blur-md' : ''}`}>¥{f2(cnyFdTotalValue)}</p>
                  <ChevronRight className="text-tertiary" size={20} />
                </div>
              </button>
              <div className="mx-6 h-[1px] bg-gray-100 dark:bg-gray-800"></div>
              <button onClick={() => setCurrentPage('usdFd')} className="w-full p-6 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-900 transition-all active:scale-[0.99]">
                <div className="flex items-center gap-5 text-left">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 font-black text-lg shadow-sm shadow-green-500/10">USD</div>
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-xl text-main leading-none">美元存款</p>
                    <div className="flex"> <div onClick={(e) => { e.stopPropagation(); setTempUsdRate(''); setShowUsdRateModal(true); }} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg text-[10px] font-black active:scale-95 transition-all">¥{f2(data.referenceUsdRate)}/$</div> </div>
                    <p className={`text-xs text-secondary font-bold transition-all ${isPrivate ? 'blur-[4px]' : ''}`}>{usdFd.length} 笔存单</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <p className={`font-black text-2xl text-main transition-all tracking-tighter leading-none ${isPrivate ? 'blur-md' : ''}`}>${f2(usdFdTotalValue)}</p>
                    <p className={`text-[10px] font-bold text-tertiary opacity-70 mt-1 transition-all ${isPrivate ? 'blur-[3px]' : ''}`}>≈¥{f2(usdFdTotalValueCny)}</p>
                  </div>
                  <ChevronRight className="text-tertiary" size={20} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GoldView = () => (
    <div className="h-full flex flex-col bg-[#f2f2f7] dark:bg-black">
      <NavBar title="黄金板块" back />
      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-24 no-scrollbar">
        {data.goldCategories.map(cat => {
          const stats = goldAnalysis.find(s => s.id === cat.id);
          const isPhysical = cat.name === PHYSICAL_GOLD_NAME;
          return (
            <div key={cat.id} className="bg-white dark:bg-[#1c1c1e] rounded-[36px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm transition-all active:scale-[0.995]">
              <div className="p-6 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800" onClick={() => setData(prev => ({ ...prev, goldCategories: prev.goldCategories.map(c => c.id === cat.id ? { ...c, isExpanded: !c.isExpanded } : c) }))}>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-main tracking-tight">{cat.name}</h3>
                    <button onClick={(e) => { e.stopPropagation(); setEditCat(cat); }} className="text-blue-500 p-1 active:scale-125 transition-transform"><Edit2 size={16}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-5 mt-2.5">
                    <div className={`text-xs font-bold text-secondary transition-all ${isPrivate ? 'blur-[4px]' : ''}`}>持仓: <span className="text-main font-black">{f2(stats?.currentWeight || 0)}g</span></div>
                    <div className={`text-xs font-bold text-secondary transition-all ${isPrivate ? 'blur-[4px]' : ''}`}>{isPhysical ? "已增值" : "获利了结"}: <span className={`font-black ${stats && stats.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>¥{f2(stats?.realizedProfit || 0)}</span></div>
                  </div>
                </div>
                {cat.isExpanded ? <ChevronUp className="text-tertiary" /> : <ChevronDown className="text-tertiary" />}
              </div>
              {cat.isExpanded && (
                <div className="p-5 bg-gray-50/50 dark:bg-black/20 border-t border-gray-50 dark:border-gray-800 space-y-3.5">
                  {cat.records.length === 0 ? <p className="text-center py-6 text-xs font-bold text-tertiary">暂无交易记录</p> :
                    cat.records.sort((a,b) => b.date.localeCompare(a.date)).map(rec => (
                      <div key={rec.id} onClick={() => setRecordMenu({ catId: cat.id, record: rec })} className="bg-white dark:bg-[#2c2c2e] p-5 rounded-3xl flex items-center justify-between border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition-all shadow-sm">
                        <div className="flex items-center gap-4 text-left flex-1">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${rec.type === 'BUY' ? 'bg-green-100 text-green-600 dark:bg-green-900/40' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40'}`}> {rec.type === 'BUY' ? <ArrowDownLeft size={22}/> : <ArrowUpRight size={22}/>} </div>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[10px] font-bold text-tertiary tracking-wide">{rec.date}</p>
                            <p className="font-black text-base text-main leading-tight"> {rec.type === 'BUY' ? '买入' : '卖出'} {f2(rec.weight)}g </p>
                            <p className="text-secondary font-bold text-xs opacity-80"> 单价: {f2(rec.price)}元/g </p>
                            {!isPhysical && rec.type === 'SELL' && rec.fee && (
                              <p className="text-secondary font-bold text-xs opacity-80"> 手续费: ¥{f2(rec.fee)} </p>
                            )}
                          </div>
                        </div>
                        <div className={`text-right transition-all ${isPrivate ? 'blur-md' : ''}`}> <p className="font-black text-2xl text-main tracking-tighter">¥{f2(rec.total)}</p> </div>
                      </div>
                    ))
                  }
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEntryModal({ show: true, type: 'GOLD_REC', title: `买入 ${cat.name}`, catId: cat.id, recType: 'BUY' })} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black text-sm active:scale-[0.98] transition-all shadow-lg shadow-green-500/20">买入</button>
                    <button onClick={() => setEntryModal({ show: true, type: 'GOLD_REC', title: `卖出 ${cat.name}`, catId: cat.id, recType: 'SELL' })} className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-sm active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20">卖出</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <button onClick={() => setEntryModal({ show: true, type: 'GOLD_CAT', title: '自定义黄金模块' })} className="w-full border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-[36px] p-7 text-secondary font-black active:scale-[0.98] active:bg-gray-100 dark:active:bg-gray-900 transition-all">+ 自定义种类模块</button>
      </div>
    </div>
  );

  const FDView = () => {
    const today = new Date().toISOString().split('T')[0];
    const activeCnyFd = useMemo(() => data.fixedDeposits.filter(f => f.currency === 'CNY' && !f.isWithdrawn), [data.fixedDeposits]);
    const sorted = useMemo(() => {
      return [...activeCnyFd].sort((a,b) => {
        const { field, order } = fdSort;
        if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }, [activeCnyFd, fdSort]);
    return (
      <div className="h-full flex flex-col bg-[#f2f2f7] dark:bg-black">
        <div className="flex-none">
          <NavBar title="人民币存款" back />
          <div className="px-5 py-4 bg-white/90 dark:bg-black/90 ios-blur flex gap-2.5 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-800">
            {[{id:'startDate',label:'存入日'},{id:'endDate',label:'到期日'},{id:'amount',label:'金额'},{id:'bank',label:'银行'}].map(opt => (
              <button key={opt.id} onClick={() => setFdSort({ field: opt.id as SortField, order: fdSort.field === opt.id && fdSort.order === 'desc' ? 'asc' : 'desc' })} className={`px-5 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all shadow-sm active:scale-[0.95] ${fdSort.field === opt.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-[#1c1c1e] text-secondary'}`}>
                {opt.label} {fdSort.field === opt.id && (fdSort.order === 'desc' ? <ChevronDown size={14} className="inline ml-1"/> : <ChevronUp size={14} className="inline ml-1"/>)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-48 no-scrollbar relative">
          {sorted.map(fd => {
            const isExpired = fd.endDate <= today;
            return (
              <div key={fd.id} onClick={() => setFdMenu(fd)} className="bg-white dark:bg-[#1c1c1e] p-7 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm relative active:scale-[0.985] transition-all">
                <div className="flex justify-between items-start mb-5">
                  <div className="text-left"> <h3 className="text-3xl font-black text-main tracking-tighter leading-none">{fd.bank || '未知银行'}</h3> <p className="text-[10px] font-black text-secondary uppercase tracking-widest mt-1.5">{fd.durationMonths}个月存期</p> </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3.5 py-2 rounded-xl text-xs font-black border border-blue-100 dark:border-blue-800">{f2(fd.annualRate)}% 年化</div>
                </div>
                <div className="grid grid-cols-2 gap-7 mb-5 text-left">
                  <div><p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">本金</p><p className={`text-2xl font-black text-main transition-all tracking-tighter ${isPrivate ? 'blur-md' : ''}`}>¥{f2(fd.amount)}</p></div>
                  <div><p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">预计利息</p><p className={`text-2xl font-black text-green-600 transition-all tracking-tighter ${isPrivate ? 'blur-md' : ''}`}>¥{f2(fd.interest)}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-gray-50 dark:border-gray-800 pt-5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-secondary overflow-hidden"> <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div> <span className="truncate">存入: {fd.startDate}</span> </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-secondary overflow-hidden justify-end"> <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div> <span className="truncate">到期: {fd.endDate}</span> </div>
                </div>
                {isExpired && ( <button onClick={(e) => { e.stopPropagation(); setWithdrawMenu(fd); }} className="mt-5 w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"> <AlertTriangle size={16}/> 确认提取本息 </button> )}
              </div>
            );
          })}
          <div className="py-4"> <button onClick={() => setCurrentPage('expiredFd')} className="w-full flex items-center justify-center gap-3 p-6 bg-white dark:bg-[#1c1c1e] rounded-[36px] border border-gray-100 dark:border-gray-800 text-secondary font-black text-sm active:scale-[0.98] shadow-sm transition-all"> <Archive size={20}/> 已到期存单存档 </button> </div>
          <button onClick={() => setEntryModal({ show: true, type: 'FD', title: '新增人民币存单', currency: 'CNY' })} className="fixed bottom-12 right-10 w-20 h-20 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-[150] ring-4 ring-white dark:ring-black"> <Plus size={44}/> </button>
        </div>
      </div>
    );
  };

  const USDView = () => {
    const today = new Date().toISOString().split('T')[0];
    const activeUsdFd = useMemo(() => data.fixedDeposits.filter(f => f.currency === 'USD' && !f.isWithdrawn), [data.fixedDeposits]);
    const sorted = useMemo(() => {
      return [...activeUsdFd].sort((a,b) => {
        const { field, order } = fdSort;
        if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }, [activeUsdFd, fdSort]);
    return (
      <div className="h-full flex flex-col bg-[#f2f2f7] dark:bg-black">
        <div className="flex-none">
          <NavBar title="美元存款" back />
          <div className="px-5 py-4 bg-white/90 dark:bg-black/90 ios-blur flex gap-2.5 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-800">
            {[{id:'startDate',label:'存入日'},{id:'endDate',label:'到期日'},{id:'amount',label:'金额'},{id:'bank',label:'银行'}].map(opt => (
              <button key={opt.id} onClick={() => setFdSort({ field: opt.id as SortField, order: fdSort.field === opt.id && fdSort.order === 'desc' ? 'asc' : 'desc' })} className={`px-5 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all shadow-sm active:scale-[0.95] ${fdSort.field === opt.id ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-[#1c1c1e] text-secondary'}`}>
                {opt.label} {fdSort.field === opt.id && (fdSort.order === 'desc' ? <ChevronDown size={14} className="inline ml-1"/> : <ChevronUp size={14} className="inline ml-1"/>)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-48 no-scrollbar relative">
          {sorted.map(fd => {
            const isExpired = fd.endDate <= today;
            return (
              <div key={fd.id} onClick={() => setFdMenu(fd)} className="bg-white dark:bg-[#1c1c1e] p-7 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm relative active:scale-[0.985] transition-all">
                <div className="flex justify-between items-start mb-5">
                  <div className="text-left"> <h3 className="text-3xl font-black text-main tracking-tighter leading-none">{fd.bank || '未知银行'}</h3> <p className="text-[10px] font-black text-secondary uppercase tracking-widest mt-1.5">{fd.durationMonths}个月存期</p> </div>
                  <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3.5 py-2 rounded-xl text-xs font-black border border-green-100 dark:border-green-800">{f2(fd.annualRate)}% 年化</div>
                </div>
                <div className="grid grid-cols-2 gap-7 mb-5 text-left">
                  <div><p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">本金</p><p className={`text-2xl font-black text-main transition-all tracking-tighter ${isPrivate ? 'blur-md' : ''}`}>${f2(fd.amount)}</p></div>
                  <div><p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">预计利息</p><p className={`text-2xl font-black text-green-600 transition-all tracking-tighter ${isPrivate ? 'blur-md' : ''}`}>${f2(fd.interest)}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-gray-50 dark:border-gray-800 pt-5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-secondary overflow-hidden"> <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div> <span className="truncate">存入: {fd.startDate}</span> </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-secondary overflow-hidden justify-end"> <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div> <span className="truncate">到期: {fd.endDate}</span> </div>
                </div>
                {isExpired && ( <button onClick={(e) => { e.stopPropagation(); setWithdrawMenu(fd); }} className="mt-5 w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"> <AlertTriangle size={16}/> 确认提取本息 </button> )}
              </div>
            );
          })}
          <div className="py-4"> <button onClick={() => setCurrentPage('expiredFd')} className="w-full flex items-center justify-center gap-3 p-6 bg-white dark:bg-[#1c1c1e] rounded-[36px] border border-gray-100 dark:border-gray-800 text-secondary font-black text-sm active:scale-[0.98] shadow-sm transition-all"> <Archive size={20}/> 已到期存单存档 </button> </div>
          <button onClick={() => setEntryModal({ show: true, type: 'FD', title: '新增美元存单', currency: 'USD' })} className="fixed bottom-12 right-10 w-20 h-20 bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-[150] ring-4 ring-white dark:ring-black"> <Plus size={44}/> </button>
        </div>
      </div>
    );
  };

  const ExpiredFDView = () => {
    const expired = useMemo(() => data.fixedDeposits.filter(f => f.isWithdrawn), [data.fixedDeposits]);
    return (
      <div className="h-full flex flex-col bg-[#f2f2f7] dark:bg-black">
        <NavBar title="已到期存档" back onBack={() => setCurrentPage('fd')} />
        <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-24 no-scrollbar">
          {expired.length === 0 ? <div className="flex flex-col items-center justify-center pt-32 text-tertiary gap-5 opacity-40"> <Archive size={64} /> <p className="font-bold text-lg">暂无存档记录</p> </div> :
            expired.sort((a,b) => b.endDate.localeCompare(a.endDate)).map(fd => (
              <div key={fd.id} onClick={() => setFdMenu(fd)} className="bg-white/50 dark:bg-[#1c1c1e]/50 p-7 rounded-[36px] border border-gray-100 dark:border-gray-800 shadow-sm opacity-80 active:scale-[0.98] transition-all">
                <div className="flex justify-between items-start mb-5">
                  <div className="text-left"> <h3 className="text-2xl font-black text-main tracking-tighter">{fd.bank}</h3> <p className="text-[10px] font-bold text-secondary uppercase mt-0.5">已取出存档</p> </div>
                  <div className="bg-gray-100 dark:bg-gray-800 text-tertiary px-3.5 py-1.5 rounded-xl text-[10px] font-black">已结算</div>
                </div>
                <div className="grid grid-cols-2 gap-5 text-left">
                   <div><p className="text-[10px] font-bold text-secondary uppercase mb-1.5">结算本金</p><p className={`text-xl font-black text-main transition-all ${isPrivate ? 'blur-md' : ''}`}>{fd.currency === 'CNY' ? '¥' : '$'}{f2(fd.amount)}</p></div>
                   <div><p className="text-[10px] font-bold text-secondary uppercase mb-1.5">实际收益</p><p className={`text-xl font-black text-green-600 transition-all ${isPrivate ? 'blur-md' : ''}`}>{fd.currency === 'CNY' ? '¥' : '$'}{f2(fd.interest)}</p></div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    );
  };

  if (!isInitialized) return null;

  return (
    <div 
      className="h-screen w-full relative bg-[#f2f2f7] dark:bg-black overflow-hidden flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div style={getPageStyle('home')}><Home /></div>
      <div style={getPageStyle('gold')}><GoldView /></div>
      <div style={getPageStyle('fd')}><FDView /></div>
      <div style={getPageStyle('usdFd')}><USDView /></div>
      <div style={getPageStyle('expiredFd')}><ExpiredFDView /></div>

      {/* Settings Panel */}
      <div className={`fixed inset-0 z-[300] bg-black/60 transition-opacity duration-300 ${showSettings ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowSettings(false)}></div>
      <div className={`fixed bottom-0 left-0 right-0 z-[301] bg-[#f2f2f7] dark:bg-[#1c1c1e] rounded-t-[40px] safe-bottom transition-transform duration-400 cubic-bezier(0.32, 0.72, 0, 1) transform ${showSettings ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-14 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-4 mb-2"></div>
        <div className="p-7">
          <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-black text-main tracking-tight">设置</h2><button onClick={() => setShowSettings(false)} className="bg-gray-200 dark:bg-gray-800 p-2.5 rounded-full text-secondary active:scale-110 transition-transform"><X size={24}/></button></div>
          <div className="space-y-5">
            <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-between bg-white dark:bg-[#2c2c2e] p-5 rounded-3xl shadow-sm active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4"><div className={`p-3 rounded-2xl ${darkMode ? 'bg-indigo-500' : 'bg-amber-100'}`}>{darkMode ? <Moon size={22} className="text-white"/> : <Sun size={22} className="text-amber-600"/>}</div><span className="font-bold text-lg text-main">深色模式</span></div>
              <div className={`w-14 h-8 rounded-full p-1 transition-colors ${darkMode ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}></div></div>
            </button>
            <div className="grid grid-cols-2 gap-5">
              <button onClick={() => { 
                const dataStr = JSON.stringify(data, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); 
                const now = new Date(); const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                a.href = url; a.download = `投资记录存档-${dateStr}.json`; a.click(); 
              }} className="flex flex-col items-center justify-center bg-white dark:bg-[#2c2c2e] p-6 rounded-3xl shadow-sm active:scale-95 transition-all"><Download className="text-blue-500 mb-3" size={28} /><span className="text-sm font-black text-main">导出存档</span></button>
              <label className="flex flex-col items-center justify-center bg-white dark:bg-[#2c2c2e] p-6 rounded-3xl shadow-sm cursor-pointer active:scale-95 transition-all"><Upload className="text-green-500 mb-3" size={28} /><span className="text-sm font-black text-main">导入恢复</span><input type="file" className="hidden" accept=".json" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { try { const parsed = JSON.parse(ev.target?.result as string); updateData(parsed); setShowSettings(false); } catch (err) { alert("文件格式错误"); } }; reader.readAsText(file); }}/></label>
            </div>
          </div>
        </div>
      </div>

      {/* Gold Price Modal */}
      <div className={`fixed inset-0 z-[400] flex items-center justify-center p-7 transition-opacity duration-300 ${showPriceModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 ios-blur" onClick={() => setShowPriceModal(false)}></div>
        <div className={`bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-[36px] p-7 shadow-2xl relative transition-transform duration-300 transform ${showPriceModal ? 'scale-100' : 'scale-90 opacity-0'}`}>
          <h3 className="text-xl font-black text-center mb-6 text-main tracking-tight">参考金价设置</h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 mb-7 relative">
            <input type="number" step="0.01" value={tempPrice} autoFocus placeholder="输入当前价" onChange={(e) => setTempPrice(e.target.value)} className="w-full bg-transparent text-center text-3xl font-black outline-none text-main placeholder:text-gray-400 pr-10" />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-tertiary">元/G</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowPriceModal(false)} className="flex-1 py-4 rounded-2xl font-bold text-secondary bg-gray-100 dark:bg-gray-800 active:scale-95">取消</button>
            <button onClick={() => { const val = parseFloat(tempPrice); if (!isNaN(val) && val > 0) { updateData(d => ({ ...d, referenceGoldPrice: val })); setShowPriceModal(false); } }} className="flex-1 py-4 rounded-2xl font-bold text-white bg-blue-600 active:scale-95">确认保存</button>
          </div>
        </div>
      </div>

      {/* USD Rate Modal */}
      <div className={`fixed inset-0 z-[400] flex items-center justify-center p-7 transition-opacity duration-300 ${showUsdRateModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 ios-blur" onClick={() => setShowUsdRateModal(false)}></div>
        <div className={`bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-[36px] p-7 shadow-2xl relative transition-transform duration-300 transform ${showUsdRateModal ? 'scale-100' : 'scale-90 opacity-0'}`}>
          <h3 className="text-xl font-black text-center mb-6 text-main tracking-tight">美元汇率设置</h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 mb-7 relative">
            <input type="number" step="0.01" value={tempUsdRate} autoFocus placeholder="输入当前汇率" onChange={(e) => setTempUsdRate(e.target.value)} className="w-full bg-transparent text-center text-3xl font-black outline-none text-main placeholder:text-gray-400 pr-10" />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-tertiary">元/$</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowUsdRateModal(false)} className="flex-1 py-4 rounded-2xl font-bold text-secondary bg-gray-100 dark:bg-gray-800 active:scale-95">取消</button>
            <button onClick={() => { const val = parseFloat(tempUsdRate); if (!isNaN(val) && val > 0) { updateData(d => ({ ...d, referenceUsdRate: val })); setShowUsdRateModal(false); } }} className="flex-1 py-4 rounded-2xl font-bold text-white bg-green-600 active:scale-95">确认保存</button>
          </div>
        </div>
      </div>

      <DataEntryModal />
      <GoldRecordModals />
      <GoldCatModals />
      <FDModals />
    </div>
  );
};
export default App;
