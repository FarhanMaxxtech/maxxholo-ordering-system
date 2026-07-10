import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

async function generateInvoiceNumber() {
  const today = new Date()
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')
  const prefix = `INV-${dateStr}-`
  const { data } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', `${prefix}%`)
  const nextNum = (data?.length || 0) + 1
  return `${prefix}${String(nextNum).padStart(3, '0')}`
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
      setOrders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  async function saveOrder(rec, id = null, submittedBy = '') {
    if (id) {
      const { error } = await supabase.from('orders').update(rec).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      const order_number = await generateInvoiceNumber()
      const newOrder = { ...rec, submitted_by: submittedBy, order_number, status: 'Pending' }
      const { error } = await supabase
        .from('orders')
        .insert(newOrder)
      if (error) throw new Error(error.message)

      // ── Notify admin about new order (broadcast to all) ──
      await sendNotification(
        `📋 New order ${order_number} submitted — ${rec.brand} (${rec.company})`
      )

      await sendOrderEmail({
        type: 'new_order',
        order: newOrder,
        recipientEmail: submittedBy,
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
        await sendOrderEmail({
          type: 'status_update',
          order: { ...order, status },
          recipientEmail: ty,
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
        await sendOrderEmail({
          type: 'status_update',
          order: { ...order, status },
          recipientEmail: targetEmail,
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