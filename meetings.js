import { db } from './fireMessage.js';
import { collection, getFirestore, getDocs, setDoc, getDoc, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";


const firestore = getFirestore();
const auth = getAuth();

let currentUserID = sessionStorage.getItem("userId"); // Ensure "userId" is the key under which it's stored
console.log(currentUserID);
document.addEventListener("DOMContentLoaded", async () => {
  // Show the loader when the page loads
  document.querySelector(".loader-overlay").style.display = "block";
});
let allUsers = []; // Store all users from Firebase
let selectedUserList = []; // Store selected user IDs
; 
const searchBar = document.querySelector('.search-bar');
const searchResults = document.getElementById('search-result');
const selectedUsers = document.getElementById('selected-users');
const continueButton = document.querySelector('.continue');

let userName;
let userData = JSON.parse(sessionStorage.getItem('userData'));
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user);
        currentUserID = user.uid; // Store the current user's ID
        
const userId = sessionStorage.getItem("userId");

document.addEventListener("DOMContentLoaded", async () => {
  // Show the loader when the page loads
  document.querySelector(".loader-overlay").style.display = "block";
});

if (!userData || userData.id !== userId) {
    if (userId) {
        const docRef = doc(db, "users", userId);
        try {
            const docSnap = getDoc(docRef);
            if (docSnap.exists()) {
                userData = docSnap.data();
                userData.id = userId;
                sessionStorage.setItem('userData', JSON.stringify(userData));
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

userName = userData.name; 
console.log(userName);
console.log("User data retrieved:", userData);

        fetchAllUsers();
    } else {
        console.error("No user is signed in. Please authenticate.");
    }
});


// Fetch all users from Firebase
async function fetchAllUsers() {
    try {
        console.log("Fetching users...");
        const usersSnapshot = await getDocs(collection(db, "users"));
        allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Fetched users:", allUsers);
    } catch (error) {
        console.error("Error fetching users:", error.message);
    }
}
const profilePicCache = {};

// Display a single search result
function displaySearchResult(userId, userName) {
    const resultItem = document.createElement('div');
    resultItem.classList.add('search-user-item', 'user-inbox');
    resultItem.dataset.userId = userId;

    resultItem.innerHTML = `
        <div class="profile-pic">
            <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
        </div>
        <div class="text-profile">
            <h1 class="name">${userName}</h1>
        </div>
    `;

    if (profilePicCache[userId]) {
        // If cached, set the profile picture from the cache
        resultItem.querySelector('.profile-picture').src = profilePicCache[userId];
        console.log(`Loaded profile picture from cache for user ${userId}`);
    } else {
        // Fetch profile picture from Firestore
        const userDocRef = doc(db, `users/${userId}`);
        
        getDoc(userDocRef)
            .then((docSnapshot) => {
                if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    const profilePicUrl = userData.profilePicture || 'user_profile_-removebg-preview.png';
                    const fetchedUserName = userData.name || 'Unknown User';

                    // Cache and set the profile picture
                    profilePicCache[userId] = profilePicUrl;
                    resultItem.querySelector('.profile-picture').src = profilePicUrl;

                    // Update name
                    resultItem.querySelector('.name').textContent = fetchedUserName;

                    console.log(`Fetched and set profile picture for user ${userId}: ${profilePicUrl}`);
                } else {
                    console.warn(`No document found for user ${userId}`);
                }
            })
            .catch((error) => {
                console.error(`Error fetching user ${userId}:`, error);
            });
    }

    // Add user to selected container on click
    resultItem.addEventListener('click', () => addUserToSelected(userId, userName));

    searchResults.appendChild(resultItem);
}


// Search and filter users
function searchUsers(searchTerm) {
    searchResults.innerHTML = '';

    if (searchTerm.trim() === '') {
        searchResults.style.display = 'none';
        return;
    }

    const filteredUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        user.id !== currentUserID && // Exclude current user
        !selectedUserList.includes(user.id) // Exclude already selected users
    );

    filteredUsers.forEach(user => displaySearchResult(user.id, user.name));

    searchResults.style.display = filteredUsers.length > 0 ? 'block' : 'none';
}

// Add user to selected list
// Add user to selected list
function addUserToSelected(userId, userName) {
    if (!selectedUserList.includes(userId)) {
        selectedUserList.push(userId);

        // Create the user item for the selected list
        const userItem = document.createElement('div');
        userItem.classList.add('selected-user-item', 'user-inbox'); // Add 'user-inbox' styling
        userItem.dataset.userId = userId;

        userItem.innerHTML = `
            <div class="profile-pic">
                <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
            </div>
            <div class="text-profile">
                <h1 class="name">${userName}</h1>
            </div>
            <div class="remove-user" style="font-size: 2em; color:white; position:absolute; right:10px;">&times;</div>
        `;

        if (profilePicCache[userId]) {
          // If cached, set the profile picture from the cache
          userItem.querySelector('.profile-picture').src = profilePicCache[userId];
          console.log(`Loaded profile picture from cache for user ${userId}`);
      } else {
          // Fetch profile picture from Firestore
          const userDocRef = doc(db, `users/${userId}`);
          
          getDoc(userDocRef)
              .then((docSnapshot) => {
                  if (docSnapshot.exists()) {
                      const userData = docSnapshot.data();
                      const profilePicUrl = userData.profilePicture || 'user_profile_-removebg-preview.png';
                      const fetchedUserName = userData.name || 'Unknown User';
  
                      // Cache and set the profile picture
                      profilePicCache[userId] = profilePicUrl;
                      userItem.querySelector('.profile-picture').src = profilePicUrl;
  
                      // Update name
                      userItem.querySelector('.name').textContent = fetchedUserName;
  
                      console.log(`Fetched and set profile picture for user ${userId}: ${profilePicUrl}`);
                  } else {
                      console.warn(`No document found for user ${userId}`);
                  }
              })
              .catch((error) => {
                  console.error(`Error fetching user ${userId}:`, error);
              });
      }


        // Add event listener to remove button
        userItem.querySelector('.remove-user').addEventListener('click', () => removeUserFromSelected(userId, userItem));

        // Append the user item to the selected users container
        selectedUsers.appendChild(userItem);

        // Clear the search input and results
        searchBar.value = ''; // Clear search input
        searchResults.innerHTML = ''; // Clear displayed search results
        searchResults.style.display = 'none'; // Hide the search results container

        updateUIState();
    }
}

