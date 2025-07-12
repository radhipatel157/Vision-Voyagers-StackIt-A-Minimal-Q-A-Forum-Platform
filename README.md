# Rich Text Q&A Platform

## 📘 Project Overview

This is a Q&A platform designed with an intuitive user experience and powerful features for content formatting, interaction, and notifications.


## ✨ Features

### 1. Rich Text Editor for Questions & Answers

The platform supports a feature-rich editor with:

- **Text Formatting**: Bold, Italic, Strikethrough
- **Lists**: Numbered and Bullet Points
- **Media & Links**:
  - Emoji insertion 😊
  - Hyperlink insertion (URLs)
  - Image uploads
- **Text Alignment**: Left, Center, Right

---

### 2. Answering Questions

- Users can post answers to any question
- The same rich text editor is used for answers
- **Authentication required**: Only logged-in users can post answers

---

### 3. Voting & Accepting Answers

- Upvote / Downvote answers
- Question owners can mark one answer as **Accepted**

---

### 4. Tagging System

- Every question must include **relevant tags**
- Helps in searchability and organization

---

### 5. Notification System 🔔

- A notification icon is shown in the top navigation bar
- Users receive alerts for:
  - New answers to their questions
  - Comments on their answers
  - Mentions via `@username`
- The bell icon displays the count of unread notifications
- Clicking it opens a dropdown of recent activities

---

## 🚀 Getting Started Locally

Make sure Node.js & npm are installed.

### Clone and Run

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>

# 2. Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
