import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  EyeOff,
  Volume2,
  VolumeX
} from 'lucide-react';

interface LoanOption {
  id: number;
  fee: string;
  receive: string;
  period: string;
}

const LOAN_OPTIONS: LoanOption[] = [
  { id: 1, fee: "516 MT", receive: "5.000–7.000 MT", period: "3 meses" },
  { id: 2, fee: "888 MT", receive: "8.000–10.000 MT", period: "4 meses" },
  { id: 3, fee: "1099 MT", receive: "12.000–15.000 MT", period: "5 meses" },
  { id: 4, fee: "1257 MT", receive: "20.000–23.000 MT", period: "6 meses" },
  { id: 5, fee: "1693 MT", receive: "25.000–37.000 MT", period: "7 meses" },
  { id: 6, fee: "1903 MT", receive: "50.000–64.000 MT", period: "8 meses" },
  { id: 7, fee: "2109 MT", receive: "68.000–86.000 MT", period: "9 meses" },
  { id: 8, fee: "2601 MT", receive: "87.000–100.000 MT", period: "10 meses" },
  { id: 9, fee: "2903 MT", receive: "120.000–135.000 MT", period: "11 meses" },
  { id: 10, fee: "3016 MT", receive: "136.000–167.000 MT", period: "12 meses" },
  { id: 11, fee: "3801 MT", receive: "168.000–189.000 MT", period: "13 meses" },
  { id: 12, fee: "4016 MT", receive: "190.000–200.000 MT", period: "14 meses" },
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
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'video' | 'gallery' | 'logs'>('overview');
  const [adminLoginForm, setAdminLoginForm] = useState({ username: '', password: '' });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [videoLinkUrl, setVideoLinkUrl] = useState<string>("");
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [isVolumeEnabled, setIsVolumeEnabled] = useState(true);
  const [showVolumeBadge, setShowVolumeBadge] = useState(false);
  const [adminFiles, setAdminFiles] = useState<{ type: 'photo' | 'video', name: string, status: 'uploading' | 'done', data?: string }[]>([]);

  // Ref do elemento de vídeo para controlo de autoplay por scroll
  const videoRef = useRef<HTMLVideoElement>(null);

  // IntersectionObserver: inicia o vídeo quando fica visível no ecrã
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !isAutoplayEnabled) return;

    // Função para tentar dar play com ou sem som
    const attemptPlay = async () => {
      try {
        // Primeiro tenta com o som configurado
        videoEl.muted = !isVolumeEnabled;
        await videoEl.play();
      } catch (err) {
        console.log("Autoplay with sound blocked, falling back to muted:", err);
        // Se falhar (quase sempre falha com som sem interação), tenta muted para garantir playback
        videoEl.muted = true;
        await videoEl.play().catch(e => console.log("Muted autoplay also failed:", e));
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            attemptPlay();
          } else {
            videoEl.pause();
          }
        });
      },
      { 
        threshold: 0.3,
        rootMargin: "0px"
      }
    );

    // Listener global para "destrancar" o som na primeira interação
    const handleFirstInteraction = () => {
      if (isVolumeEnabled && videoEl && videoEl.muted) {
        videoEl.muted = false;
        videoEl.play().catch(() => {});
      }
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('mousedown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    observer.observe(videoEl);
    return () => {
      observer.disconnect();
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [isAutoplayEnabled, isVolumeEnabled, videoFileUrl]);
  
  // Persistent CMS states (agora com id para poder apagar no Supabase)
  const [galleryImages, setGalleryImages] = useState<{ id: number; url: string }[]>([]);

  // -------- Supabase: carregar dados ao montar --------
  const loadFromSupabase = useCallback(async () => {
    // Carregar configurações CMS
    const { data: settings } = await supabase
      .from('cms_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settings) {
      setIsAutoplayEnabled(settings.autoplay_enabled ?? false);
      setIsVolumeEnabled(settings.volume_enabled ?? false);
      if (settings.video_url) {
        if (settings.video_url.startsWith('data:')) {
          setVideoFileUrl(settings.video_url);
        } else {
          setVideoLinkUrl(settings.video_url);
          setVideoFileUrl(settings.video_url);
        }
      }
    }

    // Carregar imagens da galeria
    const { data: images } = await supabase
      .from('gallery_images')
      .select('id, data_url')
      .order('created_at', { ascending: true });

    if (images) {
      setGalleryImages(images.map((img: { id: number; data_url: string }) => ({ id: img.id, url: img.data_url })));
    }
  }, []);

  useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);



  // Client name from form
  const [clientName, setClientName] = useState<string>("");

  // BI photo states: 'idle' | 'processing' | 'done'
  const [biFrenteStatus, setBiFrenteStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [biVersoStatus, setBiVersoStatus] = useState<'idle' | 'processing' | 'done'>('idle');

  // Comprovante submission states
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [submitProgress, setSubmitProgress] = useState(0);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    setTimeout(() => setCopiedNumber(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleAdminUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      const newFileObj = { type, name: file.name, status: 'uploading' as const };
      setAdminFiles(prev => [...prev, newFileObj]);

      reader.onloadend = async () => {
        const base64 = reader.result as string;

        if (type === 'video') {
          // Para vídeos: guardar base64 para permanência (limite de ~5-10MB por conta do Supabase)
          setVideoFileUrl(base64);
          setAdminFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'done', data: base64 } : f));
        } else {
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
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Função para limpar e converter links (Drive, YouTube, etc)
  const getProcessedUrl = (url: string) => {
    if (!url) return "";
    
    // Suporte para YouTube (incluindo Shorts)
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let id = "";
      if (url.includes('shorts/')) id = url.split('shorts/')[1]?.split('?')[0];
      else if (url.includes('v=')) id = url.split('v=')[1]?.split('&')[0];
      else if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1]?.split('?')[0];
      
      if (id) {
        const params = new URLSearchParams({
          autoplay: isAutoplayEnabled ? '1' : '0',
          mute: !isVolumeEnabled ? '1' : '0',
          loop: '1',
          playlist: id,
          rel: '0',
          modestbranding: '1'
        });
        return `https://www.youtube.com/embed/${id}?${params.toString()}`;
      }
    }

    // Suporte para Google Drive
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
      const idMatch = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/) || url.match(/\/d\/(.+?)$/);
      const id = idMatch ? idMatch[1] : null;
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    
    return url;
  };

  const applyVideoChanges = async () => {
    try {
      let finalUrl = videoFileUrl?.startsWith('data:') ? videoFileUrl : (videoLinkUrl || videoFileUrl);
      finalUrl = getProcessedUrl(finalUrl || "");

      const settingsData = { 
        id: 1, 
        autoplay_enabled: isAutoplayEnabled, 
        volume_enabled: isVolumeEnabled, 
        video_url: finalUrl || null, 
        updated_at: new Date().toISOString() 
      };

      const { error } = await supabase.from('cms_settings').upsert(settingsData);

      if (!error) {
        setVideoFileUrl(finalUrl);
        alert(`Sucesso! Configurações guardadas.`);
      } else {
        alert(`Erro Supabase: ${error.message}`);
      }
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message);
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

  return (
    <div style={{ backgroundColor: '#04160f', minHeight: '100vh', color: '#fcfbf8', paddingBottom: '2rem', overflowX: 'hidden' }}>
      {/* Admin Panel Modal */}
      <AnimatePresence>
        {isAdminOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
              backgroundColor: 'rgba(2, 8, 6, 0.99)', zIndex: 3000, 
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
                      width: '100%', maxWidth: '420px', padding: '3rem', backgroundColor: '#08120e', 
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
                      <h2 style={{ fontSize: '1.75rem', color: '#fcfbf8', margin: '0 0 0.5rem 0', fontWeight: 800 }}>Admin Portal</h2>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Acesso restrito à equipa Gold Services</p>
                    </div>

                    <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#94a3b8', fontWeight: 500 }}>Utilizador</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'white' }}
                          value={adminLoginForm.username}
                          onChange={(e) => setAdminLoginForm(prev => ({ ...prev, username: e.target.value }))}
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                        <label className="form-label" style={{ color: '#94a3b8', fontWeight: 500 }}>Palavra-passe</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type={showAdminPassword ? "text" : "password"} 
                            className="form-input" 
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'white', paddingRight: '3rem' }}
                            value={adminLoginForm.password}
                            onChange={(e) => setAdminLoginForm(prev => ({ ...prev, password: e.target.value }))}
                            required 
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            style={{ 
                              position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                              background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px'
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
                        style={{ background: 'transparent', color: '#4b5563', fontSize: '0.875rem', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Voltar ao Site
                      </button>
                    </form>
                  </motion.div>
                </div>
              ) : (
                <div style={{ padding: '2rem' }}>
                  {/* Dashboard Header */}
                  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                        <h2 style={{ fontSize: '1.5rem', color: '#fcfbf8', margin: 0, fontWeight: 800 }}>Dashboard CMS</h2>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Bem-vindo de volta, Admin</p>
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
                        style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}
                      >
                        Fechar
                      </button>
                    </div>
                  </header>

                  {/* Tabs Navigation */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {[
                      { id: 'overview', label: 'Visão Geral', icon: Zap },
                      { id: 'video', label: 'Vídeo Tutorial', icon: Zap },
                      { id: 'gallery', label: 'Galeria', icon: Zap },
                      { id: 'logs', label: 'Registos', icon: Zap }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveAdminTab(tab.id as any)}
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
                            <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total na Galeria</p>
                            <h3 style={{ fontSize: '2rem', margin: 0, color: '#f59e0b' }}>{galleryImages.length}</h3>
                          </div>
                          <div className="card" style={{ padding: '1.5rem', marginBottom: 0, border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                            <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Estado do Vídeo</p>
                            <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#22c55e' }}>Ativo (YT)</h3>
                          </div>
                          <div className="card" style={{ padding: '1.5rem', marginBottom: 0, border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                            <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Segurança</p>
                            <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#f59e0b' }}>SSL Ativo</h3>
                          </div>
                        </div>

                        <div className="card border-gold" style={{ padding: '2rem' }}>
                          <h3 style={{ marginBottom: '1rem' }}>Resumo de Atividade</h3>
                          <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>O painel administrativo permite o controlo total sobre os recursos visuais do site. Utilize as abas acima para gerir o vídeo principal e a galeria de fotos.</p>
                        </div>
                      </div>
                    )}

                    {activeAdminTab === 'video' && (
                      <div className="card border-gold" style={{ padding: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
                          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '0.75rem' }}>
                            <Zap size={24} color="#f59e0b" />
                          </div>
                          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Configuração de Vídeo</h3>
                        </div>
                        
                        <div 
                          onClick={() => document.getElementById('admin-video-upload')?.click()}
                          style={{ 
                            backgroundColor: 'rgba(245, 158, 11, 0.03)', border: '2px dashed #f59e0b', 
                            borderRadius: '1rem', padding: '3rem 1.5rem', textAlign: 'center', cursor: 'pointer',
                            marginBottom: '1.5rem'
                          }}
                        >
                          <span style={{ fontSize: '2.5rem' }}>🎬</span>
                          <p style={{ marginTop: '1rem', fontWeight: 700 }}>{videoFileUrl?.startsWith('data:') ? 'Alterar Ficheiro Local' : 'Selecionar Vídeo Local'}</p>
                          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>MP4, WebM ou OGG (Base64)</p>
                          <input id="admin-video-upload" type="file" accept="video/*" hidden onChange={(e) => handleAdminUpload(e, 'video')} />
                        </div>

                        {/* External Link Input */}
                        <div style={{ marginBottom: '2rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                            🔗 Link do Google Drive ou Externo (Link Direto)
                          </label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="https://drive.google.com/file/d/..."
                            value={videoLinkUrl}
                            onChange={(e) => {
                              setVideoLinkUrl(e.target.value);
                              if (e.target.value) {
                                const direct = getProcessedUrl(e.target.value);
                                setVideoFileUrl(direct);
                              }
                            }}
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'white' }}
                          />
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                            Dica: Podes colar o link normal do Google Drive. O sistema corrige-o automaticamente!
                          </p>
                        </div>

                        {/* Remove Video Button */}
                        <button 
                          onClick={() => { setVideoFileUrl(null); setVideoLinkUrl(""); }}
                          style={{ marginBottom: '2rem', padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          🗑️ Limpar Vídeo Atual
                        </button>

                        {/* Video Controls (Toggles) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <Zap size={18} color={isAutoplayEnabled ? "#22c55e" : "#4b5563"} />
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Reprodução Automática</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>O vídeo inicia sozinho ao aparecer</p>
                              </div>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={isAutoplayEnabled} 
                              onChange={(e) => setIsAutoplayEnabled(e.target.checked)}
                              style={{ width: '20px', height: '20px', accentColor: '#f59e0b', cursor: 'pointer' }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <Zap size={18} color={isVolumeEnabled ? "#f59e0b" : "#4b5563"} />
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Volume Ativo</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>O vídeo inicia com som (se permitido pelo browser)</p>
                              </div>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={isVolumeEnabled} 
                              onChange={(e) => setIsVolumeEnabled(e.target.checked)}
                              style={{ width: '20px', height: '20px', accentColor: '#f59e0b', cursor: 'pointer' }}
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: '2.5rem' }}>
                          <button 
                            onClick={applyVideoChanges}
                            style={{ 
                              width: '100%', padding: '1.25rem', backgroundColor: '#22c55e', 
                              color: 'white', border: 'none', borderRadius: '1rem', fontWeight: 800, 
                              fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                              justifyContent: 'center', gap: '10px' 
                            }}
                          >
                            💾 Salvar e Aplicar (Autoplay)
                          </button>
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#f59e0b' }}>📺 Pré-visualização:</h4>
                          <div style={{ width: '100%', aspectRatio: '9/16', borderRadius: '0.75rem', overflow: 'hidden', backgroundColor: '#000', maxWidth: '300px', margin: '0 auto', position: 'relative' }}>
                            {videoFileUrl ? (
                              <>
                                {videoFileUrl.includes('youtube.com/embed') ? (
                                  <iframe 
                                    src={videoFileUrl}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                  />
                                ) : (
                                  <video 
                                    controls 
                                    onLoadStart={() => setIsVideoLoading(true)}
                                    onCanPlay={() => setIsVideoLoading(false)}
                                    onError={() => setIsVideoLoading(false)}
                                    src={videoFileUrl || undefined} 
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                )}
                              </>
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}>
                                Sem vídeo
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                            <strong>Nota:</strong> Vídeos em ficheiro são limitados à sessão atual. Para permanência, utilize links externos.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeAdminTab === 'gallery' && (
                      <div className="card" style={{ padding: '2.5rem', backgroundColor: '#08120e' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Galeria de Media</h3>
                          <button 
                            onClick={() => document.getElementById('admin-photo-upload')?.click()}
                            style={{ backgroundColor: '#f59e0b', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
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
                          <p style={{ marginTop: '1rem', fontWeight: 600, color: '#94a3b8' }}>Arraste para aqui ou clique para selecionar fotos</p>
                          <input id="admin-photo-upload" type="file" accept="image/*" hidden onChange={(e) => handleAdminUpload(e, 'photo')} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                          {galleryImages.map((img) => (
                            <motion.div 
                              key={img.id} 
                              whileHover={{ scale: 1.02 }}
                              style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden', aspectRatio: '1/1', border: '1px solid rgba(255,255,255,0.05)' }}
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
                                  color: 'white', borderRadius: '50%', width: '32px', height: '32px', border: 'none',
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
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#4b5563' }}>
                              <Zap size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                              <p>Sem atividade recente para reportar.</p>
                            </div>
                          ) : (
                            adminFiles.map((file, idx) => (
                              <div key={idx} style={{ 
                                display: 'flex', alignItems: 'center', gap: '1rem', 
                                backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '1rem',
                                border: '1px solid rgba(255,255,255,0.05)'
                              }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {file.type === 'photo' ? '🖼️' : '🎥'}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{file.name}</p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: file.status === 'done' ? '#22c55e' : '#f59e0b' }}></div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: file.status === 'done' ? '#22c55e' : '#f59e0b' }}>
                                      {file.status === 'done' ? 'Upload verificado e sincronizado' : 'Ficheiro em fila de processamento'}
                                    </span>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: 700 }}>RECENTE</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  <footer style={{ marginTop: 'auto', paddingTop: '4rem', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>
                    Gold Services Management Protocol v2.5.0
                  </footer>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 50 }}
            className="floating-notification"
          >
            <div className="notification-icon" style={{ backgroundColor: '#eab308', borderRadius: '50%', padding: '8px', display: 'flex' }}>
              <Zap size={20} color="#04160f" />
            </div>
            <div>
              <p className="notification-title" style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 700, margin: 0 }}>APROVADO AGORA!</p>
              <p className="notification-name" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', margin: '2px 0' }}>{notification.name}</p>
              <p className="notification-text" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Recebeu {notification.amount} MT</p>
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
            <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#fcfbf8', opacity: 0.8 }}>SERVICES <span style={{ color: '#f59e0b', fontSize: '0.6rem' }}>V2.5</span></span>
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
              style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000, backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, width: '85%', maxWidth: '350px', height: '100%', backgroundColor: '#08120e', zIndex: 2001, padding: '1.5rem', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', borderLeft: '1px solid rgba(245, 158, 11, 0.2)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#f59e0b', margin: 0 }}>Histórico de Aprovações</h2>
                <X size={24} onClick={() => setIsSidebarOpen(false)} style={{ cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notificationHistory.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>Aguardando novas aprovações...</p>
                ) : (
                  notificationHistory.map((notif, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={idx}
                      style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.1)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'white' }}>{notif.name}</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{notif.time}</span>
                      </div>
                      <div style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.9rem' }}>
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
        {/* Hero Section */}
        <motion.div
          variants={itemVariants}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.1 }}>
            Empréstimos Rápidos <br />
            <span className="text-gold">para Realizar os Seus Sonhos</span>
          </h1>
          <p style={{ fontSize: '1rem', color: '#94a3b8', margin: '1.5rem 0' }}>
            Crédito de <span className="text-gold">5.000 a 200.000 MZN</span><br />
            aprovação em até <span className="text-red">8 minutos</span>
          </p>

          {/* Video Section - Vertical Format */}
          <motion.div 
            variants={itemVariants}
            style={{ 
              margin: '2rem auto',
              padding: '1rem',
              backgroundColor: 'rgba(245, 158, 11, 0.05)',
              borderRadius: '1.5rem',
              border: '2px solid rgba(245, 158, 11, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              maxWidth: '360px'
            }}
          >
            <div 
              style={{ 
                width: '100%', 
                aspectRatio: '9/16', 
                backgroundColor: '#08120e',
                borderRadius: '1rem',
                border: '1px solid rgba(245, 158, 11, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={() => {
                setIsVolumeEnabled(!isVolumeEnabled);
                setShowVolumeBadge(true);
                setTimeout(() => setShowVolumeBadge(false), 1500);
                if (videoRef.current) videoRef.current.play().catch(() => {});
              }}
            >
              {videoFileUrl?.includes('youtube.com/embed') ? (
                <iframe 
                  src={videoFileUrl}
                  onLoad={() => setIsVideoLoading(false)}
                  style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video 
                  ref={videoRef}
                  key={videoFileUrl || 'no-video'}
                  muted={!isVolumeEnabled}
                  playsInline
                  controls
                  controlsList="noplaybackrate nodownload"
                  onLoadStart={() => setIsVideoLoading(true)}
                  onCanPlay={() => setIsVideoLoading(false)}
                  onLoadedData={() => setIsVideoLoading(false)}
                  onError={() => setIsVideoLoading(false)}
                  src={videoFileUrl || undefined} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '1rem' }}
                >
                  Seu navegador não suporta a tag de vídeo.
                </video>
              )}

              {/* Distintivo de Volume (Feedback Visual) */}
              <AnimatePresence>
                {showVolumeBadge && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    style={{
                      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '1rem',
                      zIndex: 20, pointerEvents: 'none'
                    }}
                  >
                    {isVolumeEnabled ? <Volume2 size={32} color="#f59e0b" /> : <VolumeX size={32} color="#f59e0b" />}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading Overlay com Mensagem Bonita - SEMPRE ATIVO ATÉ CARREGAR */}
              <AnimatePresence>
                {isVideoLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ 
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                      backgroundColor: 'rgba(4, 22, 15, 0.98)', zIndex: 10,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', 
                      justifyContent: 'center', textAlign: 'center', padding: '1.5rem',
                      backdropFilter: 'blur(10px)',
                      pointerEvents: 'none'
                    }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{ 
                        width: '60px', height: '60px', borderRadius: '50%', 
                        border: '3px solid #f59e0b', borderTopColor: 'transparent',
                        marginBottom: '1.5rem'
                      }}
                    />
                    <h4 style={{ color: '#f59e0b', margin: '0 0 1rem 0', fontWeight: 800, fontSize: '1.1rem' }}>
                      A preparar o seu tutorial Gold... 🏆
                    </h4>
                    <p style={{ color: 'white', fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.5, margin: 0 }}>
                      Os seus sonhos estão cada vez mais perto. <br /> 
                      Aguarde enquanto carregamos a sua próxima etapa. ✨
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div style={{ 
              marginTop: '1rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              color: '#f59e0b'
            }}>
              <Zap size={16} />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                TUTORIAL: COMO RECEBER O SEU CRÉDITO
              </span>
            </div>
          </motion.div>

          {/* New Photo Gallery Section */}
          {galleryImages.length > 0 && (
            <motion.div variants={itemVariants} style={{ margin: '3rem 0' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'center', marginBottom: '1.5rem', color: '#f59e0b' }}>
                📸 Galeria de Comprovativos e Serviços
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {galleryImages.map((img) => (
                  <motion.div 
                    key={img.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                  >
                    <img src={img.url} alt={`Gallery ${img.id}`} style={{ width: '100%', display: 'block' }} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
          <motion.button
            className="btn-cta"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ borderRadius: '1rem', padding: '1.25rem' }}
            onClick={() => document.getElementById('loan-options')?.scrollIntoView({ behavior: 'smooth' })}
          >
            💰 Solicite Agora
          </motion.button>
        </motion.div>

        {/* Features Grid */}
        <motion.div className="feature-grid" variants={itemVariants}>
          <div className="feature-card" style={{ padding: '2rem' }}>
            <Clock size={24} className="text-gold" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Aprovação Rápida</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Resposta em até 8 minutos após a solicitação</p>
          </div>
          <div className="feature-card" style={{ padding: '2rem' }}>
            <ShieldCheck size={24} className="text-gold" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>100% Seguro</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Seus dados protegidos com criptografia de ponta</p>
          </div>
          <div className="feature-card" style={{ padding: '2rem' }}>
            <Wallet size={24} className="text-gold" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Sem Burocracia</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Processo simples, apenas documentos básicos</p>
          </div>
          <div className="feature-card" style={{ padding: '2rem' }}>
            <Zap size={24} className="text-gold" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Transferência Imediata</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Dinheiro na sua conta em minutos</p>
          </div>
        </motion.div>

        {/* Pricing Table Title */}
        <motion.div id="loan-options" variants={itemVariants} style={{ textAlign: 'center', margin: '4rem 0 2rem' }}>
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
              whileHover={{ x: 5, backgroundColor: '#162720' }}
              whileTap={{ scale: 0.95, boxShadow: '0 0 40px rgba(245, 158, 11, 0.6)' }}
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-number">{opt.id}</span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff', letterSpacing: '0.5px' }}>PAGA {opt.fee}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontSize: '0.9rem', paddingLeft: '2px' }}>
                <span style={{ fontSize: '1.1rem' }}>👉</span>
                <span style={{ fontWeight: 600, opacity: 0.9 }}>RECEBE {opt.receive}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Selected Option Detail Panel (ALWAYS VISIBLE) */}
        <motion.div
          className="card border-gold"
          style={{ marginTop: '2.5rem', padding: '1.5rem', backgroundColor: '#05100b' }}
          variants={itemVariants}
        >
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', color: 'white', justifyContent: 'flex-start', fontSize: '1.25rem' }}>
            📌 Opção Selecionada
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Taxa */}
            <div style={{ backgroundColor: '#2d1414', padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid rgba(255, 77, 77, 0.1)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ff4d4d', marginBottom: '0.5rem' }}>Taxa de Inscrição</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{selectedOption ? selectedOption.fee : '---'}</div>
            </div>

            {/* Valor */}
            <div style={{ backgroundColor: '#2d2614', padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid rgba(234, 179, 8, 0.1)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#eab308', marginBottom: '0.5rem' }}>Valor a Receber</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{selectedOption ? selectedOption.receive : '---'}</div>
            </div>

            {/* Prazo */}
            <div style={{ backgroundColor: '#142d20', padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22c55e', marginBottom: '0.5rem' }}>Prazo</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{selectedOption ? selectedOption.period : '---'}</div>
            </div>
          </div>
        </motion.div>

        {/* Request Form */}
        <motion.div variants={itemVariants} className="card border-gold" style={{ marginTop: '3rem', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1rem' }}>
              📝 Formulário de Solicitação
            </h2>
            <p style={{ color: 'white', marginTop: '0.5rem', fontSize: '1.125rem' }}>Preencha os seus dados para solicitar o seu empréstimo</p>
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
              <input type="text" className="form-input" placeholder="Seu contacto" />
            </div>
            <div className="form-group">
              <label className="form-label">Método de Recebimento *</label>
              <select className="form-select">
                <option>E-Mola</option>
                <option>M-Pesa</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Província *</label>
              <select className="form-select">
                <option>Selecione a província</option>
                <option>Maputo</option>
                <option>Matola</option>
                <option>Gaza</option>
                <option>Inhambane</option>
                <option>Sofala</option>
                <option>Manica</option>
                <option>Tete</option>
                <option>Zambézia</option>
                <option>Nampula</option>
                <option>Niassa</option>
                <option>Cabo Delgado</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Setor de Trabalho</label>
              <input type="text" className="form-input" placeholder="Conta propria" />
            </div>

            <div className="form-group">
              <label className="form-label">Foto do BI (Bilhete de Identidade) *</label>

              {/* Frente do BI */}
              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ color: 'white', fontWeight: 600, marginBottom: '0.6rem', fontSize: '1rem' }}>Frente do BI</p>
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
                        width: 20, height: 20, backgroundColor: '#22c55e', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 700 }}>✓</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>Imagem carregada com sucesso!</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Verso do BI */}
              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ color: 'white', fontWeight: 600, marginBottom: '0.6rem', fontSize: '1rem' }}>Verso do BI</p>
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
                        width: 20, height: 20, backgroundColor: '#22c55e', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 700 }}>✓</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>Imagem carregada com sucesso!</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div className="instruction-box" variants={itemVariants} style={{ marginTop: '3rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} /> Instruções de Pagamento:
          </h3>
          <ol>
            <li>Selecione o valor desejado na tabela acima.</li>
            <li>Faça a transferência para o número indicado abaixo.</li>
            <li>Tire um print/foto do comprovativo.</li>
            <li>Carregue o ficheiro na área de upload no final da página.</li>
          </ol>
        </motion.div>

        {/* Payment Details (Simbine Only) */}
        <motion.div
          variants={itemVariants}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}
        >
          {/* M-Pesa Card */}
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '1.25rem' }}>
              <span role="img" aria-label="money">💰</span>
              <span style={{ fontWeight: 700, color: '#f87171', fontSize: '1.2rem' }}>M-Pesa</span>
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'nowrap' }}>
              <span style={{ fontSize: '1.2rem', color: 'white' }}>Número: </span>
              <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'white' }}>855675443</span>
              <button
                className="copy-btn"
                onClick={(e) => { e.stopPropagation(); copyToClipboard('855675443'); }}
                style={{ backgroundColor: '#f59e0b', color: '#000', fontWeight: 700, borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                📋 <span style={{ fontSize: '0.7rem' }}>Copiar</span>
              </button>
            </div>

            <AnimatePresence>
              {copiedNumber === '855675443' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}
                >
                  Número copiado com sucesso
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ fontSize: '1.1rem', color: 'white', opacity: 0.9 }}>
              Nome: ISAIAS AURELIO SIMBINE
            </div>
          </div>

          {/* E-Mola Card */}
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '1.25rem' }}>
              <span role="img" aria-label="money-bag">💰</span>
              <span style={{ fontWeight: 700, color: '#fb923c', fontSize: '1.2rem' }}>E-Mola</span>
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'nowrap' }}>
              <span style={{ fontSize: '1.2rem', color: 'white' }}>Número: </span>
              <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'white' }}>865937375</span>
              <button
                className="copy-btn"
                onClick={(e) => { e.stopPropagation(); copyToClipboard('865937375'); }}
                style={{ backgroundColor: '#f59e0b', color: '#000', fontWeight: 700, borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                📋 <span style={{ fontSize: '0.7rem' }}>Copiar</span>
              </button>
            </div>

            <AnimatePresence>
              {copiedNumber === '865937375' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}
                >
                  Número copiado com sucesso
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ fontSize: '1.1rem', color: 'white', opacity: 0.9 }}>
              Nome: ISAIAS AURELIO SIMBINE
            </div>
          </div>
        </motion.div>

        {/* Upload Area Refined */}
        <motion.div
          variants={itemVariants}
          className="card"
          style={{ marginTop: '3rem', padding: '2rem', textAlign: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <span role="img" aria-label="upload" style={{ backgroundColor: '#3b82f6', borderRadius: '4px', padding: '2px', color: 'white' }}>⬆️</span>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>Carregar Comprovativo de Pagamento</h3>
          </div>

          <div
            style={{
              backgroundColor: '#404a44',
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
            <button style={{ backgroundColor: '#fcfbf8', color: '#000', borderRadius: '2rem', padding: '6px 16px', fontSize: '0.8rem', fontWeight: 600 }}>
              Escolher ficheiro
            </button>
            <input
              id="file-upload"
              type="file"
              hidden
              onChange={handleFileChange}
            />
            <span style={{ color: '#fcfbf8', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fileName ? fileName : 'nenhum fic...elecionado'}
            </span>
          </div>

          {/* Botão inativo enquanto não houver ficheiro selecionado */}
          {!fileName && submitStatus === 'idle' && (
            <div style={{
              borderRadius: '0.75rem', padding: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              backgroundColor: '#1e2922',
              border: '1.5px dashed rgba(255,255,255,0.15)',
              cursor: 'not-allowed',
              opacity: 0.55
            }}>
              <span style={{ fontSize: '1.1rem' }}>🔒</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#94a3b8' }}>Enviar Comprovativo</span>
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
                cursor: submitStatus !== 'idle' ? 'not-allowed' : 'pointer'
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
                    style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }}
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

          {/* Progress bar while processing */}
          <AnimatePresence>
            {submitStatus === 'processing' && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ marginTop: '1rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>A processar o seu comprovativo...</span>
                  <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>{submitProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#1a2e20', borderRadius: '999px', overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${submitProgress}%` }}
                    transition={{ ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #f59e0b, #22c55e)' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success message after submission */}
          <AnimatePresence>
            {submitStatus === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{
                  marginTop: '1.5rem',
                  background: 'linear-gradient(135deg, #0a2e1a 0%, #051a0e 100%)',
                  border: '1.5px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '1.25rem',
                  padding: '1.75rem 1.5rem',
                  textAlign: 'center',
                  boxShadow: '0 0 30px rgba(34, 197, 94, 0.1)'
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                    boxShadow: '0 0 20px rgba(34,197,94,0.5)'
                  }}
                >
                  <span style={{ fontSize: '1.8rem' }}>✓</span>
                </motion.div>

                <h3 style={{ color: '#22c55e', fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  Comprovativo Recebido!
                </h3>

                <p style={{ color: 'white', fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  Obrigado{clientName ? `, ${clientName.split(' ')[0]}` : ''}! 🙏
                </p>

                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
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
                  <p style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Vodacom: <span style={{ color: '#f59e0b' }}>855 675 443</span></p>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>Movitel: <span style={{ color: '#fb923c' }}>865 937 375</span></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>

        {/* Footer */}
        <footer className="footer-section" style={{ marginTop: '5rem', borderTop: '1px solid #1a4d3a', paddingTop: '3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <div>
              <h3 style={{ color: '#eab308', fontSize: '1.25rem', marginBottom: '1rem' }}>Serviços Gold</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>Empréstimos rápidos e seguros em Moçambique. Receba o seu crédito em minutos via M-Pesa ou E-Mola.</p>
            </div>

            <div>
              <h3 style={{ color: '#eab308', fontSize: '1rem', marginBottom: '1rem' }}>Links Úteis</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.875rem' }}>
                <span>Sobre</span> | <span>Termos</span> | <span>Privacidade</span> | <span>Apoio</span>
              </div>
            </div>

            <div>
              <h3 style={{ color: '#eab308', fontSize: '1rem', marginBottom: '1rem' }}>Contatos</h3>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
