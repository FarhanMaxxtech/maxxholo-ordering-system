declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get(key: string): string | undefined
  }
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}))
    const type = body.type || 'new_order'
    const order = body.order || body.record || {}
    const recipientEmail = body.recipientEmail || null
    const status = body.status || order.status || ''

    const resendApiKey = 're_19Zny4Xo_2qDENUqk8Mf6xBtUMA6BRf1k'
    const fromAddress = 'Maxxholo Orders <onboarding@resend.dev>'
    const to = recipientEmail ? [recipientEmail] : ['onboarding@resend.dev']
    const subject = type === 'status_update'
      ? `📦 Order ${order.order_number || 'Update'} — ${status}`
      : `📦 New Order ${order.order_number || ''} — ${order.brand || '—'}`

    const title = type === 'status_update'
      ? `Order status updated to ${status}`
      : 'New Job Order Submitted'

    const message = type === 'status_update'
      ? `Your order ${order.order_number || '—'} is now ${status}.`
      : `A new job order has been submitted and is currently ${order.status || 'Pending'}.`

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured.')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#2f7de1;padding:20px;border-radius:8px 8px 0 0;">
              <h2 style="color:#fff;margin:0;">${title}</h2>
            </div>
            <div style="background:#f9f9f9;padding:20px;border-radius:0 0 8px 8px;border:1px solid #eee;">
              <p style="margin-top:0;color:#333;">${message}</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr>
                  <td style="padding:8px;color:#666;width:140px;">Invoice #</td>
                  <td style="padding:8px;font-weight:bold;">${order.order_number || '—'}</td>
                </tr>
                <tr style="background:#fff;">
                  <td style="padding:8px;color:#666;">Brand</td>
                  <td style="padding:8px;">${order.brand || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666;">Company</td>
                  <td style="padding:8px;">${order.company || '—'}</td>
                </tr>
                <tr style="background:#fff;">
                  <td style="padding:8px;color:#666;">Product</td>
                  <td style="padding:8px;">${order.product || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666;">Quantity</td>
                  <td style="padding:8px;">${order.qty || '—'}</td>
                </tr>
                <tr style="background:#fff;">
                  <td style="padding:8px;color:#666;">Status</td>
                  <td style="padding:8px;">${order.status || status || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666;">Sales PIC</td>
                  <td style="padding:8px;">${order.pic || '—'}</td>
                </tr>
                <tr style="background:#fff;">
                  <td style="padding:8px;color:#666;">Submitted by</td>
                  <td style="padding:8px;">${order.submitted_by || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666;">Remark</td>
                  <td style="padding:8px;">${order.remark || '—'}</td>
                </tr>
              </table>
              <p style="color:#999;font-size:12px;margin-top:20px;">
                This is an automated notification from Maxxholo Job Order System.
              </p>
            </div>
          </div>
        `,
      }),
    })

    const data = await res.json().catch(() => ({}))
    console.log('Resend response:', data)

    if (!res.ok) {
      throw new Error(data?.message || `Resend rejected the email request (${res.status}).`)
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})