import { db } from './firebase.js'; // Import Firestore instance
import { collection ,doc, deleteDoc , getDoc, addDoc, getDocs, arrayUnion, arrayRemove,updateDoc,setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js"; // Firestore functions
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-storage.js"; // Firebase Storage functions
import { ref as dbRef, onValue } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";
import { rtdb } from "./fireMessage.js"; // Make sure rtdb is initialized properly.
// Initialize Firebase Storage
const storage = getStorage();

// Get modal element and button
const modal = document.getElementById("modal-employee-profile-setting");
const profileSettingsBtn = document.querySelector(".employee-profile-settings");
const closeModal = document.querySelector(".close");
document.addEventListener("DOMContentLoaded", async () => {
  // Show the loader when the page loads
  document.querySelector(".loader-overlay").style.display = "block";
});
// Get elements for updating the profile
const profilePicture = document.getElementById("employee-profile-picture");
const profileName = document.getElementById("employee-profile-name");
let userData = JSON.parse(sessionStorage.getItem('userData'));
// Elements for live preview
const profilePreviewPicture = document.getElementById("employee-profile-preview-picture");
const profilePreviewName = document.getElementById("employee-profile-preview-name");
const myUserId = sessionStorage.getItem("userId");
// Load saved profile data from Firestore
window.addEventListener("load", async function () {
    // Redirect to index.html if sessionStorage is empty
  // Redirect to index.html if userId is not found in sessionStorage
// Check if userId is missing from sessionStorage
if (!sessionStorage.getItem("userId")) {
    alert("Please log in to access this page."); // Show alert message
    window.location.href = "index.html"; // Redirect to login page
}

    // Get the user ID from sessionStorage
    const userId = sessionStorage.getItem("userId");
    console.log('User ID from sessionStorage:', userId);

    // Check if user data is in sessionStorage
    let userData = JSON.parse(sessionStorage.getItem('userData'));

    if (!userData || userData.id !== userId) {
        // Fetch user data from Firestore if not in sessionStorage
        if (userId) {
            const docRef = doc(db, "users", userId);
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    userData = docSnap.data();
                    userData.id = userId;
                    sessionStorage.setItem('userData', JSON.stringify(userData)); // Cache data
                    console.log("User data retrieved:", userData);
                } else {
                    console.error("No such user!");
                }
            } catch (error) {
                console.error("Error getting user data:", error);
            }
        } else {
            console.error("No user ID found in sessionStorage.");
        }
    }

    // Populate profile with sessionStorage data
    if (userData) {
        const { name: savedName, role: savedRole, profilePicture: savedProfilePic } = userData;

        if (savedName) {
            profileName.textContent = savedName;
            profilePreviewName.textContent = savedName;
        } else {
            console.warn("Name not found in user data.");
        }

        if (savedProfilePic) {
            profilePicture.src = savedProfilePic;
            profilePreviewPicture.src = savedProfilePic;
        } else {
            console.warn("Profile picture not found in user data.");
        }

        if (savedRole) {
            const roleElement = document.getElementById("employee-profile-role");
            roleElement.textContent = `User role: ${savedRole}`;
        } else {
            console.warn("Role not found in user data.");
        }
    }
});

// Open modal
if (profileSettingsBtn) {
    profileSettingsBtn.addEventListener("click", function () {
        modal.style.display = "block";
        document.body.style.overflow = "hidden"; // Disable background scrolling
        modal.style.overflowY = "auto"; // Allow scrolling inside the modal
        profilePreviewName.textContent = profileName.textContent;
        profilePreviewPicture.src = profilePicture.src;
    });
}

// Close modal
closeModal.addEventListener("click", closeProfileModal);
window.addEventListener("click", function (event) {
    if (event.target === modal) closeProfileModal();
});

function closeProfileModal() {
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Enable background scroll
}

// Live preview of name change
document.getElementById("employee-name-input").addEventListener("input", function () {
    const newName = this.value;
    profilePreviewName.textContent = newName || profileName.textContent;
});

// Live preview of profile picture change
document.getElementById("employee-profile-picture-input").addEventListener("change", function () {
    const newProfilePic = this.files[0];
    if (newProfilePic) {
        const reader = new FileReader();
        reader.onload = function (e) {
            profilePreviewPicture.src = e.target.result;
        };
        reader.readAsDataURL(newProfilePic);
    } else {
        console.warn("No new profile picture selected.");
    }
});

