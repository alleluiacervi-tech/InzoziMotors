// Message section: ui — small strings in shared components that several page
// groups render (legal-page chrome, center list labels).
import type { Locale } from '../config'

export const ui: Record<Locale, Record<string, unknown>> = {
  en: {
    legalEyebrow: 'Legal',
    onThisPage: 'On this page',
    draftTitle: 'Draft — pending legal review',
    draftBody:
      'This document describes how Sawa Cars actually operates today, written in plain language. It has not yet been reviewed by a qualified lawyer in Rwanda and is not legal advice. Users should obtain independent legal advice for their own contracts and regulated obligations before launch.',
    address: 'Address',
    openingHours: 'Opening hours',
  },
  rw: {
    legalEyebrow: 'Amategeko',
    onThisPage: 'Kuri iyi paji',
    draftTitle: 'Umushinga — utegereje isuzuma ry’abanyamategeko',
    draftBody:
      'Iyi nyandiko isobanura uko Sawa Cars ikora ubu koko, yanditswe mu magambo yoroshye. Ntiramenywa n’umunyamategeko wemewe mu Rwanda kandi si inama y’amategeko. Abakoresha bagomba gushaka inama y’amategeko yigenga ku masezerano yabo n’inshingano zigengwa n’amategeko mbere yo gutangira.',
    address: 'Aderesi',
    openingHours: 'Amasaha y’akazi',
  },
  fr: {
    legalEyebrow: 'Juridique',
    onThisPage: 'Sur cette page',
    draftTitle: 'Brouillon — en attente de révision juridique',
    draftBody:
      'Ce document décrit le fonctionnement réel de Sawa Cars aujourd’hui, rédigé en langage clair. Il n’a pas encore été révisé par un avocat qualifié au Rwanda et ne constitue pas un avis juridique. Les utilisateurs devraient obtenir un avis juridique indépendant pour leurs propres contrats et obligations réglementées avant le lancement.',
    address: 'Adresse',
    openingHours: 'Heures d’ouverture',
  },
  sw: {
    legalEyebrow: 'Kisheria',
    onThisPage: 'Kwenye ukurasa huu',
    draftTitle: 'Rasimu — inasubiri ukaguzi wa kisheria',
    draftBody:
      'Hati hii inaeleza jinsi Sawa Cars inavyofanya kazi leo hii, imeandikwa kwa lugha rahisi. Bado haijakaguliwa na wakili aliyehitimu nchini Rwanda na si ushauri wa kisheria. Watumiaji wanapaswa kupata ushauri wa kisheria unaojitegemea kwa mikataba yao na wajibu unaodhibitiwa kabla ya uzinduzi.',
    address: 'Anwani',
    openingHours: 'Saa za kufungua',
  },
  ko: {
    legalEyebrow: '법률',
    onThisPage: '이 페이지에서',
    draftTitle: '초안 — 법률 검토 대기 중',
    draftBody:
      '이 문서는 오늘날 Sawa Cars가 실제로 어떻게 운영되는지를 쉬운 언어로 설명합니다. 아직 르완다의 자격을 갖춘 변호사의 검토를 받지 않았으며 법률 자문이 아닙니다. 이용자는 출시 전에 자신의 계약과 규제 의무에 대해 독립적인 법률 자문을 받아야 합니다.',
    address: '주소',
    openingHours: '영업 시간',
  },
}
