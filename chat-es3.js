// ======================================================
//  SAFARI 3.1.2 COMPATIBLE CHAT-ES3.JS
//  WITH FULL SANITIZATION TO PREVENT JSON PARSE ERRORS
// ======================================================


// ===============================
//  POLYFILLS FOR OLD SAFARI
// ===============================

// String trim
function trimString(str) {
  return str.replace(/^\s+|\s+$/g, "");
}

// localStorage polyfill using cookies if needed
(function () {
  if (typeof window.localStorage !== "undefined") return;

  var LS_PREFIX = "ls_";

  function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
    return null;
  }

  function setCookie(name, value) {
    var date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie =
      name + "=" + value + "; expires=" + date.toGMTString() + "; path=/";
  }

  window.localStorage = {
    getItem: function (key) {
      return getCookie(LS_PREFIX + key);
    },
    setItem: function (key, value) {
      setCookie(LS_PREFIX + key, value);
    },
    removeItem: function (key) {
      setCookie(LS_PREFIX + key, "");
    }
  };
})();

// Minimal JSON polyfill
(function () {
  if (typeof window.JSON !== "undefined") return;

  window.JSON = {
    stringify: function (obj) {
      if (obj === null) return "null";

      var t = typeof obj;
      if (t === "string") {
        return '"' + obj.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
      }
      if (t === "number" || t === "boolean") return String(obj);

      if (obj instanceof Array) {
        var arr = [];
        for (var i = 0; i < obj.length; i++) arr.push(JSON.stringify(obj[i]));
        return "[" + arr.join(",") + "]";
      }

      var props = [];
      for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
          props.push(JSON.stringify(k) + ":" + JSON.stringify(obj[k]));
        }
      }
      return "{" + props.join(",") + "}";
    },

    parse: function (text) {
      return eval("(" + text + ")");
    }
  };
})();


// ===============================
//  SANITIZATION LAYER
// ===============================
//
// Fixes malformed JSON, control characters, invalid UTF-8,
// and Safari 3 encoding issues.
//
// ===============================

// Remove ALL control characters except \n
var CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

// Remove characters Safari 3.1.2 cannot encode (e.g., emojis)
var HIGH_UNICODE_REGEX = /[\u0080-\uFFFF]/g;

/**
 * Cleans a string so that JSON.stringify ALWAYS produces valid JSON
 */
function sanitize(str) {
  if (!str) return "";

  // 1. Ensure it is a string
  str = String(str);

  // 2. Remove C0 control chars (JSON forbidden)
  str = str.replace(CONTROL_CHARS_REGEX, "");

  // 3. Remove unsupported high unicode (Safari 3 cannot handle)
  str = str.replace(HIGH_UNICODE_REGEX, "");

  // 4. Normalize newlines to "\n"
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return str;
}


// ===============================
//  ROLES & PERSONAS
// ===============================

var Roles = {
  User: "user",
  Assistant: "assistant",
  Developer: "developer"
};

var PERSONAS = [
  {
    name: "Bucky",
    prompt: sanitize("You are a helpful assistant named Bucky after the UW-Madison Mascot. Your goal is to help the user with whatever queries they have."),
    initialMessage: sanitize("Hello, my name is Bucky. How can I help you?")
  },
  {
    name: "Pirate Pete",
    prompt: sanitize("You are a helpful pirate assisting your mateys with their questions. Respond like a pirate would."),
    initialMessage: sanitize("Ahoy matey! I be Pirate Pete. What knowledge be ye seekin'?")
  },
  {
    name: "Jordan Love",
    prompt: sanitize("You are the quarterback for the Green Bay Packers, ready to answer the questions of your fans."),
    initialMessage: sanitize("Hey, what’s up? I’m Jordan Love. What can I help with today?")
  }
];


// ===============================
//  STATE
// ===============================

var currentPersona = null;
var currentPersonaName = null;
var messages = [];

var elPersonaSelect = null;
var elNewChatBtn = null;
var elMessageList = null;
var elInputForm = null;
var elInputText = null;
var elSendBtn = null;
var elLoadingIndicator = null;


// ===============================
//  STORAGE HELPERS
// ===============================

function loadPersonaFromStorage() {
  var x = localStorage.getItem("persona");
  if (!x) return null;
  try {
    return JSON.parse(x).name;
  } catch (e) {
    return null;
  }
}

function savePersonaToStorage(obj) {
  localStorage.setItem("persona", JSON.stringify(obj));
}

function loadMessagesFromStorage(def) {
  var x = localStorage.getItem("messages");
  if (!x) return def;
  try {
    return JSON.parse(x);
  } catch (e) {
    return def;
  }
}

function saveMessagesToStorage(arr) {
  localStorage.setItem("messages", JSON.stringify(arr));
}


// ===============================
//  RENDERING
// ===============================

function renderPersonaSelect() {
  elPersonaSelect.options.length = 0;
  for (var i = 0; i < PERSONAS.length; i++) {
    var opt = document.createElement("option");
    opt.value = PERSONAS[i].name;
    opt.appendChild(document.createTextNode(PERSONAS[i].name));
    if (PERSONAS[i].name === currentPersonaName) opt.selected = true;
    elPersonaSelect.appendChild(opt);
  }
}

