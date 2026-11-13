import tw from './contracts.tw.json' with { type: 'json' }
import ja from './contracts.ja.json' with { type: 'json' }
import ko from './contracts.ko.json' with { type: 'json' }
import cn from './contracts.cn.json' with { type: 'json' }

export const contractDictionaries: Record<string, Record<string, string>> = { tw, ja, ko, cn }

export interface ContractProse {
  title: string
  description: string
  use?: string
  instead?: { when: string }[]
  classes: { description: string }[]
  states?: { name: string, description?: string }[]
  properties?: { description: string }[]
  keyboard?: { action: string }[]
  platform?: { fallback: string }[]
}

/** Keep contract prose separate from the client dictionary and preserve every executable field. */
export function mapContractProse<T extends ContractProse>(contract: T, translate: (text: string) => string): T {
  return {
    ...contract,
    title: translate(contract.title),
    description: translate(contract.description),
    ...(contract.use && { use: translate(contract.use) }),
    ...(contract.instead && { instead: contract.instead.map(item => ({ ...item, when: translate(item.when) })) }),
    classes: contract.classes.map(entry => ({ ...entry, description: translate(entry.description) })),
    ...(contract.states && { states: contract.states.map(state => ({ ...state, name: translate(state.name), ...(state.description && { description: translate(state.description) }) })) }),
    ...(contract.properties && { properties: contract.properties.map(property => ({ ...property, description: translate(property.description) })) }),
    ...(contract.keyboard && { keyboard: contract.keyboard.map(item => ({ ...item, action: translate(item.action) })) }),
    ...(contract.platform && { platform: contract.platform.map(item => ({ ...item, fallback: translate(item.fallback) })) })
  }
}

export function localizedContract<T extends ContractProse>(contract: T, locale: string): T {
  const dictionary = contractDictionaries[locale]
  return locale === 'en' || !dictionary ? contract : mapContractProse(contract, text => dictionary[text] ?? text)
}
