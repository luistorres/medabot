interface LandingPageProps {
  onScanMedicine: () => void;
  onManualEntry: () => void;
}

const LandingPage = ({ onScanMedicine, onManualEntry }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-mesh-landing flex flex-col relative overflow-hidden">
      {/* Decorative floating orbs */}
      <div className="absolute top-16 right-8 w-32 h-32 rounded-full bg-accent-400/10 blur-2xl animate-float" />
      <div className="absolute bottom-32 left-4 w-40 h-40 rounded-full bg-primary-400/8 blur-3xl animate-float stagger-3" />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 py-16 relative z-10">
        {/* Logo */}
        <div className="animate-stagger-in stagger-1">
          <div className="w-[72px] h-[72px] rounded-[20px] bg-white shadow-lg shadow-primary-500/10 flex items-center justify-center mb-6 ring-1 ring-gray-100">
            <img src="/logo.png" alt="MedaBot" className="w-14 h-14 object-contain rounded-2xl" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10 animate-stagger-in stagger-2">
          <h1 className="text-[2rem] font-800 text-gray-900 tracking-tight leading-none mb-3">
            Meda<span className="text-primary-600">Bot</span>
          </h1>
          <p className="text-[15px] text-gray-400 max-w-[260px] mx-auto leading-relaxed font-light">
            Informação oficial sobre medicamentos, ao alcance de uma foto.
          </p>
        </div>

        {/* CTAs */}
        <div className="w-full max-w-[340px] space-y-3">
          {/* Primary: Camera */}
          <button
            onClick={onScanMedicine}
            className="animate-stagger-in stagger-3 w-full flex items-center gap-4 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white px-5 py-[18px] rounded-2xl shadow-lg shadow-primary-600/25 transition-all duration-200 group hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5"
          >
            <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <div className="text-left flex-1">
              <span className="text-[15px] font-semibold block leading-tight">Digitalizar medicamento</span>
              <span className="text-[13px] text-white/60 font-light">Fotografe a embalagem</span>
            </div>
            <svg className="w-4 h-4 text-white/40 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {/* Secondary: Search */}
          <button
            onClick={onManualEntry}
            className="animate-stagger-in stagger-4 w-full flex items-center gap-4 glass hover:bg-white/80 active:bg-white/90 text-gray-800 px-5 py-[18px] rounded-2xl shadow-sm transition-all duration-200 group hover:shadow-md hover:-translate-y-0.5 ring-1 ring-gray-200/60"
          >
            <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200/60 transition-colors">
              <svg className="w-[22px] h-[22px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <div className="text-left flex-1">
              <span className="text-[15px] font-semibold block leading-tight">Pesquisar por nome</span>
              <span className="text-[13px] text-gray-400 font-light">Escreva o nome do medicamento</span>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-7 pb-10 relative z-10 animate-stagger-in stagger-5">
        <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-[280px] mx-auto">
          Informação baseada nos folhetos oficiais. Consulte sempre um profissional de saúde.
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
