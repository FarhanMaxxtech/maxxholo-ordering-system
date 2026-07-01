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
      .order('factory_out', { ascending: true, nullsFirst: false }) // ← latest first
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
    }
    await loadOrders()
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) throw new Error(error.message)
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status } : o)))
  }

  async function saveAdmin(id, { status, factory_out, admin_note, courier, tracking_number }) {
    const { error } = await supabase
      .from('orders')
      .update({ status, factory_out, admin_note, courier, tracking_number })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await loadOrders()
  }

  async function deleteOrder(id) {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await loadOrders()
  }

  return { orders, loading, error, loadOrders, saveOrder, updateStatus, saveAdmin, deleteOrder }
}
