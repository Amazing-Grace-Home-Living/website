import { useEffect, useState } from "react";
import { db, auth } from "./firebase.js";
import {
  doc,
  setDoc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore-compat.js";

export default function PointsWallet() {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const walletRef = doc(db, "wallets", auth.currentUser.uid);
    walletRef.get().then((snap) => {
      setPoints(snap.exists() ? snap.data().points ?? 0 : 0);
      setLoading(false);
    });
  }, []);

  const earn = async () => {
    if (!auth.currentUser) return;
    const walletRef = doc(db, "wallets", auth.currentUser.uid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(walletRef);
      const cur = snap.exists() ? snap.data().points ?? 0 : 0;
      tx.set(walletRef, { points: cur + 10 }, { merge: true });
      return cur + 10;
    }).then((newVal) => setPoints(newVal));
  };

  return (
    <div className="wallet">
      <h4>My Points</h4>
      {loading ? <p>Loading…</p> : <p>{points} pts</p>}
      <button onClick={earn}>Earn 10 pts (demo)</button>
    </div>
  );
}
