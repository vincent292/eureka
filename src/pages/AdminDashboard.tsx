import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient";
import "../styles/AdminDashboard.css"


type Contact = {
  id: number
  phone: string
  email: string
  created_at: string
  deleted: boolean
}

type DurationPrice = {
  id: string
  label: string
  duration_minutes: number
  price: number
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [promoMessage, setPromoMessage] = useState(
    "Eres importante para nosotros y tenemos esta promoción 🎉"
  )
  const [editId, setEditId] = useState<number | null>(null)
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [durationPrices, setDurationPrices] = useState<DurationPrice[]>([])
  const [priceMessage, setPriceMessage] = useState("")

  const fetchContacts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("contacts")
      .select("id, phone, email, created_at, deleted")
      .eq("deleted", false)
      .order("created_at", { ascending: false })

    if (error) console.error(error)
    else setContacts(data || [])

    setLoading(false)
  }

  const deleteContact = async (id: number) => {
    const { error } = await supabase
      .from("contacts")
      .update({ deleted: true })
      .eq("id", id)

    if (error) console.error(error)
    else fetchContacts()
  }

  const startEditing = (contact: Contact) => {
    setEditId(contact.id)
    setEditPhone(contact.phone.toString())
    setEditEmail(contact.email)
  }

  const saveEdit = async () => {
    if (editId === null) return

    const { error } = await supabase
      .from("contacts")
      .update({ phone: editPhone, email: editEmail })
      .eq("id", editId)

    if (error) console.error(error)
    else {
      setEditId(null)
      fetchContacts()
    }
  }

  const cancelEdit = () => {
    setEditId(null)
  }

  const sendWhatsApp = (phone: string) => {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(
      promoMessage
    )}`
    window.open(url, "_blank")
  }

  const fetchDurationPrices = async () => {
    const { data, error } = await supabase
      .from("booking_duration_prices")
      .select("id, label, duration_minutes, price")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setDurationPrices((data || []) as DurationPrice[])
  }

  const updateDurationPrice = async (id: string, price: number) => {
    setPriceMessage("")

    const { error } = await supabase
      .from("booking_duration_prices")
      .update({ price })
      .eq("id", id)

    if (error) {
      setPriceMessage("No se pudo guardar el precio.")
      console.error(error)
      return
    }

    setPriceMessage("Precio actualizado.")
    fetchDurationPrices()
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate("/admin/login", { replace: true })
  }

  useEffect(() => {
    fetchContacts()
    fetchDurationPrices()
  }, [])

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1 className="admin-title">Panel de Administración - Contactos</h1>
        <button type="button" className="btn-delete" onClick={signOut}>
          Cerrar sesion
        </button>
      </div>

      <div className="promo-box">
        <input
          type="text"
          value={promoMessage}
          onChange={(e) => setPromoMessage(e.target.value)}
          placeholder="Escribe tu mensaje promocional"
        />
      </div>

      <section className="admin-panel-section">
        <h2>Precios de reservas</h2>
        <p>Estos montos definen el total que ve el cliente al elegir duración.</p>

        <div className="admin-price-grid">
          {durationPrices.map((duration) => (
            <div className="admin-price-card" key={duration.id}>
              <div>
                <strong>{duration.label}</strong>
                <span>{duration.duration_minutes} minutos</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.5"
                value={duration.price}
                onChange={(event) =>
                  setDurationPrices((current) =>
                    current.map((item) =>
                      item.id === duration.id
                        ? { ...item, price: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="btn-edit"
                onClick={() => updateDurationPrice(duration.id, Number(duration.price))}
              >
                Guardar
              </button>
            </div>
          ))}
        </div>

        {priceMessage ? <p className="admin-price-message">{priceMessage}</p> : null}
      </section>

      {loading ? (
        <p className="loading">Cargando...</p>
      ) : (
        <div className="table-container">
          <table className="contacts-table">
            <thead>
              <tr>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td data-label="Teléfono">
                    {editId === contact.id ? (
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    ) : (
                      contact.phone
                    )}
                  </td>
                  <td data-label="Email">
                    {editId === contact.id ? (
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    ) : (
                      contact.email
                    )}
                  </td>
                  <td data-label="Fecha">
                    {new Date(contact.created_at).toLocaleString()}
                  </td>
                  <td data-label="Acción">
                    {editId === contact.id ? (
                      <>
                        <button className="btn-edit" onClick={saveEdit}>
                          Guardar
                        </button>
                        <button className="btn-delete" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn-edit"
                          onClick={() => startEditing(contact)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => deleteContact(contact.id)}
                        >
                          Eliminar
                        </button>
                        <button
                          className="btn-whatsapp"
                          onClick={() =>
                            sendWhatsApp(contact.phone.toString())
                          }
                        >
                          WhatsApp
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