// Remove user from selected list
function removeUserFromSelected(userId, userItem) {
    selectedUserList = selectedUserList.filter(id => id !== userId);
    userItem.remove();
    updateUIState();
}
 
// Update UI state based on selected users
function updateUIState() {
    const selectedName = document.querySelector('.selected-name'); // Ensure this targets the correct element

    selectedUsers.style.display = selectedUserList.length > 0 ? 'block' : 'none';
    selectedName.style.display = selectedUserList.length > 0 ? 'block' : 'none';
    continueButton.disabled = selectedUserList.length === 0;
}

// Initialize search functionality
searchBar.addEventListener('input', (event) => searchUsers(event.target.value));

// Fetch users on page load
document.addEventListener('DOMContentLoaded', fetchAllUsers);


 
const cancelButton = document.querySelector('.cancel');
const meetingNameInput = document.querySelector('.name-meeting');

// Add event listener to the cancel button
cancelButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to cancel? This will clear all selections.")) {
        clearAllSelections();
    }
});

// Add event listener to the continue button
continueButton.addEventListener('click', () => {
    const meetingName = meetingNameInput.value.trim();

    if (selectedUserList.length === 0) {
        alert("Please select at least one user for the meeting.");
        return;
    }

    if (meetingName === "" || meetingName.length > 20) {
        alert("Meeting name must be between 1 and 20 characters.");
        return;
    }

    openConfirmMeetingModal(meetingName, selectedUserList);
});

// Clear all selections and reset fields
function clearAllSelections() {
    selectedUserList = [];
    selectedUsers.innerHTML = '';
    meetingNameInput.value = '';
    updateUIState();
}
function openConfirmMeetingModal(meetingName, userList) {
  // Create modal content
  const modalContent = `
      <div class="modal-overlay">
          <div class="modal">
              <h2>Confirm Meeting</h2>
              <p><strong>Meeting Name:</strong> ${meetingName}</p>
              <p><strong>Selected Members:</strong></p>
              <div class="meeting-preview-members">
                  ${userList.map(userId => {
                      const user = allUsers.find(u => u.id === userId);
                      return `
                          <div class="user-inbox" data-user-id="${userId}">
                              <div class="profile-pic">
                                  <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
                              </div>
                              <div class="text-profile">
                                  <h1 class="name">${user?.name || "Unknown User"}</h1>
                              </div>
                          </div>
                      `;
                  }).join('')}
              </div>
              <div class="modal-actions">
                  <button class="confirm-meeting-button">Confirm</button>
                  <button class="close-modal-button">Cancel</button>
              </div>
          </div>
      </div>
  `;

  // Create and insert modal container
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalContent;
  document.body.appendChild(modalContainer);

  // Fetch and set profile pictures for each user
  userList.forEach(userId => {
      const userItem = modalContainer.querySelector(`.user-inbox[data-user-id="${userId}"]`);
      if (!userItem) return;

      if (profilePicCache[userId]) {
          // Set profile picture from cache
          userItem.querySelector('.profile-picture').src = profilePicCache[userId];
          console.log(`Loaded profile picture from cache for user ${userId}`);
      } else {
          // Fetch profile picture from Firestore
          const userDocRef = doc(db, `users/${userId}`);

          getDoc(userDocRef)
              .then((docSnapshot) => {
                  if (docSnapshot.exists()) {
                      const userData = docSnapshot.data();
                      const profilePicUrl = userData.profilePicture || 'user_profile_-removebg-preview.png';
                      const fetchedUserName = userData.name || 'Unknown User';

                      // Cache and set the profile picture
                      profilePicCache[userId] = profilePicUrl;
                      userItem.querySelector('.profile-picture').src = profilePicUrl;

                      // Update the name (if available)
                      userItem.querySelector('.name').textContent = fetchedUserName;

                      console.log(`Fetched and set profile picture for user ${userId}: ${profilePicUrl}`);
                  } else {
                      console.warn(`No document found for user ${userId}`);
                  }
              })
              .catch((error) => {
                  console.error(`Error fetching user ${userId}:`, error);
              });
      }
  });

  // Close modal event
  modalContainer.querySelector('.close-modal-button').addEventListener('click', () => {
      modalContainer.remove();
  });

  // Confirm meeting event
  modalContainer.querySelector('.confirm-meeting-button').addEventListener('click', async () => {
      const creatorId = currentUserID; // Assuming you have the current user's ID
      const selectedMembers = userList; // Use the userList passed to this function

      if (!meetingName || selectedMembers.length === 0) {
          alert("Please provide a meeting name and select members.");
          return;
      }

      try {
          const meetingId = await createMeeting(meetingName, creatorId, selectedMembers);

          // Start listening to updates for the created meeting
          if (meetingId) {
              listenToMeetingUpdates(meetingId);
              alert("Meeting confirmed!");
              modalContainer.remove();
              clearAllSelections(); // Optionally clear selections after confirmation
          }
      } catch (error) {
          console.error("Error confirming meeting:", error.message);
          alert("Failed to confirm the meeting. Please try again.");
      }
  });
}

 
// Function to create a new meeting
async function createMeeting(meetingName, creatorId, selectedMembers) {
    try {
        // Prepare participants with "not ready" status
        const participants = {};
        selectedMembers.forEach(memberId => {
            participants[memberId] = "not ready";
        });

        // Add meeting document to Firestore
        const meetingRef = await addDoc(collection(db, "meetings"), {
            meetingName,
            creatorId,
            selectedMembers,
            participants,
            meetingStatus: "not started",
            timestamp: serverTimestamp(),
        });

        console.log("Meeting created with ID:", meetingRef.id);
        alert("Meeting created successfully!");

        return meetingRef.id;
    } catch (error) {
        console.error("Error creating meeting:", error.message);
        alert("Failed to create meeting.");
    }
}

