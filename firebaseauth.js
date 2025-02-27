import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAjrzeOO2OXIuz3pvzlk1kbrUbvZMloF5w",
    authDomain: "company-project-b44dc.firebaseapp.com",
    projectId: "company-project-b44dc",
    storageBucket: "company-project-b44dc.appspot.com",
    messagingSenderId: "124572634221",
    appId: "1:124572634221:web:4836994009fa5e0e524364",
    measurementId: "G-133QT1XPCD"
  };
  

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Function to create a new user
export const createUser = async (name, email, password, role) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

       
        // Save user data in Firestore, including the unique domain
        await setDoc(doc(db, "users", user.uid), {
            password: password, // Keep password, but consider security implications
            name: name,
            email: email,
            role: role,
           
        });

        return { success: true, message: "User created successfully!", };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, message: error.message };
    }
};
