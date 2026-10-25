# Category 02 — Stored Cross-Site Scripting (Stored XSS)

## Overview
Stored XSS (or Persistent XSS) occurs when malicious input is submitted to the application, stored in a backend database or persistent datastore, and subsequently served to other users without adequate contextual encoding or sanitization upon retrieval.

In NimbusBoard, Category 2 explores:
1. **Team Feed Post & Comment Markup** (`XSS-STOR-01`)
2. **User Profile Field Multi-View Persistence** (`XSS-STOR-02`)

---

## Exercise 1: XSS-STOR-01 — Team Feed Post & Comment Rich Content

### Vulnerability Context
- **Target Route**: `POST /api/posts` and `GET /api/posts`
- **Component**: [client/src/components/FeedView.jsx](file:///c:/nimbusboard-xss-lab/client/src/components/FeedView.jsx)
- **Sink**: `.post-body` rendered via `dangerouslySetInnerHTML`

### Vulnerable Code Pattern
```jsx
// client/src/components/FeedView.jsx
{isVuln ? (
  <div className="post-body" dangerouslySetInnerHTML={{ __html: post.body }} />
) : (
  <div className="post-body">{post.body}</div>
)}
```

### Demonstration Payload
- **Probe**: `<i>stored_rich_content_marker</i>`
- **Submission**: Enter a post title and the probe into the post update composer on the Team Feed view, then click **Publish Update**.

### Expected Behavior
- **Vulnerable Mode**: The stored post HTML is parsed by the browser; an `<i>` italic element exists in the DOM inside `.post-body`.
- **Fixed Mode**: React interpolates `post.body` as text; no `<i>` elements are created, and literal tags are safely displayed.

---

## Exercise 2: XSS-STOR-02 — Multi-View Profile Field Persistence

### Vulnerability Context
- **Target Route**: `PUT /api/users/profile` and `GET /api/users/profile`
- **Component**: [client/src/components/ProfileView.jsx](file:///c:/nimbusboard-xss-lab/client/src/components/ProfileView.jsx)
- **Sink**: User biography rendered in the user header, author cards, and detailed bio preview.

### Vulnerable Code Pattern
```jsx
// client/src/components/ProfileView.jsx
{isVuln ? (
  <div className="profile-bio-box" dangerouslySetInnerHTML={{ __html: user.bio }} />
) : (
  <div className="profile-bio-box">{user.bio}</div>
)}
```

### Demonstration Payload
- **Probe**: `<u>profile_bio_underline</u>`
- **Submission**: In Profile view (as Ari or Mira), update the Biography field to the probe and click **Save Biography**.

### Expected Behavior
- **Vulnerable Mode**: An `<u>` underline element is generated in the profile DOM.
- **Fixed Mode**: The tags are rendered literally without underline DOM nodes.

---

## Verification

Run the automated Playwright verification test:
```bash
npx playwright test -g "CAT-02"
```
