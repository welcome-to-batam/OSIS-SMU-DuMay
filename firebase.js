
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4PC6RCkq6D9RQ18WiDaC1K9fJpL1J4Fg",
  authDomain: "osis-smu-dumay.firebaseapp.com",
  databaseURL: "https://osis-smu-dumay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "osis-smu-dumay",
  messagingSenderId: "1006411216895",
  appId: "1:1006411216895:web:6b62afafed1f32ff3359ca"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
