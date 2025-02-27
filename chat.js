import { db, rtdb } from './fireMessage.js';
import { collection, getDoc, doc, getDocs, setDoc, addDoc, onSnapshot,writeBatch, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { ref, set, onValue, get, remove, push, off, onChildRemoved, onChildAdded, update } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js"; // Realtime Database methods
const fileInput = document.getElementById('file-input');
const searchBar = document.querySelector('.search-bar');
const searchResults = document.getElementById('search-result');
const inboxContainer = document.querySelector('.user-messaging-list');
const chatContainer = document.querySelector('.chat-container');
const chatBox = document.querySelector('.chat-box');
const messageInput = document.querySelector('.message-input');
const sendButton = document.querySelector('.send');
const groupModal = document.getElementById("groupModal");
const openGroupModalButton = document.getElementById("openGroupModalButton");
const cancelGroupButton = document.getElementById("cancelGroupButton");
const makeGroupButton = document.getElementById("makeGroupButton");
const groupNameInput = document.getElementById("groupNameInput");
const groupSearchInput = document.getElementById("group-search-input");
const groupSearchResults = document.getElementById("group-search-results");
const selectedUsersContainer = document.getElementById("selected-users");
const searchResultsContainer = document.querySelector(".search-result-container")

let currentUserId;
let currentChatUserId; // To keep track of the selected chat user
let isInboxLoaded = false; // Flag to track inbox loading
const auth = getAuth();


// Set chatbox and search results to be hidden by default
document.addEventListener('DOMContentLoaded', () => {
    chatContainer.style.display = 'none'; 
    messageInput.style.display = 'block'; // Ensure the input field is visible by default
    searchResults.style.display = 'none';
    searchResults.style.maxHeight = '0';
    searchResults.style.opacity = '0';
    searchResults.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
});
document.addEventListener('DOMContentLoaded', async () => {
    
    const savedChatUserId = localStorage.getItem('currentChatUserId');
    if (savedChatUserId) {
        const userName = await getUserNameFromId(savedChatUserId);
        openChat(savedChatUserId, userName);
    }

    // Initialize other app logic
    if (!isInboxLoaded) await initializeApp();
});

// Check for initialUserId in session storage
let initialUserId = localStorage.getItem('initialUserId'); // Retrieve from local storage

// On page load, check if there's a stored chat user ID
document.addEventListener('DOMContentLoaded', async () => {
    if (!isInboxLoaded) await initializeApp();
});

 document.addEventListener("DOMContentLoaded", async () => {
    // Show the loader when the page loads
    document.querySelector(".loader-overlay").style.display = "block";
  });


async function initializeApp() {
    if (!isInboxLoaded) {
        await fetchAllUsers(); // Fetch user data
        await loadInbox();     // Load inbox data (populates groupDataArray)

      
        isInboxLoaded = true;
    }
}


// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        if (!initialUserId) {
            initialUserId = user.uid;
            sessionStorage.setItem('initialUserId', initialUserId);
            currentUserId = initialUserId;
            console.log('Signed in, currentUserId:', currentUserId);
        } else if (initialUserId !== user.uid) {
         
            window.location.href = 'index.html';
        }
    } else {
        console.log("No user is signed in.");
        window.location.href = 'index.html';
    }
});

function setupMessageListener(userId, otherUserId) {
    if (currentChatUserId === userId) return; // Avoid reinitializing for the same user

    // Unsubscribe from previous listeners if switching chats
    if (currentChatUserId) {
        const oldMessagesRef = ref(rtdb, `users/${currentUserId}/inbox/${currentChatUserId}/messages`);
        const oldOtherMessagesRef = ref(rtdb, `users/${currentChatUserId}/inbox/${currentUserId}/messages`);
        off(oldMessagesRef);
        off(oldOtherMessagesRef);
    }

    currentChatUserId = userId; // Update current chat user ID
    localStorage.setItem('currentChatUserId', currentChatUserId);

    console.log('Listening for messages with:', otherUserId);

    // References for incoming and outgoing messages
    const messagesRef = ref(rtdb, `users/${currentUserId}/inbox/${otherUserId}/messages`);
    const otherMessagesRef = ref(rtdb, `users/${otherUserId}/inbox/${currentUserId}/messages`);

    // Attach listeners for incoming messages
    onValue(messagesRef, (snapshot) => {
        const messages = snapshot.val();
        if (messages && currentChatUserId === otherUserId) {
            displayMessages(messages);
        }
    });

    onValue(otherMessagesRef, (snapshot) => {
        const messages = snapshot.val();
        if (messages && currentChatUserId === otherUserId) {
            const filteredMessages = Object.entries(messages)
                .filter(([key, value]) => !value.deleted) // Exclude deleted messages
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

            displayMessages(filteredMessages);
        }
    });

    // Listen for message deletions
    onChildRemoved(messagesRef, handleMessageDeletion);
    onChildRemoved(otherMessagesRef, handleMessageDeletion);

    groupDataArray.forEach((group) => {
        const groupRef = ref(rtdb, `groups/${group.id}/lastMessageTime`);
    
        onValue(groupRef, (snapshot) => {
            group.lastMessageTime = snapshot.exists() ? snapshot.val() : 0;
    
            // Dynamically reload inbox when group timestamps change
            reloadInbox(usersData, groupDataArray);
        });
    });
    
}

// Helper function to display messages
function displayMessages(messages) {
    chatContainer.innerHTML = ''; // Clear previous messages
    Object.entries(messages).forEach(([key, message]) => {
        const messageElement = createMessageElement(message); // Assume this function creates a DOM element for a message
        chatContainer.appendChild(messageElement);
    });
}
// Helper function to handle message deletion
function handleMessageDeletion(snapshot) {
    const messageElement = document.getElementById(snapshot.key);
    if (messageElement) {
        messageElement.remove();
    }
}


async function saveUserToInbox(userId, userName) {
    try {
        const inboxRefCurrentUser = doc(db, `users/${currentUserId}/inbox/${userId}`);
        const inboxRefOtherUser = doc(db, `users/${userId}/inbox/${currentUserId}`);

        // Check if the user is already in the current user's inbox to avoid duplication
        const inboxDocCurrentUser = await getDoc(inboxRefCurrentUser);
        if (!inboxDocCurrentUser.exists()) {
            await setDoc(inboxRefCurrentUser, { id: userId, name: userName, lastMessageTime:Date.now() });
         
            displayInboxUser(userId, userName); // Display the user in the inbox immediately
        }

        // Check if the current user is already in the other user's inbox to avoid duplication
        const inboxDocOtherUser = await getDoc(inboxRefOtherUser);
        if (!inboxDocOtherUser.exists()) {
            const currentUserData = await getUserNameFromId(currentUserId); // Assuming you have this function
            await setDoc(inboxRefOtherUser, { id: currentUserId, name: currentUserData, lastMessageTime:Date.now() });
            console.log("Current user added to other user's inbox successfully.");
        }
    } catch (error) {
        console.error("Error adding users to inbox:", error);
    }
}



async function loadInbox() {
    if (isInboxLoaded) return;

    inboxContainer.innerHTML = ''; // Clear inbox container
    console.log("Loading inbox for user:", currentUserId);

    try {
        const usersData = [];
        const groupDataArray = [];

        // Fetch user data from Firestore
        const inboxRef = collection(db, `users/${currentUserId}/inbox`);
        const inboxSnapshot = await getDocs(inboxRef);

        if (!inboxSnapshot.empty) {
            inboxSnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData) {
                    usersData.push({
                        id: userData.id,
                        name: userData.name,
                        lastMessageTime: 0, // Initialize lastMessageTime
                    });
                }
            });

            // Set up real-time listeners for user lastMessageTime
            usersData.forEach((userData) => {
                const lastMessageRef = ref(rtdb, `users/${currentUserId}/inbox/${userData.id}/lastMessageTime`);

                onValue(lastMessageRef, (snapshot) => {
                    const updatedTimestamp = snapshot.exists() ? snapshot.val() : 0;

                    // Update lastMessageTime for the user
                    const userIndex = usersData.findIndex(user => user.id === userData.id);
                    if (userIndex !== -1) {
                        usersData[userIndex].lastMessageTime = updatedTimestamp;

                        // Sort usersData by lastMessageTime in descending order
                        usersData.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

                        // Reload inbox with updated data
                        reloadInbox(usersData, groupDataArray);
                    }
                });
            });
        }

        // Fetch group data from Firestore
        const groupsRef = collection(db, 'groups');
        const groupsSnapshot = await getDocs(groupsRef);

        if (!groupsSnapshot.empty) {
            for (const groupDoc of groupsSnapshot.docs) {
                const groupData = groupDoc.data();

                if (groupData.members.includes(currentUserId)) {
                    groupDataArray.push({
                        id: groupDoc.id,
                        name: groupData.name,
                        lastMessageTime: groupData.timeStamp || 0,
                        members: groupData.members,
                    });

                    // Set up listener for group's lastMessageTime
                    const groupRef = ref(rtdb, `users/${currentUserId}/inbox/${groupDoc.id}/lastMessageTime`);
                    onValue(groupRef, (snapshot) => {
                        const updatedTimestamp = snapshot.exists() ? snapshot.val() : 0;
                        const groupIndex = groupDataArray.findIndex(group => group.id === groupDoc.id);
                        if (groupIndex !== -1) {
                            groupDataArray[groupIndex].lastMessageTime = updatedTimestamp;

                            // Sort groupDataArray by lastMessageTime
                            groupDataArray.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

                            // Reload inbox when group lastMessageTime changes
                            reloadInbox(usersData, groupDataArray);
                        }
                    });
                }
            }
        }

        // Reload inbox to include updated users and groups and sort them
        reloadInbox(usersData, groupDataArray);

        // Hide or show chat container based on data
        if (usersData.length === 0 && groupDataArray.length === 0) {
            chatContainer.style.display = 'none';
        } else {
            chatContainer.style.display = 'block';
        }
        
    } catch (error) {
        console.error("Error loading inbox:", error);
    }

    isInboxLoaded = true;
}