// Real-time listener for a specific meeting
function listenToMeetingUpdates(meetingId) {
    const meetingRef = doc(db, "meetings", meetingId);

    // Attach a listener for real-time updates
    onSnapshot(meetingRef, (snapshot) => {
        if (snapshot.exists()) {
            const meetingData = snapshot.data();
            console.log("Meeting updated:", meetingData);

            // Update your UI with new data
            updateMeetingUI(meetingData);
        } else {
            console.log("Meeting document does not exist.");
        }
    });
}

// Function to mark a user as ready
async function markUserReady(meetingId, userId) {
    try {
        const meetingRef = doc(db, "meetings", meetingId);

        // Update the participant's status to "ready"
        await updateDoc(meetingRef, {
            [`participants.${userId}`]: "ready",
        });

        console.log(`User ${userId} marked as ready.`);
    } catch (error) {
        console.error("Error updating readiness status:", error.message);
    }
}

// Example function to update the UI
function updateMeetingUI(meetingData) {
    const { meetingName, participants } = meetingData;
    console.log("Updating UI for meeting:", meetingName);

    // Example: Display participant readiness status
    for (const [userId, status] of Object.entries(participants)) {
        console.log(`User ${userId}: ${status}`);
    }
}



// Example Usage
 // Replace with your logic to get the current user ID
const pendingListDiv = document.querySelector('.pending-list');

const meetingsRef = collection(db, 'meetings');

// Real-time listener for all meetings
// Real-time listener for all meetings
onSnapshot(meetingsRef, (snapshot) => {
    // Clear the pending list before rendering new meetings
    pendingListDiv.innerHTML = '';
  
    console.log("Fetched meetings for the user:");
  
    snapshot.forEach((doc) => {
      const meetingData = doc.data();
      const meetingId = doc.id;
  

      
      const isCreator = meetingData.creatorId === currentUserID;
      const isMember = Array.isArray(meetingData.selectedMembers) && meetingData.selectedMembers.includes(currentUserID);
  
      console.log("Meeting Data:", meetingId, meetingData);
  
      if (isCreator) {
        displayMeetingCreated(meetingData, meetingId);
      } else if (isMember) {
      console.log("Invited to meeting:", meetingId, meetingData.meetingName);
      displayMeetingInvited(meetingData, meetingId);}
    });
  });
  

  // Define stopMeeting function globally
async function stopMeeting(meetingId) {
    const meetingRef = doc(db, 'meetings', meetingId);
    try {
      await deleteDoc(meetingRef); // Delete the document from Firestore
      alert('Meeting has been removed.');
  
      // Remove the meeting element from the DOM
      const meetingElement = document.querySelector(`[data-id="${meetingId}"]`);
      if (meetingElement) meetingElement.remove();
    } catch (error) {
      console.error('Error removing meeting:', error);
    }
  }
  
  // Display the meeting as created by the user
 // Display the meeting as created by the user
 function displayMeetingCreated(meetingData, meetingId) {
  console.log("Displaying created meeting:", meetingData.meetingName);

  // Check if the meeting has no selected members and delete it if true
  if (!meetingData.selectedMembers || meetingData.selectedMembers.length === 0) {
      // Firestore reference for the meeting document
      const meetingRef = doc(db, 'meetings', meetingId);
      
      // Delete the meeting if there are no selected members
      deleteDoc(meetingRef).then(() => {
          alert("Meeting has been deleted because it has no selected members.");
      }).catch((error) => {
          console.error("Error deleting meeting:", error);
      });
      return; // Exit the function if the meeting is deleted
  }

  const meetingHtml = `
    <div class="meeting-created meeting-but" data-id="${meetingId}" data-name="${meetingData.meetingName}">
      <svg xmlns="http://www.w3.org/2000/svg" height="44px" viewBox="0 -960 960 960" width="44px" fill="#e8eaed">
        <path d="M240-320h320v-22q0-44-44-71t-116-27q-72 0-116 27t-44 71v22Zm160-160q33 0 56.5-23.5T480-560q0-33-23.5-56.5T400-640q-33 0-56.5 23.5T320-560q0 33 23.5 56.5T400-480ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h480q33 0 56.5 23.5T720-720v180l160-160v440L720-420v180q0 33-23.5 56.5T640-160H160Zm0-80h480v-480H160v480Zm0 0v-480 480Z" />
      </svg>
      <h1 class="meeting-name-created">${meetingData.meetingName}</h1>
      <div class="meeting-buttons">
        <button class="start meet-but">Start</button>
        <button class="stop meet-but">Stop</button>
      </div>
    </div>
  `;
  pendingListDiv.innerHTML += meetingHtml;
}


  // Attach event listener to the parent container (event delegation)
  pendingListDiv.addEventListener('click', (event) => {
    // Check if the clicked element is a "stop" button
    if (event.target.classList.contains('stop')) {
      // Get the meeting ID from the parent element
      const meetingElement = event.target.closest('.meeting-created');
      const meetingId = meetingElement?.getAttribute('data-id');
  
      if (meetingId) {
        stopMeeting(meetingId);
      }
    }
  });


 
  // Add event listener for the 'start' button
