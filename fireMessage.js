import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjrzeOO2OXIuz3pvzlk1kbrUbvZMloF5w",
    authDomain: "company-project-b44dc.firebaseapp.com",
    projectId: "company-project-b44dc",
    storageBucket: "company-project-b44dc.appspot.com",
    messagingSenderId: "124572634221",
    appId: "1:124572634221:web:4836994009fa5e0e524364",
    measurementId: "G-133QT1XPCD",
    databaseURL: "https://company-project-b44dc.firebaseio.com/" // Updated Database URL
};

// Check if Firebase app is already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app); // Firestore for user authentication
const rtdb = getDatabase(app); // Initialize Realtime Database

export { db, rtdb };
