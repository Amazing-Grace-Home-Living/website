import { useEffect, useState } from "react";
import { db, auth } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore-compat.js";

export default function ChatRoom({ roomId }) {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const msgsRef = collection(db, "lmsChats", roomId, "messages");
    const q = query(msgsRef, orderBy("createdAt"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(list);
    });
    return () => unsub();
  }, [roomId]);

  const send = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    const msgsRef = collection(db, "lmsChats", roomId, "messages");
    await addDoc(msgsRef, {
      text: msg,
      authorUid: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || auth.currentUser.email,
      createdAt: new Date(),
    });
    setMsg("");
  };

  const del = async (id) => {
    if (!confirm("Delete this message?")) return;
    await deleteDoc(doc(db, "lmsChats", roomId, "messages", id));
  };

  const edit = async (id, oldText) => {
    const newText = prompt("Edit message:", oldText);
    if (newText === null) return;
    await updateDoc(doc(db, "lmsChats", roomId, "messages", id), { text: newText });
  };

  return (
    <section className="chat-room">
      <h3>Room: {roomId}</h3>
      <ul className="messages">
        {messages.map((m) => (
          <li key={m.id}>
            <strong>{m.authorName}:</strong> {m.text}
            {m.authorUid === auth.currentUser?.uid && (
              <>
                <button onClick={() => edit(m.id, m.text)}>✎</button>
                <button onClick={() => del(m.id)}>🗑️</button>
              </>
            )}
          </li>
        ))}
      </ul>
      {auth.currentUser ? (
        <form onSubmit={send}>
          <input
            type="text"
            placeholder="Say something…"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            required
          />
          <button type="submit">Send →</button>
        </form>
      ) : (
        <p>Please sign in to chat.</p>
      )}
    </section>
  );
}