// Update profile form submission
document.getElementById("employee-profile-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const userId = sessionStorage.getItem("userId");
    let userData = JSON.parse(sessionStorage.getItem('userData')) || {};

    const newName = document.getElementById("employee-name-input").value;
    if (newName) {
        profileName.textContent = newName;
        profilePreviewName.textContent = newName;
        userData.name = newName;
        sessionStorage.setItem('userData', JSON.stringify(userData));
    } else {
        console.warn("No new name entered.");
    }

    const newProfilePic = document.getElementById("employee-profile-picture-input").files[0];
    if (newProfilePic) {
        const storageRef = ref(storage, `profilePictures/${userId}`);
        await uploadBytes(storageRef, newProfilePic); // Upload the image file to Firebase Storage
        const downloadURL = await getDownloadURL(storageRef); // Get the download URL
        profilePicture.src = downloadURL;
        profilePreviewPicture.src = downloadURL;
        userData.profilePicture = downloadURL;
        sessionStorage.setItem('userData', JSON.stringify(userData));
    }

    // Save updated data to Firestore
    try {
        await setDoc(doc(db, "users", userId), userData);
        console.log("Employee profile updated successfully.");
    } catch (error) {
        console.error("Error updating employee profile in Firestore:", error);
    }

    closeProfileModal(); // Close modal after submission
    window.location.reload();
});


// Live preview of name change with character limit
document.getElementById("employee-name-input").addEventListener("input", function () {
    const maxLength = 18;
    const newName = this.value.slice(0, maxLength); // Enforce the limit
    this.value = newName; // Update input value if it exceeds the limit
    profilePreviewName.textContent = newName || profileName.textContent;
});


// Clear session storage on logout or login
function clearSessionDataOnLogin() {
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("userData");
  console.log("Session data cleared on login.");
}


// Bind login button to clear session storage when logging in
const loginButton = document.getElementById("login-button");
if (loginButton) {
  loginButton.addEventListener("click", function() {
      clearSessionDataOnLogin();
      window.location.href = "index.html";
      // proceed with the login functionality here
  });
}

const logout = document.getElementById("logout-button2");
if (logout) {
  logout.addEventListener("click", function() {
      clearSessionDataOnLogin();
      window.location.href = "index.html";
      // proceed with the login functionality here
  });
}


 
const userId = sessionStorage.getItem("userId");


const themeSwitch2 = document.getElementById("theme-switch2");

// Function to check screen width
function isMobileView() {
    return window.innerWidth <= 700;
}

// Apply the theme
function applyThemee(theme) {
    if (!isMobileView()) return; // Only apply theme if width is ≤ 700px
    document.documentElement.setAttribute("data-theme", theme);
}

// Save the theme to Firestore
async function saveThemeToFirestoree(theme) {
    if (!userId || !isMobileView()) return; // Prevent saving if not mobile view
    try {
        await setDoc(doc(db, "users", userId), { theme }, { merge: true });
        console.log("Theme saved to Firestore:", theme);
    } catch (error) {
        console.error("Error saving theme to Firestore:", error);
    }
}

async function loadThemeFromFirestoree() {
    if (!userId || !isMobileView()) return;
    
    const loaderOverlay = document.querySelector(".loader-overlay");
    loaderOverlay.style.display = "block"; // Show loader while loading

    try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const { theme } = docSnap.data();
            if (theme) {
                applyThemee(theme);
                themeSwitch2.checked = theme === "light"; // Sync switch state
                loaderOverlay.style.display = "none"; // Hide loader after applying theme
                return;
            }
        }

        console.warn("No theme data found in Firestore. Using default theme.");

        // Keep loader visible for 3.5 seconds, then reload page
        setTimeout(() => {
            location.reload();
        }, 5000);

    } catch (error) {
        console.error("Error loading theme from Firestore:", error);

        // Reload on error after 3.5 seconds
        setTimeout(() => {
            location.reload();
        }, 5000);
    }
}

// Event listener for theme toggle
document.querySelector(".theme-toggle2").addEventListener("click", function () {
  // Prevent execution if screen width is above 700px

    // Toggle theme switch state
    themeSwitch2.checked = !themeSwitch2.checked;
    const theme = themeSwitch2.checked ? "light" : "dark";

    applyThemee(theme);
    saveThemeToFirestoree(theme);
});
window.addEventListener("load", () => {
 
      loadThemeFromFirestoree();
 
});








