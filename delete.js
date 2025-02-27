import { deleteUser } from './firedelete.js'; // Adjust the path if necessary
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { fetchUsers } from './firedelete.js'; // Fetch function to refresh users list after changes

// Initialize Firestore
const db = getFirestore();

// Function to navigate back to the previous page
document.querySelector('.close').addEventListener('click', function() {
    const previousPage = document.referrer; // Get the previous page's URL

    
        window.location.href = previousPage; // Redirect as if clicking a link
 
});

document.addEventListener("DOMContentLoaded", async () => {
    // Show the loader when the page loads
    document.querySelector(".loader-overlay").style.display = "block";
  });
// Function to open modals
function openModal(modalClass) {
    document.querySelector(modalClass).style.display = 'flex';
}

// Function to close all modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Event listeners for each "+" button
document.addEventListener('click', (event) => {
    const target = event.target;
    
    if (target.classList.contains('role-changer')) {
        openModal('.role-modal');
        const userId = target.getAttribute('data-id');
        document.getElementById('set-role-button').setAttribute('data-id', userId);
        
        // Show current role in the select dropdown
        const currentRole = target.getAttribute('data-role'); // Assuming role is stored in data-role attribute
        document.getElementById('new-role').value = currentRole; // Set the select value to the current role
    }

    if (target.classList.contains('delete-account')) {
        const userId = target.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this account?")) {
            deleteUser(userId).catch(error => console.error("Error deleting user:", error));
        }
    }
});

// Event listener for modal close buttons
document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', closeModals);
});

// Handle saving changes with confirmation
document.querySelector('.set-button').addEventListener('click', async (event) => {

 

    const userId = event.target.getAttribute('data-id');
    const role = document.getElementById('new-role').value; // Get the selected role


 
    if (!role) { // If no valid role is selected
        alert("Please choose a valid role before proceeding.");
        return; // Stop the button's action
    }

    if (confirm("Are you sure you want to save changes?")) {
        const updateData = { role }; // Prepare the update data

        try {
            await updateUser(userId, updateData);
            alert(`User role updated to: ${role}`); // Alert message confirming the change
            closeModals();
        } catch (error) {
            console.error("Error saving changes:", error);
        }
    }
});

// Function to update user data in Firestore
async function updateUser(userId, data) {
    const userDoc = doc(db, "users", userId);
    await updateDoc(userDoc, data);
    fetchUsers(); // Refresh the user list
}

// Function to filter users based on search input
function filterUsers() {
    const searchInput = document.querySelector('.user-search').value.toLowerCase();
    const userDivs = document.querySelectorAll('.users');

    userDivs.forEach(userDiv => {
        const userName = userDiv.querySelector('.name').textContent.toLowerCase();
        if (userName.startsWith(searchInput)) {
            userDiv.style.display = ''; // Show the user if the name starts with the input
        } else {
            userDiv.style.display = 'none'; // Hide the user if it doesn't match
        }
    });
}

// Event listener for search input
document.querySelector('.user-search').addEventListener('input', filterUsers);

// Call fetchUsers to load users initially and set up search functionality
fetchUsers();




const uploadTrigger = document.querySelector('.upload-trigger');
const fileInput = document.getElementById('employee-profile-picture-input');

if (uploadTrigger && fileInput) {
    uploadTrigger.addEventListener('click', () => {
        fileInput.click();
    });
}


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