pendingListDiv.addEventListener('click', (event) => {
  // Check if the clicked element is a "start" button
  if (event.target.classList.contains('start')) {
    // Get the meeting ID and name from the parent element
    const meetingElement = event.target.closest('.meeting-created');
    const meetingId = meetingElement?.getAttribute('data-id');
    const meetingName = meetingElement?.getAttribute('data-name'); // Assuming the name is stored in a `data-name` attribute

    if (meetingId && meetingName) {
      openStartModal(meetingId, meetingName);
    }
  }
});

// Function to open the modal for starting the meeting
function openStartModal(meetingId, meetingName) {
  // Call the showModal function with the meeting name
  showModal(meetingName, meetingId);

  // Add additional behavior for the modal's confirm button
  const confirmStartButton = document.querySelector(".confirm-start");
  confirmStartButton.addEventListener("click", () => startMeeting(meetingId));
}

  // Function to open the modal for starting the meeting
function openStartModalinvited(meetingId, meetingName,meetingStatus ) {
    // Call the showModal function with the meeting name
    showJoinModal(meetingName, meetingStatus, meetingId);
  
    // Add additional behavior for the modal's confirm button
    const confirmStartButton = document.querySelector(".confirm-join");
    confirmStartButton.addEventListener("click", () => startMeeting(meetingId));
  }
  

// Reject meeting (called when member presses "Reject")
async function rejectMeeting(meetingId) {
    const meetingRef = doc(db, 'meetings', meetingId);
    try {
        const meetingSnap = await getDoc(meetingRef);
        if (meetingSnap.exists()) {
            const meetingData = meetingSnap.data();
            const members = meetingData.selectedMembers || []; // Fallback to empty array
            
            if (!Array.isArray(members)) {
                throw new Error('Invalid document structure: selectedMembers is not an array.');
            }

            const updatedMembers = members.filter(memberId => memberId !== currentUserID);

            if (updatedMembers.length === 0) {
                await deleteDoc(meetingRef);
                alert('Meeting deleted as no members remain.');
            } else {
                await updateDoc(meetingRef, { selectedMembers: updatedMembers });
                alert('You have been removed from the meeting.');
            }
        } else {
            alert('Meeting does not exist.');
        }
    } catch (error) {
        console.error('Error rejecting meeting:', error);
    }
}

  
// Function to display the meeting as invited
function displayMeetingInvited(meetingData, meetingId) {
  console.log("Displaying invited meeting:", meetingData.meetingName);

  const meetingHtml = `
      <div class="meeting-invite meeting-but" data-id="${meetingId}">
          <svg xmlns="http://www.w3.org/2000/svg" height="44px" viewBox="0 -960 960 960" width="44px" fill="#e8eaed">
              <path d="M360-320h80v-120h120v-80H440v-120h-80v120H240v80h120v120ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h480q33 0 56.5 23.5T720-720v180l160-160v440L720-420v180q0 33-23.5 56.5T640-160H160Zm0-80h480v-480H160v480Zm0 0v-480 480Z" />
          </svg>
          <h1 class="meeting-name-invited">${meetingData.meetingName}</h1>
          <div class="meeting-buttons">
        
              <button class="accept meet-but">Join</button>
              <button class="reject meet-but">Reject</button>
          </div>
      </div>
  `;
  pendingListDiv.innerHTML += meetingHtml;

} 


pendingListDiv.addEventListener('click', async (event) => {
    if (event.target.classList.contains('accept')) {
      const meetingElement = event.target.closest('.meeting-invite');
      const meetingId = meetingElement?.getAttribute('data-id');
      const meetingName = meetingElement?.querySelector('.meeting-name-invited')?.textContent;
  
      if (meetingId && meetingName) {
        try {
          // Fetch meeting details from Firestore
          const meetingRef = doc(db, "meetings", meetingId);
          const meetingSnapshot = await getDoc(meetingRef);
  
          if (meetingSnapshot.exists()) {
            const meetingData = meetingSnapshot.data();
            const meetingStatus = meetingData.meetingStatus;
  
            console.log("Join button clicked for:", meetingId, meetingName, meetingStatus);
  
            // Pass meetingStatus to the modal function
            openStartModalinvited(meetingId, meetingName, meetingStatus);
          } else {
            console.error("Meeting document does not exist in Firestore");
          }
        } catch (error) {
          console.error("Error fetching meeting data from Firestore:", error);
        }
      } else {
        console.error("Meeting ID or Name is missing");
      }
    }
  });


  

pendingListDiv.addEventListener('click', (event) => {
    // Check if the clicked element is a "reject" button
    if (event.target.classList.contains('reject')) {
        // Get the meeting ID from the parent element of the reject button
        const meetingElement = event.target.closest('.meeting-invite');
        const meetingId = meetingElement?.getAttribute('data-id');

        if (meetingId) {
            rejectMeeting(meetingId);
        }
    }
});



// Stop meeting (called when creator presses "Stop")