const themeSwitch = document.getElementById("theme-switch");
 

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

console.log(userId);

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

 
async function loadMeetingInBox(userId) {
    if (!userId) {
        console.error("User ID is not defined. Cannot load meeting inbox.");
        return;
    }

    try {
        const meetingsRef = collection(db, `meetings`);
        let isSelectedMember = false; // Flag to track if the user is a member of any meeting

        // Fetch meetings where the user is a selected member
        const meetingsSnapshot = await getDocs(meetingsRef);
        if (!meetingsSnapshot.empty) {
            meetingsSnapshot.forEach((doc) => {
                const meetingData = doc.data();
                if (meetingData.selectedMembers && meetingData.selectedMembers.includes(userId)) {
            
                        unreadGroupCounter.textContent = ''; // Counter can display a dot or other indicator if needed
                        unreadGroupCounter.style.display = 'block'; // Show counter to indicate user is part of a meeting
                    
                }
            });
        } else {
            console.log("No meetings found for the user.");
            unreadGroupCounter.textContent = ''; // Clear the counter text
            unreadGroupCounter.style.display = 'none';
        }

        // Update the unread-group-counter display
        
      
    } catch (error) {
        console.error("Error loading meeting inbox:", error);
    }
}// Get elements

const postButton = document.querySelector(".post-buting");
const modall = document.getElementById("post-modal");
const closeButton = document.querySelector(".close-button");
const postWithImageButton = document.querySelector(".post-with-image-button");
const postWithoutImageButton = document.querySelector(".post-without-image-button");
const postWithImageSection = document.getElementById("post-with-image");
const postWithoutImageSection = document.getElementById("post-without-image");
const buttonSection = document.getElementById("button-section");
const goBackButtons = document.querySelectorAll(".go-back-button"); // Select all Go Back buttons

const imageDescription = document.getElementById("post-with-image-description");
const withoutImageDescription = document.getElementById("post-without-image-description");
const titleText = document.getElementById("title-text");

const triggerFileInput = document.getElementById("trigger-file-input");
const fileeInput = document.getElementById("image-input");
const imagePreview = document.getElementById("image-select");
const jjjjjj = document.querySelector(".jjjjjj");

// Function to reset the modal
function resetModal() {
  // Hide all sections
  postWithImageSection.style.display = "none";
  postWithoutImageSection.style.display = "none";
  buttonSection.style.display = "block"; // Show the buttons again
  
  // Clear the file input and reset the image preview
  fileeInput.value = ""; // Clear the selected file // Reset to the default image
  imagePreview.style.display = "none"; // Hide the image preview if applicable
  
  // Clear all text areas
  imageDescription.value = "";
  withoutImageDescription.value = "";
  titleText.value = "";
  
  // Hide additional elements if necessary
  jjjjjj.style.display = "block";
}

// Open modal
postButton.addEventListener("click", () => {
  modall.style.display = "block";
});

// Close modal and reset
closeButton.addEventListener("click", () => {
  modall.style.display = "none";
  resetModal(); // Reset the modal to its initial state
});

// Show "Post with Image" section
postWithImageButton.addEventListener("click", () => {
  postWithImageSection.style.display = "block";
  buttonSection.style.display = "none";
  postWithoutImageSection.style.display = "none";
});

// Show "Post without Image" section
postWithoutImageButton.addEventListener("click", () => {
  postWithoutImageSection.style.display = "block";
  postWithImageSection.style.display = "none";
  buttonSection.style.display = "none";
});

// Handle "Go Back" buttons
goBackButtons.forEach(button => {
  button.addEventListener("click", () => {
    resetModal(); // Reset to the button section
  });
});

// Optional: Close modal when clicking outside the modal content and reset
window.addEventListener("click", (event) => {
  if (event.target === modall) {
    modall.style.display = "none";
    resetModal(); // Reset the modal to its initial state
  }
});

// Real-time character count display
function updateCharacterCount(textarea, maxChars) {
  const remainingChars = maxChars - textarea.value.length;
  if (remainingChars < 0) {
    textarea.value = textarea.value.substring(0, maxChars); // Enforce max length
  }
}

