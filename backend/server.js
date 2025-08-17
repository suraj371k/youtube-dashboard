// server.js - Updated comment controllers with better error handling

import express from "express";
import mongoose from "mongoose";
import { google } from "googleapis";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Models
import Note from "./models/note.model.js";
import Log from "./models/log.model.js";
import connectDb from "./config/db.js";

connectDb();

// Google Auth client
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Set refresh token if available
if (process.env.REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
}

const youtube = google.youtube({ version: "v3", auth: oauth2Client });

// Helper function to refresh access token
const refreshAccessToken = async () => {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    console.log("✅ Access token refreshed");
    return true;
  } catch (error) {
    console.error("❌ Failed to refresh access token:", error);
    return false;
  }
};

// Helper function to check and refresh token if needed
const ensureValidToken = async () => {
  try {
    // Check if we have a valid access token
    const accessToken = oauth2Client.credentials.access_token;
    const expiry = oauth2Client.credentials.expiry_date;
    
    if (!accessToken || (expiry && Date.now() >= expiry)) {
      console.log("🔄 Token expired or missing, refreshing...");
      return await refreshAccessToken();
    }
    return true;
  } catch (error) {
    console.error("❌ Token validation error:", error);
    return false;
  }
};

/* ---------- API ENDPOINTS ---------- */

// ✅ 1. Login route (redirects to Google)
app.get("/login", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube"
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log("✅ Access Token:", tokens.access_token);
    console.log("✅ Refresh Token:", tokens.refresh_token);

    // TODO: Save tokens to database for persistence
    res.redirect("http://localhost:3000/dashboard");
  } catch (err) {
    console.error("Error exchanging code for tokens", err);
    res.status(500).send("Authentication failed");
  }
});

// 1. Get Video Details
app.get("/api/video/:id", async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Ensure we have a valid token
    const tokenValid = await ensureValidToken();
    if (!tokenValid) {
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "Please login again" 
      });
    }

    const response = await youtube.videos.list({
      part: "snippet,statistics",
      id: videoId,
    });

    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ 
        error: "Video not found", 
        message: "No video found with the provided ID" 
      });
    }

    await Log.create({ action: "FETCH_VIDEO", details: { videoId } });
    res.json(response.data.items[0]);
  } catch (error) {
    console.error("❌ Error fetching video:", error);
    await Log.create({ 
      action: "FETCH_VIDEO_ERROR", 
      details: { videoId: req.params.id, error: error.message } 
    });
    
    res.status(500).json({ 
      error: "Failed to fetch video", 
      message: error.message 
    });
  }
});

// 2. Update Video Metadata
app.put("/api/video/:id", async (req, res) => {
  try {
    const { title, description } = req.body;
    const videoId = req.params.id;

    // Validate input
    if (!title && !description) {
      return res.status(400).json({ 
        error: "Invalid input", 
        message: "Title or description is required" 
      });
    }

    // Ensure we have a valid token
    const tokenValid = await ensureValidToken();
    if (!tokenValid) {
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "Please login again" 
      });
    }

    // First, get the current video data
    const currentVideo = await youtube.videos.list({
      part: "snippet",
      id: videoId,
    });

    if (!currentVideo.data.items || currentVideo.data.items.length === 0) {
      return res.status(404).json({ 
        error: "Video not found", 
        message: "No video found with the provided ID" 
      });
    }

    const currentSnippet = currentVideo.data.items[0].snippet;

    // Update with new data, keeping existing data for fields not being updated
    const updatedSnippet = {
      ...currentSnippet,
      title: title || currentSnippet.title,
      description: description || currentSnippet.description,
    };

    const response = await youtube.videos.update({
      part: "snippet",
      requestBody: {
        id: videoId,
        snippet: updatedSnippet,
      },
    });

    await Log.create({ action: "UPDATE_VIDEO", details: { videoId, title, description } });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error updating video:", error);
    await Log.create({ 
      action: "UPDATE_VIDEO_ERROR", 
      details: { videoId: req.params.id, error: error.message } 
    });
    
    res.status(500).json({ 
      error: "Failed to update video", 
      message: error.message 
    });
  }
});

