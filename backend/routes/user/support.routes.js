const express = require("express");

const router = express.Router();

const {
  isAuth,
} = require("../../middlewares/auth.middleware");

const upload = require("../../middlewares/upload.middleware");

const {
  createTicket,
  getMyTickets,
  getSingleTicket,
  replyToTicket,
  getTicketConversation,
} = require("../../controllers/support.controller");


// ========================================
// CREATE TICKET
// ========================================
router.post(
  "/",
  isAuth,
  upload.array("attachments", 5),
  createTicket
);


// ========================================
// GET MY TICKETS
// ========================================
router.get(
  "/",
  isAuth,
  getMyTickets
);


// ========================================
// GET SINGLE TICKET
// ========================================
router.get(
  "/:id",
  isAuth,
  getSingleTicket
);


// ========================================
// REPLY TO TICKET
// ========================================
router.post(
  "/reply/:id",
  isAuth,
  upload.array("attachments", 5),
  replyToTicket
);

// ========================================
// GET TICKET CONVERSATION
// ========================================
router.get(
  "/conversation/:id",
  isAuth,
  getTicketConversation
);


module.exports = router;