// Accept meeting (called when member presses "Accept")
function acceptMeeting(meetingId) {
  console.log('Accepted meeting:', meetingId);
  // Add acceptance logic if needed
}// Global Variables



let isCameraOn = false;
let isMicOn = false;
let dailyCall = null; // Daily.co call instance


// Function to create and display the modal
function showModal(meetingName, meetingId) {
  const modalContainer = document.getElementById("modal-container");
  modalContainer.innerHTML = `
    <div class="creator-waiting-room">

    <span class="close-room-modal">
    <svg xmlns="http://www.w3.org/2000/svg" height="37px" viewBox="0 -960 960 960" width="37px" fill="#e8eaed"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/></svg>
    </span>
      <h1 class="meeting-name">${meetingName}</h1>
      <div class="camera">
        <span class="camera-off"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#e8eaed"><path d="M880-260 720-420v67l-80-80v-287H353l-80-80h367q33 0 56.5 23.5T720-720v180l160-160v440ZM822-26 26-822l56-56L878-82l-56 56ZM498-575ZM382-464ZM160-800l80 80h-80v480h480v-80l80 80q0 33-23.5 56.5T640-160H160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800Z"/></svg></span>
      </div>
      <div class="action-buttons">
        <button class="cam-on-off met-buts">
          <span class="cam-on" hidden><svg xmlns="http://www.w3.org/2000/svg" height="27px" viewBox="0 -960 960 960" width="27px" fill="#e8eaed"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h480q33 0 56.5 23.5T720-720v180l160-160v440L720-420v180q0 33-23.5 56.5T640-160H160Zm0-80h480v-480H160v480Zm0 0v-480 480Z"/></svg></span>
          <span class="cam-off"><svg xmlns="http://www.w3.org/2000/svg" height="27px" viewBox="0 -960 960 960" width="27px" fill="#e8eaed"><path d="M880-260 720-420v67l-80-80v-287H353l-80-80h367q33 0 56.5 23.5T720-720v180l160-160v440ZM822-26 26-822l56-56L878-82l-56 56ZM498-575ZM382-464ZM160-800l80 80h-80v480h480v-80l80 80q0 33-23.5 56.5T640-160H160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800Z"/></svg></span>
        </button>
        <button class="mic-on-off met-buts">
          <span class="mic-on" hidden><svg xmlns="http://www.w3.org/2000/svg" height="27px" viewBox="0 -960 960 960" width="27px" fill="#e8eaed"><path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm0-240Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm40-360q17 0 28.5-11.5T520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480Z"/></svg></span>
          <span class="mic-off"><svg xmlns="http://www.w3.org/2000/svg" height="27px" viewBox="0 -960 960 960" width="27px" fill="#e8eaed"><path d="m710-362-58-58q14-23 21-48t7-52h80q0 44-13 83.5T710-362ZM480-594Zm112 112-72-72v-206q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v126l-80-80v-46q0-50 35-85t85-35q50 0 85 35t35 85v240q0 11-2.5 20t-5.5 18ZM440-120v-123q-104-14-172-93t-68-184h80q0 83 57.5 141.5T480-320q34 0 64.5-10.5T600-360l57 57q-29 23-63.5 39T520-243v123h-80Zm352 64L56-792l56-56 736 736-56 56Z"/></svg></span>
        </button>
      </div>

      <div class="mem-h">Members</div>

      <div class="members-list" aria-live="polite">
      
      </div>
      <button class="confirm-start">Start Meeting</button>
    </div>
  `;
  modalContainer.classList.remove("hidden");
  loadMembers(meetingId);

  // Attach event listeners 
  modalContainer.addEventListener("click", (event) => {
    const waitingRoom = document.querySelector(".creator-waiting-room");
    if (waitingRoom && !waitingRoom.contains(event.target)) {
      closeModal();
    }
  });
  document.querySelector(".close-room-modal").addEventListener("click", closeModal)
  document.querySelector(".cam-on-off").addEventListener("click", toggleCamera);
  document.querySelector(".mic-on-off").addEventListener("click", toggleMic);
  document.querySelector(".confirm-start").addEventListener("click", () => initializeDailyMeeting(meetingName, meetingId));
}
async function loadMembers(meetingId) {
  const membersListDiv = document.querySelector(".members-list");

  // Firestore reference for the meeting document
  const meetingRef = doc(db, 'meetings', meetingId);

  // Listen for real-time updates for the meeting document
  onSnapshot(meetingRef, async (snapshot) => {
    if (snapshot.exists()) {
      const meetingData = snapshot.data();

      // Clear the existing list
      membersListDiv.innerHTML = "";

      if (meetingData.selectedMembers && meetingData.selectedMembers.length > 0) {
        // Create an array to store all member HTML
        const membersHtml = [];

        // Iterate over the selected members array to fetch each member's data
        for (const memberId of meetingData.selectedMembers) {
          // Fetch the member's data from the 'users' collection
          const memberRef = doc(db, 'users', memberId);
          const memberSnapshot = await getDoc(memberRef);

          if (memberSnapshot.exists()) {
            const memberData = memberSnapshot.data();
            
            // Check if the member is the current user
            const label = memberId === meetingData.creatorId ? "(Host)" :
                          (memberId === currentUserID ? "(Me)" : "");

            let closeSpan = "";
            if (meetingData.creatorId === currentUserID && memberId !== currentUserID) {
              closeSpan = `<span class="remove-user" data-member-id="${memberId}">&times;</span>`;
            }

            membersHtml.push(`
              <div class="user-inbox" data-user-id="${memberData.id}">
                <div class="profile-pic">
                  <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
                </div>
                <div class="text-profile">
                  <h1 class="name naaa">${memberData?.name || "Unknown User"} ${label}</h1>
                </div>
                ${closeSpan} <!-- Add close span here -->
              </div>
            `);
          }
        }

        // Fetch the creator's data (creatorId is a single string, not an array)
        const creatorRef = doc(db, 'users', meetingData.creatorId);
        const creatorSnapshot = await getDoc(creatorRef);

        if (creatorSnapshot.exists()) {
          const creatorData = creatorSnapshot.data();

          // Check if the creator is the current user
          const label = meetingData.creatorId === currentUserID ? "(Host) (Me)" : "(Host)";

          membersHtml.push(`
            <div class="user-inbox" data-user-id="${creatorData.id}">
              <div class="profile-pic">
                <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
              </div>
              <div class="text-profile">
                <h1 class="name naaa">${creatorData?.name || "Unknown User"} ${label}</h1>
              </div>
            </div>
          `);
        }

        // Set all member HTML at once
        membersListDiv.innerHTML = membersHtml.join('');

        // Add event listeners for all remove-user spans
        const removeButtons = membersListDiv.querySelectorAll('.remove-user');
        removeButtons.forEach(button => {
          button.addEventListener('click', (e) => {
            const memberId = e.target.getAttribute('data-member-id');
            removeUser(meetingId, memberId);
          });
        });

      } else {
        membersListDiv.innerHTML = "<p>No members have joined yet.</p>";
      }
    } else {
      membersListDiv.innerHTML = "<p>Meeting data not found.</p>";
    }
  });
}