// Helper function to reload the inbox with users and groups
// Helper function to reload the inbox with users and groups
function reloadInbox(usersData, groupDataArray) {
    // Clear the inbox container
    inboxContainer.innerHTML = '';

    // Combine users and groups
    const combinedData = [...usersData, ...groupDataArray];

    // Deduplicate combined data based on IDs (users and groups)
    const uniqueCombinedData = Array.from(new Map(combinedData.map(item => [item.id, item])).values());

    // Sort by lastMessageTime (users first, then groups)
    const sortedData = uniqueCombinedData.sort((a, b) => {
        // Sort by lastMessageTime
        return (b.lastMessageTime || 0) - (a.lastMessageTime || 0);
    });

    // Display sorted inbox
    sortedData.forEach((item) => {
        const exists = document.querySelector(`[data-group-id="${item.id}"]`) ||
            document.querySelector(`[data-user-id="${item.id}"]`);
        if (!exists) {
            if (item.members) {
                displayInboxGroup(item.id, item.name); // Group
            } else {
                displayInboxUser(item.id, item.name); // User
            }
        }
    });
}


document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector(".sidebar");
    const chat = document.querySelector(".chat");
    const nothing = document.querySelector(".nothing");
    const userMessagingList = document.querySelector(".user-messaging-list");
    const goBackButton = document.querySelector(".go-back-inbox");
    const mediaQuery = window.matchMedia("(max-width: 700px)");

    // Function to toggle sidebar and chat visibility
    const handleUserClick = () => {
        if (mediaQuery.matches) {
            sidebar.style.display = "none"; // Hide sidebar
            chat.style.display = "block"; // Show chat
            if (nothing) {
                nothing.style.display = "none"; // Hide 'nothing' message
            }
            if (goBackButton) {
                goBackButton.style.display = "block"; // Show "Go Back" button
            }
        }
    };

    // Function to go back to the inbox
    const handleGoBackClick = () => {
        if (mediaQuery.matches) {
            sidebar.style.display = "block"; // Show sidebar
            chat.style.display = "none"; // Hide chat
            if (nothing) {
                nothing.style.display = "block"; // Show 'nothing' message
            }
           
        }
    };

    // Attach event listeners
    if (userMessagingList) {
        userMessagingList.addEventListener("click", handleUserClick);
    }
    if (goBackButton) {
        goBackButton.addEventListener("click", handleGoBackClick);
    }

    // Reset styles when resizing to larger screens
    mediaQuery.addEventListener("change", (e) => {
        if (!e.matches) {
            sidebar.style.display = ""; // Reset sidebar display
            chat.style.display = ""; // Reset chat display
            if (nothing) {
                nothing.style.display = ""; // Reset 'nothing' message display
            }
            if (goBackButton) {
                goBackButton.style.display = "none"; // Always hide "Go Back" button on larger screens
            }
        }
    });
});








// Function to display a group in the inbox
function displayInboxGroup(groupId, groupName) {
    if (document.querySelector(`[data-group-id="${groupId}"]`)) return;

    const inboxItem = document.createElement('div');
    inboxItem.classList.add('user-inbox', 'userrr-inbox');
    inboxItem.dataset.groupId = groupId;

    inboxItem.innerHTML = `
        <div class="group-pic">
            <svg xmlns="http://www.w3.org/2000/svg" height="27px" viewBox="0 -960 960 960" width="27px" fill="#e8eaed">
                <path d="M411-480q-28 0-46-21t-13-49l12-72q8-43 40.5-70.5T480-720q44 0 76.5 27.5T597-622l12 72q5 28-13 49t-46 21H411Zm24-80h91l-8-49q-2-14-13-22.5t-25-8.5q-14 0-24.5 8.5T443-609l-8 49ZM124-441q-23 1-39.5-9T63-481q-2-9-1-18t5-17q0 1-1-4-2-2-10-24-2-12 3-23t13-19l2-2q2-19 15.5-32t33.5-13q3 0 19 4l3-1q5-5 13-7.5t17-2.5q11 0 19.5 3.5T208-626q1 0 1.5.5t1.5.5q14 1 24.5 8.5T251-596q2 7 1.5 13.5T250-570q0 1 1 4 7 7 11 15.5t4 17.5q0 4-6 21-1 2 0 4l2 16q0 21-17.5 36T202-441h-78Zm676 1q-33 0-56.5-23.5T720-520q0-12 3.5-22.5T733-563l-28-25q-10-8-3.5-20t18.5-12h80q33 0 56.5 23.5T880-540v20q0 33-23.5 56.5T800-440ZM0-240v-63q0-44 44.5-70.5T160-400q13 0 25 .5t23 2.5q-14 20-21 43t-7 49v65H0Zm240 0v-65q0-65 66.5-105T480-450q108 0 174 40t66 105v65H240Zm560-160q72 0 116 26.5t44 70.5v63H780v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5Zm-320 30q-57 0-102 15t-53 35h311q-9-20-53.5-35T480-370Zm0 50Zm1-280Z"/>
            </svg>
        </div>
        <div class="text-profile">
            <h1 class="name">${groupName}</h1>
        </div>
        <div class="down-line"></div>
        <span class="unread-counter"></span>
    `;

    inboxContainer.appendChild(inboxItem);

    const unreadCounter = inboxItem.querySelector('.unread-counter');
    const unreadMessagesRef = ref(rtdb, `users/${userId}/inbox/${groupId}/messages`);

    // Track unread messages and update the counter
    onValue(unreadMessagesRef, (snapshot) => {
        let unreadCount = 0;

        snapshot.forEach((messageSnapshot) => {
            const messageData = messageSnapshot.val();
            if (!messageData.read) unreadCount++; // Count only unread messages
        });

        if (unreadCount > 0) {
            unreadCounter.textContent = unreadCount > 0 ? '' : unreadCount;
            unreadCounter.classList.add('show'); // Show counter
        } else {
            unreadCounter.classList.remove('show'); // Hide counter
        }
    });

    inboxItem.addEventListener('click', () => {
        openChat(groupId, groupName, true); // true indicates this is a group chat
        markMessagesAsRead(groupId);
    });
}


const profilePicCache = {};
function displayInboxUser(userId, userName) {
    const inboxItem = document.createElement('div');
    inboxItem.classList.add('user-inbox', 'userrr-inbox');
    inboxItem.dataset.userId = userId;

    // Set up HTML with placeholder profile picture
    inboxItem.innerHTML = `
        <div class="profile-pic">
            <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
        </div>
        <div class="text-profile">
            <h1 class="name">${userName}</h1>
        </div>
        <span class="delete-span" style="font-size: 2em; color:white; position:absolute; right:10px;">&times;</span>
        <div class="down-line"></div>
        <span class="unread-counter"></span> <!-- Unread counter -->
    `;

    // Append the item to the inbox container
    inboxContainer.appendChild(inboxItem);

    // Fetch profile picture from Firestore
    const userDocRef = doc(db, `users/${userId}`); // Firestore document reference
   
    onSnapshot(userDocRef, async (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            const updatedUserName = userData.name || 'Unknown User';
    
            // Update the name in the inbox
            inboxItem.querySelector('.name').textContent = updatedUserName;
        } else {
            // ✅ Check if inboxItem exists in inboxContainer before removing
            if (inboxContainer.contains(inboxItem)) {
                inboxContainer.removeChild(inboxItem);
                console.log(`User ${userId} removed from inbox (user not found in Firestore).`);
    
                // 🔥 Delete user from Firebase database (inbox messages and user data)
                try {
                    const batch = writeBatch(db);
    
                    // Remove from current user's inbox
                    const inboxUserDoc = doc(db, `users/${currentUserId}/inbox/${userId}`);
                    batch.delete(inboxUserDoc);
    
                    // Delete all messages between users
                    const messagesRef = collection(db, `users/${currentUserId}/inbox/${userId}/messages`);
                    const messagesSnapshot = await getDocs(messagesRef);
                    messagesSnapshot.forEach((msgDoc) => batch.delete(msgDoc.ref));
    
                    await batch.commit();
                    console.log(`User ${userId} and all messages deleted from Firebase.`);
                } catch (error) {
                    console.error("Error deleting user or messages from Firebase:", error);
                }
            } else {
                console.warn(`User ${userId} already removed from inbox.`);
            }
        }
    });
    
    

    if (profilePicCache[userId]) {
        inboxItem.querySelector('.profile-picture').src = profilePicCache[userId];
    } else {
        const userDocRef = doc(db, `users/${userId}`);

        // Fetch initial data using getDoc
        getDoc(userDocRef).then((docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                const profilePicUrl = userData.profilePicture || 'user_profile_-removebg-preview.png'; // Default image if no profile pic
            
                // Cache and set the profile picture
                profilePicCache[userId] = profilePicUrl;
                inboxItem.querySelector('.profile-picture').src = profilePicUrl;

                // Set the user name (if available)
             
            }
        }).catch(console.error);
    

     
        // Listen for real-time updates using onSnapshot
      
         
    }

    const unreadCounter = inboxItem.querySelector('.unread-counter');
    const unreadMessagesRef = ref(rtdb, `users/${userId}/inbox/${currentUserId}/messages`);

    // Track unread messages and update the counter
    onValue(unreadMessagesRef, (snapshot) => {
        let unreadCount = 0;

        snapshot.forEach((messageSnapshot) => {
            const messageData = messageSnapshot.val();
            if (!messageData.read) unreadCount++; // Count only unread messages
        });

        if (unreadCount > 0) {
            unreadCounter.textContent = unreadCount > 0 ? '' : unreadCount;
            unreadCounter.classList.add('show'); // Show counter
        } else {
            unreadCounter.classList.remove('show'); // Hide counter
        }
    });

    // Open chat and mark messages as read when the inbox item is clicked
    let chatOpenedByUser = false; // Flag to track if the user manually opened the chat

    inboxItem.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-span')) { // Ignore delete button click
            if (!chatOpenedByUser || currentChatUserId !== userId) {
                openChat(userId, userName);
                chatOpenedByUser = true;
                markMessagesAsRead(userId);
                
            }
        }
    });

    // Restore chat state from localStorage
    let storedChatUserId = localStorage.getItem('currentChatUserId');
    if (storedChatUserId) {
        currentChatUserId = storedChatUserId;
        openChat(currentChatUserId, userName);
    }

    // Delete user from inbox when delete span is clicked
    inboxItem.querySelector('.delete-span').addEventListener('click', async () => {
        const confirmation = confirm(`Are you sure you want to delete the conversation with ${userName}?`);
        if (confirmation) {
            try {
                const batch = writeBatch(db); // Start batch for deleting all messages and user

                const inboxUserDoc = doc(db, `users/${currentUserId}/inbox/${userId}`);
                batch.delete(inboxUserDoc);

                const messagesRef = collection(db, `users/${currentUserId}/inbox/${userId}/messages`);
                const messagesSnapshot = await getDocs(messagesRef);

                messagesSnapshot.forEach((msgDoc) => {
                    batch.delete(msgDoc.ref);
                });

                await batch.commit(); // Commit batch deletion
                inboxContainer.removeChild(inboxItem);
                console.log("User and all messages deleted from inbox successfully.");
            } catch (error) {
                console.error("Error deleting user or messages from inbox:", error);
            }
        }
    });

    inboxContainer.appendChild(inboxItem);
}




