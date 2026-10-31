import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const ADMIN_UID = "HWQfLxdBkqNWNdeCxec0PD3ddBJ2";

const style = document.createElement("style");
style.textContent = `
    .admin-layout { display: none; }

  body.admin-authenticated .admin-layout {
    display: flex;
  }

  @media (max-width: 600px) {
    body.admin-authenticated .admin-layout {
      display: block;
    }
  }
  #adminLogin {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: #f1f5f9;
    font-family: Arial, sans-serif;
  }
  .login-card {
    width: 100%;
    max-width: 380px;
    background: white;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 8px 30px #0001;
  }
  .login-card h2 { color: #0f3b63; }
  .login-card input {
    box-sizing: border-box;
    width: 100%;
    padding: 13px;
    margin: 8px 0 15px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
  }
  .login-card button {
    width: 100%;
    padding: 13px;
    border: 0;
    border-radius: 8px;
    background: #0f3b63;
    color: white;
    font-weight: bold;
  }
  #loginMessage { color: #c62828; font-size: 14px; }
`;
document.head.appendChild(style);

const login = document.createElement("div");
login.id = "adminLogin";
login.innerHTML = `
  <div class="login-card">
    <h2>Login Administrator</h2>
    <p>OSIS SMU DuMay</p>
    <form id="adminLoginForm">
      <label>Email Admin</label>
      <input id="adminEmail" type="email"
        placeholder="Masukkan email" required>
      <label>Password</label>
      <input id="adminPassword" type="password"
        placeholder="Masukkan password" required>
      <button type="submit" id="loginButton">Masuk</button>
      <p id="loginMessage"></p>
    </form>
  </div>
`;
document.body.prepend(login);

const form = document.getElementById("adminLoginForm");
const message = document.getElementById("loginMessage");
const button = document.getElementById("loginButton");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  button.disabled = true;
  button.textContent = "Memeriksa...";

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      document.getElementById("adminEmail").value.trim(),
      document.getElementById("adminPassword").value
    );

    if (result.user.uid !== ADMIN_UID) {
      await signOut(auth);
      message.textContent = "Akun ini bukan administrator.";
    }
  } catch (error) {
    message.textContent = "Login gagal. Periksa email dan password.";
  }

  button.disabled = false;
  button.textContent = "Masuk";
});

onAuthStateChanged(auth, async (user) => {
  if (user && user.uid === ADMIN_UID) {
    login.style.display = "none";
    document.body.classList.add("admin-authenticated");
  } else {
    document.body.classList.remove("admin-authenticated");
    login.style.display = "flex";
  }
});
