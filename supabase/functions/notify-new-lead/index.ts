import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template } from '../_shared/transactional-email-templates/new-lead-notification.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const FROM = 'Botami Software <notifications@updates.botami-agency.com>'
const TO = ['elias@botami-agency.com', 'theo@botami-agency.com']
const UUID_RE = /^[0-9a-f-]{36}$/i

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const apiKey = Deno.env.get('RESEND_NOTIFS_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!apiKey || !supabaseUrl || !serviceKey) {
    console.error('Missing required environment variables')
    return json({ error: 'Server configuration error' }, 500)
  }

  let leadId: string | undefined
  let templateData: Record<string, any> = {}
  try {
    const body = await req.json()
    const id = body.leadId || body.lead_id
    if (typeof id === 'string' && UUID_RE.test(id)) leadId = id
    if (body.templateData && typeof body.templateData === 'object' && !Array.isArray(body.templateData)) {
      templateData = body.templateData
    }
  } catch {
    return json({ error: 'Invalid JSON in request body' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Même logique que le bloc « 1bis » de send-transactional-email : la ligne leads fait foi.
  if (leadId) {
    let lead: Record<string, any> | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle()
      if (error) { console.error('Lead lookup failed', { error, leadId }); break }
      if (data) { lead = data; break }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500))
    }

    if (lead) {
      const pick = (dbValue: any, fallback: any) => {
        const v = dbValue === null || dbValue === undefined || dbValue === '' ? undefined : dbValue
        const f = fallback === null || fallback === undefined || fallback === '' ? undefined : fallback
        return v ?? f
      }

      let answersSummary: string | undefined
      const reponses = lead.reponses
      if (reponses && typeof reponses === 'object') {
        const lines = Object.entries(reponses as Record<string, unknown>)
          .map(([k, v]) => {
            if (Array.isArray(v)) {
              const val = v.filter((item) => item !== null && typeof item !== 'object').join(', ')
              return val.trim() ? `${k} : ${val}` : null
            }
            if (v !== null && typeof v === 'object') return null
            const val = v == null ? '' : String(v)
            return val.trim() ? `${k} : ${val}` : null
          })
          .filter(Boolean) as string[]
        if (lines.length) answersSummary = lines.join('\n')
      }

      const activite = lead.activite && String(lead.activite).trim() ? String(lead.activite) : undefined
      const baseMessage = pick(lead.message, templateData.message)
      const messageParts = [
        activite ? `Activité : ${activite}` : null,
        baseMessage || null,
        answersSummary || null,
      ].filter(Boolean) as string[]

      templateData = {
        ...templateData,
        firstName: pick(lead.first_name, templateData.firstName),
        email: pick(lead.email, templateData.email),
        phone: pick(lead.phone, templateData.phone),
        company: pick(lead.company, templateData.company),
        budget: pick(lead.budget, templateData.budget),
        companySize: pick(lead.company_size, templateData.companySize),
        situation: pick(lead.situation, templateData.situation),
        message: messageParts.length ? messageParts.join('\n\n') : undefined,
        sourceRoute: pick(lead.source_route, templateData.sourceRoute),
        utmSource: pick(lead.utm_source, templateData.utmSource),
        utmMedium: pick(lead.utm_medium, templateData.utmMedium),
        utmCampaign: pick(lead.utm_campaign, templateData.utmCampaign),
        utmTerm: pick(lead.utm_term, templateData.utmTerm),
      }
    } else {
      console.warn('Lead row not found — falling back to frontend templateData', { leadId })
    }
  }

  const element = React.createElement(template.component, templateData)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: TO, subject, html, text }),
  })
  const resBody = await res.text()
  if (!res.ok) {
    console.error(`Resend send failed [${res.status}]: ${resBody}`)
    return json({ error: 'Resend request failed', status: res.status, details: resBody }, 502)
  }
  console.log('Lead notification sent', { leadId, resend: resBody })
  return json({ success: true })
})
