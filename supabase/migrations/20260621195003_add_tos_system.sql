-- Terms of Service versioning and acceptance tracking system

-- Table to store each version of the legal documents
CREATE TABLE IF NOT EXISTS tos_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'DAITA Legal Policies',
  content_html text NOT NULL,
  effective_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false
);

-- Table to record each user's acceptance
CREATE TABLE IF NOT EXISTS tos_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role text NOT NULL CHECK (user_role IN ('teacher', 'coach', 'mentor', 'student')),
  user_identifier text NOT NULL,
  tos_version_id uuid NOT NULL REFERENCES tos_versions(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  UNIQUE(user_role, user_identifier, tos_version_id)
);

-- Indexes
CREATE INDEX idx_tos_acceptances_user_lookup ON tos_acceptances(user_role, user_identifier);
CREATE INDEX idx_tos_versions_current ON tos_versions(is_current) WHERE is_current = true;

-- Enable RLS
ALTER TABLE tos_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tos_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS policies for tos_versions (publicly readable)
CREATE POLICY "tos_versions_select_all" ON tos_versions
  FOR SELECT TO anon, authenticated USING (true);

-- RLS policies for tos_acceptances
CREATE POLICY "tos_acceptances_select_own" ON tos_acceptances
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "tos_acceptances_insert_any" ON tos_acceptances
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- RPC: Check if user has accepted the current ToS version
CREATE OR REPLACE FUNCTION check_tos_accepted(p_user_role text, p_user_identifier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version_id uuid;
  v_accepted boolean;
BEGIN
  -- Get the current ToS version
  SELECT id INTO v_current_version_id
  FROM tos_versions
  WHERE is_current = true
  LIMIT 1;

  -- If no current version exists, consider it accepted (no ToS to accept)
  IF v_current_version_id IS NULL THEN
    RETURN true;
  END IF;

  -- Check if acceptance exists
  SELECT EXISTS(
    SELECT 1 FROM tos_acceptances
    WHERE user_role = p_user_role
      AND user_identifier = p_user_identifier
      AND tos_version_id = v_current_version_id
  ) INTO v_accepted;

  RETURN v_accepted;
END;
$$;

-- RPC: Record a ToS acceptance
CREATE OR REPLACE FUNCTION record_tos_acceptance(p_user_role text, p_user_identifier text, p_user_agent text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version_id uuid;
  v_version text;
BEGIN
  -- Get the current ToS version
  SELECT id, version INTO v_current_version_id, v_version
  FROM tos_versions
  WHERE is_current = true
  LIMIT 1;

  IF v_current_version_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active ToS version found');
  END IF;

  -- Insert acceptance (idempotent with ON CONFLICT)
  INSERT INTO tos_acceptances (user_role, user_identifier, tos_version_id, user_agent)
  VALUES (p_user_role, p_user_identifier, v_current_version_id, p_user_agent)
  ON CONFLICT (user_role, user_identifier, tos_version_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'version', v_version);
END;
$$;

-- RPC: Get the current ToS content
CREATE OR REPLACE FUNCTION get_current_tos()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'version', version,
    'title', title,
    'content_html', content_html,
    'effective_date', effective_date
  ) INTO v_result
  FROM tos_versions
  WHERE is_current = true
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- RPC: Get ToS acceptance stats (for admin)
CREATE OR REPLACE FUNCTION get_tos_acceptance_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_current_version_id uuid;
BEGIN
  SELECT id INTO v_current_version_id FROM tos_versions WHERE is_current = true LIMIT 1;

  IF v_current_version_id IS NULL THEN
    RETURN '{"total_acceptances": 0, "by_role": {}}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'total_acceptances', (SELECT count(*) FROM tos_acceptances WHERE tos_version_id = v_current_version_id),
    'by_role', (
      SELECT COALESCE(jsonb_object_agg(user_role, cnt), '{}'::jsonb)
      FROM (
        SELECT user_role, count(*) as cnt
        FROM tos_acceptances
        WHERE tos_version_id = v_current_version_id
        GROUP BY user_role
      ) sub
    ),
    'version', (SELECT version FROM tos_versions WHERE id = v_current_version_id),
    'effective_date', (SELECT effective_date FROM tos_versions WHERE id = v_current_version_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Seed the initial ToS version (v1.0.0)
INSERT INTO tos_versions (version, title, content_html, effective_date, is_current)
VALUES (
  '1.0.0',
  'DAITA Legal Policies - SVEF v1.0.0',
  '',
  '2026-06-21T00:00:00Z',
  true
);

-- Update with the actual content
UPDATE tos_versions SET content_html = E'<div class="tos-content">\n<section id="privacy-policy">\n<h2>Privacy Policy</h2>\n<p><strong>Effective Date:</strong> June 21, 2026</p>\n<p><strong>Last Updated:</strong> June 21, 2026</p>\n\n<h3>1. Introduction</h3>\n<p>Silicon Valley Education Foundation (\u201cSVEF,\u201d \u201cwe,\u201d \u201cour,\u201d or \u201cus\u201d) operates the D[ai]TA platform (\u201cService\u201d), a K\u201312 math tutoring support tool that helps teachers, college mentors, and students with differentiated instruction and personalized learning. This Privacy Policy explains how we collect, use, and protect information through the Service.</p>\n\n<h3>2. Who Uses the Service</h3>\n<ul>\n<li><strong>Teachers</strong> use D[ai]TA to manage student groups, generate lesson plans, and review analytics.</li>\n<li><strong>College Mentors</strong> use D[ai]TA to access lesson plans and record tutoring session notes.</li>\n<li><strong>Students</strong> use D[ai]TA during tutoring sessions to complete assessments and log their learning.</li>\n</ul>\n\n<h3>3. Information We Collect</h3>\n<h4>Student Information</h4>\n<ul>\n<li>First name and last initial</li>\n<li>Grade level</li>\n<li>Assigned teacher</li>\n<li>Math performance data (exit ticket scores, assessment responses)</li>\n<li>Group membership and session participation records</li>\n</ul>\n<h4>Student Records</h4>\n<p>Under FERPA, student records are educational records maintained by the school or a party acting for the school. D[ai]TA processes student records solely as a \u201cschool official\u201d with a legitimate educational interest, under direction of the school or district.</p>\n<h4>Teacher and Mentor Information</h4>\n<ul>\n<li>Full name and email address</li>\n<li>School and district affiliation</li>\n<li>University and major (mentors only)</li>\n<li>Lesson plans and session notes created within the platform</li>\n</ul>\n<h4>What We Do NOT Collect</h4>\n<ul>\n<li>Social Security numbers</li>\n<li>Home addresses of students</li>\n<li>Biometric data</li>\n<li>Financial information</li>\n<li>Health or medical records</li>\n</ul>\n\n<h3>4. How We Use Information</h3>\n<ul>\n<li>To provide differentiated math instruction and tutoring support</li>\n<li>To generate AI-powered lesson plans and grouping recommendations</li>\n<li>To track student progress and produce analytics for teachers and coaches</li>\n<li>To facilitate communication between teachers and college mentors</li>\n<li>To improve the Service and develop new features</li>\n</ul>\n\n<h3>5. Artificial Intelligence</h3>\n<p>D[ai]TA uses OpenAI\u2019s API to generate lesson plans, assessments, and instructional recommendations. When AI features are used:</p>\n<ul>\n<li>Only de-identified or aggregated student performance data is sent to OpenAI</li>\n<li>No student names, emails, or personally identifiable information is included in AI prompts</li>\n<li>OpenAI does not use our API inputs to train their models (per OpenAI\u2019s data usage policy for API customers)</li>\n<li>AI-generated content is reviewed by educators before use with students</li>\n</ul>\n\n<h3>6. Service Providers</h3>\n<table>\n<thead><tr><th>Provider</th><th>Purpose</th><th>Data Accessed</th></tr></thead>\n<tbody>\n<tr><td>Supabase</td><td>Database and authentication</td><td>All platform data (encrypted at rest)</td></tr>\n<tr><td>OpenAI</td><td>AI content generation</td><td>De-identified performance data only</td></tr>\n<tr><td>Vercel/Bolt</td><td>Application hosting</td><td>No direct data access</td></tr>\n</tbody>\n</table>\n\n<h3>7. Data Sharing and Disclosure</h3>\n<p>We do not sell, rent, or trade any user information. We may disclose information only:</p>\n<ul>\n<li>To the school or district that authorized the student\u2019s use</li>\n<li>To service providers bound by data protection agreements</li>\n<li>If required by law, regulation, or valid legal process</li>\n<li>To protect the safety of users or the public</li>\n</ul>\n\n<h3>8. Data Security</h3>\n<ul>\n<li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)</li>\n<li>Access is role-based: teachers see only their students; mentors see only their assigned groups</li>\n<li>Passwords are hashed using bcrypt with per-user salts</li>\n<li>Database access is restricted by Row-Level Security policies</li>\n<li>Regular security reviews and access audits are conducted</li>\n</ul>\n\n<h3>9. Data Retention and Deletion</h3>\n<ul>\n<li>Active student data is retained for the duration of the school year</li>\n<li>At the end of each school year, student data is archived or deleted per district policy</li>\n<li>Teachers and mentors may request deletion of their accounts at any time</li>\n<li>Upon account deletion, all associated data is permanently removed within 30 days</li>\n</ul>\n\n<h3>10. Children\u2019s Privacy</h3>\n<p>D[ai]TA is designed for use in schools under teacher supervision. We do not knowingly collect information directly from children under 13 without school/district consent acting in place of parental consent under COPPA. Student accounts are created by teachers or administrators, not by students themselves.</p>\n\n<h3>11. California Student Privacy</h3>\n<p>We comply with the California Student Online Personal Information Protection Act (SOPIPA) and the Student Privacy Pledge. We do not:</p>\n<ul>\n<li>Use student information for targeted advertising</li>\n<li>Build profiles of students for non-educational purposes</li>\n<li>Sell student information</li>\n<li>Use student data to inform, influence, or enable marketing or advertising</li>\n</ul>\n\n<h3>12. Changes to This Policy</h3>\n<p>If we make material changes to this Privacy Policy, we will notify users through the platform and require re-acceptance of updated terms before continued use.</p>\n\n<h3>13. Contact</h3>\n<p>Silicon Valley Education Foundation<br/>1400 Parkmoor Ave Suite 200, San Jose, CA<br/>Email: info@svefoundation.org<br/>Phone: 408-790-9400</p>\n</section>\n\n<section id="terms-of-service">\n<h2>Terms of Service</h2>\n<p><strong>Effective Date:</strong> June 21, 2026</p>\n\n<h3>1. Acceptance of Terms</h3>\n<p>By accessing or using the D[ai]TA platform (\u201cService\u201d), you agree to be bound by these Terms of Service (\u201cTerms\u201d). If you do not agree, you may not use the Service. For teachers, coaches, and college mentors, acceptance is confirmed through a click-through acknowledgment on first login. For students, consent is provided through school district enrollment processes.</p>\n\n<h3>2. Description of Service</h3>\n<p>D[ai]TA is a K\u201312 math tutoring platform operated by Silicon Valley Education Foundation (SVEF). The Service provides AI-assisted lesson planning, student grouping, assessment generation, and session tracking for teachers and college mentors working with elementary and middle school students.</p>\n\n<h3>3. Ownership of the Service</h3>\n<p>The D[ai]TA platform, including its design, code, AI prompts, branding, and all original content, is the sole property of SVEF. Users retain ownership of content they create (e.g., lesson notes, session logs), but grant SVEF a non-exclusive license to use such content for improving the Service.</p>\n\n<h3>4. Permitted Use and Restrictions</h3>\n<p>You may use the Service only for its intended educational purpose. You may NOT:</p>\n<ul>\n<li>Share login credentials with unauthorized users</li>\n<li>Attempt to access data belonging to other teachers, mentors, or students</li>\n<li>Use the Service for any commercial purpose unrelated to education</li>\n<li>Reverse-engineer, decompile, or attempt to extract source code</li>\n<li>Upload harmful, offensive, or illegal content</li>\n<li>Use automated tools (bots, scrapers) to access the Service</li>\n</ul>\n\n<h3>5. Feedback and Improvements</h3>\n<p>Any feedback, suggestions, or ideas you submit about the Service may be used by SVEF without restriction or compensation. You waive any rights to such feedback.</p>\n\n<h3>6. User Accounts and Responsibilities</h3>\n<ul>\n<li>Accounts are created by school administrators or SVEF staff</li>\n<li>You are responsible for maintaining the confidentiality of your login credentials</li>\n<li>You must notify your administrator immediately if you suspect unauthorized access</li>\n<li>SVEF may suspend or terminate accounts that violate these Terms</li>\n</ul>\n\n<h3>7. AI-Generated Content</h3>\n<p>The Service uses artificial intelligence to generate lesson plans, assessments, and recommendations. AI-generated content:</p>\n<ul>\n<li>Is provided as a starting point and should be reviewed by educators before use</li>\n<li>May contain errors or inaccuracies</li>\n<li>Does not constitute professional educational advice</li>\n<li>Should be adapted to meet individual student needs</li>\n</ul>\n\n<h3>8. No Warranty</h3>\n<p>The Service is provided \u201cas is\u201d and \u201cas available\u201d without warranties of any kind, express or implied. SVEF does not warrant that the Service will be uninterrupted, error-free, or suitable for any particular purpose.</p>\n\n<h3>9. Limitation of Liability</h3>\n<p>To the maximum extent permitted by law, SVEF shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to loss of data, revenue, or educational outcomes.</p>\n\n<h3>10. Termination</h3>\n<p>SVEF may terminate or suspend your access at any time, with or without cause. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive (including limitation of liability and intellectual property) will survive termination.</p>\n\n<h3>11. Changes to These Terms</h3>\n<p>SVEF reserves the right to modify these Terms at any time. Material changes will be communicated through the platform, and continued use after notification constitutes acceptance. If you do not agree to updated Terms, you must discontinue use of the Service.</p>\n\n<h3>12. Governing Law</h3>\n<p>These Terms are governed by the laws of the State of California, without regard to conflict-of-law principles. Any disputes shall be resolved in the courts of Santa Clara County, California.</p>\n\n<h3>13. Severability</h3>\n<p>If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.</p>\n\n<h3>14. Contact</h3>\n<p>Silicon Valley Education Foundation<br/>1400 Parkmoor Ave Suite 200, San Jose, CA<br/>Email: info@svefoundation.org<br/>Phone: 408-790-9400</p>\n</section>\n\n<section id="student-data-protection">\n<h2>Student Data Protection Addendum</h2>\n<p><strong>Effective Date:</strong> June 21, 2026</p>\n<p>This Student Data Protection Addendum (\u201cDPA\u201d) supplements the Terms of Service and Privacy Policy and governs the processing of student data by SVEF through the D[ai]TA platform.</p>\n\n<h3>1. Definitions</h3>\n<ul>\n<li><strong>\u201cStudent Data\u201d</strong> means any information that identifies or could identify a specific student, including educational records as defined by FERPA.</li>\n<li><strong>\u201cSchool\u201d</strong> means the K\u201312 school or district that has authorized use of the Service.</li>\n<li><strong>\u201cProcessor\u201d</strong> means SVEF, acting on behalf of the School to provide the Service.</li>\n</ul>\n\n<h3>2. Roles</h3>\n<p>The School is the data controller. SVEF acts as a data processor, processing Student Data only as directed by the School and as necessary to provide the Service.</p>\n\n<h3>3. Use of Student Data</h3>\n<p>SVEF will use Student Data solely to:</p>\n<ul>\n<li>Provide the D[ai]TA tutoring platform services</li>\n<li>Generate personalized lesson plans and grouping recommendations</li>\n<li>Produce progress reports and analytics for authorized school personnel</li>\n<li>Maintain and improve the technical operation of the Service</li>\n</ul>\n<p>SVEF will NOT use Student Data to:</p>\n<ul>\n<li>Advertise or market to students or families</li>\n<li>Build commercial profiles of students</li>\n<li>Sell or rent Student Data to any third party</li>\n<li>Train AI models on identifiable student information</li>\n</ul>\n\n<h3>4. Ownership</h3>\n<p>Student Data remains the property of the School and its students/families. SVEF claims no ownership interest in Student Data and will return or delete all Student Data upon termination of the service relationship.</p>\n\n<h3>5. Service Providers</h3>\n<p>SVEF may engage sub-processors to help provide the Service (see Privacy Policy, Section 6). All sub-processors are bound by data protection agreements no less protective than this DPA.</p>\n\n<h3>6. Data Security</h3>\n<p>SVEF implements industry-standard security measures including:</p>\n<ul>\n<li>Encryption in transit and at rest</li>\n<li>Role-based access controls</li>\n<li>Regular security testing and vulnerability assessments</li>\n<li>Employee training on data protection</li>\n<li>Incident response procedures</li>\n</ul>\n\n<h3>7. Data Minimization</h3>\n<p>SVEF collects only the minimum Student Data necessary to provide the Service. We do not require full student names (only first name and last initial), do not collect home addresses, and do not collect any data beyond what is needed for educational purposes.</p>\n\n<h3>8. Access, Correction, and Export</h3>\n<p>Schools may request access to, correction of, or export of Student Data at any time by contacting SVEF. Parents/guardians may exercise their rights under FERPA through the School.</p>\n\n<h3>9. Retention and Deletion</h3>\n<ul>\n<li>Student Data is retained only for the duration of the service relationship plus a 60-day grace period</li>\n<li>Upon termination or written request, Student Data is permanently deleted within 30 days</li>\n<li>SVEF will certify deletion in writing upon request</li>\n</ul>\n\n<h3>10. Breach Notification</h3>\n<p>In the event of a data breach affecting Student Data, SVEF will:</p>\n<ul>\n<li>Notify the affected School within 72 hours of discovery</li>\n<li>Provide details of the nature and scope of the breach</li>\n<li>Take immediate steps to contain and remediate the breach</li>\n<li>Cooperate with the School\u2019s notification obligations</li>\n</ul>\n\n<h3>11. Compliance</h3>\n<p>SVEF complies with:</p>\n<ul>\n<li>Family Educational Rights and Privacy Act (FERPA)</li>\n<li>Children\u2019s Online Privacy Protection Act (COPPA)</li>\n<li>California Student Online Personal Information Protection Act (SOPIPA)</li>\n<li>California Consumer Privacy Act (CCPA) as applicable</li>\n<li>Student Privacy Pledge</li>\n</ul>\n\n<h3>12. Term, Survival, and Precedence</h3>\n<p>This DPA remains in effect for as long as SVEF processes Student Data. In the event of a conflict between this DPA and the Terms of Service, the provisions of this DPA shall prevail with respect to Student Data. Obligations regarding deletion, confidentiality, and compliance survive termination.</p>\n\n<h3>Contact</h3>\n<p>Silicon Valley Education Foundation<br/>1400 Parkmoor Ave Suite 200, San Jose, CA<br/>Email: info@svefoundation.org<br/>Phone: 408-790-9400</p>\n</section>\n</div>'
WHERE version = '1.0.0';
