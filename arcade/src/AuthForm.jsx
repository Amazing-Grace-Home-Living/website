import { useState } from "react";
import { auth, googleProvider, phoneProvider } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth-compat.js";

export default function AuthForm() {
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);

  const handleEmail = async (e) => {
    e.preventDefault();
    try {
      if (mode === "signUp") {
        await createUserWithEmailAndPassword(auth, email, pw);
      } else {
        await signInWithEmailAndPassword(auth, email, pw);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(e.message);
    }
  };

  const handlePhone = async (e) => {
    e.preventDefault();
    try {
      const verifier = new RecaptchaVerifier(
        "recaptcha-container",
        { size: "invisible" },
        auth
      );
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      const code = prompt("Enter the SMS verification code:");
      await confirmation.confirm(code);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="auth-form">
      <h2>{mode === "signUp" ? "Create Account" : "Sign In"}</h2>
      <form onSubmit={handleEmail}>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
        <button type="submit">{mode === "signUp" ? "Create Account" : "Sign In"}</button>
      </form>
      <button onClick={handleGoogle}>Continue with Google</button>
      <form onSubmit={handlePhone}>
        <input
          type="tel"
          placeholder="+1‑555‑123‑4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <button type="submit">Send SMS Code</button>
      </form>
      <div id="recaptcha-container"></div>
      <p>
        {mode === "signUp" ? "Already have an account?" : "Need an account?"}{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setMode(mode === "signUp" ? "signIn" : "signUp");
          }}
        >
          {mode === "signUp" ? "Sign In" : "Sign Up"}
        </a>
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
