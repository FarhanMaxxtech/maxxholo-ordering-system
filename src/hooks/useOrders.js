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
  await supabase.from('notifications').insert({ 
    message, 
    read: false,
    user_email: userEmail  // null = everyone sees it, email = only that user
  })
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
      const { error } = await supabase
        .from('orders')
        .insert({ ...rec, submitted_by: submittedBy, order_number, status: 'In Production' })
      if (error) throw new Error(error.message)

      // ── Notify new order submitted ──
      await sendNotification(
        `📋 New order ${order_number} submitted — ${rec.brand} (${rec.company})`
      )
    }
    await loadOrders()
  }

  async function updateStatus(id, status) {
    // Get the order details first for the notification message
    const order = orders.find(o => o.id === id)

    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) throw new Error(error.message)

    // ── Notify status change ──
    if (order) {
      const statusEmoji = {
        'In Production': '🏭',
        'Shipped':       '🚚',
        'Completed':     '✅',
      }
      // With this — sends to the order owner specifically:
      await sendNotification(
        `${statusEmoji[status] || '📦'} Your order ${order.order_number} — ${order.brand} is now ${status}`,
        order.submitted_by  // ← targets the sales user who owns this order
      )
    }
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status } : o)))
  }

  async function saveAdmin(id, { status, factory_out, admin_note, courier, tracking_number }) {
    // Get order before update for notification
    const order = orders.find(o => o.id === id)
    const prevStatus = order?.status

    const { error } = await supabase
      .from('orders')
      .update({ status, factory_out, admin_note, courier, tracking_number })
      .eq('id', id)
    if (error) throw new Error(error.message)

    // ── Notify if status changed ──
    if (order && prevStatus !== status) {
      const statusEmoji = {
        'In Production': '🏭',
        'Shipped':       '🚚',
        'Completed':     '✅',
      }
      await sendNotification(
        `${statusEmoji[status] || '📦'} Order ${order.order_number} — ${order.brand} updated to ${status}`
      )
    }

    // ── Notify if tracking number added ──
    if (order && tracking_number && !order.tracking_number) {
      await sendNotification(
        `📦 Tracking added for your order ${order.order_number} — ${order.brand}: ${tracking_number}`,
        order.submitted_by
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