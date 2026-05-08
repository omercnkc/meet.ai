import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language = "en" | "tr";

const translations = {
  en: {
    welcomeTitle: "Hello, {name}",
    welcomeSubtitle: "Ready for your next meeting?",
    startMeeting: "New Meeting",
    startingMeeting: "Starting...",
    signOut: "Sign Out",
    recentMeetings: "Recent Meetings",
    noMeetingsTitle: "No meetings yet",
    noMeetingsDesc: "Start your first meeting to get going.",
    startFirstMeeting: "New",
    justNow: "Just now",
    active: "Active",
    ended: "Ended",
    openTasksTitle: "Open Tasks",
    noOpenTasks: "No open tasks from previous meetings.",
    completedTasksTitle: "Completed Tasks",
    noCompletedTasks: "No completed tasks.",
    unknownMeeting: "Unknown Meeting",
    unknownDate: "Unknown Date",
    markAsDone: "Mark as done",
    meetingPrefix: "Meeting:",
    datePrefix: "Date:",
    startPrefix: "Start:",
    endPrefix: "End:",
    assignedToPrefix: "Assigned to:",
    you: "You",
    unassigned: "Unassigned",
    taskHint: "Tasks from your ended meetings will appear here.",
    leave: "Leave",
    endMeeting: "End Meeting",
    connecting: "Connecting...",
    roomError: "Failed to connect to room",
    record: "Record",
    stop: "Stop",
    recording: "Recording..."
  },
  tr: {
    welcomeTitle: "Merhaba, {name}",
    welcomeSubtitle: "Sonraki toplantınız için hazır mısınız?",
    startMeeting: "Yeni Toplantı",
    startingMeeting: "Başlatılıyor...",
    signOut: "Çıkış Yap",
    recentMeetings: "Son Toplantılar",
    noMeetingsTitle: "Henüz toplantı yok",
    noMeetingsDesc: "Başlamak için ilk toplantınızı oluşturun.",
    startFirstMeeting: "Yeni",
    justNow: "Şimdi",
    active: "Aktif",
    ended: "Bitti",
    openTasksTitle: "Açık Görevler",
    noOpenTasks: "Önceki toplantılardan açık görev yok.",
    completedTasksTitle: "Tamamlanan Görevler",
    noCompletedTasks: "Tamamlanan görev yok.",
    unknownMeeting: "Bilinmeyen Toplantı",
    unknownDate: "Bilinmeyen Tarih",
    markAsDone: "Tamamlandı olarak işaretle",
    meetingPrefix: "Toplantı:",
    datePrefix: "Tarih:",
    startPrefix: "Başlangıç:",
    endPrefix: "Bitiş:",
    assignedToPrefix: "Atanan:",
    you: "Siz",
    unassigned: "Atanmamış",
    taskHint: "Biten toplantılarınızdaki görevler burada görünecektir.",
    leave: "Ayrıl",
    endMeeting: "Toplantıyı Bitir",
    connecting: "Bağlanıyor...",
    roomError: "Odaya bağlanılamadı",
    record: "Kaydet",
    stop: "Durdur",
    recording: "Kaydediliyor..."
  }
};

let currentLang: Language = "en";
const listeners: Array<(lang: Language) => void> = [];

export const initI18n = async () => {
  try {
    const saved = await AsyncStorage.getItem("app_lang");
    if (saved === "tr" || saved === "en") {
      currentLang = saved;
    }
  } catch (e) {}
};

export const setLanguage = async (lang: Language) => {
  currentLang = lang;
  try {
    await AsyncStorage.setItem("app_lang", lang);
  } catch (e) {}
  listeners.forEach(l => l(lang));
};

export const useTranslation = () => {
  const [lang, setLang] = useState<Language>(currentLang);

  useEffect(() => {
    const listener = (newLang: Language) => setLang(newLang);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const t = (key: keyof typeof translations["en"], params?: Record<string, string>) => {
    let str = translations[lang][key] || translations["en"][key] || key;
    if (params) {
      Object.keys(params).forEach(k => {
        str = str.replace(`{${k}}`, params[k]);
      });
    }
    return str;
  };

  return { t, lang, setLanguage };
};
