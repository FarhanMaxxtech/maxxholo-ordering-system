import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ORDER_EDIT_STORAGE_KEY = 'maxxholo:order-edit-counts'

// TODO: replace with boss's real email once testing is confirmed working
// Later, consider querying app_accounts where role='admin' to notify all admins dynamically
const ADMIN_NOTIFY_EMAIL = 'bone@maxxtech.tech'

async function resolveRecipientEmail(email) {
  if (!email) return null
  const { data, error } = await supabase
    .from('app_accounts')
    .select('contact_email')
    .eq('email', email)
    .maybeSingle()
  if (error) {
    console.error('Contact email lookup error:', error)
    return email
  }
  return data?.contact_email || email
}

function readOrderEditCounts() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(ORDER_EDIT_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeOrderEditCounts(counts) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ORDER_EDIT_STORAGE_KEY, JSON.stringify(counts))
}

// ── Send notification helper ──
async function sendNotification(message, userEmail = null) {
  const { error } = await supabase.from('notifications').insert({
    message,
    read: false,
    user_email: userEmail
  })
  if (error) console.error('Notification error:', error)
}

async function sendOrderEmail({ type, order, recipientEmail = null, status = null }) {
  try {
    const { error } = await supabase.functions.invoke('notify-new-order', {
      body: {
        type,
        order,
        recipientEmail,
        status,
      },
    })
    if (error) console.error('Email error:', error)
  } catch (err) {
    console.error('Email error:', err)
  }
}

export function useOrders() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function loadOrders() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('factory_out', { ascending: true, nullsFirst: false })
    if (error) {
      setError(error.message)
    } else {
      const counts = readOrderEditCounts()
      const merged = (data || []).map(order => ({
        ...order,
        sales_edit_count: Number(counts[order.id] || 0),
      }))
      setOrders(merged)
    }
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  async function saveOrder(rec, id = null, submittedBy = '', isAdmin = false) {
    const invoiceNumber = (rec.order_number || '').trim()

    if (id) {
      const counts = readOrderEditCounts()
      const editCount = Number(counts[id] || 0)

      if (!isAdmin && editCount >= 1) {
        throw new Error('This order can only be edited once by a sales account.')
      }

      const { data: existingOrder } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', id)
        .single()

      const updatePayload = {
        ...rec,
        order_number: invoiceNumber || existingOrder?.order_number || null,
      }

      const { error } = await supabase.from('orders').update(updatePayload).eq('id', id)
      if (error) throw new Error(error.message)

      if (!isAdmin) {
        counts[id] = editCount + 1
        writeOrderEditCounts(counts)
      }
    } else {
      const newOrder = {
        ...rec,
        submitted_by: submittedBy,
        order_number: invoiceNumber || null,
        status: 'Pending',
      }
      const { error } = await supabase
        .from('orders')
        .insert(newOrder)
      if (error) throw new Error(error.message)

      // ── Notify admin about new order (broadcast to all) ──
      await sendNotification(
        `📋 New order ${invoiceNumber || '—'} submitted — ${rec.brand} (${rec.company})`
      )

      const resolvedEmail = await resolveRecipientEmail(submittedBy)
      await sendOrderEmail({
        type: 'new_order',
        order: newOrder,
        recipientEmail: resolvedEmail,
      })

      // ── Also notify admin ──
      await sendOrderEmail({
        type: 'new_order',
        order: newOrder,
        recipientEmail: ADMIN_NOTIFY_EMAIL,
      })
    }
    await loadOrders()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('maxxholo:notifications-updated'))
    }
  }

  async function updateStatus(id, status) {
    const order = orders.find(o => o.id === id)

    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) throw new Error(error.message)

    // ── Only notify real users, not imported orders ──
    const targetEmail = order?.submitted_by && order.submitted_by !== 'import'
      ? order.submitted_by
      : null

    if (order && targetEmail) {
      const statusEmoji = {
        'In Production': '🏭',
        'Shipped':       '🚚',
        'Completed':     '✅',
      }
      await sendNotification(
        `${statusEmoji[status] || '📦'} Your order ${order.order_number} — ${order.brand} is now ${status}`,
        targetEmail
      )

      if (['In Production', 'Shipped'].includes(status)) {
        const resolvedEmail = await resolveRecipientEmail(targetEmail)
        await sendOrderEmail({
          type: 'status_update',
          order: { ...order, status },
          recipientEmail: resolvedEmail,
          status,
        })

        // ── Also notify admin ──
        await sendOrderEmail({
          type: 'status_update',
          order: { ...order, status },
          recipientEmail: ADMIN_NOTIFY_EMAIL,
          status,
        })
      }
    }

    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status } : o)))
  }

  async function saveAdmin(id, { status, factory_out, admin_note, courier, tracking_number }) {
    const order = orders.find(o => o.id === id)
    const prevStatus = order?.status

    const { error } = await supabase
      .from('orders')
      .update({ status, factory_out, admin_note, courier, tracking_number })
      .eq('id', id)
    if (error) throw new Error(error.message)

    // ── Only notify real users, not imported orders ──
    const targetEmail = order?.submitted_by && order.submitted_by !== 'import'
      ? order.submitted_by
      : null

    // ── Notify if status changed ──
    if (order && prevStatus !== status && targetEmail) {
      const statusEmoji = {
        'In Production': '🏭',
        'Shipped':       '🚚',
        'Completed':     '✅',
      }
      await sendNotification(
        `${statusEmoji[status] || '📦'} Your order ${order.order_number} — ${order.brand} updated to ${status}`,
        targetEmail
      )

      if (['In Production', 'Shipped'].includes(status)) {
        const resolvedEmail = await resolveRecipientEmail(targetEmail)
        await sendOrderEmail({
          type: 'status_update',
          order: { ...order, status },
          recipientEmail: resolvedEmail,
          status,
        })
      
          // ── Also notify admin ──
        await sendOrderEmail({
          type: 'status_update',
          order: { ...order, status },
          recipientEmail: ADMIN_NOTIFY_EMAIL,
          status,
        })

      }
    }

    // ── Notify if tracking number added ──
    if (order && tracking_number && !order.tracking_number && targetEmail) {
      await sendNotification(
        `📦 Tracking added for your order ${order.order_number} — ${order.brand}: ${tracking_number}`,
        targetEmail
      )
    }

    await loadOrders()
  }

  async function deleteOrder(id) {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await loadOrders()
  }

  return { orders, loading, error, loadOrders, saveOrder, updateStatus, saveAdmin, deleteOrder }
}
