import { useState, useEffect, useRef } from 'react';
import { 
  Scale, Moon, Sun, Calculator, MessageSquare, User, Users, Coins, 
  FileText, ChevronDown, Plus, Trash2, Send, AlertTriangle, ArrowRightLeft, Sparkles, BookOpen
} from 'lucide-react';

// --- STYLING & FONT ---
const fontUrl = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";

// --- TYPES & INTERFACES ---
interface AssetType {
  id: number;
  name: string;
  value: number;
}

interface DeductionType {
  id: string;
  name: string;
  value: number;
}

interface HeirType {
  id: string;
  label: string;
  max?: number;
  gender?: string;
}

interface HeirCategoriesType {
  pasangan: HeirType[];
  ushul: HeirType[];
  furu: HeirType[];
  hawasyi: HeirType[];
  budak_wala: HeirType[];
}

interface DistributionType {
  id: string;
  label: string;
  count: number;
  fractionText: string;
  num: number;
  den: number;
  asabah: boolean;
  reason: string;
  dalil: string;
  value: number;
}

interface CalculationResultType {
  netto: number;
  status?: string;
  isAul?: boolean;
  aulDetail?: string | null;
  isRadd?: boolean;
  raddDetail?: string | null;
  isMusyarakah?: boolean;
  isGharrawain?: boolean;
  maxWasiat?: number;
  actualWasiat?: number;
  distributions: DistributionType[];
}

interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
}

// --- DATA KONFIGURASI AHLI WARIS ---
const HEIR_CATEGORIES: HeirCategoriesType = {
  pasangan: [
    { id: 'suami', label: 'Suami', max: 1, gender: 'female' },
    { id: 'istri', label: 'Istri', max: 4, gender: 'male' }
  ],
  ushul: [
    { id: 'bapak', label: 'Bapak', max: 1 },
    { id: 'ibu', label: 'Ibu', max: 1 },
    { id: 'kakek', label: 'Kakek (Bapak dari Bapak)', max: 1 },
    { id: 'nenek_ibu', label: 'Nenek (Ibu dari Ibu)', max: 1 },
    { id: 'nenek_bapak', label: 'Nenek (Ibu dari Bapak)', max: 1 }
  ],
  furu: [
    { id: 'anak_lk', label: 'Anak Laki-laki' },
    { id: 'anak_pr', label: 'Anak Perempuan' },
    { id: 'cucu_lk', label: 'Cucu Lk (dari Anak Lk)' },
    { id: 'cucu_pr', label: 'Cucu Pr (dari Anak Lk)' }
  ],
  hawasyi: [
    { id: 'sdr_kandung_lk', label: 'Saudara Kandung Lk' },
    { id: 'sdr_kandung_pr', label: 'Saudari Kandung Pr' },
    { id: 'sdr_sebapak_lk', label: 'Saudara Sebapak Lk' },
    { id: 'sdr_sebapak_pr', label: 'Saudari Sebapak Pr' },
    { id: 'sdr_seibu_lk', label: 'Saudara Seibu Lk' },
    { id: 'sdr_seibu_pr', label: 'Saudari Seibu Pr' },
    { id: 'ponakan_kandung_lk', label: 'Ponakan Lk (dari Sdr Kandung Lk)' },
    { id: 'ponakan_sebapak_lk', label: 'Ponakan Lk (dari Sdr Sebapak Lk)' },
    { id: 'paman_kandung', label: 'Paman Kandung (dari jalur Bapak)' },
    { id: 'paman_sebapak', label: 'Paman Sebapak (dari jalur Bapak)' },
    { id: 'sepupu_kandung_lk', label: 'Sepupu Lk (dari Paman Kandung)' },
    { id: 'sepupu_sebapak_lk', label: 'Sepupu Lk (dari Paman Sebapak)' }
  ],
  budak_wala: [
    { id: 'mutiq', label: 'Pembebas Budak Lk (Mu\'tiq)', max: 1 },
    { id: 'mutiqah', label: 'Pembebas Budak Pr (Mu\'tiqah)', max: 1 }
  ]
};

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