async function removeUser(meetingId, memberId) {
  // Confirm before removing user
  const confirmation = confirm("Are you sure you want to remove this user from the meeting?");
  if (!confirmation) return;

  // Firestore reference for the meeting document
  const meetingRef = doc(db, 'meetings', meetingId);

  // Fetch the meeting data to get the current list of members
  const meetingSnapshot = await getDoc(meetingRef);

  if (meetingSnapshot.exists()) {
    const meetingData = meetingSnapshot.data();

    // Check if the selectedMembers list exists and contains the member
    if (meetingData.selectedMembers && meetingData.selectedMembers.includes(memberId)) {
      // Remove the member from the selectedMembers array
      const updatedMembers = meetingData.selectedMembers.filter(id => id !== memberId);

      // Update Firestore with the new list of members
      await updateDoc(meetingRef, {
        selectedMembers: updatedMembers
      });

      // If there are no members left, delete the meeting
      if (updatedMembers.length === 0) {
        await deleteDoc(meetingRef);
        alert("Meeting deleted because there are no members left.");
        closeModal()
      } else {
        alert("User removed successfully!");
      }

      // Reload the members list to reflect the change
      loadMembers(meetingId);
    } else {
      alert("User not found in the meeting.");
    }
  } else {
    alert("Meeting data not found.");
  }
}




// Function to initialize Daily.co meeting
async function initializeDailyMeeting(meetingName, meetingId) {
    try {
      // Check if the room exists
      const existingRoomResponse = await fetch(`https://api.daily.co/v1/rooms/${meetingName}`, {
        method: "GET",
        headers: {
            Authorization: "Bearer fee0bd1d24bc9096fcf98f7164ae164b2912101d2698a94eadecb483299dbb3f", // Replace with your Daily.co API key
            // Replace with your Daily.co API key
        },
      });
  
      let roomUrl;
      if (existingRoomResponse.ok) {
        // Room exists, join it
        const room = await existingRoomResponse.json();
        roomUrl = room.url;
        console.log("Room already exists. Joining...");
      } else {
        // If room doesn't exist, create a new one
        const createRoomResponse = await fetch("https://api.daily.co/v1/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer fee0bd1d24bc9096fcf98f7164ae164b2912101d2698a94eadecb483299dbb3f", // Replace with your Daily.co API key
             // Replace with your Daily.co API key
          },
          body: JSON.stringify({
            name: meetingName,
    
            properties: {
              enable_chat: true,
              max_participants: 20,
              enable_screenshare: true,
              enable_prejoin_ui: true,
              owner_only_broadcast: true,
              enable_network_ui: true,
              enable_noise_cancellation_ui: true,
              start_video_off: !isCameraOn, // Use user preference
              start_audio_off: !isMicOn,   // Use user preference
            },
          }),
          
        });
  
        const room = await createRoomResponse.json();
  
        if (createRoomResponse.ok && room.url) {
          console.log("Room created successfully.");
          roomUrl = room.url;
        } else {
          console.error("Failed to create room:", room);
          alert(`Error: ${room.error}`);
          return;
        }
      }
  
      // Generate a host token
      const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fee0bd1d24bc9096fcf98f7164ae164b2912101d2698a94eadecb483299dbb3f", // Replace with your Daily.co API key
          // Replace with your Daily.co API key
        },
        body: JSON.stringify({
          properties: {
            is_owner: true,
            user_name: `${userName}`, // Grant host privileges
          },
        }),
      });
  
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.token) {
        console.error("Failed to generate token:", tokenData);
        alert("Error generating host token.");
        return;
      }
  
      // Join the meeting as host
      joinDailyMeeting(roomUrl, tokenData.token, meetingId);
    } catch (error) {
      console.error("Error initializing Daily.co meeting:", error);
    }
  }
  
  function storePreviousPage() {
    // Store the previous page URL in localStorage
    localStorage.setItem("previousPage", document.referrer || "meetings.html");
  }
  
