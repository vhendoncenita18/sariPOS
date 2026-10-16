import { cache } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasPasswordOnlySession, hasPermittedOnlineAuthentication } from '@/lib/auth/session'

export const getStoreContext = cache(async () => {
  await connection()
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: claims, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError || !hasPermittedOnlineAuthentication(claims?.claims)) {
    redirect(hasPasswordOnlySession(claims?.claims) ? '/mfa/choose' : '/login')
  }

  const { data: membership, error: membershipError } = await supabase
    .from('user_store_members')
    .select('store_id, role')
    .order('store_id')
    .limit(1)
    .maybeSingle()

  if (membershipError) redirect('/setup/store?error=membership')
  if (!membership) redirect('/setup/store')

  const { data: permissions } = await supabase.rpc('get_current_store_permissions')

  return {
    supabase,
    user,
    membership,
    storeId: membership.store_id,
    isOwner: membership.role === 'owner',
    permissions: Array.isArray(permissions) ? permissions.filter((permission): permission is string => typeof permission === 'string') : [],
    roleLabel: membership.role === 'owner' ? 'Store owner' : membership.role === 'cashier' ? 'Cashier' : 'Store member',
  }
})
