import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js"; // Import Firestore

// Your Firebase configuration
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


// Initialize Firebase and export the services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);            // Export Auth
export const database = getDatabase(app);    // Export Realtime Database
export const db = getFirestore(app);         // Export Firestore
                           // Export Realtime Database ref under a new name
