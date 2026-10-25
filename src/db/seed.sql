-- NimbusBoard Seed Data

-- Fictional users: Ari (admin), Noah (moderator), Mira (regular user)
INSERT INTO users (id, username, email, password_hash, role, bio, avatar_url) VALUES
(1, 'ari', 'ari@nimbus.local', '$2b$10$/ja2zhcScD2.Oj8ef9I7COIAHgrSmR9/Pf2gzw9YRlgvZgFnuTGui', 'admin', 'Lead Security Architect & Administrator for NimbusBoard. Overseeing compliance and audit logs.', '/avatars/default-admin.svg'),
(2, 'noah', 'noah@nimbus.local', '$2b$10$qq39KDLIyDNuitrRx0UZzOp7m7CwPkPt/PkkBV3oJkPcn8/AgDiQm', 'moderator', 'Community moderator and support queue reviewer. Keeping discussions productive.', '/avatars/default-mod.svg'),
(3, 'mira', 'mira@nimbus.local', '$2b$10$Ni9WI28DQvXpCERT6iqJW.Q3/88xQjqLR7ljJdaftYEnyvzJbNKOK', 'user', 'Product designer & frontend enthusiast. Exploring team collaboration features.', '/avatars/default-user.svg');

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Posts
INSERT INTO posts (id, user_id, author_name, title, body, tags) VALUES
(1, 1, 'Ari', 'Welcome to NimbusBoard Security Lab', 'Welcome to the NimbusBoard collaboration application. Use this training workspace to learn about XSS defense in depth, contextual encoding, and secure architectures.', 'welcome,security,getting-started'),
(2, 3, 'Mira', 'Kanban Board v2 Release Notes', 'We just updated the sprint board layout! Feel free to leave comments, propose cards, and review upcoming tasks.', 'design,sprint,announcement');

SELECT setval('posts_id_seq', (SELECT MAX(id) FROM posts));

-- Comments
INSERT INTO comments (id, post_id, user_id, author_name, body) VALUES
(1, 1, 2, 'Noah', 'Great to have the security training modules online. Looking forward to reviewing feedback submissions.'),
(2, 2, 1, 'Ari', 'The new layout looks clean and responsive.');

SELECT setval('comments_id_seq', (SELECT MAX(id) FROM comments));

-- Kanban Tasks
INSERT INTO tasks (id, title, description, status, priority, assignee_name) VALUES
(1, 'Implement Contextual Encoding', 'Ensure all user input reflected in HTML or attributes is contextually encoded.', 'todo', 'high', 'Mira'),
(2, 'Review CSP Directive Configuration', 'Audit script-src and object-src in route response headers.', 'in_progress', 'high', 'Ari'),
(3, 'Audit Rich-Text Markdown Renderer', 'Verify link scheme allowlists and HTML passthrough sanitization.', 'review', 'medium', 'Noah'),
(4, 'Deploy Local OOB Callback Listener', 'Verify callback event collection for simulated blind XSS workflows.', 'done', 'low', 'Ari');

SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks));

-- Feedback / Support
INSERT INTO feedback (id, name, email, message, category, status) VALUES
(1, 'External Contributor', 'contributor@example.com', 'Feature request: Add syntax highlighting to the markdown preview widget.', 'feature', 'pending');

SELECT setval('feedback_id_seq', (SELECT MAX(id) FROM feedback));

-- Simulated Email Notifications
INSERT INTO emails (id, recipient_email, subject, body_html, status) VALUES
(1, 'noah@nimbus.local', 'Daily Moderation Digest', '<p>Hello Noah,</p><p>You have 1 pending support ticket to review in the moderation queue.</p><p>Best regards,<br>NimbusBoard Automation</p>', 'sent');

SELECT setval('emails_id_seq', (SELECT MAX(id) FROM emails));

-- Flags for all 10 XSS Categories
INSERT INTO flags (category, exercise_id, flag_code, description, points) VALUES
('reflected', 'XSS-REFL-01', 'FLAG{xss_reflected_context_bypass}', 'Reflected input in search query body and attribute context', 100),
('stored', 'XSS-STOR-01', 'FLAG{xss_stored_rendering_danger}', 'Stored content in posts, comments, and profile biography', 100),
('dom', 'XSS-DOM-01', 'FLAG{xss_dom_sink_flow}', 'DOM sinks in live preview and URL fragment processing', 100),
('mutation', 'XSS-MUT-01', 'FLAG{xss_mutation_parser_mismatch}', 'Mutation XSS discrepancy between parser and sanitizer', 100),
('blind', 'XSS-BLIND-01', 'FLAG{xss_blind_callback_verified}', 'Blind XSS via support feedback queue with local OOB listener', 100),
('self', 'XSS-SELF-01', 'FLAG{xss_self_console_awareness}', 'Self-XSS social engineering and developer console protection', 100),
('csp', 'XSS-CSP-01', 'FLAG{xss_csp_weakness_analyzed}', 'Content Security Policy analysis: unsafe-inline and nonce reuse', 100),
('framework', 'XSS-FW-01', 'FLAG{xss_framework_escape_react}', 'Modern framework escape hatch dangerouslySetInnerHTML and javascript: hrefs', 100),
('markdown', 'XSS-MD-01', 'FLAG{xss_markdown_scheme_bypass}', 'Markdown parser HTML passthrough and malicious URI schemes', 100),
('encoding', 'XSS-ENC-01', 'FLAG{xss_encoding_filter_regression}', 'Double-decoding, normalization flaws, and naive tag blacklists', 100);

-- Initial Audit Log
INSERT INTO audit_logs (actor, action, details) VALUES
('system', 'SEED_DATABASE', 'Initialized seed users, posts, tasks, feedback, and flags.');
