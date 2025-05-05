'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabaseBrowser = createClientComponentClient()

export default supabaseBrowser 