// Event listeners for character limit enforcement
imageDescription.addEventListener("input", () => updateCharacterCount(imageDescription, 110));
withoutImageDescription.addEventListener("input", () => updateCharacterCount(withoutImageDescription, 550));
titleText.addEventListener("input", () => updateCharacterCount(titleText, 22));

// Trigger file input dialog on button click
triggerFileInput.addEventListener("click", () => {
  fileeInput.click(); // Simulate a click on the hidden file input
});

// Update image preview when a file is selected
fileeInput.addEventListener("change", (event) => {
  const file = event.target.files[0]; // Get the selected file
  if (file) {
    const reader = new FileReader(); // Create a FileReader object

    reader.onload = function (e) {
      imagePreview.src = e.target.result; // Set the image source to the file data
    };
    imagePreview.style.display = "block";
    jjjjjj.style.display = "block";
    reader.readAsDataURL(file); // Read the file as a data URL
  }
});
// Function to validate the post fields
function validatePost() {
  const isPostWithImage = postWithImageSection.style.display === "block";
  const isPostWithoutImage = postWithoutImageSection.style.display === "block";

  if (isPostWithImage) {
    const file = fileeInput.files[0]; // Get the actual file
    const description = imageDescription.value.trim();
    
    if (!description) {
      alert("Description is required for a post with an image.");
      return false;
    }
    if (!file) {  // Ensure an image file is selected
      alert("Image is required for a post with an image.");
      return false;
    }
  }

  if (isPostWithoutImage) {
    const title = titleText.value.trim();
    const description = withoutImageDescription.value.trim();
    
    if (!title) {
      alert("Title is required for a post.");
      return false;
    }
    if (!description) {
      alert("Description is required for a post without an image.");
      return false;
    }
  }

  return true;
}
 

let desImage = "";
let desText = "";
document.querySelectorAll(".posttt").forEach(postButton => {
  postButton.addEventListener("click", async () => {
    if (!validatePost()) return;
    postButton.disabled = true; // Re-enable button
    // ✅ Show loader immediately
    const loaderOverlay = document.querySelector(".loader-overlay");
    loaderOverlay.style.display = "block"; // Ensure loader is visible while loading
  

    try {
      const file = fileeInput.files[0];
      const title = titleText.value.trim();
      const description = imageDescription.value.trim();
      const descriptionWithoutImage = withoutImageDescription.value.trim();

      const storage = getStorage();
      const announcementsRef = collection(db, "announcements");

      let postType = "Without Picture";
      let imageUrl = null;
      let desImage = file ? description : "";
      let desText = file ? "" : descriptionWithoutImage;

      if (file) {
        const uniqueFileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `announcements/${uniqueFileName}`);
        const uploadSnapshot = await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(uploadSnapshot.ref);
        postType = "With Picture";
      }

      const authorId = userId;
      const newPost = {
        id: "",
        title: title || null,
        desImage,
        desText,
        postType,
        imageUrl,
        likeCount: [],
        timestamp: new Date(),
        authorId,
      };

      const newDocRef = doc(announcementsRef);
      await setDoc(newDocRef, newPost);
      await updateDoc(newDocRef, { id: newDocRef.id });

      const commentsRef = collection(newDocRef, "comments");
      await setDoc(doc(commentsRef, "template"), { placeholder: true });

      modall.style.display = "none";
      resetModal();

      // ✅ Wait for user to confirm alert before hiding loader
      alert("Post submitted successfully!");
      fetchAndRenderPosts();
    } catch (error) {
      console.error("Error submitting post:", error);
      alert("Failed to submit the post. Please try again.");
    } finally {
      setTimeout(() => {
        // ✅ Hide loader after alert confirmation
        loaderOverlay.style.display = "none";
        postButton.disabled = false; // Re-enable button
      }, 100); // Small delay to ensure alert appears first
    }
  });
});





function getTimeAgo(timestampInSeconds) {
  const now = Date.now();
  const postTime = timestampInSeconds * 1000; // Convert seconds to milliseconds
  const difference = now - postTime;

  const seconds = Math.floor(difference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 3600); // 3600 seconds in an hour
  const days = Math.floor(seconds / 86400); // 86400 seconds in a day
  const weeks = Math.floor(seconds / (86400 * 7)); // 7 days in a week
  const years = Math.floor(seconds / (86400 * 365)); // Approximation of 365 days in a year

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  } else if (seconds < 3600) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (seconds < 86400) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else if (seconds < 86400 * 7) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  } else if (seconds < 86400 * 365) {
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  } else {
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  }
}

 

