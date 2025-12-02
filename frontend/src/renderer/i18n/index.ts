/**
 * Wingman AI - Internationalization (i18n)
 * Multi-language support framework
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Supported languages
export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ko' | 'pt'

export interface LanguageInfo {
  code: Language
  name: string
  nativeName: string
  direction: 'ltr' | 'rtl'
}

export const supportedLanguages: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' }
]

// Translation type
type TranslationKey = string
type TranslationValue = string | { [key: string]: TranslationValue }
type Translations = Record<TranslationKey, TranslationValue>

// English translations (default)
const en: Translations = {
  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    settings: 'Settings',
    help: 'Help',
    about: 'About'
  },
  
  // Navigation
  nav: {
    home: 'Home',
    history: 'History',
    analytics: 'Analytics',
    practice: 'Practice',
    knowledge: 'Knowledge Base',
    settings: 'Settings'
  },
  
  // Modes
  modes: {
    interview: 'Interview',
    study: 'Study',
    work: 'Work',
    meeting: 'Meeting',
    research: 'Research',
    practice: 'Practice'
  },
  
  // Dynamic Island
  island: {
    listening: 'Listening...',
    processing: 'Processing...',
    generating: 'Generating answer...',
    ready: 'Ready',
    paused: 'Paused',
    idle: 'Idle'
  },
  
  // Settings
  settings: {
    general: 'General',
    audio: 'Audio',
    screen: 'Screen',
    ai: 'AI Models',
    appearance: 'Appearance',
    hotkeys: 'Hotkeys',
    privacy: 'Privacy',
    language: 'Language',
    theme: 'Theme',
    notifications: 'Notifications',
    autoStart: 'Start on system boot',
    enableAudio: 'Enable audio capture',
    enableScreen: 'Enable screen capture'
  },
  
  // Analytics
  analytics: {
    title: 'Analytics',
    overview: 'Overview',
    usage: 'Usage',
    performance: 'Performance',
    totalQuestions: 'Total Questions',
    totalAnswers: 'Total Answers',
    totalTime: 'Total Time',
    averageScore: 'Average Score',
    streak: 'Current Streak'
  },
  
  // Practice
  practice: {
    title: 'Practice Mode',
    start: 'Start Practice',
    stop: 'Stop Practice',
    nextQuestion: 'Next Question',
    submitAnswer: 'Submit Answer',
    getHint: 'Get Hint',
    feedback: 'Feedback',
    score: 'Score',
    strengths: 'Strengths',
    improvements: 'Areas to Improve'
  },
  
  // Meeting
  meeting: {
    title: 'Meeting Intelligence',
    start: 'Start Meeting',
    stop: 'Stop Meeting',
    speakers: 'Speakers',
    actionItems: 'Action Items',
    keyPoints: 'Key Points',
    transcript: 'Transcript',
    summary: 'Summary',
    export: 'Export'
  },
  
  // Errors
  errors: {
    connectionFailed: 'Connection failed',
    audioPermission: 'Microphone permission required',
    screenPermission: 'Screen capture permission required',
    aiError: 'AI generation failed',
    unknown: 'Something went wrong'
  },
  
  // Onboarding
  onboarding: {
    welcome: 'Welcome to Wingman AI',
    subtitle: 'Your intelligent assistant for interviews, studying, and work',
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    finish: 'Get Started',
    audioSetup: 'Audio Setup',
    screenSetup: 'Screen Setup',
    modeSelection: 'Choose Your Mode',
    ready: "You're All Set!"
  }
}

// Spanish translations
const es: Translations = {
  common: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    search: 'Buscar',
    settings: 'Configuración',
    help: 'Ayuda',
    about: 'Acerca de'
  },
  nav: {
    home: 'Inicio',
    history: 'Historial',
    analytics: 'Analítica',
    practice: 'Práctica',
    knowledge: 'Base de Conocimiento',
    settings: 'Configuración'
  },
  modes: {
    interview: 'Entrevista',
    study: 'Estudio',
    work: 'Trabajo',
    meeting: 'Reunión',
    research: 'Investigación',
    practice: 'Práctica'
  },
  island: {
    listening: 'Escuchando...',
    processing: 'Procesando...',
    generating: 'Generando respuesta...',
    ready: 'Listo',
    paused: 'Pausado',
    idle: 'Inactivo'
  },
  settings: {
    general: 'General',
    audio: 'Audio',
    screen: 'Pantalla',
    ai: 'Modelos de IA',
    appearance: 'Apariencia',
    hotkeys: 'Atajos',
    privacy: 'Privacidad',
    language: 'Idioma',
    theme: 'Tema',
    notifications: 'Notificaciones',
    autoStart: 'Iniciar con el sistema',
    enableAudio: 'Habilitar captura de audio',
    enableScreen: 'Habilitar captura de pantalla'
  },
  analytics: {
    title: 'Analítica',
    overview: 'Resumen',
    usage: 'Uso',
    performance: 'Rendimiento',
    totalQuestions: 'Total de Preguntas',
    totalAnswers: 'Total de Respuestas',
    totalTime: 'Tiempo Total',
    averageScore: 'Puntuación Media',
    streak: 'Racha Actual'
  },
  practice: {
    title: 'Modo Práctica',
    start: 'Iniciar Práctica',
    stop: 'Detener Práctica',
    nextQuestion: 'Siguiente Pregunta',
    submitAnswer: 'Enviar Respuesta',
    getHint: 'Obtener Pista',
    feedback: 'Retroalimentación',
    score: 'Puntuación',
    strengths: 'Fortalezas',
    improvements: 'Áreas a Mejorar'
  },
  meeting: {
    title: 'Inteligencia de Reuniones',
    start: 'Iniciar Reunión',
    stop: 'Detener Reunión',
    speakers: 'Participantes',
    actionItems: 'Acciones Pendientes',
    keyPoints: 'Puntos Clave',
    transcript: 'Transcripción',
    summary: 'Resumen',
    export: 'Exportar'
  },
  errors: {
    connectionFailed: 'Conexión fallida',
    audioPermission: 'Se requiere permiso de micrófono',
    screenPermission: 'Se requiere permiso de captura de pantalla',
    aiError: 'Falló la generación de IA',
    unknown: 'Algo salió mal'
  },
  onboarding: {
    welcome: 'Bienvenido a Wingman AI',
    subtitle: 'Tu asistente inteligente para entrevistas, estudio y trabajo',
    next: 'Siguiente',
    back: 'Atrás',
    skip: 'Omitir',
    finish: 'Comenzar',
    audioSetup: 'Configuración de Audio',
    screenSetup: 'Configuración de Pantalla',
    modeSelection: 'Elige tu Modo',
    ready: '¡Todo Listo!'
  }
}

// All translations
const translations: Record<Language, Translations> = {
  en,
  es,
  fr: en, // Fallback to English for now
  de: en,
  ja: en,
  zh: en,
  ko: en,
  pt: en
}

// i18n Store
interface I18nState {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string>) => string
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'en',
      
      setLanguage: (lang) => {
        set({ language: lang })
        document.documentElement.lang = lang
        const langInfo = supportedLanguages.find(l => l.code === lang)
        if (langInfo) {
          document.documentElement.dir = langInfo.direction
        }
      },
      
      t: (key, params) => {
        const { language } = get()
        const keys = key.split('.')
        
        let value: any = translations[language]
        
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k]
          } else {
            // Fallback to English
            value = translations.en
            for (const fallbackKey of keys) {
              if (value && typeof value === 'object' && fallbackKey in value) {
                value = value[fallbackKey]
              } else {
                return key // Return key if not found
              }
            }
            break
          }
        }
        
        if (typeof value !== 'string') {
          return key
        }
        
        // Replace params
        if (params) {
          return Object.entries(params).reduce(
            (acc, [paramKey, paramValue]) => acc.replace(`{${paramKey}}`, paramValue),
            value
          )
        }
        
        return value
      }
    }),
    {
      name: 'wingman-i18n'
    }
  )
)

// Helper hook for translations
export function useTranslation() {
  const { language, setLanguage, t } = useI18n()
  
  return {
    language,
    setLanguage,
    t,
    languages: supportedLanguages
  }
}

// Initialize language on load
export function initializeI18n() {
  const store = useI18n.getState()
  document.documentElement.lang = store.language
  const langInfo = supportedLanguages.find(l => l.code === store.language)
  if (langInfo) {
    document.documentElement.dir = langInfo.direction
  }
}

