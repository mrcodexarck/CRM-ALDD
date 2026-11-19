import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ⚠️ REEMPLAZA ESTOS DATOS CON LOS DE TU CONSOLA DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAmnfiCcze5WocfTw72k61aPOBFNyouKjQ",
  authDomain: "crm-aldd.firebaseapp.com",
  projectId: "crm-aldd",
  storageBucket: "crm-aldd.firebasestorage.app",
  messagingSenderId: "702415572312",
  appId: "1:702415572312:web:b4189068c87721bb32292d",
  measurementId: "G-ZMBKGR7Y4H"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);