import { createUser } from './firebaseauth.js'; // Adjust the path if necessary
import { db } from './firebase.js'; // Import Firestore instance
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js"; // Firestore functions

// Check if the user accessed the page from the Admin page
window.addEventListener("load", function () {
    // Ensure access is only granted if the referrer is the Admin page
    const referrer = document.referrer;
    const adminPage = 'admin23921094034920949.html';

    if (!referrer || !referrer.includes(adminPage)) {
        alert("Access restricted. You must access this page from the Admin page.");
        window.location.href = 'index.html'; // Redirect to login or Admin page
    }
});
document.addEventListener("DOMContentLoaded", async () => {
    // Show the loader when the page loads
    document.querySelector(".loader-overlay").style.display = "block";
  });
// Handle form submission for creating a new user
document.getElementById("create-user-form").addEventListener("submit", async function(event) {
    event.preventDefault(); // Prevent default form submission

    // Get form values
    const name = document.querySelector(".name").value;
    const email = document.querySelector(".email").value;
    const password = document.querySelector(".password").value;
    const role = document.querySelector(".role").value;

    // Call createUser function from firebaseauth.js
    try {
        const result = await createUser(name, email, password, role);

        // Display success/error message
        document.getElementById("message").textContent = result.message;
        if (result.success) {
            document.getElementById("create-user-form").reset(); // Optionally reset the form
            alert("User has been created successfully");
            // Delay clearing session storage and redirecting by 2 seconds
            setTimeout(() => {
                sessionStorage.clear(); // Clear session storage after 2 seconds
                window.location.href = 'index.html'; // Redirect to index.html
            }, 200); // 2000 ms = 2 seconds
        }
    } catch (error) {
        console.error("Error creating user:", error);
        document.getElementById("message").textContent = "Error creating user. Please try again.";
    }
});

// Close button to go back to the previous page
document.querySelector('.close').addEventListener('click', function() {
    history.back(); // Navigate back to the previous page
});



document.getElementById("name-input").addEventListener("input", function () {
    const maxLength = 18;
    const newName = this.value.slice(0, maxLength); // Enforce the limit
    this.value = newName; // Update input value if it exceeds the limit
});






const themeSwitch = document.getElementById("theme-switch");
const userId = sessionStorage.getItem("userId");

// Set the theme on the page
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

// Save the theme to Firestore
async function saveThemeToFirestore(theme) {
    if (!userId) return;
    try {
        await setDoc(doc(db, "users", userId), { theme }, { merge: true });
        console.log("Theme saved to Firestore:", theme);
    } catch (error) {
        console.error("Error saving theme to Firestore:", error);
    }
}

// Load the theme from Firestore
async function loadThemeFromFirestore() {
    if (!userId) return;
    
    const loaderOverlay = document.querySelector(".loader-overlay");
    loaderOverlay.style.display = "block"; // Ensure loader is visible while loading
  
    try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
  
        if (docSnap.exists()) {
            const { theme } = docSnap.data();
            if (theme) {
                applyTheme(theme);
                themeSwitch.checked = theme === "light"; // Sync switch state
                loaderOverlay.style.display = "none"; // Hide loader after applying theme
                return;
            }
        }
        
        console.warn("No theme data found in Firestore. Using default theme.");
  
        // If no theme is detected, keep loader visible for 3.5 seconds, then reload page
        setTimeout(() => {
            location.reload(); // Reloads the page
        }, 5000);
  
    } catch (error) {
        console.error("Error loading theme from Firestore:", error);
  
        // In case of error, also wait 3.5 seconds before reloading
        setTimeout(() => {
            location.reload();
        }, 5000);
    }
  }

// Event listener for theme toggle
document.querySelector(".theme-toggle").addEventListener("click", function (event) {
    // Ensure the checkbox state is toggled regardless of the click target
    themeSwitch.checked = !themeSwitch.checked;

    const theme = themeSwitch.checked ? "light" : "dark";
    applyTheme(theme);
    saveThemeToFirestore(theme);
});

// Load the theme on page load
window.addEventListener("load", loadThemeFromFirestore);



const loaderOverlay = document.querySelector(".loader-overlay");
const yetLoadText = document.querySelector(".yet-load");
const reloadPageButton = document.querySelector(".Reload-page");

let timeoutId;

function checkConnection() {
    if (!navigator.onLine) {
        // Show loader immediately when offline
        loaderOverlay.style.display = "block";
        yetLoadText.style.display = "block"; // Show "Hasn't yet loaded?" text
        reloadPageButton.style.display = "block";
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
        }, 3000);
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
checkConnection();
