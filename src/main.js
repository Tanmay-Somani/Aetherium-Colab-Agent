// main.js (Corrected, Simplified Version)
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
  content: '<h2>Welcome Back to Aetherium</h2><p>The application is now stable. All visuals are restored.</p>',
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
  setButtonsLoading(true);
  updateAiPanel('AI is thinking...', true);

  try {
    const backendUrl = 'http://localhost:8000/agent-request';
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: content, task: task }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();

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
    updateAiPanel(`Error: Failed to connect to the backend.`, false);
  } finally {
    setButtonsLoading(false);
  }
}

controlsContainer.addEventListener('click', (event) => {
  if (event.target.tagName !== 'BUTTON' || event.target.disabled) { return; }
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
  updateStructurePanel();
});

// --- 7. The Theme Toggle ---
const themeToggleBtn = document.querySelector('#theme-toggle-btn');

const applyTheme = (theme) => {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    themeToggleBtn.textContent = '🌙';
  }
};

const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);

themeToggleBtn.addEventListener('click', () => {
  const isDarkMode = document.body.classList.contains('dark-mode');
  if (isDarkMode) {
    localStorage.setItem('theme', 'light');
    applyTheme('light');
  } else {
    localStorage.setItem('theme', 'dark');
    applyTheme('dark');
  }
});