function renderMessageContent(msg) {
  var div = document.createElement("div");
  var parts = sanitize(msg.content).split(/\n/);
  for (var i = 0; i < parts.length; i++) {
    if (i > 0) div.appendChild(document.createElement("br"));
    div.appendChild(document.createTextNode(parts[i]));
  }
  return div;
}

function renderMessages() {
  while (elMessageList.firstChild) {
    elMessageList.removeChild(elMessageList.firstChild);
  }

  for (var i = 0; i < messages.length; i++) {
    var m = messages[i];
    if (m.role === Roles.Developer) continue;

    var row = document.createElement("div");
    row.className = "message-row";

    var bubble = document.createElement("div");
    bubble.className =
      m.role === Roles.User ? "user-message" : "assistant-message";

    bubble.appendChild(renderMessageContent(m));
    row.appendChild(bubble);
    elMessageList.appendChild(row);
  }

  if (elMessageList.lastChild && elMessageList.lastChild.scrollIntoView) {
    elMessageList.lastChild.scrollIntoView(false);
  }
}


// ===============================
//  STATE MGMT
// ===============================

function setMessages(arr) {
  messages = arr;
  saveMessagesToStorage(messages);
  renderMessages();
}

function addMessage(role, content) {
  var arr = messages.slice(0);
  arr.push({
    role: role,
    content: sanitize(content)
  });
  setMessages(arr);
}

function initMessagesForPersona(p) {
  setMessages([
    { role: Roles.Developer, content: sanitize(p.prompt) },
    { role: Roles.Assistant, content: sanitize(p.initialMessage) }
  ]);
}


// ===============================
//  PERSONA SWITCHING
// ===============================

function findPersonaByName(name) {
  for (var i = 0; i < PERSONAS.length; i++)
    if (PERSONAS[i].name === name) return PERSONAS[i];
  return PERSONAS[0];
}

function switchPersona(name) {
  currentPersonaName = name;
  currentPersona = findPersonaByName(name);
  savePersonaToStorage(currentPersona);
  initMessagesForPersona(currentPersona);
  renderPersonaSelect();
}

function handleNewChatClick() {
  initMessagesForPersona(currentPersona);
}


// ===============================
//  LOADING UI
// ===============================

function setLoading(flag) {
  elLoadingIndicator.style.display = flag ? "" : "none";
  elSendBtn.disabled = flag;
  elInputText.disabled = flag;
}


// ===============================
//  SEND TO PROXY → CS571
// ===============================

function sendToModel(userInput) {
  // Build sanitized history
  var history = [];
  for (var i = 0; i < messages.length; i++) {
    history.push({
      role: messages[i].role,
      content: sanitize(messages[i].content)
    });
  }
  history.push({
    role: Roles.User,
    content: sanitize(userInput)
  });

  // Build payload
  var payload = JSON.stringify(history);

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "http://LOCAL_IP_OF_PROXY_SERVER:8080/cs571", true);
  xhr.setRequestHeader("Content-Type", "application/json");

  try {
    if (typeof CS571 !== "undefined" && CS571 && CS571.getBadgerId) {
      xhr.setRequestHeader("X-CS571-ID", CS571.getBadgerId());
    }
  } catch (e) {}

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      setLoading(false);

      if (xhr.status >= 200 && xhr.status < 300) {
        var resp = xhr.responseText || "";
        var constructed = "";

        // Each line should be a JSON object with delta:String
        var lines = resp.split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
          var line = trimString(lines[i]);
          if (!line) continue;
          try {
            var obj = JSON.parse(line);
            if (obj && obj.delta) {
              constructed += sanitize(obj.delta);
            }
          } catch (e) {}
        }

        addMessage(Roles.Assistant, constructed || "[no response]");
      } else {
        addMessage(
          Roles.Assistant,
          "Error contacting CS571 server (status " + xhr.status + ")"
        );
      }
    }
  };

  xhr.send(payload);
}


// ===============================
//  FORM HANDLING
// ===============================

function handleInputFormSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  var text = sanitize(trimString(elInputText.value));
  if (!text) return false;

  setLoading(true);

  addMessage(Roles.User, text);
  elInputText.value = "";

  sendToModel(text);

  return false;
}


// ===============================
//  INIT
// ===============================

function initApp() {
  elPersonaSelect = document.getElementById("persona-select");
  elNewChatBtn = document.getElementById("new-chat-btn");
  elMessageList = document.getElementById("message-list");
  elInputForm = document.getElementById("input-form");
  elInputText = document.getElementById("input-text");
  elSendBtn = document.getElementById("send-btn");
  elLoadingIndicator = document.getElementById("loading-indicator");

  var storedName = loadPersonaFromStorage();
  currentPersona = storedName ? findPersonaByName(storedName) : PERSONAS[0];
  currentPersonaName = currentPersona.name;

  var def = [
    { role: Roles.Developer, content: currentPersona.prompt },
    { role: Roles.Assistant, content: currentPersona.initialMessage }
  ];
  messages = loadMessagesFromStorage(def);

  renderPersonaSelect();
  renderMessages();

  elPersonaSelect.onchange = function () {
    switchPersona(elPersonaSelect.value);
  };
  elNewChatBtn.onclick = handleNewChatClick;
  elInputForm.onsubmit = handleInputFormSubmit;
}

if (window.addEventListener) {
  window.addEventListener("load", initApp, false);
} else if (window.attachEvent) {
  window.attachEvent("onload", initApp);
} else {
  window.onload = initApp;
}