async function markMessagesAsRead(chatUserId) {
    try {
        const messagesRef = ref(rtdb, `users/${chatUserId}/inbox/${currentUserId}/messages`);
        const snapshot = await get(messagesRef);

        if (snapshot.exists()) {
            const messages = snapshot.val();
            Object.keys(messages).forEach((messageId) => {
                const messageRef = ref(rtdb, `users/${chatUserId}/inbox/${currentUserId}/messages/${messageId}`);
                if (!messages[messageId].read) {
                    update(messageRef, { read: true });
                }
            });
            console.log(`Marked messages as read for chatUserId: ${chatUserId}`);
        }
    } catch (error) {
        console.error(`Error marking messages as read for chatUserId: ${chatUserId}`, error);
    }
}
        
 


// Function to count unread messages for the current user
async function countUnreadMessages(userId) {
    const messagesRef = ref(rtdb, `users/${currentUserId}/inbox/${userId}/messages`);
    let unreadCount = 0;

    // Retrieve all messages
    const snapshot = await get(messagesRef);
    const messages = snapshot.val();

    // Count unread messages
    if (messages) {
        Object.values(messages).forEach((message) => {
            if (!message.read) {
                unreadCount++;
            }
        });
    }

    return unreadCount > 4 ? "+" : unreadCount;
}

// Function to open the chat and mark unread messages as read for the receiver
let activeChatUserId = null; // Tracks the active chat
function highlightActiveChat(userId) {
    document.querySelectorAll('.user-inbox').forEach((item) => {
        if (item.dataset.userId === userId) {
            item.classList.add('active-chat'); // Add active class
        } else {
            item.classList.remove('active-chat'); // Remove active class
        }
    });
}


// Function to hide chat settings modal if no chat is active
function hideChatSettingsIfNoChat() {
    if (!currentChatUserId) {
        chatSettingsModal.style.display = 'none';  // Hide chat settings modal if no chat is active
    } else {
        chatSettingsModal.style.display = 'block';  // Show chat settings modal if a chat is active
    }
}


async function openChat(userId, userName) {
    if (activeChatUserId === userId) return; // Avoid redundant reinitialization for the same user

    // Clean up existing listeners for the previous chat
    if (activeChatUserId) {
        off(ref(rtdb, `users/${currentUserId}/inbox/${activeChatUserId}/messages`));
        off(ref(rtdb, `users/${activeChatUserId}/inbox/${currentUserId}/messages`));
    }

    activeChatUserId = userId; // Set the new active chat user
    currentChatUserId = userId; // Update the current chat user ID
    localStorage.setItem('currentChatUserId', userId); // Persist to localStorage
    fetchUserProfile(userId);
    fetchProfile(userId);

    chatContainer.style.display = 'block'; // Show the chat modal
    chatBox.innerHTML = ''; // Clear previous messages
    messageInput.style.display = 'block'; // Display the message input

    let userMessages = [];
    let otherMessages = [];

    try {
        // Fetch existing messages immediately
        const userMessagesSnapshot = await get(ref(rtdb, `users/${currentUserId}/inbox/${userId}/messages`));
        const otherMessagesSnapshot = await get(ref(rtdb, `users/${userId}/inbox/${currentUserId}/messages`));

        userMessages = Object.entries(userMessagesSnapshot.val() || {}).map(([id, data]) => ({ ...data, id }));
        otherMessages = Object.entries(otherMessagesSnapshot.val() || {}).map(([id, data]) => ({ ...data, id }));

        // Combine and display messages immediately
        displaySortedMessages(userMessages, otherMessages);
    } catch (error) {
        console.error("Error fetching messages:", error);
    }

    // Set up real-time listeners for updates
    const messagesRef = ref(rtdb, `users/${currentUserId}/inbox/${userId}/messages`);
    const otherMessagesRef = ref(rtdb, `users/${userId}/inbox/${currentUserId}/messages`);

    onValue(messagesRef, (snapshot) => {
        const messages = snapshot.val() || {};
        userMessages = Object.entries(messages).map(([id, data]) => ({ ...data, id }));

        // Mark unread messages as read
        Object.entries(messages).forEach(([id, msg]) => {
            if (!msg.read && msg.senderId !== currentUserId) {
                update(ref(rtdb, `users/${currentUserId}/inbox/${userId}/messages/${id}`), { read: true });
            }
        });

        displaySortedMessages(userMessages, otherMessages);
    });

    onValue(otherMessagesRef, (snapshot) => {
        const messages = snapshot.val() || {};
        otherMessages = Object.entries(messages).map(([id, data]) => ({ ...data, id }));

        displaySortedMessages(userMessages, otherMessages);
    });

    // Scroll to the bottom after a short delay to ensure messages are rendered
    setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 100); // Adjust the delay as needed
}

function displaySortedMessages(userMessages, otherMessages) {
    // Use a Map to store unique messages by their ID (avoiding duplicates)
    const messageMap = new Map();

    // Combine user and other user messages into the Map
    [...userMessages, ...otherMessages].forEach((msg) => {
        messageMap.set(msg.id, msg); // msg.id should be unique for each message
    });

    // Convert Map to an array and sort messages by timestamp
    const combinedMessages = Array.from(messageMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Clear the chat box before displaying messages
    chatBox.innerHTML = '';

    // Render each message
    combinedMessages.forEach((messageData) => {
        const isMyMessage = messageData.senderId === currentUserId; // Check if the message is from the current user
        displayMessage(messageData, isMyMessage); // Function to display a single message
    });

    // Scroll to the bottom to show the latest message
    chatBox.scrollTop = chatBox.scrollHeight;
}



onValue(ref(rtdb, `users/${currentUserId}/inbox`), (snapshot) => {
    const inbox = snapshot.val();
    if (!inbox) return;

    // Check if the incoming message is for the active chat
    const incomingMessageUserId = Object.keys(inbox).find((userId) => {
        const messages = inbox[userId]?.messages;
        return messages && Object.values(messages).some((msg) => !msg.read && msg.senderId !== currentUserId);
    });

    if (incomingMessageUserId && incomingMessageUserId === activeChatUserId) {
        // Handle the active chat user message
        const userName = inbox[incomingMessageUserId].name; // Or fetch from your database
        openChat(incomingMessageUserId, userName);
    }
});


// Helper function to display messages from both users in sorted order







document.addEventListener('DOMContentLoaded', async () => {
    // Retrieve the active chat user ID from localStorage
    const activeChatUserId = localStorage.getItem('currentChatUserId');

    // If there's an active chat, reopen it
    if (activeChatUserId) {
        currentChatUserId = activeChatUserId;
        const userName = await getUserNameFromId(currentChatUserId); // You can retrieve the username from Firestore or another source
        openChat(currentChatUserId, userName); // Reopen the chat with the saved user
    }

    if (!isInboxLoaded) await initializeApp();
});

async function getUserNameFromId(userId) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data().name : 'Unknown User';
}


// Function to handle message display with synchronization

 



