# Aetherium: Your AI Writing Partner

Aetherium is a powerful, self-hosted, and collaborative writing environment designed for authors, developers, and researchers. It combines a real-time collaborative editor with a customizable "Guild" of local-first AI agents to assist in every phase of the writing process—from brainstorming and drafting to refining and organizing.

---

##  Core Features

*   **Real-Time Collaboration:** Write and edit with multiple users simultaneously, with changes synced instantly across all clients.
*   **AI Agent Guild:** A modular, multi-agent system powered by local LLMs (via Ollama) to handle specialized tasks:
    *   **Suggestion Agent:** Your creative partner for brainstorming ideas.
    *   **Improvement Agent:** A meticulous editor for refining prose and code.
    *   **Librarian Agent:** Your research assistant for summarizing content.
    *   **Reviewer Agent:** Provides high-level feedback on clarity and flow.
*   **Long-Term Memory:** Utilizes a vector database (ChromaDB) to give the AI contextual awareness of your entire project, leading to smarter, more relevant suggestions.
*   **Selective Editing:** Improve an entire document or just a single highlighted sentence for surgical precision.
*   **Structuralist Panel:** Automatically generates a navigable "Table of Contents" from your document's headings.
*   **The Chronicler:** A comprehensive logging system that records every interaction, keystroke, and button click to a local database for behavior analysis.
*   **Local First & Private:** All core components—including the AI models and databases—run locally on your machine. Your data never leaves your control.
*   **Themed UI:** Includes a polished user interface with a persistent dark mode toggle.

---

## Technology Stack

Aetherium is a full-stack application built with modern but accessible technologies.

*   **Frontend (in `aetherium-editor`):**
    *   **Framework:** Vanilla JavaScript with Vite
    *   **Editor:** TipTap
    *   **Collaboration:** Liveblocks & Y.js
    *   **Styling:** Plain CSS with a modern layout
*   **Backend (in `aetherium-backend`):**
    *   **Framework:** Python with FastAPI
    *   **AI Models:** Ollama (running models like `phi3:mini`)
    *   **Database:** SQLite with SQLAlchemy
    *   **Vector Memory:** ChromaDB with Sentence-Transformers
*   **Authentication:**
    *   Secure password hashing with Passlib/Bcrypt.
    *   User management via a local SQLite database.

---

## Getting Started

Follow these steps to get Aetherium running on your local machine.

### Prerequisites

1.  **Node.js:** [Download & Install](https://nodejs.org/en/)
2.  **Python 3.8+:** [Download & Install](https://www.python.org/downloads/)
3.  **Ollama:** [Download & Install](https://ollama.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/aetherium.git
    cd aetherium
    ```

2.  **Set up the Backend:**
    ```bash
    cd aetherium-backend
    python -m venv venv
    # Activate the virtual environment
    # Windows:
    .\venv\Scripts\activate
    # macOS/Linux:
    # source venv/bin/activate
    pip install -r requirements.txt
    ```

3.  **Set up the Frontend:**
    ```bash
    cd ../aetherium-editor
    npm install
    ```

4.  **Download an AI Model:**
    *   Open a new terminal and pull a lightweight model.
    ```bash
    ollama run phi3:mini
    ```

### Running the Application

You need to have **two terminals** running simultaneously.

1.  **Start the Backend Server:**
    *   In the `aetherium-backend` directory (with venv active):
    ```bash
    uvicorn main:app --reload
    ```
    *   The backend will be available at `http://localhost:8000`.

2.  **Start the Frontend Server:**
    *   In the `aetherium-editor` directory:
    ```bash
    npm run dev
    ```
    *   The frontend will be available at `http://localhost:5173`.

3.  **Open your browser** to `http://localhost:5173` to start using the application.

