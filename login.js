import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { app } from './firebase.js'; // Firebase app configuration

// Initialize Firebase Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginForm = document.getElementById('login-form');
const message = document.getElementById('message');

// Listen for login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent default form submission

    // Get email and password values from the form
    const email = loginForm.querySelector('.email').value.trim();
    const password = loginForm.querySelector('.password').value.trim();

    // Proceed with Firebase authentication for users
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user; // Get the authenticated user
            const userId = user.uid; // Get the user's unique ID from Firebase

            // Store user ID and role in sessionStorage
            sessionStorage.setItem('userId', userId);
            sessionStorage.setItem('adminLoggedIn', true); // Set the logged-in flag

            console.log('User signed in:', user.email); // Debugging
            console.log('Stored User ID:', userId); // Log the userId for verification

            // Redirect to admin page or other pages based on their role
            const userRef = doc(db, 'users', userId); // Reference to the user's document in Firestore
            getDoc(userRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.data();
                    const role = userData.role; // Get the user's role

                    // Store user role in sessionStorage
                    sessionStorage.setItem('userRole', role);

                    // Redirect users based on their role
                    if (role === 'admin') {
                        window.location.href = 'admin23921094034920949.html'; // Redirect to admin page
                    } else if (role === 'employee') {
                        window.location.href = 'employee-dashboard.html'; // Redirect to employee dashboard
                    } 
                    else if (role === 'sub-admin') {
                        window.location.href = 'sub-admin-dashboard.html'; // Redirect to employee dashboard
                    }
                    else {
                        message.textContent = 'Unauthorized access. Please contact support.';
                    }
                } else {
                    message.textContent = 'No user data found. Please contact support.';
                }
            }).catch((error) => {
                console.error('Error fetching user data:', error);
                message.textContent = 'Error fetching user data. Please try again later.';
            });
        })
        .catch((error) => {
            const errorMessage = error.message;
            console.error('Error during sign-in:', errorMessage); // Debugging
            message.textContent = 'Wrong Password or Email ';
        });
});



const loaderOverlay = document.querySelector(".loader-overlay");

let timeoutId;

function checkConnection() {
    if (!navigator.onLine) {
        // Show loader immediately when offline
        loaderOverlay.style.display = "block";
  
       setTimeout(() => {
                location.reload();
            }, 4000);
   // Wait 10 seconds before showing text & reload button
    }
}

// Detect unstable connection (network slow or fluctuating)
function showLoaderOnUnstableConnection() {
    if (navigator.onLine) {
        loaderOverlay.style.display = "block"; // Show loader
        setTimeout(() => {
            loaderOverlay.style.display = "none"; // Hide after 3 seconds
        }, 2000);
    }
}

// When connection is restored, the loader stays until reload completes
function handleOnline() {
    clearTimeout(timeoutId); // Cancel any forced reload if already online
}

// Listen for online/offline events
window.addEventListener("offline", checkConnection);
window.addEventListener("online", handleOnline);
window.addEventListener("visibilitychange", showLoaderOnUnstableConnection);

// Run check once on load
 