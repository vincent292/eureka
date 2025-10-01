import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient";
import "../styles/AdminDashboard.css"


type Contact = {
  id: number
  phone: string
  email: string
  created_at: string
  deleted: boolean
}

export default function AdminDashboard() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [promoMessage, setPromoMessage] = useState(
    "Eres importante para nosotros y tenemos esta promoción 🎉"
  )
  const [editId, setEditId] = useState<number | null>(null)
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")

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

  useEffect(() => {
    fetchContacts()
  }, [])

  return (
    <div className="admin-container">
      <h1 className="admin-title">Panel de Administración - Contactos</h1>

      <div className="promo-box">
        <input
          type="text"
          value={promoMessage}
          onChange={(e) => setPromoMessage(e.target.value)}
          placeholder="Escribe tu mensaje promocional"
        />
      </div>

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