// Barrel of localized message sections, merged into the dictionary by name.
// Each section file owns one page group's strings so they can be edited
// independently. Add a new section here when you add its file.
import type { Locale } from '../config'
import { home } from './home'
import { cars } from './cars'
import { rentals } from './rentals'
import { sell } from './sell'
import { tools } from './tools'
import { marketing } from './marketing'
import { auth } from './auth'
import { dashboard } from './dashboard'
import { faq } from './faq'
import { store } from './store'

export const SECTIONS: Record<string, Record<Locale, Record<string, unknown>>> = {
  home,
  cars,
  rentals,
  sell,
  tools,
  marketing,
  auth,
  dashboard,
  faq,
  store,
}
