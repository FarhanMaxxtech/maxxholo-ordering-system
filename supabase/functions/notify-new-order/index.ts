Deno.serve(async (req) => {
  try {
    const { record } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'Maxxholo Orders <orders@maxxholo.com>',
        to:      [Deno.env.get('ADMIN_EMAIL')],
        subject: `📦 New Order ${record.order_number} — ${record.brand}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#2f7de1;padding:20px;border-radius:8px 8px 0 0;">
              <h2 style="color:#fff;margin:0;">New Job Order Submitted</h2>
            </div>
            <div style="background:#f9f9f9;padding:20px;border-radius:0 0 8px 8px;border:1px solid #eee;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr>
                  <td style="padding:8px;color:#666;width:140px;">Invoice #</td>
                  <td style="padding:8px;font-weight:bold;">${record.order_number || '—'}</td>
                </tr>
                <tr style="background:#fff;">
                  <td style="padding:8px;color:#666;">Brand</td>
                  <td style="padding:8px;">${record.brand || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666;">Company</td>
                  <td style="padding:8px;">${record.company || '—'}</td>
                </tr>
                <tr style="background:#fff;">
                  <td style="padding:8px;color:#666;">Product</td>
                  <td style="padding:8px;">${record.product || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666;">Quantity</td>
                  <td style="padding:8px;">${record.qty || '—'}</td>
                </tr>
                <tr style="background:#fff;">
                  <td style="padding:8px;color:#666;">Order Type</td>
                  <td style="padding:8px;">${record.order_type || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666;">Sales PIC</td>
                  <td style="padding:8px;">${record.pic || '—'}</td>
                </tr>
                <tr style="background:#fff;">
                  <td style="padding:8px;color:#666;">Submitted by</td>
                  <td style="padding:8px;">${record.submitted_by || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666;">Remark</td>
                  <td style="padding:8px;">${record.remark || '—'}</td>
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

    const data = await res.json()
    console.log('Resend response:', data)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})