'use client';

/**
 * Tiny translations for the screens friends use every day. English is the fallback
 * for anything not translated yet. Hindi is everyday Hindi with the English words people
 * actually use for money apps (ट्रिप, UPI), the way PhonePe and GPay write it.
 * Wording that involves money should be checked by a native speaker before adding a language.
 */
import { useEffect, useState } from 'react';

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
] as const;
export type Lang = (typeof LANGS)[number]['code'];

const en = {
  'nav.home': 'Home', 'nav.groups': 'Groups', 'nav.add': 'Add', 'nav.balances': 'Balances', 'nav.profile': 'Profile', 'nav.settings': 'Settings',
  'you': 'You', 'someone': 'Someone',
  'dash.hi': 'Hi, {name} 👋', 'dash.summary': "Here's your summary", 'dash.net': 'Net balance',
  'dash.owed': 'You are owed', 'dash.owe': 'You owe', 'dash.groups': 'Your groups', 'dash.seeAll': 'See all',
  'dash.recent': 'Recent activity', 'dash.empty': 'No expenses yet', 'dash.emptyHint': 'Create a group and add your first expense',
  'exp.paid': '{date} · {name} paid', 'exp.youPaid': 'you paid', 'exp.youOwe': 'you owe {amount}',
  'exp.edit': 'Edit', 'exp.delete': 'Delete', 'exp.confirmDelete': 'Delete this expense?', 'exp.deleted': 'Expense deleted',
  'trip.total': 'Total spent', 'trip.myBalance': 'My balance', 'trip.myShare': 'My share', 'trip.perDay': 'Per day',
  'trip.expenses': 'Expenses', 'trip.youPaid': 'You paid',
  'trip.tab.expenses': 'Expenses', 'trip.tab.balances': 'Balances', 'trip.tab.stats': 'Stats',
  'trip.people': 'People', 'trip.activity': 'Activity', 'trip.done': 'Done',
  'trip.noExpenses': 'No expenses yet', 'trip.addFirst': 'Add your first expense', 'trip.addExpense': 'Add expense',
  'trip.search': 'Search expenses', 'trip.noMatch': 'No expenses match.', 'trip.archived': 'This trip is archived.', 'trip.restore': 'Restore',
  'add.title': 'Add expense', 'add.editTitle': 'Edit expense', 'add.what': 'Title', 'add.whatHint': 'e.g. Dinner at the shack',
  'add.amount': 'Amount ({sym})', 'add.date': 'Date', 'add.category': 'Category', 'add.paidBy': 'Paid by',
  'add.paidIn': 'Paid in', 'add.splitEqually': 'Split equally', 'add.change': 'Change', 'add.splitType': 'Split type',
  'add.equal': 'Equal', 'add.exact': 'Exact', 'add.items': 'Items', 'add.splitBetween': 'Split between',
  'add.save': 'Add expense', 'add.update': 'Save changes', 'add.added': 'Expense added', 'add.updated': 'Expense updated',
  'add.notes': 'Notes (optional)', 'add.keepRate': 'Use this rate for the whole trip (e.g. what your forex card gave you)',
  'settle.done': 'All settled up!', 'settle.none': 'No payments needed', 'settle.markPaid': 'Mark paid', 'settle.gotIt': 'Got it',
  'settle.saving': 'Saving…', 'settle.remind': 'Remind', 'settle.payVia': 'Pay via {method}', 'settle.breakdown': 'See breakdown',
  'settle.recorded': 'Payment recorded', 'settle.confirm': 'Record that {who} paid {to} {amount}?',
  'settle.address': '{method} address', 'settle.addMethods': 'Add UPI, PayPal, crypto and more in Profile so friends can pay you in one tap.',
  'settle.remindText': 'Hey {name}, quick nudge from {trip}: you owe me {amount}. See it and pay in one tap here: {link}',
  'settings.advanced': 'Advanced features', 'settings.advancedHint': 'Stats, activity log, CSV export and %, exact or item-wise splits.',
  'settings.adminsDefault': ' Trip admins see them until you choose here.', 'settings.language': 'Language', 'settings.profileHint': 'Name, email and how friends pay you', 'settings.feedback': 'Send feedback', 'settings.signOut': 'Sign out',
  'link.hi': 'Hi {name}', 'link.settled': "You're all settled up 🎉", 'link.owe': 'You owe {amount}', 'link.get': 'You get back {amount}',
  'link.share': 'Your share of {n} expenses: {amount}', 'link.pay': 'Pay {name} {amount}', 'link.paysYou': '{name} pays you {amount}',
  'link.noMethod': "{name} hasn't added a payment method yet. Pay them however you usually do.",
  'link.after': 'After you pay, tell the trip admin so they can mark it paid.', 'link.broken': "This link doesn't work any more",
  'link.brokenHint': 'Ask whoever sent it for a fresh one.', 'link.join': 'Want to add expenses yourself?', 'link.signup': 'Make a free account',
};
type Key = keyof typeof en;

