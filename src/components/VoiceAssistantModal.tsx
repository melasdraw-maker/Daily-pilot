import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
  MapPin,
  Calendar,
  BookOpen,
  Send,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Clock,
  Car,
  CalendarCheck,
} from 'lucide-react';
import { UserProfile, Mission, WeatherData, DailyHadith, MotivationalQuote, TravelCalculation } from '../types';
import {
  startSpeechRecognition,
  stopSpeechRecognition,
  speakText,
  stopSpeechSynthesis,
  isSpeechRecognitionSupported,
  playBase64Audio,
  stopAudioPlayback,
  stopAllAudio,
  playChime,
} from '../services/speech';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  todayMissions: Mission[];
  nextMission: Mission | null;
  nextTravel?: TravelCalculation | null;
  weather: WeatherData | null;
  dailyHadith: DailyHadith;
  motivationalQuote: MotivationalQuote;
  onNavigateTab: (tab: any) => void;
  onOpenNotebookLm: (url?: string) => void;
  onOpenPlanningValidation?: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  profile,
  todayMissions,
  nextMission,
  nextTravel,
  weather,
  dailyHadith,
  motivationalQuote,
  onNavigateTab,
  onOpenNotebookLm,
  onOpenPlanningValidation,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [assistantResponse, setAssistantResponse] = useState<{
    speechText: string;
    displayText: string;
    action?: string | null;
    audioBase64?: string | null;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micUnavailable, setMicUnavailable] = useState(false);

  const stopRecognitionRef = useRef<(() => void) | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      handleStopAll();
    } else {
      // Focus input field when opened
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleStopAll = () => {
    stopAllAudio();
    setIsListening(false);
    setIsSpeaking(false);
  };

  const handleToggleListening = () => {
    if (isListening) {
      handleStopAll();
    } else {
      setErrorMessage(null);
      setTranscript('');
      stopAllAudio();
      setIsSpeaking(false);

      if (!isSpeechRecognitionSupported()) {
        setMicUnavailable(true);
        setErrorMessage('La reconnaissance vocale par micro est restreinte par votre navigateur. Vous pouvez poser vos questions par écrit ci-dessous.');
        return;
      }

      playChime('start');
      setIsListening(true);

      const stopFn = startSpeechRecognition(
        (result) => {
          setTranscript(result.transcript);
          if (result.isFinal && result.transcript.trim().length > 1) {
            handleSendVoiceQuery(result.transcript);
          }
        },
        (error) => {
          setErrorMessage(error);
          setIsListening(false);
          if (error.includes('micro') || error.includes('autorisé') || error.includes('navigateur')) {
            setMicUnavailable(true);
          }
        },
        () => {
          setIsListening(false);
        }
      );
      stopRecognitionRef.current = stopFn;
    }
  };

  const playResponseAudio = (data: { speechText: string; audioBase64?: string | null }) => {
    stopAllAudio();
    setIsSpeaking(true);

    if (data.audioBase64) {
      // High definition Gemini TTS audio
      stopAudioRef.current = playBase64Audio(data.audioBase64, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => {
          // Fall back to Web Speech synthesis
          speakWithBrowser(data.speechText);
        },
      });
    } else {
      // Web Speech API synthesis fallback
      speakWithBrowser(data.speechText);
    }
  };

  const speakWithBrowser = (text: string) => {
    stopAudioRef.current = speakText(text, {
      rate: profile.speechRate || 1.0,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleSendVoiceQuery = async (queryText: string) => {
    if (!queryText || !queryText.trim()) return;

    stopSpeechRecognition();
    setIsListening(false);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const context = {
        currentDate: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        currentTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        profile,
        todayMissions,
        nextMission,
        travel: nextTravel,
        departureTime: nextTravel?.departureTime,
        wakeUpTime: nextTravel?.wakeUpTime,
        weather,
        hadithEnabled: profile.hadithEnabled,
        dailyHadith,
        motivationalQuote,
      };

      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText, context }),
      });

      const data = await res.json();
      setAssistantResponse(data);
      playChime('success');

      // Speak response aloud
      if (data.speechText) {
        playResponseAudio(data);
      }
    } catch (err: any) {
      console.warn('Erreur assistant:', err);
      // Even in network error, show a fallback message
      const fallback = {
        speechText: `Bonjour ${profile.name || 'Formateur'}. Je suis Daily Pilot. Votre prochaine session est ${nextMission ? nextMission.title + ' à ' + nextMission.city : 'en cours de planification'}.${nextTravel ? ` Trajet estimé : ${nextTravel.durationWithTrafficMinutes} minutes, départ à ${nextTravel.departureTime}.` : ''}`,
        displayText: `Bonjour ${profile.name || 'Formateur'} !\n\n${nextMission ? `📅 Prochaine formation : **${nextMission.title}** (${nextMission.city})\n⏰ Début : ${nextMission.startTime || '08:30'}\n⏱️ Trajet : **${nextTravel?.durationWithTrafficMinutes || 15} min** (Départ : ${nextTravel?.departureTime || '07:45'})` : 'Aucune mission enregistrée pour le moment.'}`,
      };
      setAssistantResponse(fallback);
      speakWithBrowser(fallback.speechText);
    } finally {
      setIsLoading(false);
      setTextInput('');
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      setTranscript(textInput);
      handleSendVoiceQuery(textInput);
    }
  };

  const quickPrompts = [
    { label: 'Quoi de neuf aujourd\'hui ?', icon: Sparkles },
    { label: 'Hadith du jour', icon: BookOpen },
    { label: 'Valider mon planning & réveils', icon: CalendarCheck },
    { label: 'À quelle heure dois-je partir ?', icon: Car },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Daily Pilot Vocal</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  IA & Voix FR
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Assistant interactif de route & missions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSpeaking && (
              <button
                onClick={() => {
                  stopAllAudio();
                  setIsSpeaking(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 transition-colors"
                title="Couper la voix"
              >
                <VolumeX className="w-4 h-4" />
                <span>Couper</span>
              </button>
            )}
            <button
              onClick={() => {
                handleStopAll();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Central Pulsating Voice Mic */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative">
              {isListening && (
                <>
                  <span className="absolute -inset-4 rounded-full bg-blue-500/30 animate-ping" />
                  <span className="absolute -inset-8 rounded-full bg-blue-500/15 animate-pulse" />
                </>
              )}
              {isSpeaking && (
                <span className="absolute -inset-5 rounded-full bg-emerald-500/25 animate-pulse" />
              )}
              <button
                onClick={handleToggleListening}
                disabled={isLoading}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all transform active:scale-95 ${
                  isListening
                    ? 'bg-rose-500 shadow-rose-500/40 scale-105 ring-4 ring-rose-400/30'
                    : isSpeaking
                    ? 'bg-emerald-600 shadow-emerald-500/30 ring-4 ring-emerald-400/30'
                    : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 shadow-blue-500/30 hover:scale-105'
                }`}
                title={isListening ? 'Cliquez pour arrêter' : 'Cliquez pour parler'}
              >
                {isLoading ? (
                  <RefreshCw className="w-10 h-10 animate-spin" />
                ) : isListening ? (
                  <MicOff className="w-10 h-10 animate-pulse" />
                ) : isSpeaking ? (
                  <Volume2 className="w-10 h-10 animate-bounce" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200 text-center">
              {isLoading
                ? 'Daily Pilot analyse votre demande...'
                : isListening
                ? 'Je vous écoute...'
                : isSpeaking
                ? 'Daily Pilot vous répond à voix haute...'
                : 'Touchez le micro pour parler ou écrivez ci-dessous'}
            </p>

            {transcript && (
              <div className="mt-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-slate-800 text-xs text-blue-900 dark:text-blue-200 italic text-center max-w-sm border border-blue-200/50 dark:border-slate-700">
                « {transcript} »
              </div>
            )}

            {/* Audio waveform visualization when speaking */}
            {isSpeaking && (
              <div className="flex items-center gap-1 mt-3">
                <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-7 bg-emerald-500 rounded-full animate-bounce" />
                <span className="w-1 h-5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-2">En lecture vocale</span>
              </div>
            )}

            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 max-w-md text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            )}
          </div>

          {/* Assistant Response Box */}
          {assistantResponse && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-blue-50/80 to-indigo-50/50 dark:from-slate-800/90 dark:to-slate-800/40 border border-blue-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-200 space-y-3 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Réponse de Daily Pilot</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => playResponseAudio(assistantResponse)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                    title="Réécouter la réponse à voix haute"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Réécouter</span>
                  </button>
                  {isSpeaking && (
                    <button
                      onClick={() => {
                        stopAllAudio();
                        setIsSpeaking(false);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                      title="Arrêter la voix"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm leading-relaxed whitespace-pre-line font-medium text-slate-800 dark:text-slate-200 bg-white/70 dark:bg-slate-900/50 p-3 rounded-xl border border-blue-100 dark:border-slate-800">
                {assistantResponse.displayText || assistantResponse.speechText}
              </div>

              {/* Action buttons if detected */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-200/50 dark:border-slate-700/60">
                {onOpenPlanningValidation && (
                  <button
                    onClick={() => {
                      handleStopAll();
                      onClose();
                      onOpenPlanningValidation();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all shadow-sm shadow-emerald-500/20"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Google Calendar & Réveil</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    handleStopAll();
                    onClose();
                    onNavigateTab('planning');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Voir le planning</span>
                </button>
                <button
                  onClick={() => {
                    handleStopAll();
                    onClose();
                    onNavigateTab('travel');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Détails trajet</span>
                </button>
                <button
                  onClick={() => {
                    handleStopAll();
                    onClose();
                    onOpenNotebookLm();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span>NotebookLM</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick command suggestions */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Questions fréquentes en un clic :
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPrompts.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setTranscript(item.label);
                      handleSendVoiceQuery(item.label);
                    }}
                    className="text-left text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-medium truncate">{item.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Text Input Bar for Guaranteed Interaction (Even if mic is blocked) */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Poser une question à Daily Pilot par écrit..."
                disabled={isLoading}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-9"
              />
              {textInput && (
                <button
                  type="button"
                  onClick={() => setTextInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !textInput.trim()}
              className="px-3.5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs sm:text-sm hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 shrink-0"
              title="Envoyer la question"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Envoyer</span>
            </button>
          </form>

          {micUnavailable && (
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Micro bloqué ? Vous pouvez utiliser la saisie texte ci-dessus et écouter la réponse audio.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