async function saveMessageToDatabase(messageData) {
    try {
        console.log("Saving message to database", messageData);
        const messagesRef = ref(rtdb, `users/${currentUserId}/inbox/${currentChatUserId}/messages`);
        const newMessageRef = push(messagesRef); // Create a new message reference
        const storageRef = ref(storage, `UPLD/${currentUserId}`);

        console.log("newMessageRef:", newMessageRef);
        await set(newMessageRef, {
            ...messageData,
            senderId: currentUserId, // Ensure senderId is being saved
            timestamp: Date.now(),
            read: false,
            isMyMessage: messageData.isMyMessage, // Include additional flags
        });
        

        console.log('Message with file saved to database');
    } catch (error) {
        console.error("Error saving message:", error);
    }
}


async function sendMessage() {
    const messageText = messageInput.value.trim(); // Get the trimmed input text
    const file = fileInput.files[0]; // Check if a file is uploaded

    // Prevent sending an empty message or file
    if (messageText === '' && !file) return;

    // Check if the current user or chat selection is valid
    if (initialUserId !== currentUserId || !currentChatUserId) {
        console.warn("Invalid user or chat selection.");
        return;
    }

    // Clear input fields after processing the message
    messageInput.value = '';
    fileInput.value = '';

    try {
        // Base message data
        let messageData = { 
            senderId: currentUserId, 
            timestamp: Date.now(),
            read: false,
        };

        // Process file upload if a file is attached
        if (file) {
            // Sanitize the file name
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

            // Define the path for the file in the "message-file" folder with user-specific structure
            const filePath = `message-file/${currentUserId}/${currentChatUserId}/${sanitizedFileName}`;

            // Upload the file to Firebase Storage
            const storageReference = storageRef(storage, filePath);
            const uploadResult = await uploadBytes(storageReference, file);
            console.log("File uploaded successfully:", uploadResult);

            // Get the download URL
            const downloadURL = await getDownloadURL(storageReference);
            console.log("Download URL (logged before message is sent):", downloadURL);

            const timestamp = Date.now(); // Prepare file message data
            messageData = {
                senderId: currentUserId,
                type: 'file',
                name: sanitizedFileName,
                size: file.size,
                timestamp: timestamp,
                fileUrl: downloadURL, // Add the download URL here
            };

        } else {
            // Process a text message
            messageData = {
                ...messageData,
                type: 'text',
                text: messageText,
            };
        }

        // Generate a unique message ID using Firebase push
        const messageId = push(ref(rtdb, 'messages')).key;
        messageData = { ...messageData, messageId }; // Add messageId to the message data

        // Add a unique message delete ID for future deletion
        messageData.messageDeleteId = messageId;

        // Determine if this is a group chat
        if (isGroup(currentChatUserId)) {
            const groupRef = doc(db, 'groups', currentChatUserId);
            const groupDoc = await getDoc(groupRef);
        
            if (!groupDoc.exists()) {
                console.error("Group not found with ID:", currentChatUserId);
                return;
            }
        
            const groupData = groupDoc.data();
            const groupMembers = groupData?.members || []; // Default to empty array if members are undefined
        
            if (!Array.isArray(groupMembers) || groupMembers.length === 0) {
                console.error("Invalid or empty group members list.");
                return;
            }
        
            const messageId = push(ref(rtdb, 'messages')).key; // Generate unique message ID
            const timestamp = Date.now();
            const messageWithId = { ...messageData, messageDeleteId: messageId, timestamp };
        
            try {
                // Send message to all group members
                await Promise.all(
                    groupMembers.map(async (memberId) => {
                        const memberMessagesRef = ref(rtdb, `users/${memberId}/inbox/${currentChatUserId}/messages/${messageId}`);
                        await set(memberMessagesRef, { ...messageWithId, read: memberId === currentUserId });
                    })
                );
                console.log("Message sent to all group members.");
        
                // Update last message time for each group member's inbox
                await Promise.all(
                    groupMembers.map(async (memberId) => {
                        const memberInboxRef = ref(rtdb, `users/${memberId}/inbox/${currentChatUserId}`);
                        await update(memberInboxRef, { lastMessageTime: timestamp });
                    })
                );
                console.log("Last message timestamps updated for all group members.");
        
                // Update the sender's inbox
                const senderInboxRef = ref(rtdb, `users/${currentUserId}/inbox/${currentChatUserId}`);
                await update(senderInboxRef, { lastMessageTime: timestamp });
                console.log("Last message timestamp updated for the sender.");
        
            } catch (error) {
                console.error("Error updating timestamps for group chat:", error);
            }
        }
         else {
            // Handle one-on-one chat
            const senderMessageRef = ref(rtdb, `users/${currentUserId}/inbox/${currentChatUserId}/messages/${messageId}`);
            const receiverMessageRef = ref(rtdb, `users/${currentChatUserId}/inbox/${currentUserId}/messages/${messageId}`);
        
            // Mark the message as read for the sender
            await set(senderMessageRef, { ...messageData, isMyMessage: true, read: false });
        
            // Mark the message as unread for the receiver
            await set(receiverMessageRef, { ...messageData, isMyMessage: false, read: true });
        
            const senderInboxRef = ref(rtdb, `users/${currentUserId}/inbox/${currentChatUserId}`);
            const receiverInboxRef = ref(rtdb, `users/${currentChatUserId}/inbox/${currentUserId}`);
            const timestamp = Date.now();
        
            try {
                console.log("Updating sender inbox timestamp at:", senderInboxRef.toString());
                await update(senderInboxRef, { lastMessageTime: timestamp });
            } catch (error) {
                console.error("Failed to update sender inbox timestamp:", error);
            }
        
            try {
                console.log("Updating receiver inbox timestamp at:", receiverInboxRef.toString());
                await update(receiverInboxRef, { lastMessageTime: timestamp });
            } catch (error) {
                console.error("Failed to update receiver inbox timestamp:", error);
            }
            
        }

        console.log("Message sent successfully:", messageData);

    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send the message. Please try again.");
    }
}





