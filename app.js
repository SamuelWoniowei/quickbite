const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use(
  session({
    store: new FileStore({}),
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

const menu = [
  { id: 1, name: "Jollof Rice with Chicken", price: 2500 },
  { id: 2, name: "Fried Rice with Beef", price: 2700 },
  { id: 3, name: "Pounded Yam & Egusi Soup", price: 3000 },
  { id: 4, name: "Bole and Fish", price: 2000 },
];

const optionsMessage = `\nSelect 1 to Place an order\nSelect 99 to checkout order\nSelect 98 to see order history\nSelect 97 to see current order\nSelect 0 to cancel order`;

io.on("connection", (socket) => {
  const sessionId = socket.handshake.headers["user-agent"];
  if (!socket.sessionStore) socket.sessionStore = {};
  if (!socket.sessionStore[sessionId]) {
    socket.sessionStore[sessionId] = {
      currentOrder: [],
      orderHistory: [],
    };
  }

  const sessionData = socket.sessionStore[sessionId];

  const send = (msg) => socket.emit("bot-message", msg);

  send("👋 Welcome to ChatBite Restaurant!" + optionsMessage);

  socket.on("user-message", (msg) => {
    const input = msg.trim();
    if (input === "1") {
      let menuList = menu
        .map((item, idx) => `${idx + 1}. ${item.name} - ₦${item.price}`)
        .join("\n");
      send("🍽️ Here's our menu:\n" + menuList + "\n\nSelect item number to order.");
    } else if (["1", "2", "3", "4"].includes(input)) {
      const item = menu[parseInt(input) - 1];
      if (item) {
        sessionData.currentOrder.push(item);
        send(`✅ ${item.name} added to your order.` + optionsMessage);
      }
    } else if (input === "97") {
      if (sessionData.currentOrder.length) {
        const summary = sessionData.currentOrder
          .map((i) => `- ${i.name} - ₦${i.price}`)
          .join("\n");
        send("🛒 Current Order:\n" + summary);
      } else {
        send("🚫 No current order." + optionsMessage);
      }
    } else if (input === "98") {
      if (sessionData.orderHistory.length) {
        const history = sessionData.orderHistory
          .map((order, idx) => `Order ${idx + 1}:\n${order.map(i => `- ${i.name} - ₦${i.price}`).join("\n")}`)
          .join("\n\n");
        send("📜 Order History:\n" + history);
      } else {
        send("📭 No order history yet." + optionsMessage);
      }
    } else if (input === "99") {
      if (sessionData.currentOrder.length) {
        sessionData.orderHistory.push(sessionData.currentOrder);
        send("✅ Order placed. Proceed to payment: /pay" + optionsMessage);
        sessionData.currentOrder = [];
      } else {
        send("🚫 No order to place." + optionsMessage);
      }
    } else if (input === "0") {
      sessionData.currentOrder = [];
      send("🗑️ Current order canceled." + optionsMessage);
    } else {
      send("❓ Invalid input." + optionsMessage);
    }
  });
});

app.post("/pay", async (req, res) => {
  try {
    const amount = 3000 * 100; // ₦3000 in kobo
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: "testuser@example.com",
        amount,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
        },
      }
    );
    res.json({ url: response.data.data.authorization_url });
  } catch (error) {
    res.status(500).send("Payment init failed.");
  }
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));