// Function to fetch and render posts
async function fetchAndRenderPosts() {
  const postContainer = document.querySelector(".post"); // Target the post container
  postContainer.innerHTML = ""; // Clear the container before rendering
  
  try {
    // Fetch posts from the "announcements" collection
    const postsSnapshot = await getDocs(collection(db, "announcements"));
  
    // Cache for user data
    const profilePicCache = {};
  
    // Array to store post HTML
    let postsHTML = "";
  
  
    const sortedPosts = postsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds); // Sort descending by timestamp
  
  for (const post of sortedPosts) {
    const postUserDocRef = doc(db, `users/${post.authorId}`); // Firestore document reference
    // Ensure user data is cached or fetched dynamically
    if (!profilePicCache[post.authorId]) {
      const userDocSnapshot = await getDoc(postUserDocRef); // Fetch user data
      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();
        profilePicCache[post.authorId] = {
          name: userData.name || "Unknown User",
          profilePicture:
            userData.profilePicture || "user_profile_-removebg-preview.png", // Default profile picture
        };
      } else {
        profilePicCache[post.authorId] = {
          name: "Unknown User",
          profilePicture: "user_profile_-removebg-preview.png", // Default profile picture
        };
      }
  
      // Listen for real-time updates to user data
      onSnapshot(postUserDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedUserData = docSnapshot.data();
          profilePicCache[post.authorId] = {
            name: updatedUserData.name || "Unknown User",
            profilePicture:
              updatedUserData.profilePicture || "user_profile_-removebg-preview.png",
          };
  
          // Update the UI dynamically for the updated post
          const userElement = document.querySelector(`.post[data-author-id="${post.authorId}"]`);
          if (userElement) {
            userElement.querySelector(".user-name").textContent = updatedUserData.name;
            userElement.querySelector(".user-profile-picture").src =
              updatedUserData.profilePicture;
          }
        }
      });
    }
  
    const likeCount = post.likeCount ? post.likeCount.length : 0;
    // Get cached user data
    const userData = profilePicCache[post.authorId];
  const timeAgo = getTimeAgo(post.timestamp.seconds); // Get formatted time ago
  
    // Construct HTML based on post type
    let postHTML = "";
    const isPostOwner = post.authorId === userId;
    if (post.postType === "With Picture") {
      const isLiked = post.likeCount && post.likeCount.includes(userId);
      const likeSvg = isLiked
        ? `<svg class="like-svg liked" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e8eaed">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>`
        : `<svg class="like-svg" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed">
            <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/>
          </svg>`;
  
      postHTML = `
        <div class="post-with-image" data-author-id="${post.authorId}" data-id="${post.id}">
  
          <div class="user-profile">
          ${isPostOwner ? `
          <span  > 
            <svg class="delete-my-post" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e8eaed">
              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
            </svg>
          </span>` : ""}
            <div class="user-profile-pic">
              <img src="${userData.profilePicture}" alt="Profile Picture" class="user-profile-picture">
            </div>
            <h2 class="user-name">${userData.name}</h2>
          </div>
       <p class="date">${timeAgo}</p>
          <div class="post-pic">
            <img src="${post.imageUrl}" alt="Post Image" class="image-picture">
          </div>
          <p class="description">${post.desImage || ""}</p>
          <div class="posted-buttons">
            <span class="like" style="cursor:pointer">${likeSvg}</span>
            <span class="comment"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M240-400h480v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM880-80 720-240H160q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v720ZM160-320h594l46 45v-525H160v480Zm0 0v-480 480Z"/></svg></span>
          </div>
          <p class="like-count"></p>
        </div>
      `;
    } else {
      const isLiked = post.likeCount && post.likeCount.includes(userId);
   
      const likeSvg = isLiked
      ? `<svg class="like-svg liked" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e8eaed">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>`
      : `<svg class="like-svg" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed">
          <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/>
        </svg>`;
  
      postHTML = `
        <div class="post-without-image" data-author-id="${post.authorId}" data-id="${post.id}">
          <div class="user-profile">
          ${isPostOwner ? `
          <span  > 
            <svg class="delete-my-post" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e8eaed">
              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
            </svg>
          </span>` : ""}
            <div class="user-profile-pic">
              <img src="${userData.profilePicture}" alt="Profile Picture" class="user-profile-picture">
            </div>
            <h2 class="user-name">${userData.name}</h2>
          </div>
          <p class="date">${timeAgo}</p>
          <span class="title"> Title: ${post.title || "Untitled Post"}</span>
          <p class="description-without-image">${post.desText || ""}</p>
          <div class="posted-buttons">
            <span class="like">${likeSvg}</span>
            <span class="comment"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M240-400h480v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM880-80 720-240H160q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v720ZM160-320h594l46 45v-525H160v480Zm0 0v-480 480Z"/></svg></span>
          </div>
          <p class="like-count">Liked by ${likeCount} people and you</p>
        </div>
      `;
    }
  
    // Append the generated HTML to the postsHTML array
    postsHTML += postHTML;
  }
  
  // Render all posts at once
  postContainer.innerHTML = postsHTML;
  
  
  document.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".delete-my-post"); // Correct selector
    if (!deleteButton) return;
  
    // Ensure confirm dialog does not show twice
  confirm("Are you sure you want to delete this post?");
  
  
    const postElement = deleteButton.closest(".post-with-image, .post-without-image");
    if (!postElement) return;
  
    const postId = postElement.getAttribute("data-id");
    if (!postId) {
        console.error("Post ID not found!");
        return;
    }
  
    try {
        await deleteDoc(doc(db, "announcements", postId));
        postElement.remove(); // Remove the post from the DOM
        console.log("Post deleted successfully");
    } catch (error) {
        console.error("Error deleting post:", error);
    }
  }); // Prevent multiple event listeners
  
    
  document.addEventListener("click", async function (event) {
    if (event.target.closest(".like")) { // Check if clicked element is a like button
      const likeButton = event.target.closest(".like");
      const svg = likeButton.querySelector("svg");
      const postElement = likeButton.closest("[data-id]");
  
      if (!postElement) {
      console.error("No parent element with data-id found.");
      return;
    }
  
    const postId = postElement.getAttribute("data-id");
    console.log("Post ID:", postId); // Debugging
  
    if (!postId) return;
  
    const postRef = doc(db, "announcements", postId);
    const isLiked = svg.classList.contains("liked");
    console.log("Before Click - Liked:", isLiked); // Debugging
  
    try {
      const postSnapshot = await getDoc(postRef);
      if (!postSnapshot.exists()) {
        console.error("Post not found!");
        return;
      }
  
      const postData = postSnapshot.data();
      
      if (!userId) {
        console.error("User ID is undefined!");
        return;
      }
  
      if (isLiked) {
        await updateDoc(postRef, {
          likeCount: arrayRemove(userId),
        });
  
        svg.classList.remove("liked");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("height", "24px");
        svg.setAttribute("viewBox", "0 -960 960 960");
        svg.setAttribute("width", "24px");
        svg.setAttribute("fill", "#e8eaed");
        svg.innerHTML = `
          <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/>
        `;
      } else {
        await updateDoc(postRef, {
          likeCount: arrayUnion(userId),
        });
  
        svg.classList.add("liked");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("height", "24px");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", "24px");
        svg.setAttribute("fill", "#e8eaed");
        svg.innerHTML = `
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        `;
      }
  
      console.log("After Click - Liked:", svg.classList.contains("liked")); // Debugging
    } catch (error) {
      console.error("Error updating like:", error);
    }
    }
  });
  
  
  
    postsSnapshot.docs.forEach((postDoc) => {



      
      const postId = postDoc.id; // Get the ID of the current post
      const postRef = doc(db, 'announcements', postId);
    
      onSnapshot(postRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const postData = docSnapshot.data();
          const likeCountArray = postData.likeCount || []; // Array of user IDs who liked the post
          const likeCount = likeCountArray.length;
    
          // Assuming you have the current user's ID
          const currentUserId = myUserId; // Replace with the actual logged-in user's ID
          const userLiked = likeCountArray.includes(currentUserId);
    
          const postElement = document.querySelector(`[data-id="${postId}"]`);
          if (postElement) {
            let likeText;
            if (likeCount === 0) {
              likeText = "0 likes";
            } else if (likeCount === 1 && userLiked) {
              likeText = "Liked by you";
            } else if (likeCount === 1) {
              likeText = "Liked by 1 person";
            } else if (userLiked) {
              likeText = `Liked by ${likeCount - 1} people and you`;
            } else {
              likeText = `Liked by ${likeCount} people`;
            }
    
            postElement.querySelector(".like-count").textContent = likeText;
          }
        }
      });
    });
    
    
  
    document.addEventListener("click", async (event) => {
      if (event.target.closest(".comment")) {
        const postElement = event.target.closest(".post-with-image, .post-without-image");
        if (!postElement) return;
        
        const postId = postElement.dataset.id;
        document.querySelector(".comment-modal").dataset.postId = postId; // Store postId in modal
    
        loadComments(postId); // Load comments immediately
        document.getElementById("commentModal").style.display = "flex"; // Show modal
        
      }
    });
    
    
    const commentInput = document.querySelector(".comment-input");
  const sendCommentBtn = document.querySelector(".send-comment");
  const commentsContainer = document.querySelector(".comment-list");
  const modal = document.getElementById("commentModal");
  const closingButton = document.querySelector(".close-comment-button");  // Use a more descriptive variable name
  function resetModal() {modal.style.display = "none";}
  // Close the modal when clicking on the background
  modal.addEventListener("click", (event) => {
  // Check if the clicked target is the background (not the modal content)
  if (event.target === modal) {
    resetModal() // Hide the modal
  }
  });
  
  // Close the modal when clicking the close button (including inside SVG)
  closingButton.addEventListener("click", () => {
  
    resetModal(); // Hide the modal
    // Hide the modal
  });
  
  
    
      // Function to post a comment
      async function postComment(postId) {
        const commentText = commentInput.value.trim();
        if (commentText === "") return;
      
        const commentData = {
          text: commentText,
          timestamp: new Date(),
          authorId: userId,
        };
      
        try {
          const commentsRef = collection(db, `announcements/${postId}/comments`); // Correct reference
          await addDoc(commentsRef, commentData);
      
          commentInput.value = ""; // Clear input field
          loadComments(postId); // Refresh comments
        } catch (error) {
          console.error("Error posting comment:", error);
        }
      }
      
      
    
      function sendCommentHandler() {
        const postId = document.querySelector(".comment-modal").dataset.postId;
        if (!postId) return;
    
        // Check if button is already disabled (prevents multiple clicks)
        if (sendCommentBtn.disabled) return;
    
        sendCommentBtn.disabled = true; // Disable button immediately
        
        postComment(postId)
            .then(() => {
                sendCommentBtn.disabled = false; // Re-enable after comment is posted
            })
            .catch(error => {
                console.error("Error posting comment:", error);
                sendCommentBtn.disabled = false; // Ensure re-enable even on error
            });
    }
    
    // Ensure only one event listener is active
    sendCommentBtn.removeEventListener("click", sendCommentHandler);
    sendCommentBtn.addEventListener("click", sendCommentHandler);
    
     
  async function loadComments(postId) {
    const commentsContainer = document.querySelector(".comment-list");
    commentsContainer.innerHTML = "<p class='loader-comment'>Loading comments...</p>";
  
    try {
        const commentsSnapshot = await getDocs(collection(db, `announcements/${postId}/comments`));
        let commentsHTML = "";
  
        // Sort comments by timestamp in descending order (newest first)
        const commentsData = commentsSnapshot.docs
            .map(doc => ({
                id: doc.id,
                data: doc.data()
            }))
            .sort((a, b) => b.data.timestamp?.seconds - a.data.timestamp?.seconds); // Sort by timestamp (newest first)
  
        // Identify the last comment (oldest) by its timestamp
  
  
        for (let i = 0; i < commentsData.length; i++) {
            const { id, data } = commentsData[i];
            if (id === "template") continue;
  
            const commentData = data;
            const commentAuthorId = commentData.authorId;
  
            let userProfilePic = "user_profile_-removebg-preview.png";
            let userName = "Unknown User";
  
            // Fetch user details
            const userDocRef = doc(db, `users/${commentAuthorId}`);
            const userDocSnapshot = await getDoc(userDocRef);
            if (userDocSnapshot.exists()) {
                const userData = userDocSnapshot.data();
                userName = userData.name || "Unknown User";
                userProfilePic = userData.profilePicture || "user_profile_-removebg-preview.png";
            }
  
            // Format comment timestamp
            const timeAgo = getTimeAgo(commentData.timestamp?.seconds);
  
            // Show delete button only if the comment belongs to the current user
            const deleteButtonHTML = commentAuthorId === userId
                ? `<span class="delete-comment" data-comment-id="${id}" data-post-id="${postId}">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e8eaed">
                        <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                    </svg>
                   </span>`
                : "";
  
            // Add a special class for the last (oldest) comment
  
  
            commentsHTML += `
                <div class="comments ">
                <span class="comment-time">${timeAgo}</span>
                    ${deleteButtonHTML}
                    <div class="user-profile-comment">
                        <div class="user-profile-pic-comment">
                            <img src="${userProfilePic}" alt="Profile Picture" class="user-profile-picture-comment">
                        </div>
                        <h2 class="user-name-comment" style=" font-size: 15px !important;
                        color: #fff !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;">${userName}</h2>
                    </div>
                    <p class="comment-p" style="
                    ">${commentData.text}</p>
                </div>
            `;
        }
  
        commentsContainer.innerHTML = commentsHTML || "<p class='loader-comment'>No comments yet.</p>";
  
        // Attach event listeners to delete buttons
        document.querySelectorAll(".delete-comment").forEach(button => {
            button.addEventListener("click", async (event) => {
                const commentId = event.currentTarget.dataset.commentId;
                const postId = event.currentTarget.dataset.postId;
                if (commentId && postId) {
                    await deleteComment(postId, commentId);
                }
            });
        });
  
    } catch (error) {
        console.error("Error loading comments:", error);
        commentsContainer.innerHTML = "<p>Failed to load comments.</p>";
    }
  }
  
  
  
  
  // Function to delete a comment
  async function deleteComment(postId, commentId) {
  try {
      await deleteDoc(doc(db, `announcements/${postId}/comments/${commentId}`));
      loadComments(postId); // Refresh comments after deletion
  } catch (error) {
      console.error("Error deleting comment:", error);
  }
  }

  
  
  
     
  
  } catch (error) {
    console.error("Error fetching posts:", error);
    postContainer.innerHTML = "<p>Failed to load posts. Please try again later.</p>";
  }
  }
  
 