function joinDailyMeeting(roomUrl, hostToken, meetingId) {
  // Open the meeting URL with the token in a new tab
  const meetingWindow = window.open(`${roomUrl}?t=${hostToken}`, "_blank");

  if (!meetingWindow) {
    console.error("Failed to open the meeting window.");
    return;
  }

  // Monitor if the meeting window is closed
  const checkClosedInterval = setInterval(() => {
    if (meetingWindow.closed) {
      clearInterval(checkClosedInterval);
      console.log("Meeting window closed. Redirecting...");
      const meetingRef = doc(db, "meetings", meetingId);

      updateDoc(meetingRef, { meetingStatus: "not started" })
        .then(() => {
          alert("Meeting started successfully!");
          closeModal();
        })
        .catch((error) => console.error("Error starting meeting:", error));

      // Ask for confirmation to delete the meeting
      const confirmDeletion = confirm("Do you want to delete this meeting?");
      if (confirmDeletion) {
        stopMeeting(meetingId);
      }
    }
  }, 1000); // Check every second
}
  


  
 
// Remaining code from your implementation...

// Function to toggle camera state
function toggleCamera() {
  isCameraOn = !isCameraOn;
  document.querySelector(".cam-on").hidden = !isCameraOn;
  document.querySelector(".cam-off").hidden = isCameraOn;


  if (isCameraOn) {
  
    startCamera(); // Turn on the camera
  } else {
   
    stopCamera(); // Turn off the camera
  }
}

// Function to toggle mic state
// Function to toggle mic state
function toggleMic() {
    isMicOn = !isMicOn;
    document.querySelector(".mic-on").hidden = !isMicOn;
    document.querySelector(".mic-off").hidden = isMicOn;
  
    if (isMicOn) {
      startMicrophone(); // Turn on the microphone
    } else {
      stopMicrophone(); // Turn off the microphone
    }
  }
  
  // Function to start microphone
  function startMicrophone() {
    const micContainer = document.querySelector(".action-buttons"); // Optional, for displaying audio feedback
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        // Save the microphone stream globally if needed
        window.microphoneStream = stream;
        console.log("Microphone is ON");
      })
      .catch((error) => {
        console.error("Error accessing the microphone:", error);
        alert("Unable to access the microphone.");
      });
  }
  
  // Function to stop microphone
  function stopMicrophone() {
    if (window.microphoneStream) {
      const tracks = window.microphoneStream.getTracks();
      tracks.forEach((track) => track.stop()); // Stop all audio tracks
      window.microphoneStream = null;
      console.log("Microphone is OFF");
    }
  }
  

// Function to start camera

function startCamera() {
  const videoElement = document.createElement("video");
  videoElement.id = "user-camera";
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.style.width = "350px"; // Adjust as necessary for your modal
  videoElement.style.height = "175px";
  videoElement.style.borderRadius = "20px";

  const cameraContainer = document.querySelector(".camera");

  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      videoElement.srcObject = stream;
      cameraContainer.appendChild(videoElement);
      console.log("Camera is ON");
    })
    .catch((error) => {
      console.error("Error accessing the camera:", error);
      alert("Unable to access the camera.");
    });
}

// Function to stop camera
function stopCamera() {
  const videoElement = document.getElementById("user-camera");
  if (videoElement) {
    const stream = videoElement.srcObject;
    const tracks = stream.getTracks();

    // Stop all tracks to turn off the camera
    tracks.forEach((track) => track.stop());
    videoElement.remove();
    console.log("Camera is OFF");
  }
}

// Function to start the meeting
function startMeeting(meetingId) {
  const meetingRef = doc(db, "meetings", meetingId);

  updateDoc(meetingRef, { meetingStatus: "started" })
    .then(() => {
      alert("Meeting started successfully!");
      closeModal();
    })
    .catch((error) => console.error("Error starting meeting:", error));
}



// Function to close the modal
// Function to close the modal
function closeModal() {
    stopMicrophone();
    stopCamera(); // Ensure the camera is turned off
    const modalContainer = document.getElementById("modal-container");
    modalContainer.classList.add("hidden");
  }
  

 