// Utility function to check if an ID corresponds to a group
function isGroup(id) {
    // Adjust this logic based on your group ID structure
    return id && id.length > 50; // Example: Group IDs are longer than 50 characters
}
function displayMessage(messageData, isMyMessage) {
    const messageElement = document.createElement('div');
    messageElement.classList.add(isMyMessage ? 'my-message' : 'their-message');
    messageElement.id = messageData.id; // Set the unique ID to match the Firebase message ID
   
    const userId = messageData.senderId;
 
   
    // Check if this message has already been displayed in the chat box
    if (document.getElementById(messageData.id)) {
        return;  // Prevent adding the same message again
    }
    // Conditionally add the profile picture only for `their-message`
    if (!isMyMessage) {
        const profileElement = document.createElement('div');
        profileElement.classList.add('their-message-profile');
    
        // Set up HTML with placeholder profile picture
        profileElement.innerHTML = `
            <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
        `;
      
      
        // Fetch profile picture from Firestore for the sender
    // Fetch profile picture from Firestore for the sender


if (!userId) {
    console.warn("senderId is undefined for message:", messageData);
    console.log(userId);
    return; // Skip rendering if senderId is invalid
}

const userDocRef = doc(db, `users/${userId}`);
getDoc(userDocRef)
    .then((docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            const profilePicUrl = userData.profilePicture || 'user_profile_-removebg-preview.png';

            const profilePictureElement = profileElement.querySelector('.profile-picture');
            if (profilePictureElement) {
                profilePictureElement.src = profilePicUrl; // Dynamically update the profile picture
                messageElement.appendChild(profileElement);
            }
        } else {
            console.warn(`No document found for user ID: ${userId}`);
        }
    })
    .catch((error) => {
        console.error(`Error fetching profile picture for user ID: ${userId}`, error);
    });

    

    }
    
    // Add delete button for your messages and copy button for both your and their messages
    messageElement.innerHTML += `
        ${isMyMessage ? `
        <span class='delete-my-message' aria-label="Delete message">
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="white">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
            </svg>
        </span>
        ` : ''}
        <span class='copy-message' aria-label="Copy message">
            <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="white">
                <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/>
            </svg>
        </span>
    `;

    // If message is a file, create file-specific message and return (stop regular message rendering)
    if (messageData.type === 'file') {
        const fileBlob = new Blob([messageData.fileContent]); // Ensure fileContent is retrieved correctly
        const fileElement = createMessageElement({
            type: 'file',
            name: messageData.name,
            size: messageData.size,
            senderId: messageData.senderId,
            file: fileBlob,
            fileUrl: messageData.fileUrl,
            messageId: messageData.id,
        });
    
        fileElement.classList.add(isMyMessage ? 'my-message' : 'their-message');
    
        // Set the message ID as a data attribute to access later when deleting
        fileElement.setAttribute('data-message-id', messageData.id);
    
        chatBox.appendChild(fileElement);
        return; // Exit early to avoid adding any additional message text
    }
    
    // If it's a text message, continue with normal rendering
    messageElement.innerHTML += `<p>${messageData.text}</p>`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the latest message


    // Check the timestamp of the message and hide the delete button after 5 hours
    const messageTimestamp = messageData.timestamp; // Assuming messageData contains a timestamp
    const currentTime = Date.now();
    const timeDifference = currentTime - messageTimestamp;

    if (timeDifference > 5 * 60 * 60 * 1000) {  // 5 hours in milliseconds
        const deleteButton = messageElement.querySelector('.delete-my-message');
        if (deleteButton) {
            deleteButton.remove(); // Remove the delete button element entirely if 5 hours have passed
        }
    }

    // Show delete button on hover and hide it after 5 seconds, if it's your message
    if (isMyMessage) {
        const deleteButton = messageElement.querySelector('.delete-my-message');
        if (deleteButton) {
            messageElement.addEventListener('mouseenter', () => {
                deleteButton.style.display = 'inline'; // Show delete button on hover
                setTimeout(() => {
                    deleteButton.style.display = 'none'; // Hide delete button after 5 seconds
                }, 5000);
            });

            deleteButton.addEventListener('click', async () => {
                try {
                    if (isGroup(currentChatUserId)) {
                        const groupRef = doc(db, 'groups', currentChatUserId);
                        const groupDoc = await getDoc(groupRef);
            
                        if (!groupDoc.exists()) {
                            console.error("Group not found with ID:", currentChatUserId);
                            return;
                        }
            
                        const groupData = groupDoc.data();
                        const groupMembers = groupData.members;
            
                        console.log("Group Members:", groupMembers);
                        if (!groupMembers || groupMembers.length === 0) {
                            console.error("No members found in the group.");
                            return;
                        }
            
                        const messageRef = ref(rtdb, `users/${currentUserId}/inbox/${currentChatUserId}/messages`);
                        const snapshot = await get(messageRef);
                        const messages = snapshot.val();
            
                        if (!messages) {
                            console.error("No messages found in the inbox.");
                            return;
                        }
            
                        const messageToDelete = Object.values(messages).find(
                            msg => msg.messageDeleteId === messageData.messageDeleteId
                        );
            
                        if (!messageToDelete) {
                            console.error("Message not found in the inbox.");
                            return;
                        }
            
                        const messageDeleteId = messageToDelete.messageDeleteId;
                        console.log("Deleting messages with messageDeleteId:", messageDeleteId);
            
                        for (const memberId of groupMembers) {
                            try {
                                const memberMessagesRef = ref(rtdb, `users/${memberId}/inbox/${currentChatUserId}/messages`);
                                const memberMessagesSnapshot = await get(memberMessagesRef);
                                const memberMessages = memberMessagesSnapshot.val();
            
                                if (memberMessages) {
                                    const messagesToDelete = Object.entries(memberMessages).filter(
                                        ([key, msg]) => msg.messageDeleteId === messageDeleteId
                                    );
            
                                    for (const [messageId, msgToDelete] of messagesToDelete) {
                                        const messageRefToDelete = ref(
                                            rtdb,
                                            `users/${memberId}/inbox/${currentChatUserId}/messages/${messageId}`
                                        );
                                        await remove(messageRefToDelete);
                                        console.log(`Deleted message ID: ${messageId} for member ID: ${memberId}`);
                                    }
                                } else {
                                    console.log(`No messages found for member ID: ${memberId}`);
                                }
                            } catch (error) {
                                console.error(`Error deleting message for member ID ${memberId}:`, error);
                            }
                        }
            
                        console.log("Message deleted successfully for all group members, including the sender.");
                    } else {
                        const senderMessageRef = ref(
                            rtdb,
                            `users/${currentUserId}/inbox/${currentChatUserId}/messages/${messageData.id}`
                        );
                        const receiverMessageRef = ref(
                            rtdb,
                            `users/${currentChatUserId}/inbox/${currentUserId}/messages/${messageData.id}`
                        );
            
                        await remove(senderMessageRef);
                        console.log("Message deleted for sender.");
            
                        await remove(receiverMessageRef);
                        console.log("Message deleted for receiver.");
                    }
            
                    messageElement.remove();
                } catch (error) {
                    console.error("Error deleting message:", error);
                    alert("Failed to delete message. Please try again.");
                }
            });
            



            
            
            

            
            
        }
    }


 


    // Copy message when copy icon is clicked
    const copyButton = messageElement.querySelector('.copy-message');
    if (copyButton) {
        // Apply absolute positioning for the copy button
        if (!isMyMessage) {
            copyButton.style.position = 'absolute';
            copyButton.style.right = '10px';
            copyButton.style.top = '20px';
            copyButton.style.cursor = 'pointer';
        } else {
            copyButton.style.cursor = 'pointer';
            copyButton.style.position = 'absolute';
            copyButton.style.left = '10px';
            copyButton.style.top = '20px';
        }

        copyButton.addEventListener('click', () => {
            const messageText = messageData.text;
            navigator.clipboard.writeText(messageText)
                .catch((error) => {
                    console.error('Failed to copy message:', error);
                    alert('Failed to copy message.');
                });
        });
    }
}
function createMessageElement(messageData) {
    const div = document.createElement('div');
    const isMyMessage = messageData.senderId === currentUserId;

    div.classList.add(isMyMessage ? 'my-message' : 'their-message');
   
    

    div.id = messageData.messageId || messageData.id; // Check if these properties are populated
    
    // Ensure the ID matches the Firebase document ID
    // Profile picture handling (for received messages)
    if (!isMyMessage) {
        const profileElement = document.createElement('div');
        profileElement.classList.add('their-message-profile');

        profileElement.innerHTML = `
            <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
        `;

        const userId = messageData.senderId;
        const userDocRef = doc(db, `users/${userId}`);
        getDoc(userDocRef)
            .then((docSnapshot) => {
                if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    const profilePicUrl = userData.profilePicture;
                    const profilePictureElement = profileElement.querySelector('.profile-picture');
                    if (profilePictureElement) {
                        profilePictureElement.src = profilePicUrl;
                    }
                } else {
                    console.warn(`No document found for user ID: ${userId}`);
                }
            })
            .catch((error) => {
                console.error(`Error fetching profile picture for user ID: ${userId}`, error);
            });

        div.appendChild(profileElement);
    }

    // Handle file messages
    if (messageData.type === 'file') {
        const fileIcon = document.createElement('div');
        fileIcon.classList.add('file-icon');
        fileIcon.innerHTML = '&#128196;'; // File emoji

        const fileDetails = document.createElement('p');
        fileDetails.classList.add('file-details');
        fileDetails.innerText = `${messageData.name} (${formatFileSize(messageData.size)})`;

        const downloadButton = document.createElement('a');
        downloadButton.classList.add('action-btn');
        downloadButton.innerText = 'Download';
        downloadButton.href = messageData.fileUrl;
        downloadButton.download = messageData.name;

        div.appendChild(fileIcon);
        div.appendChild(fileDetails);
        div.appendChild(downloadButton);
    } else {
        // Handle text messages
        const text = document.createElement('p');
        text.innerText = messageData.text;
        div.appendChild(text);
    }

    // Add delete button for own messages
    if (isMyMessage) {
        const deleteButton = document.createElement('span');
        deleteButton.classList.add('delete-my-message');
        deleteButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="white">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
            </svg>
        `;
        deleteButton.style.display = 'none';
        div.appendChild(deleteButton);

        // Show delete button on hover
        div.addEventListener('mouseenter', () => {
            deleteButton.style.display = 'inline';
        });

        div.addEventListener('mouseleave', () => {
            deleteButton.style.display = 'none';
        });
        deleteButton.addEventListener('click', async () => {
            try {
                if (isGroup(currentChatUserId)) {
                    const groupRef = doc(db, 'groups', currentChatUserId);
                    const groupDoc = await getDoc(groupRef);
        
                    if (!groupDoc.exists()) {
                        console.error("Group not found with ID:", currentChatUserId);
                        return;
                    }
        
                    const groupData = groupDoc.data();
                    const groupMembers = groupData.members;
        
                    console.log("Group Members:", groupMembers);
                    if (!groupMembers || groupMembers.length === 0) {
                        console.error("No members found in the group.");
                        return;
                    }
        
                    // Loop through each group member and delete the message for them
                    for (const memberId of groupMembers) {
                        try {
                            const memberMessageRef = ref(
                                rtdb,
                                `users/${memberId}/inbox/${currentChatUserId}/messages/${div.id}`
                            );
                            console.log(memberMessageRef);
                            await remove(memberMessageRef);
                            console.log(`Deleted message with ID: ${div.id} for member ID: ${memberId}`);
                        } catch (error) {
                            console.error(`Error deleting message for member ID ${memberId}:`, error);
                        }
                    }
        
                    console.log("Message deleted successfully for all group members, including the sender.");
                } else {
                    // Handling one-on-one message deletion
                    const senderMessageRef = ref(
                        rtdb,
                        `users/${currentUserId}/inbox/${currentChatUserId}/messages/${div.id}`
                    );
                    const receiverMessageRef = ref(
                        rtdb,
                        `users/${currentChatUserId}/inbox/${currentUserId}/messages/${div.id}`
                    );
        
                    await remove(senderMessageRef);
                    console.log(`Message deleted for sender: ${senderMessageRef.toString()} with ID: ${div.id}`);
        
                    await remove(receiverMessageRef);
                    console.log(`Message deleted for receiver: ${receiverMessageRef.toString()} with ID: ${div.id}`);
                }
        
                // Remove the message from the DOM
                div.remove();
            } catch (error) {
                console.error("Error deleting message:", error);
                alert("Failed to delete message. Please try again.");
            }
        });
        
        
        
        
        
        
        
    }

    return div;
}





// Helper function to format file sizes









// Listen for Enter key to send a message
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Listen for changes in the file input and send a message when a file is selected
fileInput.addEventListener('change', () => {
    sendMessage();
});




sendButton.addEventListener('click', sendMessage);




// Add a close chat function

// Listen for input changes in the search bar
searchBar.addEventListener('input', (event) => {
    const searchTerm = event.target.value;
    searchUsers(searchTerm);
});

async function searchUsers(searchTerm) {
    if (searchTerm.trim() === '') {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
        searchResultsContainer.setAttribute('hidden', '');
        return;
    }

    // Ensure users are loaded before searching
    if (!allUsers || allUsers.length === 0) {
        console.warn("Users not loaded yet!");
        return;
    }

    searchResults.innerHTML = '';

    // Get all inbox users
    const inboxUserIds = Array.from(inboxContainer.querySelectorAll('.user-inbox')).map(
        item => item.dataset.userId
    );

    // Display inbox users that match the search term
    inboxUserIds.forEach(userId => {
        const user = allUsers.find(u => u.id === userId && u.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (user) {
            displaySearchResult(user.id, user.name);
        }
    });

    // Filter out users that are already in the inbox
    const filteredUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        user.id !== currentUserId &&
        !inboxUserIds.includes(user.id)  // Exclude already displayed inbox users
    );

    // Display filtered users
    filteredUsers.forEach(user => displaySearchResult(user.id, user.name));

    // Show or hide search results
    if (searchResults.children.length > 0) {
        searchResults.style.display = 'block';
        searchResults.style.maxHeight = '200px';
        searchResults.style.opacity = '1';
        searchResultsContainer.removeAttribute('hidden');
    } else {
        searchResultsContainer.setAttribute('hidden', '');
        searchResults.style.display = 'none';
        searchResults.style.maxHeight = '0';
        searchResults.style.opacity = '0';
    }
}






let allUsers = []; // Array to store all user data

// Fetch all users on page load
async function fetchAllUsers() {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("Error fetching users:", error);
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    await fetchAllUsers(); // Load all users initially
    await loadInbox(); // Load inbox users on page load
});


// Display each search result without a delete span
// Display each search result without a delete span
// Cache object for storing fetched profile pictures


function displaySearchResult(userId, userName) {
    const resultItem = document.createElement('div');
    resultItem.classList.add('user-inbox', 'search-user-item');
    resultItem.dataset.userId = userId;
    resultItem.innerHTML = `
        <div class="profile-pic">
            <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
        </div>
        <div class="text-profile">
            <h1 class="name">${userName}</h1>
        </div>
    `;

    // Check if the profile picture is already cached
    if (profilePicCache[userId]) {
        // If cached, set the profile picture from the cache
        resultItem.querySelector('.profile-picture').src = profilePicCache[userId];
    } else {
        // Fetch profile picture from Firestore
        const userDocRef = doc(db, `users/${userId}`); // Firestore document reference
        
        // Fetch user document from Firestore
        getDoc(userDocRef).then((docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                const profilePicUrl = userData.profilePicture || 'user_profile_-removebg-preview.png'; // Default image if no profile pic
                const fetchedUserName = userData.name || 'Unknown User'; // Fallback for missing name

                // Cache and set the profile picture
                profilePicCache[userId] = profilePicUrl;
                resultItem.querySelector('.profile-picture').src = profilePicUrl;

                // Set the user name (if available)
                resultItem.querySelector('.name').textContent = fetchedUserName;
            }
        }).catch(console.error);
    }

    // On click, add user to inbox and open chat
    resultItem.addEventListener('click', async () => {
        const existingUser = inboxContainer.querySelector(`[data-user-id="${userId}"]`);

        if (!existingUser) {
            await saveUserToInbox(userId, userName);
        }

        const sidebar = document.querySelector(".sidebar");
        const chat = document.querySelector(".chat");
        const nothing = document.querySelector(".nothing");
        const goBackButton = document.querySelector(".go-back-inbox");

        // Media query logic for smaller screens
        const mediaQuery = window.matchMedia('(max-width: 700px)');
        if (mediaQuery.matches) {
            sidebar.style.display = 'none'; // Hide sidebar
            chat.style.display = 'block'; // Show chat
            if (nothing) {
                nothing.style.display = 'none'; // Hide 'nothing' message
            }
            if (goBackButton) {
                goBackButton.style.display = 'block'; // Show "Go Back" button
            }
        }

        // Open the chat for the selected user
        openChat(userId, userName);
        searchBar.value = '';
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    });

    // Append the result item to the search results
    searchResults.appendChild(resultItem);
}





// Detect network status changes
window.addEventListener('online', () => {
    console.log("Network is back online. Reloading inbox and chat data...");
    if (currentUserId) {
        loadInbox(); // Reload inbox when the network comes back
        if (currentChatUserId) {
            openChat(currentChatUserId); // Reload chat if a chat is open
        }
    }
});


 

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
            }, 1000);
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
 





(function() {
    if ('WebSocket' in window) {
        const protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
        const address = protocol + window.location.host + '/ws';
        const socket = new WebSocket(address);
        socket.onmessage = function(msg) {
            if (msg.data == 'reload') window.location.reload();
        };
    }
})();



document.querySelector('.page-close').addEventListener('click', function() {
    history.back(); // Navigate back to the previous page
});


document.querySelector('.page-close1').addEventListener('click', function() {
    history.back(); // Navigate back to the previous page
});



import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-storage.js"; // Firebase Storage methods

const storage = getStorage(); // Firebase Storage instance (ensure Firebase is already initialized)
// Element references

const importFiles = document.querySelector('.import-files');

// Trigger file input on clicking the span
importFiles.addEventListener('click', () => fileInput.click());

// Handle file import
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const maxFileSize = 50 * 1024 * 1024; // 50MB in bytes
        if (file.size > maxFileSize) {
            alert('The selected file exceeds the 50MB size limit. Please choose a smaller file.');
            fileInput.value = ''; // Reset the input
            return;
        }

        const fileDetails = `${file.name} (${formatFileSize(file.size)})`;
        messageInput.value = `📄 ${fileDetails}`;
        messageInput.dataset.file = JSON.stringify({ name: file.name, size: file.size });
    }
});

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    else if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
    else return `${(bytes / 1048576).toFixed(2)} MB`;
}

// Clear file details and allow typing
messageInput.addEventListener('input', () => {
    const fileData = messageInput.dataset.file; // Retrieve file data if present
    if (fileData && !messageInput.value.startsWith('📄')) {
        // Clear only if the user modifies the input
        fileInput.value = ''; // Reset file input
        delete messageInput.dataset.file; // Remove file data
        messageInput.value = ''; // Clear the input field
    }
});



window.addEventListener("load", async function () {
    // Redirect to index.html if sessionStorage is empty
  // Redirect to index.html if userId is not found in sessionStorage
// Check if userId is missing from sessionStorage
if (!sessionStorage.getItem("userId")) {
    alert("Please log in to access this page."); // Show alert message
    window.location.href = "index.html"; // Redirect to login page
}})


// Send text message
function sendTextMessage(text) {
    if (text) {
        const messageElement = createMessageElement('text', text);
        chatContainer.appendChild(messageElement);
        resetInput();
    }
}

// Create message element



// Reset input fields
function resetInput() {
    messageInput.value = '';
    delete messageInput.dataset.file;
}

 
let selectedUsers = []; // To store selected users

// Show modal
openGroupModalButton.addEventListener("click", () => {
  groupModal.style.display = "flex";
});

// Hide modal and reset inputs
cancelGroupButton.addEventListener("click", () => {
  groupModal.style.display = "none";
  resetModal();
});

// Functionality to make a group
makeGroupButton.addEventListener("click", () => {
  const groupName = groupNameInput.value.trim();

  // Alert if group name is empty
  if (!groupName) {
    alert("Group name cannot be empty.");
    return;
  }

  // Alert if fewer than 2 users are selected
  if (selectedUsers.length < 2) {
    alert("You need at least 2 members to create a group.");
    return;
  }

  // Create the group (mock function)
  createGroup(groupName);

  // Reset and close modal
  resetModal();
  groupModal.style.display = "none";
});

// Function to reset modal fields
// Function to reset modal fields
function resetModal() {
    // Clear inputs
    groupNameInput.value = "";
    groupSearchInput.value = "";
    groupSearchResults.innerHTML = "";
  
    // Clear selected users array and UI
    selectedUsers = [];
    selectedUsersContainer.innerHTML = "";
    selectedUsersContainer.style.display = "none";
  }
  

// Function to create a group (mock implementation)

// Event listener for the group search input
groupSearchInput.addEventListener("input", (event) => {
  const searchTerm = event.target.value.trim();
  searchGroupUsers(searchTerm);
});

// Function to search and display users for the group modal
async function searchGroupUsers(searchTerm) {
  if (searchTerm === "") {
    groupSearchResults.innerHTML = "";
    groupSearchResults.style.display = "none";
    return;
  }

  groupSearchResults.innerHTML = "";

  // Filter users based on the search term and exclude already selected users
  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    user.id !== currentUserId &&
    !selectedUsers.some((selectedUser) => selectedUser.id === user.id)
  );

  // Display filtered users
  filteredUsers.forEach((user) => displayGroupSearchResult(user));

  // Show or hide the results based on availability
  if (groupSearchResults.children.length > 0) {
    groupSearchResults.style.display = "block";
    groupSearchResults.style.maxHeight = "200px";
    groupSearchResults.style.opacity = "1";
  } else {
    groupSearchResults.style.display = "none";
    groupSearchResults.style.maxHeight = "0";
    groupSearchResults.style.opacity = "0";
  }
}

// Function to display a user in the search results
function displayGroupSearchResult(user) {
  const resultItem = document.createElement("div");
  resultItem.classList.add("user-inbox", "group-slecting-users");
  resultItem.dataset.userId = user.id;
  resultItem.innerHTML = `
      <div class="profile-pic">
          <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
      </div>
      <div class="text-profile">
          <h1 class="name">${user.name}</h1>
      </div>
       `;

  // On click, add user to the selected users list
  resultItem.addEventListener("click", () => {
    addUserToGroup(user);
    groupSearchInput.value = ""; // Clear the search input
    groupSearchResults.innerHTML = ""; // Clear search results
    groupSearchResults.style.display = "none"; // Hide search results
  });

  groupSearchResults.appendChild(resultItem);
}

function addUserToGroup(user) {
  // Prevent duplicate entries
  if (selectedUsers.some((selectedUser) => selectedUser.id === user.id)) return;

  // Add user to the selected users list
  selectedUsers.push(user);

  // Show the selected users container if it's hidden
  if (selectedUsers.length === 1) {
    selectedUsersContainer.style.display = "block";
  }

  // Create a styled element for the selected user
  const selectedUserDiv = document.createElement("div");
  selectedUserDiv.classList.add("user-inbox", "selected-user-item");
  selectedUserDiv.dataset.userId = user.id;
  selectedUserDiv.innerHTML = `
      <div class="profile-pic">
          <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
      </div>
      <div class="text-profile">
          <h1 class="name">${user.name}</h1>
      </div>
      <div class="remove-user-button" style="font-size: 2em; color:white; position:absolute; right:10px;">&times;</div>
 
  `;

  // Add event listener to the remove button
  const removeButton = selectedUserDiv.querySelector(".remove-user-button");
  removeButton.addEventListener("click", () => {
    // Remove user from selected users array
    selectedUsers = selectedUsers.filter((selectedUser) => selectedUser.id !== user.id);
    // Remove the user's div
    selectedUserDiv.remove();
    // Hide the selected users container if no users remain
    if (selectedUsers.length === 0) {
      selectedUsersContainer.style.display = "none";
    }
    // Refresh search results
    searchGroupUsers(groupSearchInput.value);
  });

  // Add the selected user element to the container
  selectedUsersContainer.appendChild(selectedUserDiv);
}

 
// Initialize Firebase (use your configuration)
async function createGroup(groupName) {
    try {
        // Ensure selectedUsers and currentUserId are properly initialized
        console.log('Selected Users:', selectedUsers);
        console.log('Current User ID:', currentUserId);

        if (!selectedUsers || !currentUserId) {
            throw new Error("Selected users or current user ID is missing.");
        }

        // Include the current user's ID in the selected users
        const allUserIds = [...selectedUsers.map((user) => user.id), currentUserId];

        // Sort the IDs to ensure consistent group ID regardless of selection order
        allUserIds.sort();

        // Create a unique group ID by joining the sorted IDs
        const groupId = allUserIds.join("_");
        console.log('Generated Group ID:', groupId);

        // Create the group object
        const groupData = {
            id: groupId,
            name: groupName,
            members: allUserIds,
            createdAt: new Date().toISOString(),
            timeStamp: Date.now(), // Add initial timeStamp value
        };

        // Check if db is initialized correctly
        if (!db) {
            throw new Error("Firestore db is not initialized.");
        }

        // Create Firestore reference for the group in the `groups` collection
        const groupRef = doc(db, `groups/${groupId}`);

        console.log('Creating group in Firestore...');
        await setDoc(groupRef, groupData);
        console.log(`Group "${groupName}" created with ID: ${groupId}`);

        // Notify success
        openChat(groupId);
        sessionStorage.setItem("showChatOnReload", "true");
        window.location.reload();
    
   
    } catch (error) {
        console.error("Error creating group:", error); 
        // Show a generic error message to the user
        alert("Failed to create group. Please try again.");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const mediaQuery = window.matchMedia('(max-width: 700px)');
    const sidebar = document.querySelector(".sidebar");
    const chat = document.querySelector(".chat");
    const nothing = document.querySelector(".nothing");
    const goBackButton = document.querySelector(".go-back-inbox");

    if (sessionStorage.getItem("showChatOnReload") === "true" && mediaQuery.matches) {
        if (sidebar) sidebar.style.display = 'none'; // Hide sidebar
        if (chat) chat.style.display = 'block'; // Show chat
        if (nothing) nothing.style.display = 'none'; // Hide 'nothing' message
        if (goBackButton) goBackButton.style.display = 'block'; // Show "Go Back" button

        // **Remove the flag after applying changes**
        sessionStorage.removeItem("showChatOnReload");
    }
});



function syncTimeStamp(groupId, ) {
    // Path to the group's timestamp inside the user's inbox
    const rtdbRef = ref(rtdb, `users/${initialUserId}/inbox/${groupId}/lastMessageTime`);

    // Set up a real-time listener on RTDB
    onValue(rtdbRef, async (snapshot) => {
        if (snapshot.exists()) {
            const newTimeStamp = snapshot.val();
            console.log(`Updating Firestore timeStamp for group: ${groupId} to ${newTimeStamp}`);

            // Update the Firestore group document with the new timeStamp
            const groupRef = doc(db, `groups/${groupId}`);
            try {
                await updateDoc(groupRef, { timeStamp: newTimeStamp });
                console.log(`Firestore timeStamp updated for group: ${groupId}`);
            } catch (error) {
                console.error(`Error syncing timeStamp for group ${groupId}:`, error);
            }
        } else {
            console.log(`No lastMessageTime exists in RTDB for group: ${groupId} under user: ${initialUserId}`);
        }
    });
}





// Select modal elements
const chatSettingsModal = document.querySelector('.chat-settings-modal');
const modalContainer = document.querySelector('.chat-settings-modal-container');
const goBack = document.querySelector('.go-back');
const currentChatProfile = document.querySelector('.current-chat-profile');
const currentChatName = document.querySelector('.current-chat-name');
const currentChatRole = document.querySelector('.current-chat-role');

const profilePicture = document.querySelector('.profile-picture');
const userProfilePicture = document.querySelector('.user-profile-picture');
// Function to show the modal
// Fetch profile from Firestore
async function fetchUserProfile(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("User data retrieved:", userData);

 
            console.log("Profile picture element:", profilePicture);
                 profilePicture.src = userData.profilePicture || 'user_profile_-removebg-preview.png'; // Fallback to 'image.png'
            profilePicture.alt = userData.name
                ? `${userData.name}'s Profile Picture`
                : 'Default Profile Picture';
              
            const currentChatName = document.querySelector('.current-chat-name');
            const currentChatRole = document.querySelector('.current-chat-role');
 
            currentChatName.textContent = `${userData.name}`;
            currentChatRole.textContent = `Role: ${userData.role}`;
        } else {
            console.warn("No user found for the given ID:", userId);
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
    }
}


