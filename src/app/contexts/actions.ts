'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServiceClient } from '@/lib/db/supabase'

function requiredField(formData: FormData, name: string): string {
  const value = formData.get(name)
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required field: ${name}`)
  }
  return value.trim()
}

export async function createBusinessContext(formData: FormData) {
  const supabase = createSupabaseServiceClient()
  const { error } = await supabase.from('business_contexts').insert({
    business_name: requiredField(formData, 'business_name'),
    business_description: requiredField(formData, 'business_description'),
    target_audience: requiredField(formData, 'target_audience'),
  })
  if (error) throw error

  revalidatePath('/contexts')
  redirect('/contexts')
}

export async function updateBusinessContext(id: string, formData: FormData) {
  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('business_contexts')
    .update({
      business_name: requiredField(formData, 'business_name'),
      business_description: requiredField(formData, 'business_description'),
      target_audience: requiredField(formData, 'target_audience'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error

  revalidatePath('/contexts')
  redirect('/contexts')
}

export async function deleteBusinessContext(id: string) {
  const supabase = createSupabaseServiceClient()
  // Runs reference business_contexts with ON DELETE RESTRICT (0001_init.sql),
  // so deleting a context with existing Runs fails loudly rather than
  // orphaning them -- surfaced here as a thrown error.
  const { error } = await supabase.from('business_contexts').delete().eq('id', id)
  if (error) {
    throw new Error(
      'Could not delete: this Business Context has Runs attached to it. Delete those Runs first.'
    )
  }

  revalidatePath('/contexts')
  redirect('/contexts')
}
