import { createClient } from "@liveblocks/client";
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import './style.css';

// --- 1. Client and Room setup ---
const client = createClient({
  // IMPORTANT: REPLACE with your actual public key from liveblocks.io
  publicApiKey: "pk_dev_ye2qUNdd2GWwhUNdN_82-8tRb_bW324LDqBEHfy7L2ilDkENMe8vclHgbxw1Qv-S",
});

const roomName = "aetherium-book-project";
const { room, leave } = client.enterRoom(roomName);

// --- 2. Yjs document setup ---
const yDoc = new Y.Doc();
const provider = new LiveblocksYjsProvider(room, yDoc);

// --- 3. TipTap Editor initialization ---
const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit.configure({ history: false }),
    Collaboration.configure({ document: yDoc }),
    CollaborationCursor.configure({
      provider: provider,
      user: {
        name: `User ${Math.floor(Math.random() * 1000)}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      },
    }),
  ],
  content: '<h2>Welcome to Aetherium</h2><p>This is your collaborative AI writing environment. All interactions are now being logged by the Chronicler.</p><h2>Chapter 1: The Chronicler Awakens</h2><p>Use the buttons below to interact with your team of AI agents.</p>',
  editorProps: {
    attributes: {
      class: 'ProseMirror',
    },
  },
});

// --- 4. Handle cleanup when the user leaves the page ---
window.addEventListener('beforeunload', () => {
  leave();
});

// --- 5. The Command Center ---
const aiResponseArea = document.querySelector('#ai-response-area');
const controlsContainer = document.querySelector('.controls');

function updateAiPanel(content, isPlaceholder = false) {
  if (isPlaceholder) {
    aiResponseArea.innerHTML = `<p class="placeholder">${content}</p>`;
  } else {
    aiResponseArea.innerHTML = `<p>${content.replace(/\n/g, '<br>')}</p>`;
  }
}

function setButtonsLoading(isLoading) {
  const buttons = controlsContainer.querySelectorAll('button');
  buttons.forEach(button => {
    if (isLoading) {
      button.disabled = true;
      button.classList.add('loading');
    } else {
      button.disabled = false;
      button.classList.remove('loading');
    }
  });
}

async function sendToAgent(task, content, isSelection = false) {
  console.log(`Sending task '${task}' to backend...`);
  setButtonsLoading(true);
  updateAiPanel('AI is thinking...', true);

  try {
    const backendUrl = 'http://localhost:8000/agent-request'; // Update if needed
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: content, task: task }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    console.log("Received from Agent Guild:", data);

    if (task === 'improve') {
      if (isSelection) {
        editor.chain().focus().insertContent(data.response).run();
      } else {
        editor.chain().focus().selectAll().insertContent(data.response).run();
      }
      updateAiPanel('Text improved and replaced in the editor.', true);
    } else if (task === 'save_to_memory') {
      updateAiPanel('Content chunk saved to the AI\'s long-term memory.', true);
    } else {
      updateAiPanel(data.response);
    }

  } catch (error) {
    console.error("Error communicating with Agent Guild:", error);
    updateAiPanel(`Error: Failed to connect to the backend. Please ensure it's running.`, false);
  } finally {
    setButtonsLoading(false);
  }
}

controlsContainer.addEventListener('click', (event) => {
  if (event.target.tagName !== 'BUTTON' || event.target.disabled) {
    return;
  }
  const task = event.target.dataset.task;
  if (!task) return;

  const { from, to, empty } = editor.state.selection;
  let contentHTML = '';
  let isSelection = false;

  if (!empty) {
    const selectedSlice = editor.state.doc.slice(from, to);
    const tempEditor = new Editor({ extensions: [StarterKit], content: selectedSlice.content });
    contentHTML = tempEditor.getHTML();
    tempEditor.destroy();
    isSelection = true;
  } else {
    contentHTML = editor.getHTML();
    isSelection = false;
  }
  
  sendToAgent(task, contentHTML, isSelection);
});

// --- 6. The Structuralist Panel ---
const structureList = document.querySelector('#structure-list');
const refreshStructureBtn = document.querySelector('#refresh-structure-btn');

function updateStructurePanel() {
  const headings = [];
  editor.state.doc.forEach(node => {
    if (node.type.name === 'heading' && node.attrs.level === 2) {
      headings.push(node.textContent);
    }
  });

  if (headings.length === 0) {
    structureList.innerHTML = '<p class="placeholder">No chapters (h2 headings) found.</p>';
    return;
  }

  const listHtml = `<ul>${headings.map(h => `<li>${h}</li>`).join('')}</ul>`;
  structureList.innerHTML = listHtml;
}

refreshStructureBtn.addEventListener('click', () => {
  console.log("Scanning document for chapters...");
  updateStructurePanel();
});


// --- 7. The Chronicler (Event Logging) ---
const Chronicler = (() => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const backendLogUrl = 'http://localhost:8000/log-event/'; // Update IP if needed

  let eventBuffer = [];
  let bufferTimeout = null;

  async function sendBuffer() {
    if (eventBuffer.length === 0) return;
    
    const eventsToSend = [...eventBuffer];
    eventBuffer = [];

    try {
      // Use navigator.sendBeacon as it's designed for analytics and is non-blocking
      // It reliably sends data even when a page is unloading.
      const blob = new Blob([JSON.stringify(eventsToSend)], { type: 'application/json' });
      // Note: sendBeacon doesn't return a promise, it's a "fire-and-forget" method.
      // We can check the return value, true means it was queued successfully.
      if (!navigator.sendBeacon(backendLogUrl, blob)) {
        console.error('Beacon queueing failed. Logs might be lost.');
      }
      console.log(`Queued ${eventsToSend.length} events to be sent.`);
    } catch (error) {
      console.error('Error queueing log beacon:', error);
      // If there's an immediate error, put events back in the buffer.
      eventBuffer.push(...eventsToSend); 
    }
  }

  function log(eventType, payload) {
    eventBuffer.push({
      session_id: sessionId,
      event_type: eventType,
      payload: payload,
    });

    clearTimeout(bufferTimeout);
    if (eventBuffer.length >= 20) {
      sendBuffer();
    } else {
      bufferTimeout = setTimeout(sendBuffer, 2500); // Send after 2.5 seconds of inactivity
    }
  }

  function initialize() {
    console.log("Chronicler initialized with session ID:", sessionId);

    // 1. Listen for content changes in the editor (covers typing, deleting, pasting)
    editor.on('transaction', ({ transaction }) => {
      if (transaction.docChanged) {
        log('content_changed', { text_length: transaction.doc.textContent.length });
      }
    });
    
    // 2. Listen for button clicks on AI controls
    controlsContainer.addEventListener('click', (event) => {
      if (event.target.tagName === 'BUTTON') {
        const task = event.target.dataset.task;
        if (task) {
          log('button_click', { task: task, button_text: event.target.textContent });
        }
      }
    });

    // 3. Ensure any remaining events are sent when the user leaves
    window.addEventListener('beforeunload', () => {
      if(eventBuffer.length > 0) sendBuffer();
    });
  }

  return { initialize };
})();