async function fetchProfile(userId) {
    const userElement = document.querySelector(".user");
    const groupElement = document.querySelector(".group");

    if (isGroup(userId)) {
        // Fetch and display the group profile
        await fetchgroupProfile(userId);

        // Update visibility
        groupElement.hidden = false;
        userElement.hidden = true;
    } else {
        // Fetch and display the user profile
        await fetchuserProfile(userId);

        // Update visibility
        userElement.hidden = false;
        groupElement.hidden = true;
    }
}


async function fetchuserProfile(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("User data retrieved:", userData);
            const userProfilePictureElement = document.getElementById("user-profile-picture");
            
 
            console.log("Profile picture element:", profilePicture);
            userProfilePictureElement.src = userData.profilePicture || 'user_profile_-removebg-preview.png'; // Fallback to 'image.png'
            userProfilePictureElement.alt = userData.name
                ? `${userData.name}'s Profile Picture`
                : 'Default Profile Picture';
               
                const userNameElement = document.querySelector(".user-name");
  

            userNameElement.textContent = `${userData.name}`;
       
            
        } else {
            console.warn("No user found for the given ID:", userId);
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
    }
}




async function fetchgroupProfile(groupId) {
    try {
        const groupRef = doc(db, "groups", groupId);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            console.log("Group data retrieved:", groupData);

            const gruopNameElement = document.querySelector(".group-name");
            gruopNameElement.textContent = `${groupData.name}`;
          
        } else {
            console.warn("No group found for the given ID:", userId);
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
    }
}



