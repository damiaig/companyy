// Import the necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjrzeOO2OXIuz3pvzlk1kbrUbvZMloF5w",
    authDomain: "company-project-b44dc.firebaseapp.com",
    projectId: "company-project-b44dc",
    storageBucket: "company-project-b44dc.appspot.com",
    messagingSenderId: "124572634221",
    appId: "1:124572634221:web:4836994009fa5e0e524364",
    measurementId: "G-133QT1XPCD"
};
const myuserId = sessionStorage.getItem("userId");
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Fetch users from Firestore
export async function fetchUsers() {
    const usersContainer = document.getElementById("user-container");
    usersContainer.innerHTML = ''; // Clear existing content

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        console.log("Fetched users:", querySnapshot.docs.length);

        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const userId = doc.id;

            // Skip displaying if user role is "admin"
            if (doc.id === myuserId) return;

            // Create user HTML structure
            const userDiv = document.createElement('div');
            userDiv.className = 'users';
            userDiv.innerHTML = `
                <div class="name">${user.name}</div>
                <div class="user-info">
                    <div class="user-details">
                    <div class="user-detail-row">
                    <p class="current-email">Email: <span class="line-break">${user.email}</span></p>
                </div>
                <div class="user-detail-row">
                    <p class="current-password">Password: <span class="line-break">${user.password}</span></p>
                </div>
                <div class="user-detail-row"  id="user-detail-row1">
                    <p class="current-role">Role: <span class="line-break">${user.role}</span></p>
                    <button class="changer role-changer" data-id="${userId}">+</button>
                </div>
                
                    </div>
                    <div class="user-buttons-container">
                        <button class="user-buttons save-changes" data-id="${userId}">Save Changes</button>
                        <button class="user-buttons delete-account" data-id="${userId}">Delete Account</button>
                    </div>
                </div>
            `;
            
            usersContainer.appendChild(userDiv); // Append the userDiv to usersContainer
        });
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

// Function to delete a user from Firestore
export async function deleteUser(userId) {
    try {
        await deleteDoc(doc(db, "users", userId));
        console.log(`User ${userId} deleted successfully`);
        fetchUsers(); // Refresh the user list
    } catch (error) {
        console.error("Error deleting user:", error);
    }
}

// Check if the authenticated user has an admin role
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User is authenticated:", user.uid);

        // Fetch the user document from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'admin') {
                console.log("User is an admin.");
                fetchUsers(); // Fetch users only if authenticated as an admin
            } else {
                console.error("User does not have admin role.");
                // Handle non-admin access (e.g., show a message or redirect)
            }
        } else {
            console.error("No such user document found!");
        }
    } else {
        console.log("No user is authenticated");
        // Handle unauthenticated state (e.g., redirect to login)
    }
});