// 3. Add Comment - IMPROVED VERSION
app.post("/api/video/:id/comment", async (req, res) => {
  try {
    const { text } = req.body;
    const videoId = req.params.id;

    // Validate input
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        error: "Invalid input", 
        message: "Comment text is required" 
      });
    }

    if (text.length > 10000) {
      return res.status(400).json({ 
        error: "Invalid input", 
        message: "Comment text is too long (max 10000 characters)" 
      });
    }

    // Ensure we have a valid token
    const tokenValid = await ensureValidToken();
    if (!tokenValid) {
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "Please login again" 
      });
    }

    // Check if video exists and comments are enabled
    const videoCheck = await youtube.videos.list({
      part: "snippet,status",
      id: videoId,
    });

    if (!videoCheck.data.items || videoCheck.data.items.length === 0) {
      return res.status(404).json({ 
        error: "Video not found", 
        message: "No video found with the provided ID" 
      });
    }

    // Add the comment
    const response = await youtube.commentThreads.insert({
      part: "snippet",
      requestBody: {
        snippet: {
          videoId: videoId,
          topLevelComment: { 
            snippet: { 
              textOriginal: text.trim() 
            } 
          },
        },
      },
    });

    await Log.create({ action: "ADD_COMMENT", details: { videoId, text } });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error adding comment:", error);
    
    let errorMessage = "Failed to add comment";
    let statusCode = 500;

    // Handle specific YouTube API errors
    if (error.code === 400) {
      statusCode = 400;
      if (error.message.includes("commentsDisabled")) {
        errorMessage = "Comments are disabled for this video";
      } else if (error.message.includes("videoNotFound")) {
        errorMessage = "Video not found";
        statusCode = 404;
      } else if (error.message.includes("forbidden")) {
        errorMessage = "You don't have permission to comment on this video";
        statusCode = 403;
      } else {
        errorMessage = error.message;
      }
    } else if (error.code === 401) {
      statusCode = 401;
      errorMessage = "Authentication required. Please login again.";
    } else if (error.code === 403) {
      statusCode = 403;
      errorMessage = "Permission denied. Check your YouTube API quota or permissions.";
    }

    await Log.create({ 
      action: "ADD_COMMENT_ERROR", 
      details: { videoId: req.params.id, text, error: error.message } 
    });
    
    res.status(statusCode).json({ 
      error: "Comment failed", 
      message: errorMessage,
      details: error.message 
    });
  }
});

// 4. Reply to Comment - IMPROVED VERSION
app.post("/api/comment/:id/reply", async (req, res) => {
  try {
    const { text } = req.body;
    const commentId = req.params.id;

    // Validate input
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        error: "Invalid input", 
        message: "Reply text is required" 
      });
    }

    if (text.length > 10000) {
      return res.status(400).json({ 
        error: "Invalid input", 
        message: "Reply text is too long (max 10000 characters)" 
      });
    }

    // Ensure we have a valid token
    const tokenValid = await ensureValidToken();
    if (!tokenValid) {
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "Please login again" 
      });
    }

    const response = await youtube.comments.insert({
      part: "snippet",
      requestBody: {
        snippet: {
          parentId: commentId,
          textOriginal: text.trim(),
        },
      },
    });

    await Log.create({ action: "REPLY_COMMENT", details: { commentId, text } });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error replying to comment:", error);
    
    let errorMessage = "Failed to reply to comment";
    let statusCode = 500;

    if (error.code === 400) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.code === 401) {
      statusCode = 401;
      errorMessage = "Authentication required. Please login again.";
    } else if (error.code === 403) {
      statusCode = 403;
      errorMessage = "Permission denied. Check your YouTube API quota or permissions.";
    } else if (error.code === 404) {
      statusCode = 404;
      errorMessage = "Comment not found or you don't have permission to reply.";
    }

    await Log.create({ 
      action: "REPLY_COMMENT_ERROR", 
      details: { commentId: req.params.id, text, error: error.message } 
    });
    
    res.status(statusCode).json({ 
      error: "Reply failed", 
      message: errorMessage,
      details: error.message 
    });
  }
});

// 5. Delete Comment - IMPROVED VERSION
app.delete("/api/comment/:id", async (req, res) => {
  try {
    const commentId = req.params.id;

    // Ensure we have a valid token
    const tokenValid = await ensureValidToken();
    if (!tokenValid) {
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "Please login again" 
      });
    }

    await youtube.comments.delete({ id: commentId });
    
    await Log.create({
      action: "DELETE_COMMENT",
      details: { commentId },
    });
    
    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting comment:", error);
    
    let errorMessage = "Failed to delete comment";
    let statusCode = 500;

    if (error.code === 400) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.code === 401) {
      statusCode = 401;
      errorMessage = "Authentication required. Please login again.";
    } else if (error.code === 403) {
      statusCode = 403;
      errorMessage = "Permission denied. You can only delete your own comments.";
    } else if (error.code === 404) {
      statusCode = 404;
      errorMessage = "Comment not found.";
    }

    await Log.create({ 
      action: "DELETE_COMMENT_ERROR", 
      details: { commentId: req.params.id, error: error.message } 
    });
    
    res.status(statusCode).json({ 
      error: "Delete failed", 
      message: errorMessage,
      details: error.message 
    });
  }
});

// 6. Notes CRUD
app.post("/api/notes", async (req, res) => {
  try {
    const note = await Note.create(req.body);
    await Log.create({ action: "ADD_NOTE", details: note });
    res.json(note);
  } catch (error) {
    console.error("❌ Error adding note:", error);
    res.status(500).json({ 
      error: "Failed to add note", 
      message: error.message 
    });
  }
});

app.get("/api/notes", async (req, res) => {
  try {
    const { q } = req.query;
    const notes = q
      ? await Note.find({ text: { $regex: q, $options: "i" } })
      : await Note.find();
    res.json(notes);
  } catch (error) {
    console.error("❌ Error fetching notes:", error);
    res.status(500).json({ 
      error: "Failed to fetch notes", 
      message: error.message 
    });
  }
});

// 7. Logs Viewer
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    console.error("❌ Error fetching logs:", error);
    res.status(500).json({ 
      error: "Failed to fetch logs", 
      message: error.message 
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    hasRefreshToken: !!process.env.REFRESH_TOKEN 
  });
});

app.listen(5000, () => console.log("Server running on 5000"));