// Function to show modal and fetch profile
async function showModal() {
    modalContainer.style.display = 'flex'; // Show the modal
    document.body.style.overflow = 'hidden'; // Freeze the background

    const isGroupChat = isGroup(currentChatUserId); // Check if it's a group

    // Toggle visibility based on chat type
    if (isGroupChat) {
        document.querySelector('.current-group-profile').hidden = false;
        document.querySelector('.current-chat-profile').hidden = true;
        document.querySelector('.current-chat-name').hidden = true;
        document.querySelector('.current-chat-role').hidden = true;

        // Fetch group details
        fetchGroupProfile(currentChatUserId);
    } else {
        document.querySelector('.current-group-profile').hidden = true;
        document.querySelector('.current-chat-profile').hidden = false;
        document.querySelector('.current-chat-name').hidden = false;
        document.querySelector('.current-chat-role').hidden = false;

        // Fetch user details
        fetchUserProfile(currentChatUserId);
    }
}


// Function to hide modal


// Event listeners
chatSettingsModal.addEventListener('click', showModal);
goBack.addEventListener('click', hideModal);

function hideModal() {
    modalContainer.style.display = 'none'; // Hide the modal
    document.body.style.overflow = ''; // Restore background scroll
}


async function fetchGroupProfile(groupId) {
    try {
        const groupRef = doc(db, "groups", groupId);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            console.log("Group data retrieved:", groupData);

            const groupNameElement = document.querySelector('.current-group-name');
            const groupUsersContainer = document.querySelector('.group-users-container');

            groupNameElement.textContent = `${groupData.name}`;
            groupUsersContainer.innerHTML = ""; // Clear previous user list

            // Fetch details of each group member
            const memberPromises = groupData.members.map(async (memberId) => {
                const memberRef = doc(db, `users/${memberId}`);
                const memberSnap = await getDoc(memberRef);

                if (memberSnap.exists()) {
                    const memberData = memberSnap.data();
                    return {
                        id: memberId,
                        name: memberData.name || "Unknown User",
                        profilePicture: memberData.profilePicture || "user_profile_-removebg-preview.png"
                    };
                } else {
                    console.warn(`No user found for ID: ${memberId}`);
                    return {
                        id: memberId,
                        name: "Unknown User",
                        profilePicture: "user_profile_-removebg-preview.png"
                    };
                }
            });

            const members = await Promise.all(memberPromises);

            // Display each member
            members.forEach((member) => {
                const memberElement = document.createElement('div');
                memberElement.classList.add('user-inbox', 'group-user-pfp');
                memberElement.dataset.userId = member.id;

                memberElement.innerHTML = `
                    <div class="profile-pic">
                        <img src="${member.profilePicture}" alt="Profile Picture" class="profile-picture">
                    </div>
                    <div class="text-profile">
                        <h1 class="name">${member.name}</h1>
                    </div>
              
                `;

                groupUsersContainer.appendChild(memberElement);
            });
        } else {
            console.warn("No group found for the given ID:", groupId);
        }

        document.querySelector('.leave-group').addEventListener('click', async () => {
        // Replace with logic to get the current groupId
    // Replace with logic to get the current userId
    const previousPageUrl = document.referrer;
            try {
                // 1. Remove user from group members in Firestore
                const groupRef = doc(db, "groups", groupId);
                const groupSnap = await getDoc(groupRef);
        
                if (groupSnap.exists()) {
                    const groupData = groupSnap.data();
        
                    // Filter out the current user from the group members
                    const updatedMembers = groupData.members.filter(memberId => memberId !== currentUserId);
                    await updateDoc(groupRef, { members: updatedMembers });
        
                    console.log(`User ${currentUserId} removed from group ${groupId}`);
                } else {
                    console.warn("Group does not exist:", groupId);
                }
        
                // 2. Remove group ID from user's RTDB inbox
                const userInboxRef = ref(rtdb, `users/${currentUserId}/inbox/${groupId}`);
                await remove(userInboxRef);
                console.log(`Group ${groupId} removed from user's RTDB inbox`);
        
                // 3. Remove group ID from user's Firestore data
                const userRef = doc(db, "users", currentUserId);
                const userSnap = await getDoc(userRef);
        
                if (userSnap.exists()) {
                    const userData = userSnap.data();
        
                    if (userData.groups) {
                        const updatedGroups = userData.groups.filter(id => id !== groupId);
                        await updateDoc(userRef, { groups: updatedGroups });
        
                        console.log(`Group ${groupId} removed from user's Firestore data`);
                    }
                } else {
                    console.warn("User does not exist:", currentUserId);
                }
        
                // 4. Close the modal
                const modal = document.querySelector('.chat-settings-modal-container');
                modal.style.display = 'none'; // Or use a class to hide the modal
        
                // 5. Redirect to the previous page
                if (previousPageUrl) {
                    window.location.href = previousPageUrl;
                } else {
                    console.warn("No previous page URL found");
                }
            } catch (error) {
                console.error("Error leaving the group:", error);
            }
        });
        

    } catch (error) {
        console.error("Error fetching group profile:", error);
    }

    
}
 


