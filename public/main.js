const socket = io();
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const send = document.getElementById("send");

const appendMessage = (msg, type = "bot") => {
  const bubble = document.createElement("div");
  bubble.className = `p-3 rounded max-w-xs ${type === "bot" ? "bg-gray-200 self-start" : "bg-blue-500 text-white self-end"}`;
  bubble.textContent = msg;
  const container = document.createElement("div");
  container.className = `flex ${type === "bot" ? "justify-start" : "justify-end"}`;
  container.appendChild(bubble);
  chat.appendChild(container);
  chat.scrollTop = chat.scrollHeight;
};

send.onclick = () => {
  const msg = input.value.trim();
  if (!msg) return;
  appendMessage(msg, "user");
  socket.emit("user-message", msg);
  input.value = "";
};

socket.on("bot-message", (msg) => appendMessage(msg));
