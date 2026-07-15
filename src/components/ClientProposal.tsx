/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { PartySetupState, ThemeConfig, ClientProposalData } from "../types";
import { DollarSign, FileText, Calendar, CalendarPlus, User, Phone, Mail, MapPin, Printer, Share2, Plus, ArrowRight, CheckCircle, Smartphone, Sparkles } from "lucide-react";

interface ClientProposalProps {
  state: PartySetupState;
  activeTheme: ThemeConfig;
  onUpdateState: (updates: Partial<PartySetupState>) => void;
}

export default function ClientProposal({ state, activeTheme, onUpdateState }: ClientProposalProps) {
  // Client proposal state
  const [proposal, setProposal] = useState<ClientProposalData>({
    clientName: "Ana Paula Silva",
    clientEmail: "anapaula@exemplo.com",
    clientPhone: "(11) 98765-4321",
    eventDate: "2026-08-15",
    eventLocation: "Espaço Planeta Kids, São Paulo - SP",
    notes: "Deseja arco de balões desconstruído volumoso e cilindros encapados combinando.",
    pricePanel: 350.00,
    priceCylinders: 180.00,
    priceBalloons: 250.00,
    priceDecorations: 120.00,
    priceTotal: 900.00,
    themeId: activeTheme.id,
    conceptTitle: "",
    conceptDescription: "",
  });

  const [isSaved, setIsSaved] = useState(false);
  const [showPresentationMode, setShowPresentationMode] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Recalculate total price
  const handlePriceChange = (field: keyof ClientProposalData, val: string) => {
    const numVal = parseFloat(val) || 0;
    setProposal(prev => {
      const updated = { ...prev, [field]: numVal };
      const total = updated.pricePanel + updated.priceCylinders + updated.priceBalloons + updated.priceDecorations;
      return { ...updated, priceTotal: total };
    });
  };

  const handleTextChange = (field: keyof ClientProposalData, val: string) => {
    setProposal(prev => ({ ...prev, [field]: val }));
  };

  // Generate mock printable or download
  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    setIsSaved(true);
    if (proposal.eventDate) {
      window.open(getGoogleCalendarUrl(), "_blank");
    }
    setTimeout(() => setIsSaved(false), 3000);
  };

  const getGoogleCalendarUrl = () => {
    const title = encodeURIComponent(`Festa - ${proposal.clientName}`);
    const location = encodeURIComponent(proposal.eventLocation || "");
    const details = encodeURIComponent(
      `Proposta de Decoracao FestDecor3D\n\nConceito Criativo: ${proposal.conceptTitle || ""}\nDescricao: ${proposal.conceptDescription || ""}\n\nObservacoes: ${proposal.notes || ""}`
    );
    
    let dateStr = "";
    if (proposal.eventDate) {
      dateStr = proposal.eventDate.replace(/-/g, "");
    }
    
    if (!dateStr) {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateStr = `${y}${m}${day}`;
    }
    
    const start = `${dateStr}T140000`;
    const end = `${dateStr}T180000`;
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}&details=${details}`;
  };

  // WhatsApp (Zap) share helper
  const handleWhatsAppShare = () => {
    const formattedDate = proposal.eventDate ? new Date(proposal.eventDate).toLocaleDateString("pt-BR") : "";
    
    const message = `*FestDecor3D - Proposta de Decoração de Festa* 🌸
    
Olá *${proposal.clientName}*! Aqui está o layout virtual e a proposta de orçamento para a sua festa:

*Conceito:* ${proposal.conceptTitle || "Personalizado"}
${proposal.conceptDescription ? `*Descrição:* ${proposal.conceptDescription}\n` : ""}*Data:* ${formattedDate}
*Local:* ${proposal.eventLocation}

*Itens Inclusos no Projeto:*
• 01x Painel ${state.shape === "round" ? "Circular 1.5m" : state.shape === "rectangular" ? "Retangular" : state.shape === "trio_pocket" ? "Trio Sobreposto Boho" : "Arco Romano"}
• 03x Mesas de Cilindros (${state.cylinderStyle === "kraft_mdf" ? "MDF Cru / Papel Kraft 📦" : state.cylinderStyle === "rustic_wood" ? "Tronco Rústico / Ripado" : "Sublimados no Tema"})
• Montagem Orgânica de Arco de Balões
• Kit de Bandejas, Boleiras & Adereços de Mesa

