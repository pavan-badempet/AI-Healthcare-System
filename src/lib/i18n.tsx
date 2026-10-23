/**
 * AI Healthcare System — Internationalization (i18n) & Multi-lingual Support
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'es' | 'hi' | 'fr' | 'de' | 'zh' | 'ar' | 'te';

export interface ClinicalLanguageMetadata {
  code: Language;
  nativeLabel: string;
  englishName: string;
  localeTag: string;
  direction: 'ltr' | 'rtl';
  clinicalStandard: string;
}

export const CLINICAL_LANGUAGES: ClinicalLanguageMetadata[] = [
  {
    code: 'en',
    nativeLabel: 'English',
    englishName: 'English (US / International)',
    localeTag: 'en-US',
    direction: 'ltr',
    clinicalStandard: 'SNOMED-CT / ICD-10-CM',
  },
  {
    code: 'es',
    nativeLabel: 'Español',
    englishName: 'Spanish (Clinical)',
    localeTag: 'es-ES',
    direction: 'ltr',
    clinicalStandard: 'SNOMED-CT / CIE-10',
  },
  {
    code: 'hi',
    nativeLabel: 'हिन्दी',
    englishName: 'Hindi (ABDM / India)',
    localeTag: 'hi-IN',
    direction: 'ltr',
    clinicalStandard: 'ABDM FHIR / ICD-11',
  },
  {
    code: 'te',
    nativeLabel: 'తెలుగు',
    englishName: 'Telugu (ABDM / India)',
    localeTag: 'te-IN',
    direction: 'ltr',
    clinicalStandard: 'ABDM FHIR / ICD-11',
  },
  {
    code: 'fr',
    nativeLabel: 'Français',
    englishName: 'French (Clinical)',
    localeTag: 'fr-FR',
    direction: 'ltr',
    clinicalStandard: 'SNOMED-CT / CIM-10',
  },
  {
    code: 'de',
    nativeLabel: 'Deutsch',
    englishName: 'German (Clinical)',
    localeTag: 'de-DE',
    direction: 'ltr',
    clinicalStandard: 'ICD-10-GM / HL7',
  },
  {
    code: 'zh',
    nativeLabel: '中文',
    englishName: 'Chinese (Simplified)',
    localeTag: 'zh-CN',
    direction: 'ltr',
    clinicalStandard: 'ICD-11 / CN-FHIR',
  },
  {
    code: 'ar',
    nativeLabel: 'العربية',
    englishName: 'Arabic (RTL Clinical)',
    localeTag: 'ar-SA',
    direction: 'rtl',
    clinicalStandard: 'WHO ICD-11 / HL7 RTL',
  },
];

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Patients',
    'nav.capacity': 'Beds',
    'nav.telemedicine': 'Telehealth',
    'nav.predict': 'Health AI',
    'nav.chat': 'Assistant',
    'nav.frontier': 'Autonomous Frontier',
    'nav.lakehouse': 'Data Platform',
    'nav.admin': 'Admin',
    'common.logout': 'Sign Out',
    'common.search': 'Search',
    'profile.kicker': 'Clinician Identity & Security',
    'profile.title': 'User Profile & RBAC Role',
    'profile.subtitle': 'Manage clinician credentials, role assignments, and clinical interface language.',
    'profile.activeRole': 'Active Role',
    'profile.switchRole': 'Switch Active Persona / Role',
    'profile.languageSectionTitle': 'Clinical Interface Language & Localization',
    'profile.languageSectionDesc': 'Select the active display language for navigation, clinical terminology, and patient handoff workflows.',
    'profile.editTitle': 'Edit Profile Details',
    'profile.fullName': 'Full Name',
    'profile.email': 'Email Address',
    'profile.username': 'Username',
    'profile.saveButton': 'Save Profile',
    'profile.savedMessage': 'Profile & localization preferences updated!',
    'profile.menuSettings': 'Profile Settings',
    'profile.menuLanguage': 'Interface Language',
    'profile.disclaimerSample': 'Clinical decision support output must be verified by a licensed physician.',
  },
  es: {
    'nav.dashboard': 'Panel Clínico',
    'nav.patients': 'Pacientes',
    'nav.capacity': 'Camas',
    'nav.telemedicine': 'Telemedicina',
    'nav.predict': 'IA Clínica',
    'nav.chat': 'Asistente',
    'nav.frontier': 'Frontera Autónoma',
    'nav.lakehouse': 'Plataforma de Datos',
    'nav.admin': 'Admin',
    'common.logout': 'Cerrar Sesión',
    'common.search': 'Buscar',
    'profile.kicker': 'Identidad Clínica y Seguridad',
    'profile.title': 'Perfil de Usuario y Rol RBAC',
    'profile.subtitle': 'Gestione credenciales médicas, asignación de roles e idioma de la interfaz clínica.',
    'profile.activeRole': 'Rol Activo',
    'profile.switchRole': 'Cambiar Persona / Rol Activo',
    'profile.languageSectionTitle': 'Idioma de la Interfaz Clínica y Localización',
    'profile.languageSectionDesc': 'Seleccione el idioma activo para navegación, terminología médica y transferencias clínicas.',
    'profile.editTitle': 'Editar Detalles del Perfil',
    'profile.fullName': 'Nombre Completo',
    'profile.email': 'Correo Electrónico',
    'profile.username': 'Nombre de Usuario',
    'profile.saveButton': 'Guardar Perfil',
    'profile.savedMessage': '¡Perfil y preferencias de idioma actualizados!',
    'profile.menuSettings': 'Configuración del Perfil',
    'profile.menuLanguage': 'Idioma de Interfaz',
    'profile.disclaimerSample': 'El soporte de decisión clínica debe ser verificado por un médico autorizado.',
  },
  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.patients': 'रोगी सूची',
    'nav.capacity': 'बिस्तर क्षमता',
    'nav.telemedicine': 'टेलीमेडिसिन',
    'nav.predict': 'स्वास्थ्य एआई',
    'nav.chat': 'सहायक',
    'nav.frontier': 'स्वायत्त फ्रंटियर',
    'nav.lakehouse': 'डेटा प्लेटफ़ॉर्म',
    'nav.admin': 'प्रशासन',
    'common.logout': 'लॉग आउट',
    'common.search': 'खोजें',
    'profile.kicker': 'चिकित्सक पहचान और सुरक्षा',
    'profile.title': 'उपयोगकर्ता प्रोफ़ाइल और RBAC भूमिका',
    'profile.subtitle': 'चिकित्सक प्रमाणपत्र, भूमिका असाइनमेंट और क्लिनिकल इंटरफ़ेस भाषा प्रबंधित करें।',
    'profile.activeRole': 'सक्रिय भूमिका',
    'profile.switchRole': 'सक्रिय भूमिका बदलें',
    'profile.languageSectionTitle': 'क्लिनिकल इंटरफ़ेस भाषा और स्थानीयकरण',
    'profile.languageSectionDesc': 'नेविगेशन, चिकित्सा शब्दावली और रोगी हैंडऑफ़ वर्कफ़्लो के लिए सक्रिय भाषा चुनें।',
    'profile.editTitle': 'प्रोफ़ाइल विवरण संपादित करें',
    'profile.fullName': 'पूरा नाम',
    'profile.email': 'ईमेल पता',
    'profile.username': 'उपयोगकर्ता नाम',
    'profile.saveButton': 'प्रोफ़ाइल सहेजें',
    'profile.savedMessage': 'प्रोफ़ाइल और भाषा प्राथमिकताएं सफलतापूर्वक अपडेट की गईं!',
    'profile.menuSettings': 'प्रोफ़ाइल सेटिंग्स',
    'profile.menuLanguage': 'इंटरफ़ेस भाषा',
    'profile.disclaimerSample': 'क्लिनिकल निर्णय सहायता परिणामों की पुष्टि योग्य चिकित्सक द्वारा की जानी चाहिए।',
  },
  fr: {
    'nav.dashboard': 'Tableau de Bord',
    'nav.patients': 'Patients',
    'nav.capacity': 'Lits',
    'nav.telemedicine': 'Télésanté',
    'nav.predict': 'IA Santé',
    'nav.chat': 'Assistant',
    'nav.frontier': 'Frontière Autonome',
    'nav.lakehouse': 'Plateforme de Données',
    'nav.admin': 'Admin',
    'common.logout': 'Se déconnecter',
    'common.search': 'Rechercher',
    'profile.kicker': 'Identité Clinique et Sécurité',
    'profile.title': 'Profil Utilisateur et Rôle RBAC',
    'profile.subtitle': 'Gérez les identifiants cliniques, les attributions de rôles et la langue de l’interface.',
    'profile.activeRole': 'Rôle Actif',
    'profile.switchRole': 'Changer de Rôle Actif',
    'profile.languageSectionTitle': 'Langue de l’Interface Clinique et Localisation',
    'profile.languageSectionDesc': 'Sélectionnez la langue d’affichage pour la navigation et les dossiers médicaux.',
    'profile.editTitle': 'Modifier les Détails du Profil',
    'profile.fullName': 'Nom Complet',
    'profile.email': 'Adresse E-mail',
    'profile.username': 'Nom d’utilisateur',
    'profile.saveButton': 'Enregistrer le Profil',
    'profile.savedMessage': 'Profil et langue mis à jour avec succès !',
    'profile.menuSettings': 'Paramètres du Profil',
    'profile.menuLanguage': 'Langue de l’Interface',
    'profile.disclaimerSample': 'L’aide à la décision clinique doit être vérifiée par un médecin agréé.',
  },
  de: {
    'nav.dashboard': 'Dashboard',
    'nav.patients': 'Patienten',
    'nav.capacity': 'Betten',
    'nav.telemedicine': 'Telemedizin',
    'nav.predict': 'Diagnose-KI',
    'nav.chat': 'Assistent',
    'nav.frontier': 'Autonome Grenze',
    'nav.lakehouse': 'Datenplattform',
    'nav.admin': 'Admin',
    'common.logout': 'Abmelden',
    'common.search': 'Suchen',
    'profile.kicker': 'Klinische Identität & Sicherheit',
    'profile.title': 'Benutzerprofil & RBAC-Rolle',
    'profile.subtitle': 'Verwalten Sie Zugangsdaten, Rollenzuweisungen und die klinische Oberflächensprache.',
    'profile.activeRole': 'Aktive Rolle',
    'profile.switchRole': 'Aktive Rolle wechseln',
    'profile.languageSectionTitle': 'Klinische Oberflächensprache & Lokalisierung',
    'profile.languageSectionDesc': 'Wählen Sie die aktive Anzeigesprache für Navigation und klinische Übergaben.',
    'profile.editTitle': 'Profildaten bearbeiten',
    'profile.fullName': 'Vollständiger Name',
    'profile.email': 'E-Mail-Adresse',
    'profile.username': 'Benutzername',
    'profile.saveButton': 'Profil speichern',
    'profile.savedMessage': 'Profil und Spracheinstellungen erfolgreich aktualisiert!',
    'profile.menuSettings': 'Profileinstellungen',
    'profile.menuLanguage': 'Oberflächensprache',
    'profile.disclaimerSample': 'Klinische Entscheidungsunterstützung muss ärztlich überprüft werden.',
  },
  zh: {
    'nav.dashboard': '临床仪表板',
    'nav.patients': '患者名册',
    'nav.capacity': '病床管理',
    'nav.telemedicine': '远程医疗',
    'nav.predict': '健康AI评估',
    'nav.chat': '临床助手',
    'nav.frontier': '自主医疗前沿',
    'nav.lakehouse': '数据中台',
    'nav.admin': '管理中心',
    'common.logout': '退出登录',
    'common.search': '搜索',
    'profile.kicker': '临床医生身份与安全',
    'profile.title': '用户资料与 RBAC 角色',
    'profile.subtitle': '管理临床医生凭证、角色权限分配以及临床界面语言设置。',
    'profile.activeRole': '当前角色',
    'profile.switchRole': '切换当前临床角色',
    'profile.languageSectionTitle': '临床界面语言与多语言本地化',
    'profile.languageSectionDesc': '选择用于导航栏、临床术语及患者交接班流程的显示语言。',
    'profile.editTitle': '编辑个人资料',
    'profile.fullName': '姓名',
    'profile.email': '电子邮箱',
    'profile.username': '用户名',
    'profile.saveButton': '保存个人资料',
    'profile.savedMessage': '个人资料与界面语言偏好已更新！',
    'profile.menuSettings': '个人资料设置',
    'profile.menuLanguage': '界面语言',
    'profile.disclaimerSample': '临床决策支持结果必须由执业医师审核确认。',
  },
  ar: {
    'nav.dashboard': 'لوحة التحكم',
    'nav.patients': 'المرضى',
    'nav.capacity': 'الأسرة',
    'nav.telemedicine': 'الطب عن بعد',
    'nav.predict': 'الذكاء التشخيصي',
    'nav.chat': 'المساعد الطبي',
    'nav.frontier': 'الواجهة المستقلة',
    'nav.lakehouse': 'منصة البيانات',
    'nav.admin': 'المسؤول',
    'common.logout': 'تسجيل خروج',
    'common.search': 'بحث',
    'profile.kicker': 'هوية الطبيب والأمان',
    'profile.title': 'ملف المستخدم ودور الصلاحيات',
    'profile.subtitle': 'إدارة بيانات اعتماد الطبيب، وتعيينات الأدوار، ولغة الواجهة السريرية.',
    'profile.activeRole': 'الدور النشط',
    'profile.switchRole': 'تبديل الدور النشط',
    'profile.languageSectionTitle': 'لغة الواجهة السريرية والترجمة',
    'profile.languageSectionDesc': 'اختر لغة العرض النشطة للتنقل والمصطلحات السريرية وتسليم رعاية المرضى.',
    'profile.editTitle': 'تعديل تفاصيل الملف الشخصي',
    'profile.fullName': 'الاسم الكامل',
    'profile.email': 'البريد الإلكتروني',
    'profile.username': 'اسم المستخدم',
    'profile.saveButton': 'حفظ الملف الشخصي',
    'profile.savedMessage': 'تم تحديث الملف الشخصي وتفضيلات اللغة بنجاح!',
    'profile.menuSettings': 'إعدادات الملف الشخصي',
    'profile.menuLanguage': 'لغة الواجهة',
    'profile.disclaimerSample': 'يجب التحقق من مخرجات دعم القرار السريري من قبل طبيب مرخص.',
  },
  te: {
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.patients': 'రోగులు',
    'nav.capacity': 'పడకలు',
    'nav.telemedicine': 'టెలిమెడిసిన్',
    'nav.predict': 'హెల్త్ AI',
    'nav.chat': 'అసిస్టెంట్',
    'nav.frontier': 'స్వయంప్రతిపత్తి ఫ్రాంటియర్',
    'nav.lakehouse': 'డేటా లేక్‌హౌస్',
    'nav.admin': 'అడ్మిన్',
    'common.logout': 'లాగ్ అవుట్',
    'common.search': 'శోధించండి',
    'profile.kicker': 'వైద్యుని గుర్తింపు & భద్రత',
    'profile.title': 'వినియోగదారు ప్రొఫైల్ & RBAC పాత్ర',
    'profile.subtitle': 'వైద్యుల వివరాలు, పాత్ర అసైన్‌మెంట్‌లు మరియు క్లినికల్ ఇంటర్‌ఫేస్ భాషను నిర్వహించండి.',
    'profile.activeRole': 'ప్రస్తుత పాత్ర',
    'profile.switchRole': 'ప్రస్తుత పాత్రను మార్చండి',
    'profile.languageSectionTitle': 'క్లినికల్ ఇంటర్‌ఫేస్ భాష & స్థానికీకరణ',
    'profile.languageSectionDesc': 'నావిగేషన్, వైద్య పదజాలం మరియు రోగి హ్యాండ్ఆఫ్ కోసం భాషను ఎంచుకోండి.',
    'profile.editTitle': 'ప్రొఫైల్ వివరాలను సవరించండి',
    'profile.fullName': 'పూర్తి పేరు',
    'profile.email': 'ఇమెయిల్ చిరునామా',
    'profile.username': 'వినియోగదారు పేరు',
    'profile.saveButton': 'ప్రొఫైల్ సేవ్ చేయండి',
    'profile.savedMessage': 'ప్రొఫైల్ మరియు భాషా ఎంపికలు విజయవంతంగా నవీకరించబడ్డాయి!',
    'profile.menuSettings': 'ప్రొఫైల్ సెట్టింగ్‌లు',
    'profile.menuLanguage': 'ఇంటర్‌ఫేస్ భాష',
    'profile.disclaimerSample': 'క్లినికల్ నిర్ణయ సహాయక ఫలితాలను అర్హత కలిగిన వైద్యుడు ధృవీకరించాలి.',
  },
};

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app-language') as Language;
      if (stored && TRANSLATIONS[stored]) return stored;
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-language', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