// Call the function to render posts on page load
 
fetchAndRenderPosts();
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.querySelector(".hamburger-menu");
  const closeMenu = document.querySelector(".close-menu");
  const divaaa = document.querySelector(".divaaa");
  const bars = document.querySelectorAll(".bar"); // Select all bars inside the hamburger

  // Function to check screen width and hide menu if necessary
  function checkScreenWidth() {
    if (window.innerWidth > 700) {
      closeMenuAction(); // Ensure menu closes when resizing above 700px
    }
  }

 

 

  // Function to open menu
  function openMenu() {
    divaaa.style.display = "block"; // Ensure the menu is displayed
    divaaa.style.opacity = "1";
    divaaa.style.visibility = "visible";
    divaaa.style.transform = "translateY(0)"; // Slide in effect
    hamburger.classList.add("active"); // Apply animation to hamburger

    // ✅ Keep hamburger fixed when menu is open
    hamburger.style.position = "fixed";
}

function closeMenuAction() {
    divaaa.style.opacity = "0";
    divaaa.style.visibility = "hidden";
    divaaa.style.transform = "translateY(-20px)"; // Slide out effect

    setTimeout(() => {
        divaaa.style.display = "none"; // Hide after animation
    }, 300); // Delay matches animation duration

    hamburger.classList.remove("active"); 

    // ✅ Reset hamburger to absolute after closing
    hamburger.style.position = "absolute";
}

  // Function to toggle menu when clicking the hamburger
  function toggleMenu() {
    if (divaaa.style.display === "block" && divaaa.style.opacity === "1") {
      closeMenuAction(); // If menu is open, close it
    } else {
      openMenu(); // If menu is closed, open it
    }
  }

  // Event Listeners
  hamburger.addEventListener("click", toggleMenu);
 

  // Hide divaaa when resizing above 700px
  window.addEventListener("resize", checkScreenWidth);

  // Initial check on page load
  checkScreenWidth();
});