*Investimento Estimado:*
• Painel: R$ ${proposal.pricePanel.toFixed(2)}
• Cilindros: R$ ${proposal.priceCylinders.toFixed(2)}
• Balões: R$ ${proposal.priceBalloons.toFixed(2)}
• Doces/Decorações: R$ ${proposal.priceDecorations.toFixed(2)}
----------------------------------
*TOTAL DO PROJETO:* R$ ${proposal.priceTotal.toFixed(2)}

*Visualização Virtual:* Você pode ver nossa simulação 3D abrindo o FestDecor3D no seu navegador!

Ficamos à disposição para fechamento de contrato!`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = proposal.clientPhone.replace(/\D/g, "");
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  // Theme colors to decorate the proposal UI
  const themeColorPrimary = activeTheme.balloonColors[0] || "#10b981";

  return (
    <div className="flex flex-col gap-6 text-slate-300">
      
      {/* SECTION 1: PROPOSAL DATA FORM */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <h4 className="font-sans font-semibold text-slate-100 text-sm tracking-tight uppercase">
              Dados do Cliente & Orçamento
            </h4>
          </div>
          <button 
            onClick={() => setShowPresentationMode(true)}
            className="text-xs bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Modo Apresentação</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Nome do Responsável:</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={proposal.clientName}
                onChange={(e) => handleTextChange("clientName", e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Event Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Data do Evento:</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                type="date"
                value={proposal.eventDate}
                onChange={(e) => handleTextChange("eventDate", e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch (err) {
                    console.log("showPicker not supported", err);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">WhatsApp / Telefone:</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={proposal.clientPhone}
                onChange={(e) => handleTextChange("clientPhone", e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">E-mail:</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="email"
                value={proposal.clientEmail}
                onChange={(e) => handleTextChange("clientEmail", e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[10px] uppercase font-bold text-slate-500">Local da Festa:</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={proposal.eventLocation}
                onChange={(e) => handleTextChange("eventLocation", e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[10px] uppercase font-bold text-slate-500">Detalhes / Observações:</label>
            <textarea
              value={proposal.notes}
              onChange={(e) => handleTextChange("notes", e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Custom Concept Title */}
          <div className="flex flex-col gap-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
            <label className="text-[10px] uppercase font-bold text-emerald-450 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Conceito Criativo (Título Personalizado):</span>
            </label>
            <input
              type="text"
              value={proposal.conceptTitle || ""}
              onChange={(e) => handleTextChange("conceptTitle", e.target.value)}
              placeholder="Digite o título do conceito criativo do projeto (ex: Jardim Encantado Minimalista)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Custom Concept Description */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[10px] uppercase font-bold text-emerald-450">Descrição do Conceito Criativo:</label>
            <textarea
              value={proposal.conceptDescription || ""}
              onChange={(e) => handleTextChange("conceptDescription", e.target.value)}
              placeholder="Digite livremente a descrição do conceito criativo do projeto..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Pricing break downs */}
        <div className="mt-5 pt-5 border-t border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-3">
            Custos de Locação / Serviços (R$):
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-500 block mb-1">Painel Temático</span>
              <input
                type="number"
                value={proposal.pricePanel}
                onChange={(e) => handlePriceChange("pricePanel", e.target.value)}
                className="w-full bg-transparent font-semibold text-xs text-slate-100 focus:outline-none"
              />
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-500 block mb-1">Trio de Cilindros</span>
              <input
                type="number"
                value={proposal.priceCylinders}
                onChange={(e) => handlePriceChange("priceCylinders", e.target.value)}
                className="w-full bg-transparent font-semibold text-xs text-slate-100 focus:outline-none"
              />
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-500 block mb-1">Arco de Balões</span>
              <input
                type="number"
                value={proposal.priceBalloons}
                onChange={(e) => handlePriceChange("priceBalloons", e.target.value)}
                className="w-full bg-transparent font-semibold text-xs text-slate-100 focus:outline-none"
              />
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-500 block mb-1">Doces & Boleiras</span>
              <input
                type="number"
                value={proposal.priceDecorations}
                onChange={(e) => handlePriceChange("priceDecorations", e.target.value)}
                className="w-full bg-transparent font-semibold text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-slate-950 flex justify-between items-center border border-emerald-500/15">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Investimento Estimado:</span>
              <span className="text-xl font-bold text-emerald-400 font-sans tracking-tight">
                R$ {proposal.priceTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Salvar Proposta
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-green-950/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Enviar pelo ZAP</span>
              </button>
              <button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950/20"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir PDF</span>
              </button>
            </div>
          </div>

          {isSaved && (
            <div className="mt-3 p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>Orçamento salvo no histórico local de apresentações com sucesso!</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: PRINTABLE SLIDE PREVIEW (Client Presentation mockup) */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-4">
          Visualização da Apresentação do Cliente (Slide/Orçamento)
        </span>

        {/* Printable/Shareable Sheet Frame */}
        <div 
          ref={printableRef}
          className="bg-white text-slate-800 rounded-xl p-6 border border-slate-200 shadow-lg relative print:border-none print:shadow-none"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-5 mb-5">
            <div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-600" />
                <span className="text-sm font-black tracking-tight text-slate-900 uppercase">FestDecor3D Premium</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Simulação de Decoração & Projeto Personalizado</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded uppercase">PROPOSTA #DECO-{activeTheme.id.toUpperCase().substring(0, 5)}</span>
              <p className="text-[9px] text-slate-500 mt-1">Gerado em: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Client Card & Details */}
          <div className="grid grid-cols-2 gap-4 mb-5 text-[11px] bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 font-extrabold block uppercase tracking-wider text-[8px] mb-1">Cliente Solicitante</span>
              <p className="font-bold text-slate-900">{proposal.clientName}</p>
              <p className="text-slate-600 mt-0.5">{proposal.clientPhone}</p>
              <p className="text-slate-600">{proposal.clientEmail}</p>
            </div>
            <div>
              <span className="text-slate-400 font-extrabold block uppercase tracking-wider text-[8px] mb-1">Detalhes do Evento</span>
              <p className="font-bold text-slate-900 flex items-center gap-1 flex-wrap">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{proposal.eventDate ? new Date(proposal.eventDate + "T00:00:00").toLocaleDateString("pt-BR") : ""}</span>
              </p>
              <p className="text-slate-600 mt-0.5 max-w-[200px] truncate">{proposal.eventLocation}</p>
              <p className="text-slate-500 italic mt-1 line-clamp-1">"{proposal.notes}"</p>
            </div>
          </div>

          {/* Theme specifications description */}
          <div className="mb-5">
            <span className="text-slate-400 font-extrabold block uppercase tracking-wider text-[8px] mb-1.5">Conceito Criativo & Paleta de Cores</span>
            <h5 className="font-bold text-slate-900 text-sm">{proposal.conceptTitle || "Digite o conceito criativo do projeto"}</h5>
            <p className="text-slate-600 text-[11px] leading-relaxed mt-1 whitespace-pre-line">
              {proposal.conceptDescription || "Digite a descrição do conceito criativo..."}
            </p>

            <div className="flex gap-2 items-center mt-3.5">
              <span className="text-[9px] font-bold text-slate-500">Paleta de Balões:</span>
              <div className="flex gap-1">
                {activeTheme.balloonColors.map((col, idx) => (
                  <div 
                    key={idx}
                    className="w-4 h-4 rounded-full border border-slate-200 shadow-sm"
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
              <span className="text-[9px] font-bold text-slate-500 ml-4">Cores de Cilindros:</span>
              <div className="flex gap-1">
                {activeTheme.cylinderColors.map((col, idx) => (
                  <div 
                    key={idx}
                    className="w-4 h-4 rounded-full border border-slate-200 shadow-sm"
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Breakdowns */}
          <div className="border-t border-slate-100 pt-4 mt-4">
            <span className="text-slate-400 font-extrabold block uppercase tracking-wider text-[8px] mb-2.5">Tabela de Serviços & Itens Inclusos</span>
            
            <div className="flex flex-col gap-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <div className="text-slate-600">
                  <span className="font-bold text-slate-950">01x Painel {state.shape === "round" ? "Redondo Circular" : state.shape === "rectangular" ? "Retangular de Fundo" : "Arco Romano"}</span>
                  <p className="text-[9px] text-slate-400">Estampa personalizada em tecido sublimado premium, resistente a reflexos de foto</p>
                </div>
                <span className="font-bold text-slate-900">R$ {proposal.pricePanel.toFixed(2)}</span>
              </div>
               <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <div className="text-slate-600">
                  <span className="font-bold text-slate-950">
                    03x Mesas de Cilindros ({state.cylinderStyle === "kraft_mdf" ? "MDF Cru / Papel Kraft 📦" : state.cylinderStyle === "rustic_wood" ? "Tronco Rústico / Ripado" : "Sublimado/Cores do Tema"})
                  </span>
                  <p className="text-[9px] text-slate-400">
                    {state.cylinderStyle === "kraft_mdf" 
                      ? "Trio de cilindros em papel kraft natural de alta resistência (igual à imagem de referência)" 
                      : state.cylinderStyle === "rustic_wood" 
                        ? "Trio de cilindros amadeirados rústicos com mesa ripada central" 
                        : "Trio de cilindros com tecidos sublimados e cores coordenadas com o tema"}
                  </p>
                </div>
                <span className="font-bold text-slate-900">R$ {proposal.priceCylinders.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <div className="text-slate-600">
                  <span className="font-bold text-slate-950">01x Montagem de Balões Cromados & Foscos ({state.balloonStyle === "organic_arch" ? "Arco Desconstruído" : "Estilo Clássico"})</span>
                  <p className="text-[9px] text-slate-400">Montagem orgânica no local, misturando tamanhos gigantes e mini-balões cromados</p>
                </div>
                <span className="font-bold text-slate-900">R$ {proposal.priceBalloons.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <div className="text-slate-600">
                  <span className="font-bold text-slate-950">01x Kit de Boleiras, Bandejas & Adereços</span>
                  <p className="text-[9px] text-slate-400">Suportes coloridos laqueados, cake stand central e arranjos temáticos de mesa</p>
                </div>
                <span className="font-bold text-slate-900">R$ {proposal.priceDecorations.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-emerald-50 p-3.5 rounded-xl mt-4 border border-emerald-100">
              <div>
                <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wider">Valor Líquido do Projeto</span>
                <p className="text-[9px] text-slate-400 mt-0.5">Incluso montagem, frete de transporte e desmontagem ao final do evento</p>
              </div>
              <span className="text-base font-black text-emerald-700">R$ {proposal.priceTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer signature */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400">
            <span>Aprovado por: ____________________________________</span>
            <span>Apresentado por: FestDecor3D</span>
          </div>
        </div>
      </div>

      {/* FULL SCREEN PRESENTATION MODE MODAL */}
      {showPresentationMode && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto">
          <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 relative flex flex-col gap-6">
            
            <button 
              onClick={() => {
                setShowPresentationMode(false);
                if (proposal.eventDate) {
                  window.open(getGoogleCalendarUrl(), "_blank");
                }
              }}
              className="absolute top-5 right-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

            {/* Slide title */}
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Showcase de Projeto Exclusivo</span>
                <h3 className="font-sans font-extrabold text-slate-100 text-xl tracking-tight">Proposta para {proposal.clientName}</h3>
              </div>
            </div>

            {/* Content Splitting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Virtual Mockup image rendered inside presentation */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Visualização do Projeto (Preview)</span>
                <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center relative p-4">
                  <div className="relative w-44 h-44 rounded-full overflow-hidden border-2 border-slate-700">
                    <img 
                      src={state.customBackdropUrl || activeTheme.backdropUrl} 
                      alt="Review" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {state.textOverlay && (
                      <div className="absolute inset-0 flex items-center justify-center p-2 text-center bg-black/30">
                        <span className="text-[10px] font-bold" style={{ color: state.textColor }}>{state.textOverlay}</span>
                      </div>
                    )}
                  </div>
                  {/* Decorative organic arch overlay badge */}
                  <span className="absolute bottom-3 right-3 text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                    {state.shape === "round" ? "Circular 1.5m" : "Retangular"} + Balões
                  </span>
                </div>
                
                {/* Decorative cylinder colors row */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <span className="text-slate-400">Revestimento dos 3 cilindros:</span>
                  <div className="flex gap-1.5">
                    {activeTheme.cylinderColors.map((col, idx) => (
                      <div 
                        key={idx}
                        className="w-5 h-5 rounded-md border border-white/10"
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Concept Text and pitch suggestions */}
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conceito do Tema</span>
                  <h4 className="text-lg font-extrabold text-emerald-400 mt-1">{proposal.conceptTitle || "Sem título do conceito"}</h4>
                  <p className="text-slate-300 text-xs leading-relaxed mt-2 bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-line">
                    {proposal.conceptDescription || "Sem descrição do conceito."}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sugestão de Arranjos & Adereços</span>
                  <div className="grid grid-cols-2 gap-2">
                    {activeTheme.decorations.map((dec, idx) => (
                      <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-[10px] text-slate-400 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="truncate">{dec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/15 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Orçamento Total Concluído</span>
                    <span className="text-xl font-bold text-emerald-400">R$ {proposal.priceTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        setShowPresentationMode(false);
                        if (proposal.eventDate) {
                          window.open(getGoogleCalendarUrl(), "_blank");
                        }
                        handlePrint();
                      }}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Confirmar Locação</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick tips about premium fabrics */}
            <p className="text-slate-500 text-[9px] text-center mt-2">
              *Painéis e cilindros sublimados FestDecor3D utilizam tecidos elásticos de microfibra, laváveis, anti-reflexo de flash e com tintas atóxicas ecológicas.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
