import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
// VERSION: GOLD_SERVICES_V2_FINAL_SYNC
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ShieldCheck,
  Wallet,
  Zap,
  BookOpen,
  Menu,
  Coins,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoanOption {
  id: number;
  fee: string;
  receive: string;
  period: string;
}

const LOAN_OPTIONS: LoanOption[] = [
  { id: 1, fee: "549 MT", receive: "5.000–7.000 MT", period: "3 meses" },
  { id: 2, fee: "957 MT", receive: "8.000–10.000 MT", period: "4 meses" },
  { id: 3, fee: "1197 MT", receive: "12.000–15.000 MT", period: "5 meses" },
  { id: 4, fee: "1350 MT", receive: "16.000–19.000 MT", period: "6 meses" },
  { id: 5, fee: "1693 MT", receive: "20.000–23.000 MT", period: "7 meses" },
  { id: 6, fee: "1997 MT", receive: "25.000–37.000 MT", period: "8 meses" },
  { id: 7, fee: "2147 MT", receive: "38.000–49.000 MT", period: "9 meses" },
  { id: 8, fee: "2447 MT", receive: "50.000–64.000 MT", period: "10 meses" },
  { id: 9, fee: "2718 MT", receive: "68.000–86.000 MT", period: "11 meses" },
  { id: 10, fee: "3137 MT", receive: "87.000–100.000 MT", period: "12 meses" },
  { id: 11, fee: "3897 MT", receive: "102.000–118.000 MT", period: "13 meses" },
  { id: 12, fee: "4099 MT", receive: "120.000–135.000 MT", period: "14 meses" },
  { id: 13, fee: "4597 MT", receive: "136.000–167.000 MT", period: "15 meses" },
  { id: 14, fee: "5005 MT", receive: "168.000–189.000 MT", period: "16 meses" },
  { id: 15, fee: "5555 MT", receive: "190.000–200.000 MT", period: "17 meses" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const tabVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.25, staggerChildren: 0.1 }
  },
  exit: { 
    opacity: 0, 
    y: -15,
    transition: { duration: 0.2 }
  }
};

const RANDOM_NAMES = [
  "António Matsinhe", "Isabel Chirindza", "Fernando Mucavele", "Sílvia Langa",
  "Rui Mondlane", "Artur Chissano", "Fátima Mabote", "José Tembe",
  "Bernardo Machava", "Lucília Guambe", "Edson Cuamba", "Helena Muianga",
  "Patrício Sitoe", "Gilda Bata", "Mário Cossa", "Teresa Huo",
  "Armando Guebuza", "Graça Machel", "Alberto Mondlane", "Rosa Bila"
];