const hi: Partial<Record<Key, string>> = {
  'nav.home': 'होम', 'nav.groups': 'ग्रुप', 'nav.add': 'जोड़ें', 'nav.balances': 'हिसाब', 'nav.profile': 'प्रोफ़ाइल', 'nav.settings': 'सेटिंग्स',
  'you': 'आप', 'someone': 'कोई',
  'dash.hi': 'नमस्ते, {name} 👋', 'dash.summary': 'आपका हिसाब एक नज़र में', 'dash.net': 'कुल बैलेंस',
  'dash.owed': 'आपको मिलने हैं', 'dash.owe': 'आपको देने हैं', 'dash.groups': 'आपके ग्रुप', 'dash.seeAll': 'सब देखें',
  'dash.recent': 'हाल के खर्चे', 'dash.empty': 'अभी कोई खर्चा नहीं', 'dash.emptyHint': 'ग्रुप बनाइए और पहला खर्चा जोड़िए',
  'exp.paid': '{date} · {name} ने दिए', 'exp.youPaid': 'आपने दिए', 'exp.youOwe': 'आपको {amount} देने हैं',
  'exp.edit': 'बदलें', 'exp.delete': 'हटाएँ', 'exp.confirmDelete': 'यह खर्चा हटाएँ?', 'exp.deleted': 'खर्चा हटा दिया',
  'trip.total': 'कुल खर्चा', 'trip.myBalance': 'मेरा बैलेंस', 'trip.myShare': 'मेरा हिस्सा', 'trip.perDay': 'हर दिन',
  'trip.expenses': 'खर्चे', 'trip.youPaid': 'आपने दिए',
  'trip.tab.expenses': 'खर्चे', 'trip.tab.balances': 'हिसाब', 'trip.tab.stats': 'आँकड़े',
  'trip.people': 'लोग', 'trip.activity': 'गतिविधि', 'trip.done': 'हो गया',
  'trip.noExpenses': 'अभी कोई खर्चा नहीं', 'trip.addFirst': 'पहला खर्चा जोड़िए', 'trip.addExpense': 'खर्चा जोड़ें',
  'trip.search': 'खर्चे खोजें', 'trip.noMatch': 'कोई खर्चा नहीं मिला।', 'trip.archived': 'यह ट्रिप आर्काइव है।', 'trip.restore': 'वापस लाएँ',
  'add.title': 'खर्चा जोड़ें', 'add.editTitle': 'खर्चा बदलें', 'add.what': 'किस चीज़ का', 'add.whatHint': 'जैसे: शैक पर डिनर',
  'add.amount': 'रकम ({sym})', 'add.date': 'तारीख', 'add.category': 'किस तरह का', 'add.paidBy': 'किसने दिए',
  'add.paidIn': 'किस करेंसी में', 'add.splitEqually': 'सब में बराबर', 'add.change': 'बदलें', 'add.splitType': 'कैसे बाँटें',
  'add.equal': 'बराबर', 'add.exact': 'तय रकम', 'add.items': 'आइटम से', 'add.splitBetween': 'किस-किस में बाँटें',
  'add.save': 'खर्चा जोड़ें', 'add.update': 'बदलाव सेव करें', 'add.added': 'खर्चा जुड़ गया', 'add.updated': 'खर्चा बदल गया',
  'add.notes': 'नोट (ज़रूरी नहीं)', 'add.keepRate': 'पूरी ट्रिप के लिए यही रेट रखें (जैसे फ़ॉरेक्स कार्ड वाला)',
  'settle.done': 'सब हिसाब बराबर!', 'settle.none': 'किसी को कुछ नहीं देना', 'settle.markPaid': 'पेमेंट हो गया', 'settle.gotIt': 'मिल गए',
  'settle.saving': 'सेव हो रहा है…', 'settle.remind': 'याद दिलाएँ', 'settle.payVia': '{method} से दें', 'settle.breakdown': 'पूरा हिसाब देखें',
  'settle.recorded': 'पेमेंट दर्ज हो गया', 'settle.confirm': 'दर्ज करें कि {who} ने {to} को {amount} दिए?',
  'settle.address': '{method} पता', 'settle.addMethods': 'प्रोफ़ाइल में UPI, PayPal वगैरह जोड़िए, ताकि दोस्त एक टैप में पैसे दे सकें।',
  'settle.remindText': 'हाय {name}, {trip} का हिसाब: आपको मुझे {amount} देने हैं। यहाँ देखिए और एक टैप में दीजिए: {link}',
  'settings.advanced': 'एडवांस्ड फ़ीचर', 'settings.advancedHint': 'आँकड़े, गतिविधि, CSV और %, तय रकम या आइटम से बाँटना।',
  'settings.adminsDefault': ' जब तक आप न चुनें, ट्रिप एडमिन को ये दिखते हैं।', 'settings.language': 'भाषा', 'settings.profileHint': 'नाम, ईमेल और दोस्त आपको पैसे कैसे दें', 'settings.feedback': 'सुझाव भेजें', 'settings.signOut': 'साइन आउट',
  'link.hi': 'नमस्ते {name}', 'link.settled': 'आपका सब हिसाब बराबर है 🎉', 'link.owe': 'आपको {amount} देने हैं', 'link.get': 'आपको {amount} वापस मिलने हैं',
  'link.share': '{n} खर्चों में आपका हिस्सा: {amount}', 'link.pay': '{name} को {amount} दें', 'link.paysYou': '{name} आपको {amount} देंगे',
  'link.noMethod': '{name} ने अभी पेमेंट का तरीका नहीं जोड़ा। जैसे हमेशा देते हैं, वैसे दे दीजिए।',
  'link.after': 'पैसे देने के बाद ट्रिप एडमिन को बता दीजिए, ताकि वो इसे दर्ज कर दें।', 'link.broken': 'यह लिंक अब काम नहीं करता',
  'link.brokenHint': 'जिसने भेजा है, उनसे नया लिंक माँगिए।', 'link.join': 'खुद खर्चे जोड़ना चाहते हैं?', 'link.signup': 'फ़्री अकाउंट बनाइए',
};

export const DICTS: Record<Lang, Partial<Record<Key, string>>> = { en, hi };
const KEY = 'tripsplit:lang';
const EVENT = 'tripsplit:lang-changed';

export function getLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'en' || v === 'hi') return v;
  } catch {}
  return 'en';
}

export function setLang(lang: Lang) {
  try { localStorage.setItem(KEY, lang); } catch {}
  document.documentElement.lang = lang;
  window.dispatchEvent(new Event(EVENT));
}

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const s = DICTS[lang][key] ?? en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : s;
}

/** `const t = useT(); t('dash.owe')` — re-renders when the language changes. */
export function useT() {
  const [lang, set] = useState<Lang>('en');
  useEffect(() => {
    const sync = () => { const l = getLang(); set(l); document.documentElement.lang = l; };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const t = (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
  t.lang = lang;
  return t;
}