const addUsersButton = document.querySelector('.add-users');
const addUserContainer = document.querySelector('.add-user-container');
const cancelButton = document.querySelector('.cancel');

// Show the "Add Users" modal
function showAddUsersModal() {
    addUserContainer.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Freeze the background
}

// Hide the "Add Users" modal
function hideAddUsersModal() {
    addUserContainer.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scrolling
}

// Event listeners
addUsersButton.addEventListener('click', showAddUsersModal);
cancelButton.addEventListener('click', hideAddUsersModal);


const addUserSearchInput = document.querySelector('.add-user-search-input');
const searchedAddUsers = document.querySelector('.searched-add-users');
const selectedAddedUsers = document.querySelector('.selected-added-users');

  // Populate this array with user data from your backend

// Function to search and display users in the add-user modal
addUserSearchInput.addEventListener("input", (event) => {
    const searchTerm = event.target.value.trim();
    if (searchTerm === "") {
        searchedAddUsers.innerHTML = "";
        searchedAddUsers.style.display = "none";
        return;
    }
    searchAddUsers(searchTerm);
});

async function searchAddUsers(searchTerm) {
    searchedAddUsers.innerHTML = "";

    try {
        // Fetch current group data to get existing members
        const groupRef = doc(db, "groups", currentChatUserId);
        const groupSnap = await getDoc(groupRef);

        let currentGroupMembers = [];
        if (groupSnap.exists()) {
            currentGroupMembers = groupSnap.data().members;
        }

        // Filter users to exclude selected and already added group members
        const filteredUsers = allUsers.filter((user) =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !selectedUsers.some((selectedUser) => selectedUser.id === user.id) &&
            !currentGroupMembers.includes(user.id) // Exclude current group members
        );

        // Display filtered users
        filteredUsers.forEach((user) => displaySearchedUser(user));

        // Handle display logic
        if (filteredUsers.length > 0) {
            searchedAddUsers.style.display = "block";
            searchedAddUsers.style.maxHeight = "200px";
            searchedAddUsers.style.opacity = "1";
        } else {
            searchedAddUsers.style.display = "none";
        }
    } catch (error) {
        console.error("Error fetching group members:", error);
    }
}


function displaySearchedUser(user) {
    const userItem = document.createElement("div");
    userItem.classList.add("user-inbox", "group-slecting-users");
    userItem.dataset.userId = user.id;
    userItem.innerHTML = `
        <div class="profile-pic">
            <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
        </div>
        <div class="text-profile">
            <h1 class="name">${user.name}</h1>
        </div>
    `;

    userItem.addEventListener("click", () => {
        addUserToSelected(user);
        addUserSearchInput.value = "";
        searchedAddUsers.innerHTML = "";
        searchedAddUsers.style.display = "none";
    });

    searchedAddUsers.appendChild(userItem);
}

function addUserToSelected(user) {
    if (selectedUsers.some((selectedUser) => selectedUser.id === user.id)) return;

    selectedUsers.push(user);

    const selectedUserDiv = document.createElement("div");
    selectedUserDiv.classList.add("user-inbox", "selected-user-item");
    selectedUserDiv.dataset.userId = user.id;
    selectedUserDiv.innerHTML = `
        <div class="profile-pic">
            <img src="user_profile_-removebg-preview.png" alt="Profile Picture" class="profile-picture">
        </div>
        <div class="text-profile">
            <h1 class="name">${user.name}</h1>
        </div>
        <div class="remove-user-button" style="font-size: 2em; color:white; position:absolute; right:10px;">&times;</div>
    `;

    const removeButton = selectedUserDiv.querySelector(".remove-user-button");
    removeButton.addEventListener("click", () => {
        selectedUsers = selectedUsers.filter((selectedUser) => selectedUser.id !== user.id);
        selectedUserDiv.remove();
        if (selectedUsers.length === 0) {
            selectedAddedUsers.style.display = "none";
        }
    });

    selectedAddedUsers.appendChild(selectedUserDiv);
    selectedAddedUsers.style.display = "block";
}


// Confirm Button Functionality
const confirmButton = document.querySelector('.confirm-add-user');

// Event listener for the confirm button
confirmButton.addEventListener('click', async () => {
    if (selectedUsers.length === 0) {
        alert("No users selected to add.");
        return;
    }

    try {
        // Update group members in Firestore
        const groupRef = doc(db, "groups", currentChatUserId);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            const updatedMembers = [...groupData.members, ...selectedUsers.map(user => user.id)];
            
            // Remove duplicate user IDs
            const uniqueMembers = [...new Set(updatedMembers)];

            await updateDoc(groupRef, { members: uniqueMembers });

            console.log("Group members updated:", uniqueMembers);

            // Update each user's inbox
            const userUpdates = selectedUsers.map(async (user) => {
                const userRef = doc(db, "users", user.id);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const updatedGroups = userData.groups ? [...userData.groups, currentChatUserId] : [currentChatUserId];

                    await updateDoc(userRef, { groups: updatedGroups });
                    console.log(`Group added to user ${user.id}'s inbox.`);
                }
            });

            await Promise.all(userUpdates);

            // Refresh UI for the group in the current user's inbox
            displayInboxGroup(currentChatUserId, groupData.name);

            // Clear selected users and hide modal
            selectedUsers = [];
            selectedAddedUsers.innerHTML = "";
            hideModal() ;
        } else {
            console.warn("Group does not exist:", currentChatUserId);
        }
    } catch (error) {
        console.error("Error adding users to the group:", error);
    }
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