function App() {
  const [selectedOption, setSelectedOption] = useState<LoanOption | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [notification, setNotification] = useState<{ name: string; amount: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<{ name: string; amount: string; time: string }[]>([]);
  const [repaymentMethod, setRepaymentMethod] = useState<'monthly' | 'end_of_term' | null>(null);

  // 4-tab navigation
  const [formStep, setFormStep] = useState<number>(1);

  // Form fields for tab 3
  const [clientContact, setClientContact] = useState<string>("");
  const [receiveMethod, setReceiveMethod] = useState<string>("E-Mola");
  const [province, setProvince] = useState<string>("");
  const [workSector, setWorkSector] = useState<string>("");
  const [mpesaCopied, setMpesaCopied] = useState(false);
  const [emolaCopied, setEmolaCopied] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'applications' | 'gallery' | 'logs'>('overview');
  const [adminLoginForm, setAdminLoginForm] = useState({ username: '', password: '' });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminFiles, setAdminFiles] = useState<{ type: 'photo' | 'video', name: string, status: 'uploading' | 'done', data?: string }[]>([]);

  // base64 file data states
  const [biFrenteBase64, setBiFrenteBase64] = useState<string>("");
  const [biVersoBase64, setBiVersoBase64] = useState<string>("");
  const [paymentProofBase64, setPaymentProofBase64] = useState<string>("");

  // Applications list state
  const [applications, setApplications] = useState<any[]>([]);

  // Persistent CMS states (agora com id para poder apagar no Supabase)
  const [galleryImages, setGalleryImages] = useState<{ id: number; url: string }[]>([]);

  // -------- Supabase: carregar dados ao montar --------
  const loadFromSupabase = useCallback(async () => {
    if (!supabase) return;

    // Carregar imagens da galeria
    try {
      const { data: images } = await supabase
        .from('gallery_images')
        .select('id, data_url')
        .order('created_at', { ascending: true });

      if (images) {
        setGalleryImages(images.map((img: { id: number; data_url: string }) => ({ id: img.id, url: img.data_url })));
      }
    } catch (e) {
      console.error("Erro ao carregar imagens da galeria:", e);
    }

    // Carregar solicitações de empréstimo
    let dbApps: any[] = [];
    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && !error) {
        dbApps = data;
      }
    } catch (e) {
      console.warn("Tabela 'loan_applications' não encontrada ou erro ao acessar. Usando cache local.");
    }

    // Combinar com localStorage
    const localApps = JSON.parse(localStorage.getItem('loan_applications') || '[]');
    const combined = [...dbApps];
    localApps.forEach((la: any) => {
      // Comparação simples para evitar duplicados
      if (!combined.some(c => c.client_contact === la.client_contact && c.created_at === la.created_at)) {
        combined.push(la);
      }
    });

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setApplications(combined);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    void loadFromSupabase();
  }, [loadFromSupabase]);



  // Client name from form
  const [clientName, setClientName] = useState<string>("");

  // BI photo states: 'idle' | 'processing' | 'done'
  const [biFrenteStatus, setBiFrenteStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [biVersoStatus, setBiVersoStatus] = useState<'idle' | 'processing' | 'done'>('idle');

  // Comprovante submission states
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [submitProgress, setSubmitProgress] = useState(0);

  const isTab2Unlocked = true;
  const isTab3Unlocked = selectedOption !== null && repaymentMethod !== null;
  const isTab4Unlocked = isTab3Unlocked && 
                         clientName.trim() !== "" && 
                         clientContact.trim() !== "" && 
                         province !== "" && 
                         province !== "Selecione a província" && 
                         biFrenteStatus === "done" && 
                         biVersoStatus === "done";

  useEffect(() => {
    const interval = setInterval(() => {
      const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
      const randomOption = LOAN_OPTIONS[Math.floor(Math.random() * LOAN_OPTIONS.length)];
      const amount = randomOption.receive.split('–')[0];
      const newNotification = { name: randomName, amount: amount };

      setNotification(newNotification);

      // Update History
      const now = new Date();
      const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

      setNotificationHistory(prev => [
        { ...newNotification, time: timeStr },
        ...prev.slice(0, 9)
      ]);

      setTimeout(() => setNotification(null), 5000);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers or insecure contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in MS Edge.
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        console.error('Fallback: Oops, unable to copy', e);
      }
      document.body.removeChild(textarea);
    }
  };

  // Helper to copy number/code and show feedback

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleAdminUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      const newFileObj = { type: 'photo' as const, name: file.name, status: 'uploading' as const };
      setAdminFiles(prev => [...prev, newFileObj]);

      reader.onloadend = async () => {
        const base64 = reader.result as string;

        // Para fotos: converter em base64 e guardar no Supabase
        setAdminFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'done', data: base64 } : f));

        const { data, error } = await supabase
          .from('gallery_images')
          .insert({ data_url: base64 })
          .select('id, data_url')
          .single();

        if (!error && data) {
          setGalleryImages(prev => [...prev, { id: data.id, url: data.data_url }]);
        } else {
          console.error('Erro ao guardar imagem no Supabase:', error);
          alert('Erro ao guardar a imagem. Verifique a ligação ao Supabase.');
        }
      };
      
      reader.readAsDataURL(file);
    }
  };



  const handleBiPhoto = (e: React.ChangeEvent<HTMLInputElement>, setStatus: (s: 'idle' | 'processing' | 'done') => void) => {
    if (e.target.files && e.target.files[0]) {
      setStatus('processing');
      // Simulação de processamento/upload
      setTimeout(() => {
        setStatus('done');
      }, 1500);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Updated credentials as per user request
    if (adminLoginForm.username === 'kingleakds@gmail.com' && adminLoginForm.password === 'Albertina198211') {
      setIsAdminAuthenticated(true);
    } else {
      alert('Credenciais Inválidas');
    }
  };

  const handleSubmitComprovante = () => {
    if (submitStatus !== 'idle') return;
    setSubmitStatus('processing');
    setSubmitProgress(0);

    const duration = 3500;
    const steps = 60;
    const interval = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += 1;
      setSubmitProgress(Math.min(Math.round((current / steps) * 100), 99));
      if (current >= steps) {
        clearInterval(timer);
        setSubmitProgress(100);
        setTimeout(() => setSubmitStatus('done'), 400);
      }
    }, interval);
  };

  // Helper to calculate monthly payment range (Flex Mola Style)
  const getMonthlyPaymentRange = (receiveStr: string, periodStr: string) => {
    // Extract number of months
    const monthsMatch = periodStr.match(/\d+/);
    const months = monthsMatch ? parseInt(monthsMatch[0]) : 1;

    // Extract amounts from range (e.g. "5.000–7.000")
    // Replace dots and parse
    const amounts = receiveStr.replace(' MT', '').split(/[–-]/).map(s => {
      const clean = s.replace(/\./g, '').trim();
      return parseInt(clean);
    });

    if (amounts.length === 2 && !isNaN(amounts[0]) && !isNaN(amounts[1])) {
      const min = Math.ceil(amounts[0] / months);
      const max = Math.ceil(amounts[1] / months);
      
      const format = (val: number) => val.toLocaleString('pt-MZ').replace(/,/g, '.');
      return `${format(min)} MT a ${format(max)} MT`;
    } else if (amounts.length === 1 && !isNaN(amounts[0])) {
      const single = Math.ceil(amounts[0] / months);
      return `${single.toLocaleString('pt-MZ').replace(/,/g, '.')} MT`;
    }
    
    return "--- MT";
  };

  // Helper to calculate target month (for End of Term)
  const getTargetMonth = (periodStr: string) => {
    const monthsMatch = periodStr.match(/\d+/);
    const monthsToAdd = monthsMatch ? parseInt(monthsMatch[0]) : 1;
    
    const now = new Date();
    const targetDate = new Date(now.setMonth(now.getMonth() + monthsToAdd));
    
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    
    return {
      month: monthNames[targetDate.getMonth()],
      year: targetDate.getFullYear(),
      count: monthsToAdd
    };
  };

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', color: 'var(--foreground)', paddingBottom: '2rem', overflowX: 'hidden', position: 'relative' }}>
      {/* Admin Panel Modal */}
      <AnimatePresence>
        {isAdminOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
              backgroundColor: 'rgba(255, 255, 255, 0.98)', zIndex: 3000, 
              padding: 0, overflowY: 'auto', backdropFilter: 'blur(15px)'
            }}
          >
            <div style={{ maxWidth: '900px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              {!isAdminAuthenticated ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    style={{ 
                      width: '100%', maxWidth: '420px', padding: '3rem', backgroundColor: '#faf7f0', 
                      borderRadius: '2rem', border: '1px solid rgba(245, 158, 11, 0.15)',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                      position: 'relative', overflow: 'hidden'
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, #f59e0b, #ed8936)' }} />
                    
                    <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                      <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldCheck size={32} color="#f59e0b" />
                      </div>
                      <h2 style={{ fontSize: '1.75rem', color: '#1a1200', margin: '0 0 0.5rem 0', fontWeight: 800 }}>Portal do Administrador</h2>
                      <p style={{ color: '#8a7d6b', fontSize: '0.9rem' }}>Acesso restrito à equipa Gold Services</p>
                    </div>

                    <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#8a7d6b', fontWeight: 500 }}>Utilizador</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)', color: '#1a1200' }}
                          value={adminLoginForm.username}
                          onChange={(e) => setAdminLoginForm(prev => ({ ...prev, username: e.target.value }))}
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                        <label className="form-label" style={{ color: '#8a7d6b', fontWeight: 500 }}>Palavra-passe</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type={showAdminPassword ? "text" : "password"} 
                            className="form-input" 
                            style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)', color: '#1a1200', paddingRight: '3rem' }}
                            value={adminLoginForm.password}
                            onChange={(e) => setAdminLoginForm(prev => ({ ...prev, password: e.target.value }))}
                            required 
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            style={{ 
                              position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                              background: 'transparent', border: 'none', color: '#8a7d6b', cursor: 'pointer', padding: '4px'
                            }}
                          >
                            {showAdminPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                      <button 
                        type="submit" 
                        className="btn-cta" 
                        style={{ marginTop: '0.5rem', height: '3.5rem', borderRadius: '1rem', fontSize: '1rem' }}
                      >
                        Autenticar
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsAdminOpen(false)}
                        style={{ background: 'transparent', color: '#a09070', fontSize: '0.875rem', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Voltar ao Site
                      </button>
                    </form>
                  </motion.div>
                </div>
              ) : (
                <div style={{ padding: '2rem' }}>
                  {/* Dashboard Header */}
                  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid rgba(212, 144, 10, 0.15)', paddingBottom: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d4900a' }}></div>
                        <h2 style={{ fontSize: '1.5rem', color: '#1a1200', margin: 0, fontWeight: 800 }}>Painel de Gestão CMS</h2>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#8a7d6b' }}>Bem-vindo de volta, Admin</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <button 
                        onClick={() => setIsAdminAuthenticated(false)}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        Sair
                      </button>
                      <button 
                        onClick={() => setIsAdminOpen(false)}
                        style={{ background: '#f59e0b', color: '#ffffff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}
                      >
                        Fechar
                      </button>
                    </div>
                  </header>

                  {/* Tabs Navigation */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', backgroundColor: 'var(--bg-2)', padding: '0.4rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                    {[
                      { id: 'overview', label: 'Visão Geral', icon: Zap },
                      { id: 'gallery', label: 'Galeria', icon: Zap },
                      { id: 'logs', label: 'Registos', icon: Zap }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveAdminTab(tab.id as 'overview' | 'gallery' | 'logs')}
                        style={{ 
                          flex: 1, padding: '0.8rem', borderRadius: '0.75rem', border: 'none', 
                          backgroundColor: activeAdminTab === tab.id ? '#f59e0b' : 'transparent',
                          color: activeAdminTab === tab.id ? '#000' : '#94a3b8',
                          fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        <tab.icon size={16} />
                        <span className="hide-mobile">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <motion.div
                    key={activeAdminTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeAdminTab === 'overview' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                          <div className="card" style={{ padding: '1.5rem', marginBottom: 0, border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                            <p style={{ color: '#8a7d6b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total na Galeria</p>
                            <h3 style={{ fontSize: '2rem', margin: 0, color: '#f59e0b' }}>{galleryImages.length}</h3>
                          </div>
                          <div className="card" style={{ padding: '1.5rem', marginBottom: 0, border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                            <p style={{ color: '#8a7d6b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Estado do Vídeo</p>
                            <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#d4900a' }}>Ativo (YT)</h3>
                          </div>
                          <div className="card" style={{ padding: '1.5rem', marginBottom: 0, border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                            <p style={{ color: '#8a7d6b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Segurança</p>
                            <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#f59e0b' }}>SSL Ativo</h3>
                          </div>
                        </div>

                        <div className="card border-gold" style={{ padding: '2rem' }}>
                          <h3 style={{ marginBottom: '1rem' }}>Resumo de Atividade</h3>
                          <p style={{ color: '#8a7d6b', lineHeight: 1.6 }}>O painel administrativo permite o controlo total sobre os recursos visuais do site. Utilize as abas acima para gerir a galeria de fotos.</p>
                        </div>
                      </div>
                    )}

                    {activeAdminTab === 'gallery' && (
                      <div className="card" style={{ padding: '2.5rem', backgroundColor: '#faf7f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Galeria de Mídia</h3>
                          <button 
                            onClick={() => document.getElementById('admin-photo-upload')?.click()}
                            style={{ backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            + Adicionar Foto
                          </button>
                        </div>

                        <div 
                          onClick={() => document.getElementById('admin-photo-upload')?.click()}
                          style={{ 
                            backgroundColor: 'rgba(245, 158, 11, 0.03)', border: '2px dashed rgba(245, 158, 11, 0.3)', 
                            borderRadius: '1.5rem', padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '2.5rem'
                          }}
                        >
                          <span style={{ fontSize: '3rem', opacity: 0.5 }}>📂</span>
                          <p style={{ marginTop: '1rem', fontWeight: 600, color: '#8a7d6b' }}>Arraste para aqui ou clique para selecionar fotos</p>
                          <input id="admin-photo-upload" type="file" accept="image/*" hidden onChange={(e) => handleAdminUpload(e)} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                          {galleryImages.map((img) => (
                            <motion.div 
                              key={img.id} 
                              whileHover={{ scale: 1.02 }}
                              style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden', aspectRatio: '1/1', border: '1px solid rgba(212, 144, 10, 0.15)' }}
                            >
                              <img src={img.url} alt={`Gallery ${img.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.7))', opacity: 0 }}></div>
                              <button 
                                onClick={async () => {
                                  await supabase.from('gallery_images').delete().eq('id', img.id);
                                  setGalleryImages(prev => prev.filter(i => i.id !== img.id));
                                }}
                                style={{ 
                                  position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(239, 68, 68, 0.9)', 
                                  color: '#1a1200', borderRadius: '50%', width: '32px', height: '32px', border: 'none',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                                }}
                              >
                                <X size={16} />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeAdminTab === 'logs' && (
                      <div className="card" style={{ padding: '2.5rem' }}>
                        <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem' }}>Registos do Sistema</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {adminFiles.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#a09070' }}>
                              <Zap size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                              <p>Sem atividade recente para reportar.</p>
                            </div>
                          ) : (
                            adminFiles.map((file, idx) => (
                              <div key={idx} style={{ 
                                display: 'flex', alignItems: 'center', gap: '1rem', 
                                backgroundColor: 'var(--bg-2)', padding: '1.25rem', borderRadius: '1rem',
                                border: '1px solid rgba(212, 144, 10, 0.15)'
                              }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {file.type === 'photo' ? '🖼️' : '🎥'}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{file.name}</p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: file.status === 'done' ? '#f5a623' : '#f59e0b' }}></div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: file.status === 'done' ? '#f5a623' : '#f59e0b' }}>
                                      {file.status === 'done' ? 'Carregamento verificado e sincronizado' : 'Ficheiro em fila de processamento'}
                                    </span>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#a09070', fontWeight: 700 }}>RECENTE</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  <footer style={{ marginTop: 'auto', paddingTop: '4rem', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>
                    Protocolo de Gestão Gold Services v2.5.0
                  </footer>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Activity Indicator Removed from Fixed Position */}

      {/* Floating Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 50 }}
            className="floating-notification"
          >
            <div className="notification-icon" style={{ backgroundColor: '#a36700', borderRadius: '50%', padding: '8px', display: 'flex' }}>
              <Zap size={20} color="#ffffff" />
            </div>
            <div>
              <p className="notification-title" style={{ fontSize: '0.75rem', color: '#a36700', fontWeight: 700, margin: 0 }}>APROVADO AGORA!</p>
              <p className="notification-name" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1200', margin: '2px 0' }}>{notification.name}</p>
              <p className="notification-text" style={{ fontSize: '0.8rem', color: '#8a7d6b', margin: 0 }}>Recebeu {notification.amount} MT</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Coins className="text-gold" size={28} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#f59e0b', letterSpacing: '-0.5px' }}>GOLD</span>
            <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#1a1200', opacity: 0.8 }}>SERVICES <span style={{ color: '#f59e0b', fontSize: '0.6rem' }}>V2.5</span></span>
          </div>
        </div>
        <Menu size={24} style={{ cursor: 'pointer' }} onClick={() => setIsSidebarOpen(true)} />
      </header>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.35)', zIndex: 2000, backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, width: '85%', maxWidth: '350px', height: '100%', backgroundColor: '#faf7f0', zIndex: 2001, padding: '1.5rem', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', borderLeft: '1px solid rgba(245, 158, 11, 0.2)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#f59e0b', margin: 0 }}>Histórico de Aprovações</h2>
                <X size={24} onClick={() => setIsSidebarOpen(false)} style={{ cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notificationHistory.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#8a7d6b', marginTop: '2rem' }}>Aguardando novas aprovações...</p>
                ) : (
                  notificationHistory.map((notif, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={idx}
                      style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.1)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#1a1200' }}>{notif.name}</span>
                        <span style={{ fontSize: '0.7rem', color: '#8a7d6b' }}>{notif.time}</span>
                      </div>
                      <div style={{ color: '#d4900a', fontWeight: 600, fontSize: '0.9rem' }}>
                        Aprovado: {notif.amount} MT
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div style={{ position: 'absolute', bottom: '2rem', width: 'calc(100% - 3rem)', textAlign: 'center' }}>
                <span className="text-gold" style={{ fontSize: '0.8rem', opacity: 0.5 }}>Gold Services V2.5 - Histórico em Tempo Real</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        className="container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: '1.25rem',
          padding: '0.5rem',
          marginBottom: '3rem',
          gap: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }} className="tabs-nav-container">
          {[
            { id: 1, label: 'Informações', icon: 'ℹ️', unlocked: true },
            { id: 2, label: 'Solicitar', icon: '💰', unlocked: isTab2Unlocked },
            { id: 3, label: 'Dados Pessoais', icon: '📝', unlocked: isTab3Unlocked },
            { id: 4, label: 'Finalizar', icon: '✅', unlocked: isTab4Unlocked }
          ].map((tab) => {
            const isActive = formStep === tab.id;
            const isCompleted = tab.id < formStep;
            
            return (
              <button
                key={tab.id}
                type="button"
                disabled={!tab.unlocked}
                onClick={() => {
                  if (tab.unlocked) {
                    setFormStep(tab.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '0.8rem 1rem',
                  borderRadius: '0.85rem',
                  border: 'none',
                  backgroundColor: isActive 
                    ? 'rgba(245, 158, 11, 0.1)' 
                    : 'transparent',
                  color: isActive 
                    ? '#f59e0b' 
                    : tab.unlocked 
                      ? '#94a3b8' 
                      : '#334155',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.9rem',
                  cursor: tab.unlocked ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  borderBottom: isActive ? '2px solid #f59e0b' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{isCompleted ? '✓' : tab.icon}</span>
                <span>{tab.label}</span>
                {!tab.unlocked && <span style={{ fontSize: '0.75rem' }}>🔒</span>}
              </button>
            );
          })}
        </div>

        {/* Resumo da Simulação - Visível em todas as abas após seleção */}
        {selectedOption && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card border-gold"
            style={{
              padding: '1.25rem',
              marginBottom: '2.5rem',
              background: 'linear-gradient(135deg, var(--gold-pale) 0%, #fff8e6 100%)',
              border: '2px solid var(--gold)',
              borderRadius: '1.5rem',
              boxShadow: '0 10px 25px rgba(212, 144, 10, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212, 144, 10, 0.15)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} className="text-gold" />
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f59e0b', letterSpacing: '0.5px' }}>SIMULAÇÃO ATIVA</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  padding: '4px 12px',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 800,
                  transition: 'all 0.2s'
                }}
              >
                Alterar Simulação
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ borderRight: '1px solid rgba(212, 144, 10, 0.15)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#8a7d6b', fontWeight: 600, letterSpacing: '0.5px' }}>VOCÊ RECEBE</p>
                <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 900, color: '#d4900a' }}>{selectedOption.receive}</p>
              </div>
              <div style={{ borderRight: '1px solid rgba(212, 144, 10, 0.15)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#8a7d6b', fontWeight: 600, letterSpacing: '0.5px' }}>TAXA DE INSCRIÇÃO</p>
                <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 900, color: '#ef4444' }}>{selectedOption.fee}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#8a7d6b', fontWeight: 600, letterSpacing: '0.5px' }}>PRAZO TOTAL</p>
                <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 900, color: '#a36700' }}>{selectedOption.period}</p>
              </div>
            </div>

            {repaymentMethod && (
              <div style={{ 
                backgroundColor: 'rgba(212, 144, 10, 0.05)', 
                padding: '8px 12px', 
                borderRadius: '0.75rem', 
                fontSize: '0.78rem', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#8a7d6b',
                border: '1px solid rgba(212, 144, 10, 0.15)'
              }}>
                <span style={{ fontWeight: 600 }}>Forma de Devolução:</span>
                <span style={{ color: '#1a1200', fontWeight: 800 }}>
                  {repaymentMethod === 'monthly' ? '🗓️ PARCELADO MENSAL' : '🏁 PAGAR TUDO NO FINAL'}
                </span>
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {formStep === 1 && (
            <motion.div
              key="tab-info"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}
            >
              {/* === HERO SECTION === */}
              <motion.div variants={itemVariants} style={{ textAlign: 'center', padding: '1rem 0 0.5rem' }}>
                {/* Badge de credibilidade */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    backgroundColor: 'rgba(245, 166, 35, 0.1)',
                    border: '1px solid rgba(245, 166, 35, 0.3)',
                    borderRadius: '999px', padding: '6px 16px',
                    marginBottom: '1.75rem'
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d4900a', boxShadow: '0 0 8px #f5a623' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d4900a', letterSpacing: '0.5px' }}>SERVIÇO AUTORIZADO · MOÇAMBIQUE</span>
                </motion.div>

                <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem', letterSpacing: '-1px' }}>
                  Crédito Rápido e Seguro<br />
                  <span style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>até 200.000 MT</span>
                </h1>

                <p style={{ fontSize: '1.05rem', color: '#8a7d6b', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto 2rem' }}>
                  Receba o seu empréstimo via <strong style={{ color: '#1a1200' }}>M-Pesa ou E-Mola</strong> em até{' '}
                  <strong style={{ color: '#f59e0b' }}>8 minutos</strong> após a aprovação.
                </p>

                {/* Stats bar */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1px', backgroundColor: 'var(--border)',
                  borderRadius: '1.25rem', overflow: 'hidden',
                  border: '1px solid rgba(212, 144, 10, 0.15)',
                  marginBottom: '2rem'
                }}>
                  {[
                    { value: '+2.400', label: 'Clientes Aprovados', color: '#d4900a' },
                    { value: '8 min', label: 'Tempo Médio', color: '#f59e0b' },
                    { value: '100%', label: 'Digital & Seguro', color: '#d4900a' },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      backgroundColor: 'var(--bg-2)',
                      padding: '1.25rem 0.75rem',
                      textAlign: 'center'
                    }}>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: stat.color }}>{stat.value}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#8a7d6b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* === COMO FUNCIONA === */}
              <motion.div variants={itemVariants}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8a7d6b', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>Como Funciona</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { step: '01', icon: '💰', title: 'Escolha o Valor', desc: 'Selecione o montante e o prazo que se adapta ao seu orçamento' },
                    { step: '02', icon: '📝', title: 'Preencha o Formulário', desc: 'Dados básicos e foto do BI — processo 100% digital, sem filas' },
                    { step: '03', icon: '⚡', title: 'Aprovação em Minutos', desc: 'Receba confirmação e o dinheiro direto no seu M-Pesa ou E-Mola' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 * i }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '1rem',
                        backgroundColor: 'var(--bg-2)',
                        border: '1px solid rgba(212, 144, 10, 0.15)',
                        borderRadius: '1.25rem', padding: '1.25rem'
                      }}
                    >
                      <div style={{
                        minWidth: '48px', height: '48px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                        border: '1px solid rgba(245,158,11,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem'
                      }}>{item.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '1px' }}>PASSO {item.step}</span>
                        </div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#1a1200' }}>{item.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#8a7d6b', lineHeight: 1.5 }}>{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* === VANTAGENS === */}
              <motion.div variants={itemVariants}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8a7d6b', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>Porquê Escolher-nos</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                </div>

                <div className="feature-grid">
                  {[
                    { icon: <Clock size={22} color="#f59e0b" />, title: 'Aprovação em 8 min', desc: 'Resposta imediata após submissão' },
                    { icon: <ShieldCheck size={22} color="#f59e0b" />, title: '100% Seguro', desc: 'Dados encriptados e protegidos' },
                    { icon: <Wallet size={22} color="#f59e0b" />, title: 'Sem Burocracia', desc: 'Apenas BI — sem garantias' },
                    { icon: <Zap size={22} color="#f59e0b" />, title: 'Transferência Direta', desc: 'M-Pesa ou E-Mola instantâneo' },
                  ].map((feat, i) => (
                    <div key={i} className="feature-card" style={{ padding: '1.5rem', gap: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        backgroundColor: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>{feat.icon}</div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{feat.title}</h3>
                      <p style={{ fontSize: '0.8rem', color: '#8a7d6b', margin: 0, lineHeight: 1.5 }}>{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* === GALERIA (se existir) === */}
              {galleryImages.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8a7d6b', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>Comprovativos & Serviços</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {galleryImages.map((img) => (
                      <motion.div
                        key={img.id}
                        whileHover={{ scale: 1.02 }}
                        style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(245, 158, 11, 0.15)', aspectRatio: '4/3' }}
                      >
                        <img src={img.url} alt={`Comprovativo ${img.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* === CTA FINAL === */}
              <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', paddingBottom: '1rem' }}>
                <motion.button
                  className="btn-cta"
                  whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(245,158,11,0.4)' }}
                  whileTap={{ scale: 0.96 }}
                  animate={{ 
                    scale: [1, 1.03, 1], 
                    boxShadow: ['0 8px 24px rgba(245,158,11,0.25)', '0 15px 35px rgba(245,158,11,0.5)', '0 8px 24px rgba(245,158,11,0.25)'] 
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    borderRadius: '1.25rem',
                    padding: '1.2rem 3rem',
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    letterSpacing: '0.5px',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '350px',
                    boxShadow: '0 8px 24px rgba(34, 197, 94, 0.25)',
                    transition: 'box-shadow 0.3s'
                  }}
                  onClick={() => {
                    setFormStep(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  💸 SOLICITAR AGORA ⚡
                </motion.button>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#a09070', textAlign: 'center' }}>
                  ✓ Sem compromisso &nbsp;·&nbsp; ✓ Aprovação em minutos &nbsp;·&nbsp; ✓ 100% digital
                </p>
              </motion.div>
            </motion.div>
          )}

          {formStep === 2 && (
            <motion.div
              key="tab-simulate"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
            >
              <motion.div id="loan-options" variants={itemVariants} style={{ textAlign: 'center', margin: '1rem 0' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                  📊 TABELA DE TAXA DE RECEPÇÃO IMEDIATA ⚠️
                </h2>
                <p style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
                  <span>💬</span> ESCOLHE A OPÇÃO IDEAL PARA TI
                </p>
              </motion.div>

              <motion.div className="option-list" variants={itemVariants}>
                {LOAN_OPTIONS.map((opt) => (
                  <motion.div
                    key={opt.id}
                    className={`option-item ${selectedOption?.id === opt.id ? 'selected' : ''}`}
                    onClick={() => setSelectedOption(opt)}
                    whileHover={{ x: 5, backgroundColor: '#faf7f0' }}
                    whileTap={{ scale: 0.95, boxShadow: '0 0 40px rgba(245, 158, 11, 0.6)' }}
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge-number">{opt.id}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1a1200', letterSpacing: '0.5px' }}>PAGA {opt.fee}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a1200', fontSize: '0.9rem', paddingLeft: '2px' }}>
                      <span style={{ fontSize: '1.1rem' }}>👉</span>
                      <span style={{ fontWeight: 600, opacity: 0.9 }}>RECEBE {opt.receive}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <AnimatePresence>
                {selectedOption && (
                  <motion.div
                    key="selection-summary"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="card border-gold"
                    style={{ 
                      marginTop: '2rem', 
                      padding: '2rem', 
                      background: 'linear-gradient(135deg, rgba(8, 18, 14, 0.95) 0%, rgba(4, 22, 15, 0.95) 100%)',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <h2 style={{ fontSize: '1.5rem', color: '#a36700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        📋 Resumo da sua Solicitação
                      </h2>
                      
                      <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid var(--border)', marginBottom: '1.5rem', textAlign: 'left' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-2)' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '1rem', color: '#8a7d6b', fontWeight: 600, fontSize: '0.9rem' }}>VOCÊ RECEBE</td>
                              <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#d4900a' }}>{selectedOption.receive}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '1rem', color: '#8a7d6b', fontWeight: 600, fontSize: '0.9rem' }}>A PAGAR (TAXA)</td>
                              <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>{selectedOption.fee}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '1rem', color: '#8a7d6b', fontWeight: 600, fontSize: '0.9rem' }}>PRAZO TOTAL</td>
                              <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#a36700' }}>{selectedOption.period}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '2rem', color: '#a36700', fontSize: '1.25rem', textAlign: 'center' }}>
                      📅 Como deseja efetuar o pagamento?
                    </h3>
                  
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <motion.div
                        onClick={() => setRepaymentMethod('monthly')}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          padding: '1.5rem',
                          borderRadius: '1.5rem',
                          backgroundColor: repaymentMethod === 'monthly' ? 'rgba(212, 144, 10, 0.08)' : 'var(--bg-2)',
                          border: repaymentMethod === 'monthly' ? '2px solid var(--gold)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                          <div style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            border: `2px solid ${repaymentMethod === 'monthly' ? '#f5a623' : '#94a3b8'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {repaymentMethod === 'monthly' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#d4900a' }} />}
                          </div>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a1200' }}>PARCELADO MENSAL 🗓️</span>
                        </div>
                        <div style={{ paddingLeft: '36px' }}>
                          <p style={{ fontSize: '0.9rem', color: '#8a7d6b', margin: 0, lineHeight: 1.5 }}>
                            Pague o seu empréstimo em parcelas mensais suaves ao longo do prazo escolhido.
                          </p>
                          <AnimatePresence>
                            {repaymentMethod === 'monthly' && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ 
                                  marginTop: '1rem', 
                                  backgroundColor: 'rgba(245, 166, 35, 0.15)', 
                                  padding: '1rem', 
                                  borderRadius: '1rem', 
                                  border: '1px solid rgba(245, 166, 35, 0.3)',
                                  overflow: 'hidden'
                                }}
                              >
                                <div style={{ fontSize: '0.8rem', color: '#d4900a', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Prestação Mensal Estimada:</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a1200' }}>
                                  {getMonthlyPaymentRange(selectedOption.receive, selectedOption.period)} / mês
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      <motion.div
                        onClick={() => setRepaymentMethod('end_of_term')}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          padding: '1.5rem',
                          borderRadius: '1.5rem',
                          backgroundColor: repaymentMethod === 'end_of_term' ? 'rgba(192, 57, 43, 0.08)' : 'var(--bg-2)',
                          border: repaymentMethod === 'end_of_term' ? '2px solid var(--danger)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                          <div style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            border: `2px solid ${repaymentMethod === 'end_of_term' ? '#ef4444' : '#94a3b8'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {repaymentMethod === 'end_of_term' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />}
                          </div>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a1200' }}>PAGAR TUDO NO FINAL 🏁</span>
                        </div>
                        <div style={{ paddingLeft: '36px' }}>
                          <p style={{ fontSize: '0.9rem', color: '#8a7d6b', margin: 0, lineHeight: 1.5 }}>
                            Sem preocupações mensais. Devolva todo o montante de uma só vez no final do prazo.
                          </p>
                          <AnimatePresence>
                            {repaymentMethod === 'end_of_term' && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ 
                                  marginTop: '1rem', 
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                                  padding: '1rem', 
                                  borderRadius: '1rem', 
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  overflow: 'hidden'
                                }}
                              >
                                <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Data para Pagamento Único:</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a1200' }}>
                                  {getTargetMonth(selectedOption.period).month} de {getTargetMonth(selectedOption.period).year}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#8a7d6b', marginTop: '4px' }}>
                                  (Daqui a exatamente {getTargetMonth(selectedOption.period).count} meses)
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', gap: '1rem' }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    color: '#1a1200',
                    borderRadius: '1rem',
                    padding: '1rem 2rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                  onClick={() => {
                    setFormStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  ⬅ Voltar para Informações
                </button>
                
                <motion.button
                  className="btn-cta"
                  disabled={!isTab3Unlocked}
                  whileHover={isTab3Unlocked ? { scale: 1.02 } : {}}
                  whileTap={isTab3Unlocked ? { scale: 0.98 } : {}}
                  style={{
                    opacity: isTab3Unlocked ? 1 : 0.5,
                    cursor: isTab3Unlocked ? 'pointer' : 'not-allowed',
                    padding: '1rem 2.5rem',
                    borderRadius: '1rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    if (isTab3Unlocked) {
                      setFormStep(3);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                >
                  Avançar para Dados Pessoais ➔
                </motion.button>
              </div>
            </motion.div>
          )}

          {formStep === 3 && (
            <motion.div
              key="tab-form"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
            >
              <motion.div variants={itemVariants} className="card border-gold" style={{ padding: '2rem', margin: 0 }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.5rem', color: '#a36700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1rem' }}>
                    📝 Seus Dados Pessoais
                  </h2>
                  <p style={{ color: '#1a1200', marginTop: '0.5rem', fontSize: '1.125rem' }}>Preencha os seus dados para solicitar o seu empréstimo</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                  <div className="form-group">
                    <label className="form-label">Nome Completo *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Seu nome"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contacto *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Seu contacto" 
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método de Recebimento *</label>
                    <select 
                      className="form-select"
                      value={receiveMethod}
                      onChange={(e) => setReceiveMethod(e.target.value)}
                    >
                      <option value="E-Mola">E-Mola</option>
                      <option value="M-Pesa">M-Pesa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Província *</label>
                    <select 
                      className="form-select"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                    >
                      <option value="">Selecione a província</option>
                      <option value="Maputo">Maputo</option>
                      <option value="Matola">Matola</option>
                      <option value="Gaza">Gaza</option>
                      <option value="Inhambane">Inhambane</option>
                      <option value="Sofala">Sofala</option>
                      <option value="Manica">Manica</option>
                      <option value="Tete">Tete</option>
                      <option value="Zambézia">Zambézia</option>
                      <option value="Nampula">Nampula</option>
                      <option value="Niassa">Niassa</option>
                      <option value="Cabo Delgado">Cabo Delgado</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Setor de Trabalho</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Conta propria" 
                      value={workSector}
                      onChange={(e) => setWorkSector(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Foto do BI (Bilhete de Identidade) *</label>

                    <div style={{ marginTop: '1.5rem' }}>
                      <p style={{ color: '#1a1200', fontWeight: 600, marginBottom: '0.6rem', fontSize: '1rem' }}>Frente do BI</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-input"
                        onChange={(e) => handleBiPhoto(e, setBiFrenteStatus)}
                      />
                      <AnimatePresence>
                        {biFrenteStatus === 'processing' && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                              style={{
                                width: 16, height: 16, border: '2.5px solid rgba(245,158,11,0.3)',
                                borderTopColor: '#f59e0b', borderRadius: '50%', flexShrink: 0
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>A processar imagem...</span>
                          </motion.div>
                        )}
                        {biFrenteStatus === 'done' && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}
                          >
                            <div style={{
                              width: 20, height: 20, backgroundColor: '#d4900a', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              <span style={{ fontSize: '0.75rem', color: '#1a1200', fontWeight: 700 }}>✓</span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#d4900a', fontWeight: 600 }}>Imagem carregada com sucesso!</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                      <p style={{ color: '#1a1200', fontWeight: 600, marginBottom: '0.6rem', fontSize: '1rem' }}>Verso do BI</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-input"
                        onChange={(e) => handleBiPhoto(e, setBiVersoStatus)}
                      />
                      <AnimatePresence>
                        {biVersoStatus === 'processing' && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                              style={{
                                width: 16, height: 16, border: '2.5px solid rgba(245,158,11,0.3)',
                                borderTopColor: '#f59e0b', borderRadius: '50%', flexShrink: 0
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>A processar imagem...</span>
                          </motion.div>
                        )}
                        {biVersoStatus === 'done' && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}
                          >
                            <div style={{
                              width: 20, height: 20, backgroundColor: '#d4900a', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              <span style={{ fontSize: '0.75rem', color: '#1a1200', fontWeight: 700 }}>✓</span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#d4900a', fontWeight: 600 }}>Imagem carregada com sucesso!</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', gap: '1rem' }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    color: '#1a1200',
                    borderRadius: '1rem',
                    padding: '1rem 2rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                  onClick={() => {
                    setFormStep(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  ⬅ Voltar para Solicitação
                </button>
                
                <motion.button
                  className="btn-cta"
                  disabled={!isTab4Unlocked}
                  whileHover={isTab4Unlocked ? { scale: 1.02 } : {}}
                  whileTap={isTab4Unlocked ? { scale: 0.98 } : {}}
                  style={{
                    opacity: isTab4Unlocked ? 1 : 0.5,
                    cursor: isTab4Unlocked ? 'pointer' : 'not-allowed',
                    padding: '1rem 2.5rem',
                    borderRadius: '1rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    if (isTab4Unlocked) {
                      setFormStep(4);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                >
                  Avançar para Finalizar ➔
                </motion.button>
              </div>
            </motion.div>
          )}

          {formStep === 4 && (
            <motion.div
              key="tab-finalize"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
            >
              {selectedOption && (
                <motion.div
                  key="final-summary-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card border-gold"
                  style={{ 
                    padding: '2.5rem 1.5rem',
                    backgroundImage: 'linear-gradient(180deg, #faf7f0 0%, #ffffff 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                    margin: 0
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.03 }}>
                    <Zap size={200} color="#f59e0b" />
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.4rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      📋 Tabela de Resumo Final
                    </h2>
                    <div style={{ width: '40px', height: '4px', backgroundColor: '#f59e0b', margin: '15px auto', borderRadius: '2px' }} />
                  </div>

                  <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-2)' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid rgba(212, 144, 10, 0.15)' }}>
                          <td style={{ padding: '1rem', color: '#8a7d6b', fontWeight: 600, fontSize: '0.9rem' }}>NOME DO CANDIDATO</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#1a1200' }}>{clientName || '---'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(212, 144, 10, 0.15)' }}>
                          <td style={{ padding: '1rem', color: '#8a7d6b', fontWeight: 600, fontSize: '0.9rem' }}>MONTANTE A RECEBER</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#d4900a', fontSize: '1.1rem' }}>{selectedOption.receive}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(212, 144, 10, 0.15)' }}>
                          <td style={{ padding: '1rem', color: '#8a7d6b', fontWeight: 600, fontSize: '0.9rem' }}>TAXA DE INSCRIÇÃO</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#f59e0b' }}>{selectedOption.fee}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(212, 144, 10, 0.15)' }}>
                          <td style={{ padding: '1rem', color: '#8a7d6b', fontWeight: 600, fontSize: '0.9rem' }}>MÉTODO ESCOLHIDO</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                            {repaymentMethod === 'monthly' ? 'PARCELADO MENSAL' : repaymentMethod === 'end_of_term' ? 'PAGAR TUDO NO FINAL' : 'Pendente de seleção'}
                          </td>
                        </tr>
                        {repaymentMethod === 'monthly' && (
                          <tr style={{ borderBottom: '1px solid rgba(212, 144, 10, 0.15)' }}>
                            <td style={{ padding: '1rem', color: '#8a7d6b', fontWeight: 600, fontSize: '0.9rem' }}>MENSALIDADE FIXA</td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#1a1200' }}>{getMonthlyPaymentRange(selectedOption.receive, selectedOption.period)}</td>
                          </tr>
                        )}
                        {repaymentMethod === 'end_of_term' && (
                          <tr style={{ borderBottom: '1px solid rgba(212, 144, 10, 0.15)' }}>
                            <td style={{ padding: '1rem', color: '#8a7d6b', fontWeight: 600, fontSize: '0.9rem' }}>LIQUIDAÇÃO FINAL EM</td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#1a1200' }}>{getTargetMonth(selectedOption.period).month} de {getTargetMonth(selectedOption.period).year}</td>
                          </tr>
                        )}
                        <tr style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                          <td style={{ padding: '1rem', color: '#f59e0b', fontWeight: 800, fontSize: '0.9rem' }}>ESTADO DO PEDIDO</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 900, color: '#f59e0b' }}>✓ PRONTO A PROCESSAR</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--bg-2)', borderRadius: '1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ color: '#8a7d6b', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                      Ao efetuar o pagamento da taxa de inscrição, o seu crédito será processado automaticamente para o número indicado no formulário.
                    </p>
                  </div>
                </motion.div>
              )}

              <motion.div className="instruction-box" variants={itemVariants} style={{ margin: 0 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={20} /> Instruções de Pagamento:
                </h3>
                <ol>
                  <li>Faça a transferência da taxa correspondente abaixo.</li>
                  <li>Tire um print/foto do comprovativo de pagamento.</li>
                  <li>Carregue o comprovativo no botão de upload e clique em Enviar.</li>
                </ol>
              </motion.div>

              <motion.div
                variants={itemVariants}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
              >
                <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '1.25rem' }}>
                    <span role="img" aria-label="money">💰</span>
                    <span style={{ fontWeight: 700, color: '#f87171', fontSize: '1.2rem' }}>M-Pesa</span>
                  </div>

                  <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#1a1200' }}>855675443</span>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button type="button" className="copy-btn" onClick={(e) => { e.stopPropagation(); copyToClipboard('855675443'); setMpesaCopied(true); setTimeout(() => setMpesaCopied(false), 3000); }} style={{ background: 'linear-gradient(45deg, #ff416c, #ff4b2b)', color: '#ffffff', fontWeight: 700, borderRadius: '4px', padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 0, 0, 0.4)', transition: 'transform 0.2s' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        📋 <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Copiar</span>
                      </button>
                      <button type="button" className="transfer-btn" onClick={(e) => { e.stopPropagation(); window.location.href = 'tel:*150#'; }} style={{ background: 'linear-gradient(45deg, #28a745, #218838)', color: '#ffffff', fontWeight: 700, borderRadius: '4px', padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(40, 167, 69, 0.4)', transition: 'transform 0.2s' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        📞 <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Telefone</span>
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {mpesaCopied && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ color: '#d4900a', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}
                      >
                        Número copiado com sucesso
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ fontSize: '1.1rem', color: '#1a1200', opacity: 0.9 }}>
                    Nome: ISAIAS AURELIO SIMBINE
                  </div>
                </div>

                <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '1.25rem' }}>
                    <span role="img" aria-label="money-bag">💰</span>
                    <span style={{ fontWeight: 700, color: '#fb923c', fontSize: '1.2rem' }}>E-Mola</span>
                  </div>

                  <div className="payment-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#1a1200' }}>865937375</span>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button type="button" className="copy-btn" onClick={(e) => { e.stopPropagation(); copyToClipboard('865937375'); setEmolaCopied(true); setTimeout(() => setEmolaCopied(false), 3000); }} style={{ background: 'linear-gradient(45deg, #ff416c, #ff4b2b)', color: '#ffffff', fontWeight: 700, borderRadius: '4px', padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 0, 0, 0.4)', transition: 'transform 0.2s' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        📋 <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Copiar</span>
                      </button>
                      <button type="button" className="transfer-btn" onClick={(e) => { e.stopPropagation(); window.location.href = 'tel:*898#'; }} style={{ background: 'linear-gradient(45deg, #28a745, #218838)', color: '#ffffff', fontWeight: 700, borderRadius: '4px', padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(40, 167, 69, 0.4)', transition: 'transform 0.2s' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        📤 <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Telefone</span>
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {emolaCopied && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ color: '#d4900a', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}
                      >
                        Número copiado com sucesso
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ fontSize: '1.1rem', color: '#1a1200', opacity: 0.9 }}>
                    Nome: ISAIAS AURELIO SIMBINE
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="card"
                style={{ padding: '2rem', textAlign: 'center', margin: 0 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                  <span role="img" aria-label="upload" style={{ backgroundcolor: '#d4900a', borderRadius: '4px', padding: '2px', color: '#1a1200' }}>⬆️</span>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a1200' }}>Carregar Comprovativo de Pagamento</h3>
                </div>

                <div
                  style={{
                    backgroundColor: '#f3edd9',
                    padding: '0.75rem',
                    borderRadius: '2rem',
                    marginBottom: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <button type="button" style={{ backgroundcolor: '#1a1200', color: '#ffffff', borderRadius: '2rem', padding: '6px 16px', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                    Escolher ficheiro
                  </button>
                  <input
                    id="file-upload"
                    type="file"
                    hidden
                    onChange={handleFileChange}
                  />
                  <span style={{ color: '#1a1200', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fileName ? fileName : 'nenhum fic...elecionado'}
                  </span>
                </div>

                {!fileName && submitStatus === 'idle' && (
                  <div style={{
                    borderRadius: '0.75rem', padding: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    backgroundColor: '#f3edd9',
                    border: '1.5px dashed var(--border)',
                    cursor: 'not-allowed',
                    opacity: 0.55
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>🔒</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#8a7d6b' }}>Enviar Comprovativo</span>
                  </div>
                )}

                {(fileName || submitStatus !== 'idle') && (
                  <motion.button
                    className="btn-cta"
                    style={{
                      backgroundColor: submitStatus === 'done' ? '#15803d' : '#cc0000',
                      borderRadius: '0.75rem', padding: '1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      opacity: submitStatus === 'processing' ? 0.85 : 1,
                      cursor: submitStatus !== 'idle' ? 'not-allowed' : 'pointer',
                      border: 'none',
                      width: '100%'
                    }}
                    whileHover={submitStatus === 'idle' ? { scale: 1.02 } : {}}
                    whileTap={submitStatus === 'idle' ? { scale: 0.98 } : {}}
                    onClick={handleSubmitComprovante}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {submitStatus === 'idle' && (
                      <>
                        <span role="img" aria-label="check">✅</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Enviar Comprovativo</span>
                      </>
                    )}
                    {submitStatus === 'processing' && (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                          style={{ width: 20, height: 20, border: '3px solid rgba(26, 18, 0, 0.15)', borderTopColor: '#1a1200', borderRadius: '50%' }}
                        />
                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>A enviar...</span>
                      </>
                    )}
                    {submitStatus === 'done' && (
                      <>
                        <span style={{ fontSize: '1.2rem' }}>✅</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Enviado com Sucesso!</span>
                      </>
                    )}
                  </motion.button>
                )}

                <AnimatePresence>
                  {submitStatus === 'processing' && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ marginTop: '1rem' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#8a7d6b' }}>A processar o seu comprovativo...</span>
                        <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>{submitProgress}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
                        <motion.div
                          animate={{ width: `${submitProgress}%` }}
                          transition={{ ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #f59e0b, #f5a623)' }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {submitStatus === 'done' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      style={{
                        marginTop: '1.5rem',
                        background: 'linear-gradient(135deg, #f3edd9 0%, #ffffff 100%)',
                        border: '1.5px solid rgba(245, 166, 35, 0.4)',
                        borderRadius: '1.25rem',
                        padding: '1.75rem 1.5rem',
                        textAlign: 'center',
                        boxShadow: '0 0 30px rgba(245, 166, 35, 0.1)'
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                        style={{
                          width: 56, height: 56, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #d97706, #f5a623)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 1rem',
                          boxShadow: '0 0 20px rgba(245,166,35,0.5)'
                        }}
                      >
                        <span style={{ fontSize: '1.8rem' }}>✓</span>
                      </motion.div>

                      <h3 style={{ color: '#d4900a', fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                        Comprovativo Recebido!
                      </h3>

                      <p style={{ color: '#1a1200', fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', lineHeight: 1.5 }}>
                        Obrigado{clientName ? `, ${clientName.split(' ')[0]}` : ''}! 🙏
                      </p>

                      <p style={{ color: '#8a7d6b', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                        O seu pedido de empréstimo foi submetido com sucesso.
                        A nossa equipa irá analisar o seu comprovativo e a aprovação
                        pode levar <span style={{ color: '#f59e0b', fontWeight: 700 }}>até 8 minutos</span>. ⏱️
                      </p>

                      <div style={{
                        background: 'rgba(245, 158, 11, 0.07)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: '0.875rem',
                        padding: '1rem'
                      }}>
                        <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                          📞 Precisa de ajuda? Contacte o nosso apoio:
                        </p>

                        <p style={{ color: '#1a1200', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1rem' }}>Movitel: <span style={{ color: '#fb923c' }}>865 937 375</span></p>
                        
                        <a 
                          href="https://wa.me/258865937375" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            backgroundColor: '#25D366',
                            color: '#1a1200',
                            fontWeight: 700,
                            padding: '0.75rem 1.5rem',
                            borderRadius: '2rem',
                            textDecoration: 'none',
                            boxShadow: '0 4px 12px rgba(245, 166, 35, 0.3)',
                            transition: 'transform 0.2s',
                            width: '100%',
                            maxWidth: '300px',
                            margin: '0 auto'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                          </svg>
                          WhatsApp +258 85 567 5443
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {submitStatus !== 'done' && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
                  <button
                    type="button"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      color: '#1a1200',
                      borderRadius: '1rem',
                      padding: '1rem 2rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                    onClick={() => {
                      setFormStep(3);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    ⬅ Voltar para o Formulário
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="footer-section" style={{ marginTop: '5rem', borderTop: '1px solid #e8d5a0', paddingTop: '3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <div>
              <h3 style={{ color: '#a36700', fontSize: '1.25rem', marginBottom: '1rem' }}>Serviços Gold</h3>
              <p style={{ color: '#8a7d6b', lineHeight: 1.6 }}>Empréstimos rápidos e seguros em Moçambique. Receba o seu crédito em minutos via M-Pesa ou E-Mola.</p>
            </div>

            <div>
              <h3 style={{ color: '#a36700', fontSize: '1rem', marginBottom: '1rem' }}>Links Úteis</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: '#8a7d6b', fontSize: '0.875rem' }}>
                <span>Sobre</span> | <span>Termos</span> | <span>Privacidade</span> | <span>Apoio</span>
              </div>
            </div>

            <div>
              <h3 style={{ color: '#a36700', fontSize: '1rem', marginBottom: '1rem' }}>Contatos</h3>
              <div style={{ color: '#8a7d6b', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span>📞 855675443 | 865937375</span>
                <span>📧 info@goldservices.co.mz</span>
                <span>📍 Maputo, Moçambique</span>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setIsAdminOpen(true)}
            style={{ textAlign: 'center', marginTop: '4rem', fontSize: '10px', color: '#333', cursor: 'pointer', padding: '1rem' }}
          >
            © 2024 Gold Services. Todos os direitos reservados.
            <br />
            Processamos o seu pedido em tempo recorde.
          </div>
        </footer>
      </motion.div>
    </div>
  );
}

export default App;