export default function App() {
  // --- STATE MANAGEMENT ---
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<'calculator' | 'chat'>('calculator');
  
  // Faraid Form State
  const [jenazahGender, setJenazahGender] = useState<'male' | 'female'>('male');
  const [madzhab, setMadzhab] = useState<string>('syafii');
  const [assets, setAssets] = useState<AssetType[]>([
    { id: Date.now(), name: 'Uang Tunai / Tabungan', value: 0 }
  ]);
  const [deductions, setDeductions] = useState<DeductionType[]>([
    { id: 'tajhiz', name: 'Biaya Pengurusan Jenazah', value: 0 },
    { id: 'hutang', name: 'Hutang Pewaris', value: 0 },
    { id: 'zakat', name: 'Zakat Tertunggak', value: 0 },
    { id: 'wasiat', name: 'Wasiat (Maks 1/3)', value: 0 },
  ]);
  const [heirs, setHeirs] = useState<Record<string, number>>({});
  const [calculationResult, setCalculationResult] = useState<CalculationResultType | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      role: 'ai', 
      text: "Assalamu'alaikum! Mizan waris siap nemenin kamu bahas Faraid. Kalau ada hasil Aul atau Radd yang bikin bingung di sebelah, tanyain aja ke Mizan ya! Dalilnya InsyaAllah kuat dari referensi Ulama Ahlus Sunnah." 
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const link = document.createElement('link');
    link.href = fontUrl;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const initialHeirs: Record<string, number> = {};
    Object.values(HEIR_CATEGORIES).flat().forEach((h: HeirType) => { initialHeirs[h.id] = 0; });
    setHeirs(initialHeirs);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatMessages, isTyping]);

  useEffect(() => { 
    calculateFaraid(); 
  }, [assets, deductions, heirs, jenazahGender, madzhab]);

  // --- HANDLERS ---
  const handleThemeToggle = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  
  const handleAssetChange = (id: number, value: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, value: Number(value) || 0 } : a));
  };
  
  const addAsset = () => {
    setAssets(prev => [...prev, { id: Date.now(), name: 'Aset Lainnya', value: 0 }]);
  };
  
  const removeAsset = (id: number) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };
  
  const handleDeductionChange = (id: string, value: string) => {
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, value: Number(value) || 0 } : d));
  };
  
  const updateHeirCount = (id: string, delta: number) => {
    setHeirs(prev => {
      const max = Object.values(HEIR_CATEGORIES).flat().find((h: HeirType) => h.id === id)?.max || 99;
      const currentVal = prev[id] || 0;
      const newVal = currentVal + delta;
      return { ...prev, [id]: Math.min(Math.max(newVal, 0), max) };
    });
  };

  // --- CORE FARAID LOGIC ENGINE ---
  const calculateFaraid = () => {
    const totalAssets = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const tajhiz = Number(deductions.find(d => d.id === 'tajhiz')?.value) || 0;
    const hutang = Number(deductions.find(d => d.id === 'hutang')?.value) || 0;
    const zakat = Number(deductions.find(d => d.id === 'zakat')?.value) || 0;
    const requestedWasiat = Number(deductions.find(d => d.id === 'wasiat')?.value) || 0;

    const hartaBersihAwal = totalAssets - tajhiz - hutang - zakat;
    const maxWasiat = hartaBersihAwal > 0 ? hartaBersihAwal / 3 : 0;
    const actualWasiat = Math.min(requestedWasiat, maxWasiat);
    const netto = Math.max(0, hartaBersihAwal - actualWasiat);

    if (netto <= 0) {
      setCalculationResult({ netto: 0, status: 'Harta habis untuk pengurang', distributions: [] });
      return;
    }

    const dist: DistributionType[] = [];
    const h = heirs;

    // IDENTIFIKASI HAJB (PENGHALANG)
    const hasAnakLk = (h.anak_lk || 0) > 0;
    const hasAnakPr = (h.anak_pr || 0) > 0;
    const hasCucuLk = (h.cucu_lk || 0) > 0 && !hasAnakLk; // Hajb Hirman
    const hasFuruLk = hasAnakLk || hasCucuLk;
    const hasFuru = hasFuruLk || hasAnakPr || (h.cucu_pr || 0) > 0;
    
    const sdrTerhalangMutlak = hasFuruLk || (h.bapak || 0) > 0 || (madzhab === 'hanafi' && (h.kakek || 0) > 0);

    const addShare = (
      id: string, 
      label: string, 
      fractionText: string, 
      num: number, 
      den: number, 
      asabah: boolean, 
      reason: string, 
      dalil: string
    ) => {
      dist.push({ id, label, count: h[id] || 0, fractionText, num, den, asabah, reason, dalil, value: 0 });
    };

    // 1. ZAWIL FURUDH & ASABAH
    // Pasangan
    if (jenazahGender === 'female' && (h.suami || 0) > 0) {
      addShare('suami', 'Suami', hasFuru ? '1/4' : '1/2', hasFuru ? 6 : 12, 24, false, 
        hasFuru ? 'Mendapat 1/4 karena ada keturunan (anak/cucu).' : 'Mendapat 1/2 karena tidak ada keturunan.',
        'QS. An-Nisa: 12');
    } else if (jenazahGender === 'male' && (h.istri || 0) > 0) {
      addShare('istri', 'Istri', hasFuru ? '1/8' : '1/4', hasFuru ? 3 : 6, 24, false,
        hasFuru ? 'Mendapat 1/8 karena ada keturunan.' : 'Mendapat 1/4 karena tidak ada keturunan.',
        'QS. An-Nisa: 12');
    }

    // Ibu & Bapak
    let isGharrawain = false;
    if ((h.ibu || 0) > 0) {
      isGharrawain = !hasFuru && (h.bapak || 0) > 0 && ((h.suami || 0) > 0 || (h.istri || 0) > 0) && ((h.sdr_kandung_lk || 0) + (h.sdr_kandung_pr || 0) + (h.sdr_seibu_lk || 0) + (h.sdr_seibu_pr || 0)) < 2;
      if (isGharrawain) {
        addShare('ibu', 'Ibu', '1/3 Sisa', 0, 24, false, 'Kasus Umariyatain/Gharrawain. Ibu mendapat 1/3 dari sisa harta setelah jatah pasangan diambil.', 'Ijtihad Umar bin Khattab');
      } else if (hasFuru || (((h.sdr_kandung_lk || 0) + (h.sdr_kandung_pr || 0) + (h.sdr_seibu_lk || 0) + (h.sdr_seibu_pr || 0)) >= 2)) {
        addShare('ibu', 'Ibu', '1/6', 4, 24, false, 'Mendapat 1/6 karena ada keturunan atau 2+ saudara.', 'QS. An-Nisa: 11');
      } else {
        addShare('ibu', 'Ibu', '1/3', 8, 24, false, 'Mendapat 1/3 karena tidak ada keturunan & tdk ada 2+ saudara.', 'QS. An-Nisa: 11');
      }
    }

    if ((h.bapak || 0) > 0) {
      if (hasFuruLk) addShare('bapak', 'Bapak', '1/6', 4, 24, false, 'Mendapat 1/6 karena ada keturunan Laki-laki.', 'QS. An-Nisa: 11');
      else if (hasFuru) addShare('bapak', 'Bapak', '1/6 + Asabah', 4, 24, true, 'Mendapat 1/6 + sisa (Asabah) karena hanya ada keturunan perempuan.', 'QS. An-Nisa: 11 & Hadits Ibnu Abbas');
      else addShare('bapak', 'Bapak', 'Asabah', 0, 24, true, 'Menjadi Asabah murni karena tidak ada keturunan.', 'Hadits Riwayat Bukhari');
    }

    // Furu' (Anak & Cucu)
    if ((h.anak_pr || 0) > 0 && !hasAnakLk) {
      if (h.anak_pr === 1) addShare('anak_pr', 'Anak Pr', '1/2', 12, 24, false, 'Mendapat 1/2 karena tunggal.', 'QS. An-Nisa: 11');
      else addShare('anak_pr', 'Anak Pr', '2/3', 16, 24, false, 'Mendapat 2/3 dibagi rata karena >1.', 'QS. An-Nisa: 11');
    } else if ((h.anak_pr || 0) > 0 && hasAnakLk) {
      addShare('anak_pr', 'Anak Pr', 'Asabah bil Ghair', 0, 24, true, 'Menjadi Asabah karena ditarik oleh Anak Lk (porsi 1:2).', 'QS. An-Nisa: 11');
    }

    if (hasAnakLk) {
      addShare('anak_lk', 'Anak Lk', 'Asabah', 0, 24, true, 'Menjadi Asabah Bin Nafs (mengambil seluruh sisa).', 'Hadits Ibnu Abbas');
    }

    // Cucu Lk/Pr jika tdk ada Anak Lk
    if (!hasAnakLk) {
      if ((h.cucu_lk || 0) > 0) {
        if ((h.cucu_pr || 0) > 0) {
          addShare('cucu_lk', 'Cucu Lk', 'Asabah', 0, 24, true, 'Mengambil sisa bersama Cucu Pr (Asabah bil Ghair).', 'Qiyas Anak Lk & Pr');
          addShare('cucu_pr', 'Cucu Pr', 'Asabah', 0, 24, true, 'Ditarik oleh Cucu Lk (porsi 1:2).', 'Qiyas Anak Lk & Pr');
        } else {
          addShare('cucu_lk', 'Cucu Lk', 'Asabah', 0, 24, true, 'Kedudukannya menggantikan Anak Lk.', 'Ijma Ulama');
        }
      } else if ((h.cucu_pr || 0) > 0) {
        if ((h.anak_pr || 0) === 1) {
          addShare('cucu_pr', 'Cucu Pr', '1/6', 4, 24, false, 'Mendapat 1/6 sbg pelengkap 2/3 (Takmilatan lits-tsulutsain) bersama 1 Anak Pr.', 'Hadits Ibnu Mas\'ud');
        } else if ((h.anak_pr || 0) === 0) {
          if (h.cucu_pr === 1) addShare('cucu_pr', 'Cucu Pr', '1/2', 12, 24, false, 'Mendapat 1/2 karena tunggal.', 'QS. An-Nisa: 11 (Qiyas)');
          else addShare('cucu_pr', 'Cucu Pr', '2/3', 16, 24, false, 'Mendapat 2/3 dibagi rata.', 'QS. An-Nisa: 11 (Qiyas)');
        }
      }
    }

    // Kasus Al-Musyarakah (Himariyah)
    let isMusyarakah = false;
    const totalSdrSeibu = (h.sdr_seibu_lk || 0) + (h.sdr_seibu_pr || 0);
    if (madzhab !== 'hanafi' && madzhab !== 'hambali' && (h.suami || 0) > 0 && (h.ibu || 0) > 0 && totalSdrSeibu > 1 && (h.sdr_kandung_lk || 0) > 0 && !hasFuru && !(h.bapak || 0) && !(h.kakek || 0)) {
      isMusyarakah = true;
    }

    // Saudara (jika tdk terhalang mutlak)
    if (!sdrTerhalangMutlak) {
      if (totalSdrSeibu > 0) {
        if (isMusyarakah) {
          addShare('sdr_seibu_lk', 'Sdr Seibu', 'Musyarakah (1/3)', 8, 24, false, 'Kasus Musyarakah. Berbagi 1/3 rata dengan Sdr Kandung.', 'Ijtihad Umar bin Khattab');
        } else if (totalSdrSeibu === 1) {
          if (h.sdr_seibu_lk) addShare('sdr_seibu_lk', 'Sdr Seibu Lk', '1/6', 4, 24, false, 'Mendapat 1/6 karena tunggal.', 'QS. An-Nisa: 12');
          if (h.sdr_seibu_pr) addShare('sdr_seibu_pr', 'Sdr Seibu Pr', '1/6', 4, 24, false, 'Mendapat 1/6 karena tunggal.', 'QS. An-Nisa: 12');
        } else {
          addShare('sdr_seibu_lk', 'Sdr Seibu', '1/3', 8, 24, false, 'Mendapat 1/3 dibagi rata Lk & Pr.', 'QS. An-Nisa: 12');
        }
      }

      if ((h.sdr_kandung_lk || 0) > 0) {
        if (isMusyarakah) {
           addShare('sdr_kandung_lk', 'Sdr Kandung Lk', 'Musyarakah', 0, 24, false, 'Berserikat dalam 1/3 milik Sdr Seibu. (Dibagi rata).', 'Kasus Himariyah');
        } else {
           addShare('sdr_kandung_lk', 'Sdr Kandung Lk', 'Asabah', 0, 24, true, 'Menjadi Asabah.', 'QS. An-Nisa: 176');
           if ((h.sdr_kandung_pr || 0) > 0) addShare('sdr_kandung_pr', 'Sdr Kandung Pr', 'Asabah bil Ghair', 0, 24, true, 'Menjadi asabah ditarik Sdr Kandung Lk.', 'QS. An-Nisa: 176');
        }
      } else if ((h.sdr_kandung_pr || 0) > 0) {
        if (hasAnakPr || (h.cucu_pr || 0) > 0) {
           addShare('sdr_kandung_pr', 'Sdr Kandung Pr', 'Asabah Ma\'al Ghair', 0, 24, true, 'Menjadi Asabah bersama keturunan Pr.', 'Hadits Ibnu Mas\'ud');
        } else {
           if (h.sdr_kandung_pr === 1) addShare('sdr_kandung_pr', 'Sdr Kandung Pr', '1/2', 12, 24, false, 'Mendapat 1/2 karena tunggal.', 'QS. An-Nisa: 176');
           else addShare('sdr_kandung_pr', 'Sdr Kandung Pr', '2/3', 16, 24, false, 'Mendapat 2/3 dibagi rata.', 'QS. An-Nisa: 176');
        }
      }
    }

    // Budak (Wala')
    const hasNasab = dist.some(d => d.id !== 'suami' && d.id !== 'istri');
    if (!hasNasab && ((h.mutiq || 0) > 0 || (h.mutiqah || 0) > 0)) {
      if ((h.mutiq || 0) > 0) addShare('mutiq', 'Mu\'tiq', 'Asabah', 0, 24, true, 'Mendapat sisa harta karena membebaskan budak (Wala\').', 'Hadits: Al-Wala\' liman A\'taq');
      else addShare('mutiqah', 'Mu\'tiqah', 'Asabah', 0, 24, true, 'Mendapat sisa harta karena membebaskan budak.', 'Hadits');
    }

    // --- MATH CALCULATIONS ---
    // Universal Base Denominator
    const asalMasalah = 24; 
    let totalShares = dist.filter(d => !d.asabah && d.num > 0 && d.id !== 'ibu' && !isMusyarakah).reduce((acc, curr) => acc + curr.num, 0);

    // Gharrawain Math
    if (isGharrawain) {
      const spouseShare = dist.find(d => d.id === 'suami' || d.id === 'istri')?.num || 0;
      const sisa = 24 - spouseShare;
      const ibuIdx = dist.findIndex(d => d.id === 'ibu');
      if (ibuIdx >= 0) {
        dist[ibuIdx].num = sisa / 3;
        totalShares += dist[ibuIdx].num;
      }
    }

    // Musyarakah Math
    if (isMusyarakah) {
      const sdrSeibuIdx = dist.findIndex(d => d.id === 'sdr_seibu_lk');
      const sdrKandungIdx = dist.findIndex(d => d.id === 'sdr_kandung_lk');
      const musyarakahShare = 8; // 1/3 dari 24
      totalShares += musyarakahShare;
      
      const totalPeople = totalSdrSeibu + (h.sdr_kandung_lk || 0);
      if (sdrSeibuIdx >= 0) dist[sdrSeibuIdx].num = (musyarakahShare / totalPeople) * totalSdrSeibu;
      if (sdrKandungIdx >= 0) {
        dist[sdrKandungIdx].num = (musyarakahShare / totalPeople) * (h.sdr_kandung_lk || 0);
        dist[sdrKandungIdx].asabah = false; 
      }
    }

    // AUL LOGIC
    const isAul = totalShares > asalMasalah && dist.filter(d => d.asabah).length === 0;
    let aulDetail = null;
    let penyebut = asalMasalah;

    if (isAul) {
      penyebut = totalShares; // KPK Naik
      aulDetail = `Total porsi Ahli Waris (${totalShares}/${asalMasalah}) melebihi harta. Terjadi Aul, sehingga Asal Masalah (KPK) dinaikkan dari 24 menjadi ${totalShares}. Porsi setiap ahli waris dzawil furudh otomatis dikurangi secara adil proporsional.`;
    }

    const sisaFractions = Math.max(0, asalMasalah - totalShares);
    const asabahList = dist.filter(d => d.asabah);

    // ASABAH LOGIC
    if (asabahList.length > 0 && sisaFractions > 0 && !isAul) {
      let asabahPoints = 0;
      asabahList.forEach(a => {
        const count = h[a.id] || 0;
        if (a.id.includes('_lk') || a.id === 'bapak' || a.id === 'mutiq') {
          asabahPoints += (count * 2);
        } else if (a.id.includes('_pr') || a.id === 'mutiqah') {
          asabahPoints += (count * 1);
        }
      });

      asabahList.forEach(a => {
        const count = h[a.id] || 0;
        if (count > 0) {
          const pts = (a.id.includes('_lk') || a.id === 'bapak' || a.id === 'mutiq') ? 2 : 1;
          a.num = (sisaFractions * (count * pts)) / asabahPoints; 
          a.num = a.num / count; // per person
        }
      });
    }

    // RADD LOGIC
    const isRadd = totalShares < asalMasalah && asabahList.length === 0 && totalShares > 0;
    let raddDetail = null;

    if (isRadd) {
       const spouseShare = dist.find(d => d.id === 'suami' || d.id === 'istri')?.num || 0;
       const raddSum = totalShares - spouseShare; // Porsi nasab yang berhak radd
       const sisaBagi = asalMasalah - totalShares;

       if (raddSum > 0) {
         // Kembalikan proporsional ke ahli waris selain suami/istri (Jumhur)
         dist.forEach(d => {
           if (d.id !== 'suami' && d.id !== 'istri') {
              d.num = d.num * ((asalMasalah - spouseShare) / raddSum);
           }
         });
         const penerimaRadd = dist.filter(d => d.id !== 'suami' && d.id !== 'istri' && d.num > 0).map(d => d.label).join(', ');
         raddDetail = `Terdapat SISA harta sebesar ${sisaBagi}/${asalMasalah} dan tidak ada Asabah. Berdasarkan Jumhur Ulama, sisa ini dikembalikan (Radd) secara proporsional kepada: ${penerimaRadd}. (Pasangan tidak mendapat Radd jika ada ahli waris nasab).`;
       } else if (spouseShare > 0) {
          // Hanya ada pasangan
          dist.forEach(d => {
             if (d.id === 'suami' || d.id === 'istri') {
                d.num = asalMasalah; // Take all
             }
          });
          raddDetail = `Terdapat SISA harta sebesar ${sisaBagi}/${asalMasalah}. Karena tidak ada ahli waris keluarga (nasab) sama sekali, seluruh sisa dikembalikan (Radd) kepada pasangan.`;
       }
    }

    // Calculate Final Rupiah Value
    dist.forEach(d => {
      const portionTotal = (d.num / penyebut);
      d.value = d.asabah ? (portionTotal * netto) : ((portionTotal * netto) / d.count);
    });

    setCalculationResult({
      netto,
      isAul,
      aulDetail,
      isRadd,
      raddDetail,
      isMusyarakah,
      isGharrawain,
      maxWasiat,
      actualWasiat,
      distributions: dist.filter(d => d.value > 0).sort((a,b) => b.value - a.value)
    });
  };

  // --- AI CHAT FUNCTION (Calling Server SECURE endpoint) ---
  const chatWithAI = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    const activeHeirs = Object.entries(heirs)
      .filter(([_, v]) => (v as number) > 0)
      .map(([k, v]) => {
        const hLabel = Object.values(HEIR_CATEGORIES)
          .flat()
          .find((item: HeirType) => item.id === k)?.label || k;
        return `${hLabel}: ${v}`;
      })
      .join(', ');

    const systemPrompt = `
      Kamu adalah "Mizan waris" (Mizan/Miz), asisten Fiqih Mawaris dari Surabaya.
      Gaya bicaramu santai, hangat ala Gen Z, pakai kata aku, kamu, Mizan/Miz. Keilmuanmu mendalam dari rujukan Ahlus Sunnah (Rumaysho, Almanhaj, NU Online, BinBaz.org.sa, dll).
      
      State Kalkulator User:
      - Harta Bersih: Rp ${calculationResult?.netto.toLocaleString('id-ID')}
      - Ahli Waris Aktif: ${activeHeirs || 'Belum diisi'}
      - Status Aul: ${calculationResult?.isAul ? 'Ya. ' + calculationResult?.aulDetail : 'Tidak'}
      - Status Radd: ${calculationResult?.isRadd ? 'Ya. ' + calculationResult?.raddDetail : 'Tidak'}

      TUGAS UTAMA:
      1. Jika ditanya apa itu Aul/Radd pada kasus mereka, gunakan 'State Kalkulator' di atas untuk menjelaskan BAGAIMANA dan KE MANA Aul/Radd disalurkan.
      2. Sebutkan dalil (Qur'an/Hadits/Ijma/Qiyas/Ijtihad Sahabat) dengan jelas.
      3. Jangan gunakan markdown JSON/codeblock rumit. Formatlah dengan list/paragraf biasa.
    `;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          systemInstruction: systemPrompt
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Server side error");
      }

      const aiText = data.text || "Mizan agak nge-lag nih jaringannya. Coba chat lagi ya!";
      setChatMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        text: "Aduh, koneksi Mizan terputus atau API Key belum disetting di panel Secrets. Mohon pastikan GEMINI_API_KEY sudah terdaftar ya." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-[#090E17] text-slate-200' : 'bg-slate-50 text-slate-800'} transition-colors duration-500`}>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 ${theme === 'dark' ? 'bg-emerald-600' : 'bg-emerald-300'}`} />
        <div className={`absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-10 ${theme === 'dark' ? 'bg-indigo-600' : 'bg-indigo-300'}`} />
      </div>

      <nav className={`relative z-10 sticky top-0 backdrop-blur-xl border-b ${theme === 'dark' ? 'bg-[#090E17]/80 border-white/5' : 'bg-white/80 border-slate-200'} px-6 py-4 flex justify-between items-center`}>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-emerald-500/20 bg-emerald-950">
            <img src="/logo.svg" className="w-full h-full object-cover" alt="Mizan Waris" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-400">Mizan Waris</h1>
            <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">Pro Faraid Engine</p>
          </div>
        </div>
        
        <div className="hidden md:flex bg-slate-500/10 p-1 rounded-xl">
          <button onClick={() => setActiveTab('calculator')} className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'calculator' ? 'bg-white dark:bg-slate-800 shadow text-emerald-500' : 'opacity-70 hover:opacity-100'}`}>
            <Calculator className="w-4 h-4" /> Kalkulator
          </button>
          <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'chat' ? 'bg-white dark:bg-slate-800 shadow text-emerald-500' : 'opacity-70 hover:opacity-100'}`}>
            <MessageSquare className="w-4 h-4" /> Mizan waris Chat
          </button>
        </div>

        <button onClick={handleThemeToggle} className="p-2 rounded-full hover:bg-slate-500/10 transition">
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-indigo-600" />}
        </button>
      </nav>

      <div className="md:hidden flex p-4 relative z-10">
        <div className="flex w-full bg-slate-500/10 p-1 rounded-xl">
           <button onClick={() => setActiveTab('calculator')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition flex justify-center items-center gap-2 ${activeTab === 'calculator' ? 'bg-white dark:bg-slate-800 shadow text-emerald-500' : 'opacity-70'}`}>
            <Calculator className="w-4 h-4" /> Kalkulator
          </button>
          <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition flex justify-center items-center gap-2 ${activeTab === 'chat' ? 'bg-white dark:bg-slate-800 shadow text-emerald-500' : 'opacity-70'}`}>
            <MessageSquare className="w-4 h-4" /> Chat AI
          </button>
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        
        {/* VIEW 1: KALKULATOR */}
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LEFT: INPUTS */}
            <div className="xl:col-span-7 space-y-6">
              
              {/* STEP 1: JENAZAH */}
              <div className={`p-6 rounded-3xl border shadow-lg ${theme === 'dark' ? 'bg-slate-900/40 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-200'}`}>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2"><User className="text-emerald-500 w-5 h-5"/> Informasi Pewaris (Jenazah)</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-2 opacity-70">Jenis Kelamin</label>
                    <div className="flex bg-slate-500/10 p-1 rounded-xl">
                      <button onClick={() => setJenazahGender('male')} className={`flex-1 py-2 rounded-lg text-sm transition ${jenazahGender === 'male' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-slate-500/20'}`}>Laki-laki</button>
                      <button onClick={() => setJenazahGender('female')} className={`flex-1 py-2 rounded-lg text-sm transition ${jenazahGender === 'female' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-slate-500/20'}`}>Perempuan</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-2 opacity-70">Madzhab Fiqih</label>
                    <div className="relative">
                      <select value={madzhab} onChange={(e) => setMadzhab(e.target.value)} className={`w-full appearance-none py-2.5 px-4 rounded-xl text-sm outline-none transition ${theme === 'dark' ? 'bg-slate-800/80 border border-white/5' : 'bg-slate-50 border border-slate-200'}`}>
                        <option value="syafii">Syafi'i (Jumhur)</option>
                        <option value="hanafi">Hanafi</option>
                        <option value="maliki">Maliki</option>
                        <option value="hambali">Hambali</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-4 h-4 opacity-50 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: HARTA */}
              <div className={`p-6 rounded-3xl border shadow-lg ${theme === 'dark' ? 'bg-slate-900/40 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold flex items-center gap-2"><Coins className="text-emerald-500 w-5 h-5"/> Harta & Pengurang</h2>
                  <button onClick={addAsset} className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-emerald-500/20 transition animate-pulse">
                    <Plus className="w-3 h-3" /> Aset
                  </button>
                </div>
                
                <div className="space-y-3 mb-6">
                  {assets.map((asset) => (
                    <div key={asset.id} className="flex items-center gap-2">
                      <input type="text" value={asset.name} onChange={(e) => setAssets(assets.map(a => a.id === asset.id ? { ...a, name: e.target.value } : a))} className={`flex-1 w-1/3 px-3 py-2.5 rounded-xl text-sm outline-none ${theme === 'dark' ? 'bg-slate-800/50 border border-white/5' : 'bg-slate-50 border border-slate-200'}`} placeholder="Nama Aset" />
                      <div className="relative flex-1 w-2/3">
                        <span className="absolute left-3 top-2.5 text-sm opacity-50 font-medium">Rp</span>
                        <input type="number" min="0" value={asset.value || ''} onChange={(e) => handleAssetChange(asset.id, e.target.value)} className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none font-medium ${theme === 'dark' ? 'bg-slate-800/50 border border-white/5' : 'bg-slate-50 border border-slate-200'}`} placeholder="0" />
                      </div>
                      {assets.length > 1 && <button onClick={() => removeAsset(asset.id)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-5 border-t border-slate-500/20">
                  {deductions.map(deduction => (
                    <div key={deduction.id}>
                      <label className="block text-[11px] font-semibold mb-1 opacity-70 uppercase tracking-wider">{deduction.name}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm opacity-50">Rp</span>
                        <input type="number" min="0" value={deduction.value || ''} onChange={(e) => handleDeductionChange(deduction.id, e.target.value)} className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none ${theme === 'dark' ? 'bg-slate-800/50 border border-white/5' : 'bg-slate-50 border border-slate-200'} ${(deduction.id === 'wasiat' && calculationResult?.actualWasiat !== undefined && deduction.value > calculationResult.actualWasiat) ? 'border-red-500/50 focus:border-red-500' : ''}`} placeholder="0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 3: AHLI WARIS */}
              <div className={`p-6 rounded-3xl border shadow-lg ${theme === 'dark' ? 'bg-slate-900/40 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-200'}`}>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2"><Users className="text-emerald-500 w-5 h-5"/> Pemilihan Ahli Waris</h2>
                <div className="space-y-4">
                  {Object.entries(HEIR_CATEGORIES).map(([category, items]) => (
                    <div key={category} className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-3">{category.replace('_', ' ')}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {items.map(heir => {
                          const isDisabled = (heir.gender && heir.gender !== jenazahGender) || (jenazahGender === 'male' && heir.id === 'suami') || (jenazahGender === 'female' && heir.id === 'istri');
                          if (isDisabled) return null;

                          return (
                            <div key={heir.id} className={`flex justify-between items-center px-3 py-2 rounded-xl border transition-all ${heirs[heir.id] > 0 ? 'border-emerald-500/50 bg-emerald-500/5 scale-[1.01]' : (theme === 'dark' ? 'border-white/5 bg-slate-800/50' : 'border-slate-200 bg-white')}`}>
                              <span className={`text-xs ${heirs[heir.id] > 0 ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-medium'}`}>{heir.label}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateHeirCount(heir.id, -1)} className="w-6 h-6 rounded-full bg-slate-500/10 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition">-</button>
                                <span className="text-xs w-3 text-center font-bold">{heirs[heir.id] || 0}</span>
                                <button onClick={() => updateHeirCount(heir.id, 1)} className="w-6 h-6 rounded-full bg-slate-500/10 flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-500 transition">+</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: RESULTS */}
            <div className="xl:col-span-5 relative">
              <div className={`sticky top-24 p-6 rounded-3xl border shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-white/10' : 'bg-gradient-to-b from-white to-slate-50 border-slate-200'}`}>
                
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                  <Calculator className="w-48 h-48" />
                </div>
                
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-500/20 pb-4">
                  <FileText className="text-emerald-500 w-5 h-5"/> Hasil Faraid
                </h2>
                
                <div className="mb-4 bg-slate-500/5 p-4 rounded-2xl border border-slate-500/10">
                  <p className="text-xs font-semibold opacity-70 mb-1 uppercase tracking-wider">Harta Bersih (Tarikhah)</p>
                  <p className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-400">
                    {formatRupiah(calculationResult?.netto || 0)}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {calculationResult?.isAul && <span className="text-[10px] px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> KASUS AUL</span>}
                    {calculationResult?.isRadd && <span className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md font-bold flex items-center gap-1"><ArrowRightLeft className="w-3 h-3"/> KASUS RADD</span>}
                    {calculationResult?.isMusyarakah && <span className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-md font-bold">AL-MUSYARAKAH</span>}
                    {calculationResult?.isGharrawain && <span className="text-[10px] px-2 py-1 bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-md font-bold">GHARRAWAIN</span>}
                  </div>
                </div>

                {/* AUL / RADD DETAILED ALERTS */}
                {(calculationResult?.isAul || calculationResult?.isRadd) && (
                  <div className={`mb-5 p-3.5 rounded-xl border-l-4 text-xs leading-relaxed font-medium ${
                    calculationResult.isAul 
                    ? 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-200' 
                    : 'bg-blue-500/10 border-blue-500 text-blue-800 dark:text-blue-200'
                  }`}>
                    <strong className="block mb-1 font-bold">{calculationResult.isAul ? 'Penjelasan Aul:' : 'Penjelasan Radd:'}</strong>
                    {calculationResult.isAul ? calculationResult.aulDetail : calculationResult.raddDetail}
                  </div>
                )}

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {calculationResult && calculationResult.distributions && calculationResult.distributions.length > 0 ? (
                    calculationResult.distributions.map((distItem, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border relative overflow-hidden ${theme === 'dark' ? 'bg-slate-800/60 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-600"></div>
                        
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-sm">{distItem.label} {distItem.count > 1 ? <span className="text-[10px] font-normal bg-slate-500/20 px-1.5 py-0.5 rounded ml-1">{distItem.count} Orang</span> : ''}</h4>
                            <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-wide">{distItem.fractionText}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-base">{formatRupiah(distItem.value)}</p>
                            <p className="text-[10px] opacity-60">per orang</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-500/10 p-2.5 rounded-xl mt-2">
                          <p className="text-[11px] leading-relaxed opacity-90"><span className="font-semibold">Alasan:</span> {distItem.reason}</p>
                          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5 border-t border-slate-500/20 pt-1.5">
                            <BookOpen className="w-3 h-3" /> {distItem.dalil}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-50">
                      <Scale className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Belum ada perhitungan valid.</p>
                      <p className="text-xs mt-1">Silakan isi harta & ahli waris.</p>
                    </div>
                  )}
                </div>

                <button onClick={() => setActiveTab('chat')} className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-center gap-2 text-sm font-bold hover:shadow-lg transition">
                  <Sparkles className="w-4 h-4 text-amber-200 fill-amber-200" /> Tanya Rinci ke Mizan waris
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CHATBOT */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`flex flex-col h-[75vh] rounded-3xl border shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-200'}`}>
              
              <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-emerald-500/20 relative shadow-lg">
                    <img src="/logo.svg" className="w-full h-full object-cover" alt="Mizan Waris" referrerPolicy="no-referrer" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">Mizan waris AI <span className="bg-emerald-500/20 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Online</span></h3>
                    <p className="text-xs opacity-70">Asisten Faraid (Referensi Kitab Ahlus Sunnah)</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-500/5">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[10px] mr-2 mt-1 shadow-sm">Miz</div>}
                    <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm' 
                      : `${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-white border border-slate-100 text-slate-800'} rounded-tl-sm`
                    }`}>
                      {msg.text.split('\n').map((line, j) => {
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <p key={j} className="mb-2 last:mb-0">
                            {parts.map((part, k) => 
                              part.startsWith('**') && part.endsWith('**') 
                              ? <span key={k} className="font-bold">{part.slice(2, -2)}</span> 
                              : part
                            )}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs mr-2 mt-1">Miz</div>
                    <div className={`px-5 py-4 rounded-2xl rounded-tl-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white border border-slate-100'} flex gap-1.5 shadow-sm`}>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-500/70 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-2 h-2 bg-emerald-500/40 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className={`p-4 border-t ${theme === 'dark' ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <form onSubmit={(e) => { e.preventDefault(); chatWithAI(); }} className="relative flex items-center gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Contoh: Mizan, Radd itu dalilnya apa sih? Dan kenapa ke Ibu?" 
                    className={`flex-1 pl-4 pr-12 py-3.5 rounded-xl text-sm outline-none transition ${theme === 'dark' ? 'bg-slate-800 border border-white/10 focus:border-emerald-500' : 'bg-white border border-slate-300 focus:border-emerald-500 shadow-sm'}`}
                  />
                  <button 
                    type="submit" 
                    disabled={isTyping || !chatInput.trim()}
                    className={`absolute right-2 p-2.5 rounded-lg transition-all ${chatInput.trim() ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md scale-100' : 'text-slate-400 bg-transparent scale-90'}`}
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #10b981; border-radius: 4px; }
      `}} />
    </div>
  );
}