// Initialize the Chronicler at the very end of the script
Chronicler.initialize();

// --- 8. Theme Toggle ---

const themeToggleBtn = document.querySelector('#theme-toggle-btn');

// Function to apply the theme
const applyTheme = (theme) => {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.textContent = '☀️'; // Sun icon for switching to light
  } else {
    document.body.classList.remove('dark-mode');
    themeToggleBtn.textContent = '🌙'; // Moon icon for switching to dark
  }
};

// Check for saved theme in localStorage on page load
const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);

// Event listener for the button
themeToggleBtn.addEventListener('click', () => {
  // Check current theme by looking at the body class
  const isDarkMode = document.body.classList.contains('dark-mode');
  if (isDarkMode) {
    localStorage.setItem('theme', 'light');
    applyTheme('light');
  } else {
    localStorage.setItem('theme', 'dark');
    applyTheme('dark');
  }
});
// --- 9. Authentication Logic ---

const authOverlay = document.querySelector('#auth-overlay');
const appContainer = document.querySelector('#app-container');
const loginForm = document.querySelector('#login-form form');
const registerForm = document.querySelector('#register-form form');
const loginFormContainer = document.querySelector('#login-form');
const registerFormContainer = document.querySelector('#register-form');
const showRegisterLink = document.querySelector('#show-register');
const showLoginLink = document.querySelector('#show-login');

let accessToken = null;

function showApp() {
  authOverlay.style.display = 'none';
  appContainer.style.visibility = 'visible';
}

// -- Event Listeners for switching forms --
showRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginFormContainer.style.display = 'none';
  registerFormContainer.style.display = 'block';
});

showLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginFormContainer.style.display = 'block';
  registerFormContainer.style.display = 'none';
});

// -- Registration Form Submission --
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#register-email').value;
    const password = document.querySelector('#register-password').value;

    try {
        const response = await fetch('http://localhost:8000/users/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Registration failed');

        }
        alert('Registration successful! Please login.');
        showLoginLink.click(); // Switch to the login form
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

// -- Login Form Submission --
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#login-email').value;
    const password = document.querySelector('#login-password').value;

    // FastAPI's OAuth2 expects form data, not JSON
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
        const response = await fetch('http://localhost:8000/token', {
            method: 'POST',
            body: formData
        });
         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Login failed');
        }
        const data = await response.json();
        accessToken = data.access_token;
        console.log("Login successful, token received.");
        showApp(); // Show the main application
    } catch (error) {
         alert(`Error: ${error.message}`);
    }
});

// -- IMPORTANT: Update sendToAgent to include the token --
async function sendToAgent(task, content, isSelection = false) {
  if (!accessToken) {
    alert("Authentication error. Please login again.");
    return;
  }
  console.log(`Sending task '${task}' to backend...`);
  setButtonsLoading(true);
  updateAiPanel('AI is thinking...', true);

  try {
    const backendUrl = 'http://localhost:8000/agent-request';
    // Add the Authorization header with the Bearer token
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ html: content, task: task }),
    });
    
    if (response.status === 401) {
         alert("Session expired. Please login again.");
         // In a real app, you would redirect to the login screen.
         return;
    }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    // (The rest of the function remains the same...)
    const data = await response.json();
    // ...
  } finally {
    setButtonsLoading(false);
  }
}