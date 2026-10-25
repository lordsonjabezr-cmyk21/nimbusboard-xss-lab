# Solutions — Category 02: Stored XSS

## Challenge 1: XSS-STOR-01 (Team Feed Posts & Comments)

### 1. Root Cause Analysis
Team feed posts are saved to PostgreSQL via `POST /api/posts`. When the frontend loads the feed via `GET /api/posts`, `FeedView.jsx` renders `post.body` through `dangerouslySetInnerHTML`. Anyone viewing the feed executes the stored markup.

### 2. Harmless Proof of Concept
1. In the Team Feed composer, enter:
   - **Title**: `Sprint Security Update`
   - **Body**: `<i>stored_rich_content_marker</i>`
2. Click **Publish Update**.
3. Inspect `.post-body` in DevTools. An `<i>` element is rendered in the feed.

### 3. Remediation Diff
```diff
--- a/client/src/components/FeedView.jsx
+++ b/client/src/components/FeedView.jsx
@@ -88,3 +88,1 @@
-  <div className="post-body" dangerouslySetInnerHTML={{ __html: post.body }} />
+  <div className="post-body">{post.body}</div>
```
If rich HTML styling is required by business requirements, sanitize with DOMPurify:
```jsx
<div className="post-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body) }} />
```

---

## Challenge 2: XSS-STOR-02 (User Profile Persistence Across Views)

### 1. Root Cause Analysis
User biography updates submitted via `PUT /api/users/profile` are stored without sanitization. In `ProfileView.jsx`, `user.bio` is rendered using `dangerouslySetInnerHTML`. Because profile bios appear across multiple views (e.g. user card, post header, settings), stored payloads propagate throughout the application.

### 2. Harmless Proof of Concept
1. Navigate to `/profile`.
2. Under **Biography**, enter: `<u>profile_bio_underline</u>`.
3. Click **Save Biography**.
4. The biography renders as an underlined element `<u>` across the profile view.

### 3. Remediation Diff
```diff
--- a/client/src/components/ProfileView.jsx
+++ b/client/src/components/ProfileView.jsx
@@ -95,3 +95,1 @@
-  <div className="profile-bio-box" dangerouslySetInnerHTML={{ __html: user.bio }} />
+  <div className="profile-bio-box">{user.bio}</div>
```
