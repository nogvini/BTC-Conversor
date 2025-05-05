'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = 'https://sqnxrzndkppbwqdmvzer.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbnhyem5ka3BwYndxZG12emVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MDA0NDMsImV4cCI6MjA2MTk3NjQ0M30.yaMQFTEWoNT3OeOCq-P05w39hpe1ppDcMp4DR7gVMRw'

export const supabaseBrowser = createClientComponentClient({
  supabaseUrl,
  supabaseKey,
})

export default supabaseBrowser 