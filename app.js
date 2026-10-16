
/* =========================================
   MH CLASS HUB — APP JAVASCRIPT
   Front-end demo functionality
========================================= */

"use strict";

/* =========================================
   HELPERS
========================================= */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const STORAGE_PREFIX = "mh-class-hub-";

function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch (error) {
    console.warn("Could not read saved data:", error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify(value)
    );
    return true;
  } catch (error) {
    console.warn("Could not save data:", error);
    showToast("Data could not be saved in this browser.", true);
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function formatDate(value) {
  if (!value) return "No date set";

  const date = new Date(value + "T12:00:00");

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(value);
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getInitials(name) {
  return String(name || "MH")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "MH";
}

/* =========================================
   TOAST NOTIFICATIONS
========================================= */

let toastTimer;

function showToast(message, isError = false) {
  let toast = $("#toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  clearTimeout(toastTimer);

  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* =========================================
   PAGE NAVIGATION
========================================= */

const pageTitles = {
  dashboard: "Dashboard",
  chat: "Group Chat",
  assignments: "Assignments",
  notes: "Notes & Resources",
  members: "Class Members",
  announcements: "Announcements",
  projects: "Projects",
  settings: "Settings"
};

function navigateTo(pageName) {
  const target = $(`#${pageName}`);

  if (!target || !target.classList.contains("page-section")) {
    showToast("This page is not available.", true);
    return;
  }

  $$(".page-section").forEach(section => {
    section.classList.toggle("active", section === target);
  });

  $$(".nav-link").forEach(link => {
    const linkPage = link.dataset.page;

    link.classList.toggle("active", linkPage === pageName);

    if (linkPage === pageName) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const title = $("#page-title");

  if (title) {
    title.textContent = pageTitles[pageName] || "MH Class Hub";
  }

  closeSidebar();

  if (pageName === "chat") {
    scrollChatToBottom();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
  $$(".nav-link").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();

      const pageName = link.dataset.page;

      if (pageName) navigateTo(pageName);
    });
  });

  $$("[data-go-to]").forEach(button => {
    button.addEventListener("click", () => {
      navigateTo(button.dataset.goTo);
    });
  });
}

/* =========================================
   MOBILE SIDEBAR
========================================= */

function openSidebar() {
  const sidebar = $(".sidebar");
  const overlay = $(".sidebar-overlay");

  sidebar?.classList.add("open");
  overlay?.classList.add("open");

  $("#menu-toggle")?.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  $(".sidebar")?.classList.remove("open");
  $(".sidebar-overlay")?.classList.remove("open");

  $("#menu-toggle")?.setAttribute("aria-expanded", "false");
}

function setupSidebar() {
  $("#menu-toggle")?.addEventListener("click", () => {
    const sidebar = $(".sidebar");

    if (sidebar?.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  $(".sidebar-overlay")?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeSidebar();
      closeAllModals();
    }
  });
}

/* =========================================
   MODAL MANAGEMENT
========================================= */

function openModal(modal) {
  if (!modal) return;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const firstInput = $("input, textarea, select", modal);

  setTimeout(() => firstInput?.focus(), 50);
}

function closeModal(modal) {
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  if (!$(".modal.open")) {
    document.body.style.overflow = "";
  }
}

function closeAllModals() {
  $$(".modal.open").forEach(closeModal);
}

function setupModals() {
  $$("[data-open-modal]").forEach(button => {
    button.addEventListener("click", () => {
      const modalId = button.dataset.openModal;
      openModal(document.getElementById(modalId));
    });
  });

  $$("[data-close-modal]").forEach(button => {
    button.addEventListener("click", () => {
      closeModal(button.closest(".modal"));
    });
  });

  $$(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });
}

/* =========================================
   CHAT
========================================= */

const defaultMessages = [
  {
    id: "welcome-1",
    name: "MH Admin",
    text: "Welcome to MH Class Hub! Use this space to discuss class topics and share ideas.",
    time: "Welcome message",
    own: false
  },
  {
    id: "welcome-2",
    name: "MH Admin",
    text: "Please keep the conversation respectful and focused on learning.",
    time: "Welcome message",
    own: false
  }
];

let messages = readStorage("messages", defaultMessages);

function renderMessages() {
  const container = $("#chat-messages");

  if (!container) return;

  if (!messages.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <h3>No messages yet</h3>
        <p>Start the conversation with your classmates.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = messages.map(message => {
    const ownClass = message.own ? "own-message" : "";
    const initials = getInitials(message.name);

    return `
      <div class="chat-message ${ownClass}">
        <div class="avatar">${escapeHTML(initials)}</div>

        <div class="message-body">
          <div class="message-meta">
            <strong>${escapeHTML(message.name)}</strong>
            <span>${escapeHTML(message.time)}</span>
          </div>

          <div class="message-bubble">${escapeHTML(message.text)}</div>
        </div>
      </div>
    `;
  }).join("");

  scrollChatToBottom();
}

function scrollChatToBottom() {
  const container = $("#chat-messages");

  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function sendMessage() {
  const input = $("#chat-input");

  if (!input) {
    showToast("Chat input was not found.", true);
    return;
  }

  const text = input.value.trim();

  if (!text) {
    showToast("Please type a message first.", true);
    input.focus();
    return;
  }

  if (text.length > 2000) {
    showToast("Message is too long. Maximum 2000 characters.", true);
    return;
  }

  const profileName =
    readStorage("profileName", "Your Name").trim() || "Your Name";

  messages.push({
    id: makeId(),
    name: profileName,
    text,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }),
    own: true
  });

  messages = messages.slice(-200);
  saveStorage("messages", messages);

  input.value = "";
  renderMessages();

  showToast("Message added to this browser's demo chat.");
}

function setupChat() {
  renderMessages();

  $("#chat-send")?.addEventListener("click", sendMessage);

  $("#chat-input")?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
}

/* =========================================
   ASSIGNMENTS
========================================= */

const defaultAssignments = [
  {
    id: "assignment-1",
    title: "Programming Fundamentals — Lab 1",
    subject: "Programming Fundamentals",
    dueDate: "",
    status: "Pending",
    description: "Complete the introductory C++ environment setup."
  },
  {
    id: "assignment-2",
    title: "Computer System Layers",
    subject: "Computer Fundamentals",
    dueDate: "",
    status: "In Progress",
    description: "Explain the six layers of a computing system."
  }
];

let assignments = readStorage("assignments", defaultAssignments);

function renderAssignments() {
  const container = $("#assignment-list");

  if (!container) return;

  if (!assignments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <h3>No assignments yet</h3>
        <p>Add your first assignment to get started.</p>
      </div>
    `;
    updateDashboardStats();
    return;
  }

  container.innerHTML = assignments.map(item => {
    const statusClass =
      item.status === "Completed"
        ? "badge-green"
        : item.status === "In Progress"
          ? "badge-blue"
          : "badge-orange";

    return `
      <article class="assignment-item">
        <div class="assignment-icon">📘</div>

        <div class="assignment-details">
          <h4>${escapeHTML(item.title)}</h4>
          <p>${escapeHTML(item.subject || "General")}</p>
          <p>${escapeHTML(item.description || "")}</p>
        </div>

        <div class="assignment-meta">
          <span class="badge ${statusClass}">
            ${escapeHTML(item.status)}
          </span>

          <span class="muted small-text">
            ${item.dueDate ? "Due " + formatDate(item.dueDate) : "No due date"}
          </span>

          <button
            class="btn btn-small"
            type="button"
            data-toggle-assignment="${escapeHTML(item.id)}"
          >
            ${item.status === "Completed" ? "Reopen" : "Complete"}
          </button>
        </div>
      </article>
    `;
  }).join("");

  updateDashboardStats();
}

function addAssignment(event) {
  event.preventDefault();

  const title = $("#assignment-title")?.value.trim();
  const subject = $("#assignment-subject")?.value.trim() || "General";
  const dueDate = $("#assignment-due-date")?.value || "";
  const description = $("#assignment-description")?.value.trim() || "";

  if (!title) {
    showToast("Please enter an assignment title.", true);
    return;
  }

  assignments.unshift({
    id: makeId(),
    title,
    subject,
    dueDate,
    status: "Pending",
    description
  });

  if (!saveStorage("assignments", assignments)) return;

  renderAssignments();
  $("#assignment-form")?.reset();
  closeModal($("#assignment-modal"));

  showToast("Assignment added successfully.");
}

function setupAssignments() {
  renderAssignments();

  $("#assignment-form")?.addEventListener("submit", addAssignment);

  $("#assignment-list")?.addEventListener("click", event => {
    const button = event.target.closest("[data-toggle-assignment]");

    if (!button) return;

    const item = assignments.find(
      assignment => assignment.id === button.dataset.toggleAssignment
    );

    if (!item) return;

    item.status =
      item.status === "Completed" ? "Pending" : "Completed";

    if (!saveStorage("assignments", assignments)) return;

    renderAssignments();

    showToast(
      item.status === "Completed"
        ? "Assignment marked as completed."
        : "Assignment reopened."
    );
  });
}

/* =========================================
   NOTES & RESOURCES
========================================= */

const defaultNotes = [
  {
    id: "note-1",
    title: "C++ Basics",
    category: "Programming",
    description: "Variables, data types, input, output and operators.",
    link: ""
  },
  {
    id: "note-2",
    title: "Computer System Layers",
    category: "Computer Fundamentals",
    description: "Information, hardware, programming, OS, applications and communication.",
    link: ""
  },
  {
    id: "note-3",
    title: "Lab Resources",
    category: "Lab",
    description: "Store useful lab instructions and learning resources here.",
    link: ""
  }
];

let notes = readStorage("notes", defaultNotes);

function renderNotes() {
  const container = $("#notes-grid");

  if (!container) return;

  if (!notes.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>No notes available</h3>
        <p>Add a note or resource for your group.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notes.map(note => `
    <article class="note-card">
      <div class="note-icon">📄</div>

      <h3>${escapeHTML(note.title)}</h3>
      <p>${escapeHTML(note.description || "")}</p>

      <div class="note-footer">
        <span>${escapeHTML(note.category || "General")}</span>

        ${
          note.link
            ? `<a class="text-link"
                 href="${escapeHTML(note.link)}"
                 target="_blank"
                 rel="noopener noreferrer">Open resource ↗</a>`
            : `<span>Class resource</span>`
        }
      </div>
    </article>
  `).join("");
}

function addNote(event) {
  event.preventDefault();

  const title = $("#note-title")?.value.trim();
  const category = $("#note-category")?.value.trim() || "General";
  const description = $("#note-description")?.value.trim() || "";
  const rawLink = $("#note-link")?.value.trim() || "";

  if (!title) {
    showToast("Please enter a note title.", true);
    return;
  }

  let link = "";

  if (rawLink) {
    try {
      const url = new URL(rawLink);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Unsupported URL protocol");
      }

      link = url.href;
    } catch {
      showToast("Enter a valid link beginning with https://", true);
      return;
    }
  }

  notes.unshift({
    id: makeId(),
    title,
    category,
    description,
    link
  });

  if (!saveStorage("notes", notes)) return;

  renderNotes();
  $("#note-form")?.reset();
  closeModal($("#note-modal"));

  showToast("Note added successfully.");
}

function setupNotes() {
  renderNotes();

  $("#note-form")?.addEventListener("submit", addNote);
}

/* =========================================
   ANNOUNCEMENTS
========================================= */

const defaultAnnouncements = [
  {
    id: "announcement-1",
    title: "Welcome to MH Class Hub",
    message: "This is our shared space for class discussions, resources and projects.",
    date: getToday(),
    author: "MH Admin"
  },
  {
    id: "announcement-2",
    title: "Keep Resources Organized",
    message: "Please use clear titles when adding notes, files or assignment details.",
    date: getToday(),
    author: "MH Admin"
  }
];

let announcements = readStorage("announcements", defaultAnnouncements);

function renderAnnouncements() {
  const container = $("#announcements-list");

  if (!container) return;

  if (!announcements.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📢</div>
        <h3>No announcements yet</h3>
        <p>Announcements will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = announcements.map(item => `
    <article class="announcement-item">
      <div class="announcement-top">
        <span class="badge badge-orange">Announcement</span>
        <span class="muted small-text">${formatDate(item.date)}</span>
      </div>

      <h4>${escapeHTML(item.title)}</h4>
      <p>${escapeHTML(item.message)}</p>

      <div class="announcement-meta">
        Posted by ${escapeHTML(item.author || "Class member")}
      </div>
    </article>
  `).join("");
}

function addAnnouncement(event) {
  event.preventDefault();

  const title = $("#announcement-title")?.value.trim();
  const message = $("#announcement-message")?.value.trim();

  if (!title || !message) {
    showToast("Enter both a title and announcement.", true);
    return;
  }

  announcements.unshift({
    id: makeId(),
    title,
    message,
    date: getToday(),
    author: readStorage("profileName", "Your Name")
  });

  if (!saveStorage("announcements", announcements)) return;

  renderAnnouncements();
  $("#announcement-form")?.reset();
  closeModal($("#announcement-modal"));

  showToast("Announcement added.");
}

function setupAnnouncements() {
  renderAnnouncements();

  $("#announcement-form")?.addEventListener("submit", addAnnouncement);
}

/* =========================================
   PROJECTS
========================================= */

const defaultProjects = [
  {
    id: "project-1",
    title: "MH Class Hub",
    description: "A shared learning space for our small class group.",
    status: "In Progress",
    progress: 45
  },
  {
    id: "project-2",
    title: "Programming Practice",
    description: "Practice basic programming problems together.",
    status: "Planning",
    progress: 15
  }
];

let projects = readStorage("projects", defaultProjects);

function renderProjects() {
  const container = $("#projects-grid");

  if (!container) return;

  if (!projects.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🚀</div>
        <h3>No projects yet</h3>
        <p>Add a project for your class team.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = projects.map(project => {
    const progress = Math.max(
      0,
      Math.min(100, Number(project.progress) || 0)
    );

    return `
      <article class="project-card">
        <div class="project-top">
          <div class="project-icon">🚀</div>
          <span class="badge badge-blue">${escapeHTML(project.status)}</span>
        </div>

        <h3>${escapeHTML(project.title)}</h3>
        <p>${escapeHTML(project.description || "")}</p>

        <div class="progress-label">
          <span>Progress</span>
          <strong>${progress}%</strong>
        </div>

        <div
          class="progress-track"
          role="progressbar"
          aria-valuenow="${progress}"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="${escapeHTML(project.title)} progress"
        >
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
      </article>
    `;
  }).join("");
}

function addProject(event) {
  event.preventDefault();

  const title = $("#project-title")?.value.trim();
  const description = $("#project-description")?.value.trim() || "";
  const status = $("#project-status")?.value || "Planning";
  const progress = Number($("#project-progress")?.value || 0);

  if (!title) {
    showToast("Please enter a project title.", true);
    return;
  }

  projects.unshift({
    id: makeId(),
    title,
    description,
    status,
    progress: Math.max(0, Math.min(100, progress))
  });

  if (!saveStorage("projects", projects)) return;

  renderProjects();
  $("#project-form")?.reset();
  closeModal($("#project-modal"));

  showToast("Project added successfully.");
}

function setupProjects() {
  renderProjects();

  $("#project-form")?.addEventListener("submit", addProject);
}

/* =========================================
   MEMBER DISPLAY
========================================= */

function setupMemberProfile() {
  const nameInput = $("#profile-name");
  const savedName = readStorage("profileName", "");

  if (nameInput && savedName) {
    nameInput.value = savedName;
  }

  $("#profile-form")?.addEventListener("submit", event => {
    event.preventDefault();

    const name = nameInput?.value.trim();

    if (!name) {
      showToast("Please enter your display name.", true);
      return;
    }

    if (!saveStorage("profileName", name)) return;

    const profileName = $(".profile-name");

    if (profileName) {
      profileName.textContent = name;
    }

    const avatar = $(".profile-button .avatar");

    if (avatar) {
      avatar.textContent = getInitials(name);
    }

    showToast("Display name saved in this browser.");
  });
}

/* =========================================
   DASHBOARD STATISTICS
========================================= */

function updateDashboardStats() {
  const statValues = $$(".stat-value");

  if (!statValues.length) return;

  const pendingCount = assignments.filter(
    item => item.status !== "Completed"
  ).length;

  const completedCount = assignments.filter(
    item => item.status === "Completed"
  ).length;

  const values = {
    assignments: assignments.length,
    pending: pendingCount,
    completed: completedCount,
    projects: projects.length
  };

  const statMap = {
    assignments: ["[data-stat='assignments']", "#stat-assignments"],
    pending: ["[data-stat='pending']", "#stat-pending"],
    completed: ["[data-stat='completed']", "#stat-completed"],
    projects: ["[data-stat='projects']", "#stat-projects"]
  };

  Object.entries(statMap).forEach(([key, selectors]) => {
    selectors.forEach(selector => {
      const element = $(selector);

      if (element) {
        element.textContent = values[key];
      }
    });
  });
}

/* =========================================
   SEARCH
========================================= */

function setupSearch() {
  const searchInput = $("#global-search");

  if (!searchInput) return;

  searchInput.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;

    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      showToast("Type something to search.", true);
      return;
    }

    const searchTargets = [
      { page: "assignments", items: assignments },
      { page: "notes", items: notes },
      { page: "announcements", items: announcements },
      { page: "projects", items: projects }
    ];

    const match = searchTargets.find(target =>
      target.items.some(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(query)
        )
      )
    );

    if (!match) {
      showToast("No matching item found.");
      return;
    }

    navigateTo(match.page);
    showToast(`Matching item found in ${pageTitles[match.page]}.`);
  });
}

/* =========================================
   SETTINGS
========================================= */

function setupSettings() {
  const themeSwitch = $("#theme-switch");

  if (themeSwitch) {
    themeSwitch.checked = readStorage("theme", "dark") === "light";

    themeSwitch.addEventListener("change", () => {
      const isLight = themeSwitch.checked;

      document.body.classList.toggle("light-theme", isLight);
      saveStorage("theme", isLight ? "light" : "dark");

      showToast(
        isLight
          ? "Light theme enabled if supported by your stylesheet."
          : "Dark theme enabled."
      );
    });
  }

  const savedTheme = readStorage("theme", "dark");

  document.body.classList.toggle("light-theme", savedTheme === "light");

  $$("[data-reset-demo]").forEach(button => {
    button.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Reset this browser's MH Class Hub demo data? This cannot be undone."
      );

      if (!confirmed) return;

      [
        "messages",
        "assignments",
        "notes",
        "announcements",
        "projects",
        "profileName"
      ].forEach(key => {
        try {
          localStorage.removeItem(STORAGE_PREFIX + key);
        } catch (error) {
          console.warn("Could not clear saved data:", error);
        }
      });

      window.location.reload();
    });
  });
}

/* =========================================
   QUICK ACTIONS
========================================= */

function setupQuickActions() {
  $$("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;

      const actionPages = {
        chat: "chat",
        assignments: "assignments",
        notes: "notes",
        announcements: "announcements",
        projects: "projects",
        members: "members"
      };

      if (actionPages[action]) {
        navigateTo(actionPages[action]);
      }
    });
  });
}

/* =========================================
   NOTIFICATION BUTTON
========================================= */

function setupNotifications() {
  $("#notification-button")?.addEventListener("click", () => {
    navigateTo("announcements");
    showToast("You are viewing class announcements.");
  });
}

/* =========================================
   INITIALIZE APP
========================================= */

function initializeApp() {
  setupNavigation();
  setupSidebar();
  setupModals();

  setupChat();
  setupAssignments();
  setupNotes();
  setupAnnouncements();
  setupProjects();

  setupMemberProfile();
  setupSearch();
  setupSettings();
  setupQuickActions();
  setupNotifications();

  updateDashboardStats();

  const savedName = readStorage("profileName", "");

  if (savedName) {
    const nameElement = $(".profile-name");
    const avatarElement = $(".profile-button .avatar");

    if (nameElement) {
      nameElement.textContent = savedName;
    }

    if (avatarElement) {
      avatarElement.textContent = getInitials(savedName);
    }
  }

  console.log("MH Class Hub initialized successfully.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