// Function to create and display the waiting room modal
// Function to create and display the waiting room modal
function showJoinModal(meetingName, meetingStatus, meetingId) {
  const modallContainer = document.getElementById("modal-container");
  modallContainer.innerHTML = `
    <div class="participant-waiting-room">
    <span class="close-room-modal">
    <svg xmlns="http://www.w3.org/2000/svg" height="37px" viewBox="0 -960 960 960" width="37px" fill="#e8eaed"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/></svg>
    </span>
      <h1 class="meeting-name">${meetingName}</h1>
      <div class="camera">
        <span class="camera-off">
          <svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#e8eaed">
            <path d="M880-260 720-420v67l-80-80v-287H353l-80-80h367q33 0 56.5 23.5T720-720v180l160-160v440ZM822-26 26-822l56-56L878-82l-56 56ZM498-575ZM382-464ZM160-800l80 80h-80v480h480v-80l80 80q0 33-23.5 56.5T640-160H160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800Z"/>
          </svg>
        </span>
      </div>
      <div class="action-buttons">
        <button class="cam-on-off met-buts">
          <span class="cam-on" hidden>
            <svg xmlns="http://www.w3.org/2000/svg" height="27px" viewBox="0 -960 960 960" width="27px" fill="#e8eaed">
              <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h480q33 0 56.5 23.5T720-720v180l160-160v440L720-420v180q0 33-23.5 56.5T640-160H160Zm0-80h480v-480H160v480Zm0 0v-480 480Z"/>
            </svg>
          </span>
          <span class="cam-off">
            <svg xmlns="http://www.w3.org/2000/svg" height="27px" viewBox="0 -960 960 960" width="27px" fill="#e8eaed">
              <path d="M880-260 720-420v67l-80-80v-287H353l-80-80h367q33 0 56.5 23.5T720-720v180l160-160v440ZM822-26 26-822l56-56L878-82l-56 56ZM498-575ZM382-464ZM160-800l80 80h-80v480h480v-80l80 80q0 33-23.5 56.5T640-160H160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800Z"/>
            </svg>
          </span>
        </button>

        <button class="mic-on-off met-buts">
          <span class="mic-on" hidden>
            <svg xmlns="http://www.w3.org/2000/svg" height="27px" viewBox="0 -960 960 960" width="27px" fill="#e8eaed">
              <path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm0-240Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm40-360q17 0 28.5-11.5T520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480Z"/>
            </svg>
          </span>
          <span class="mic-off">
            <svg xmlns="http://www.w3.org/2000/svg" height="27px" viewBox="0 -960 960 960" width="27px" fill="#e8eaed">
              <path d="m710-362-58-58q14-23 21-48t7-52h80q0 44-13 83.5T710-362ZM480-594Zm112 112-72-72v-206q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v126l-80-80v-46q0-50 35-85t85-35q50 0 85 35t35 85v240q0 11-2.5 20t-5.5 18ZM440-120v-123q-104-14-172-93t-68-184h80q0 83 57.5 141.5T480-320q34 0 64.5-10.5T600-360l57 57q-29 23-63.5 39T520-243v123h-80Zm352 64L56-792l56-56 736 736-56 56Z"/>
            </svg>
          </span>
        </button>
      </div>

      <div class="mem-h">Members</div>

      <div class="members-list" aria-live="polite">
      
      </div>


      <div class="meeting-to-start">
        <span class="status" ${meetingStatus === "started" ? 'hidden' : ''}>Waiting For Meeting to start...</span>
        <button class="confirm-join" ${meetingStatus === "started" ? '' : 'hidden'}>Join Meeting</button>
      </div>
    </div>
  `;
  modallContainer.classList.remove("hidden");
  loadMembers(meetingId);
  modallContainer.addEventListener("click", (event) => {
    const waitingRoom = document.querySelector(".participant-waiting-room");
    if (waitingRoom && !waitingRoom.contains(event.target)) {
      closeModal();
    }
  });
  // Event Listeners
  document.querySelector(".close-room-modal").addEventListener("click", closeModal)
  document.querySelector(".cam-on-off").addEventListener("click", toggleCamera);
  document.querySelector(".mic-on-off").addEventListener("click", toggleMic);
 
    document.querySelector(".confirm-join").addEventListener("click", () => handleDailyMeeting(meetingName, meetingId));
 
}

 
    
function joinMeetingAsHost(roomUrl, hostToken) {
  // Open the meeting URL with the token in a new tab
  const meetingWindow = window.open(`${roomUrl}?t=${hostToken}`, "_blank");

if (!meetingWindow) {
  console.error("Failed to open the meeting window.");
  return;
}

// Store the previous page to allow redirection after the meeting
storePreviousPage();

// Monitor if the meeting window is closed

}

// Function to join a Daily.co meeting as a host






document.querySelector('.close').addEventListener('click', function() {
history.back(); // Navigate back to the previous page
});

// Function to create or join a Daily.co meeting
async function handleDailyMeeting(meetingName) {
  try {
    // Check if the room exists
    const existingRoomResponse = await fetch(`https://api.daily.co/v1/rooms/${meetingName}`, {
      method: "GET",
      headers: {
          Authorization: "Bearer fee0bd1d24bc9096fcf98f7164ae164b2912101d2698a94eadecb483299dbb3f", // Replace with your Daily.co API key
          // Replace with your Daily.co API key
      },
    });

    let roomUrl;
    if (existingRoomResponse.ok) {
      // Room exists, join it
      const room = await existingRoomResponse.json();
      roomUrl = room.url;
      console.log("Room already exists. Joining...");
    } else {
      // If room doesn't exist, create a new one
      const createRoomResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fee0bd1d24bc9096fcf98f7164ae164b2912101d2698a94eadecb483299dbb3f", // Replace with your Daily.co API key
           // Replace with your Daily.co API key
        },
        body: JSON.stringify({
          name: meetingName,
  
          properties: {
            enable_chat: true,
            max_participants: 20,
            enable_screenshare: true,
            enable_prejoin_ui: true,
            owner_only_broadcast: true,
            enable_network_ui: true,
            enable_noise_cancellation_ui: true,
            start_video_off: !isCameraOn, // Use user preference
            start_audio_off: !isMicOn,   // Use user preference
          },
        }),
        
      });

      const room = await createRoomResponse.json();

      if (createRoomResponse.ok && room.url) {
        console.log("Room created successfully.");
        roomUrl = room.url;
      } else {
        console.error("Failed to create room:", room);
        alert(`Error: ${room.error}`);
        return;
      }
    }

    // Generate a host token
    const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer fee0bd1d24bc9096fcf98f7164ae164b2912101d2698a94eadecb483299dbb3f", // Replace with your Daily.co API key
        // Replace with your Daily.co API key
      },
      body: JSON.stringify({
        properties: {
          is_owner: true,
          user_name: `${userName}`, // Grant host privileges
        },
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.token) {
      console.error("Failed to generate token:", tokenData);
      alert("Error generating host token.");
      return;
    }

    // Join the meeting as host
    joinMeetingAsHost(roomUrl, tokenData.token);
  } catch (error) {
    console.error("Error initializing Daily.co meeting:", error);
  }
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

