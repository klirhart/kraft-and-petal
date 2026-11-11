import { useEffect } from 'react'
import { SHOP_CONFIG } from '@/lib/config'

/** Sets the tab title to "<Page name> \u2013 Kraft & Petal". Pass null while the name is unknown. */
export function usePageTitle(title: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} \u2013 ${SHOP_CONFIG.name}` : SHOP_CONFIG.name
  }, [title])
}
