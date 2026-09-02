export const TOS_VERSION = '1.0.0';

export const PRIVACY_POLICY_HTML = `
<h2>Privacy Policy</h2>
<p><strong>Effective Date:</strong> June 21, 2026</p>
<p><strong>Last Updated:</strong> June 21, 2026</p>

<h3>1. Introduction</h3>
<p>Silicon Valley Education Foundation ("SVEF," "we," "our," or "us") operates the D[ai]TA platform ("Service"), a K-12 math tutoring support tool that helps teachers, college mentors, and students with differentiated instruction and personalized learning. This Privacy Policy explains how we collect, use, and protect information through the Service.</p>

<h3>2. Who Uses the Service</h3>
<ul>
<li><strong>Teachers</strong> use D[ai]TA to manage student groups, generate lesson plans, and review analytics.</li>
<li><strong>College Mentors</strong> use D[ai]TA to access lesson plans and record tutoring session notes.</li>
<li><strong>Students</strong> use D[ai]TA during tutoring sessions to complete assessments and log their learning.</li>
</ul>

<h3>3. Information We Collect</h3>
<h4>Student Information</h4>
<ul>
<li>First name and last initial</li>
<li>Grade level</li>
<li>Assigned teacher</li>
<li>Math performance data (exit ticket scores, assessment responses)</li>
<li>Group membership and session participation records</li>
</ul>
<h4>Student Records</h4>
<p>Under FERPA, student records are educational records maintained by the school or a party acting for the school. D[ai]TA processes student records solely as a "school official" with a legitimate educational interest, under direction of the school or district.</p>
<h4>Teacher and Mentor Information</h4>
<ul>
<li>Full name and email address</li>
<li>School and district affiliation</li>
<li>University and major (mentors only)</li>
<li>Lesson plans and session notes created within the platform</li>
</ul>
<h4>What We Do NOT Collect</h4>
<ul>
<li>Social Security numbers</li>
<li>Home addresses of students</li>
<li>Biometric data</li>
<li>Financial information</li>
<li>Health or medical records</li>
</ul>

<h3>4. How We Use Information</h3>
<ul>
<li>To provide differentiated math instruction and tutoring support</li>
<li>To generate AI-powered lesson plans and grouping recommendations</li>
<li>To track student progress and produce analytics for teachers and coaches</li>
<li>To facilitate communication between teachers and college mentors</li>
<li>To improve the Service and develop new features</li>
</ul>

<h3>5. Artificial Intelligence</h3>
<p>D[ai]TA uses OpenAI's API to generate lesson plans, assessments, and instructional recommendations. When AI features are used:</p>
<ul>
<li>Only de-identified or aggregated student performance data is sent to OpenAI</li>
<li>No student names, emails, or personally identifiable information is included in AI prompts</li>
<li>OpenAI does not use our API inputs to train their models (per OpenAI's data usage policy for API customers)</li>
<li>AI-generated content is reviewed by educators before use with students</li>
</ul>

<h3>6. Service Providers</h3>
<table>
<thead><tr><th>Provider</th><th>Purpose</th><th>Data Accessed</th></tr></thead>
<tbody>
<tr><td>Supabase</td><td>Database and authentication</td><td>All platform data (encrypted at rest)</td></tr>
<tr><td>OpenAI</td><td>AI content generation</td><td>De-identified performance data only</td></tr>
<tr><td>Vercel/Bolt</td><td>Application hosting</td><td>No direct data access</td></tr>
</tbody>
</table>

<h3>7. Data Sharing and Disclosure</h3>
<p>We do not sell, rent, or trade any user information. We may disclose information only:</p>
<ul>
<li>To the school or district that authorized the student's use</li>
<li>To service providers bound by data protection agreements</li>
<li>If required by law, regulation, or valid legal process</li>
<li>To protect the safety of users or the public</li>
</ul>

<h3>8. Data Security</h3>
<ul>
<li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)</li>
<li>Access is role-based: teachers see only their students; mentors see only their assigned groups</li>
<li>Passwords are hashed using bcrypt with per-user salts</li>
<li>Database access is restricted by Row-Level Security policies</li>
<li>Regular security reviews and access audits are conducted</li>
</ul>

<h3>9. Data Retention and Deletion</h3>
<ul>
<li>Active student data is retained for the duration of the school year</li>
<li>At the end of each school year, student data is archived or deleted per district policy</li>
<li>Teachers and mentors may request deletion of their accounts at any time</li>
<li>Upon account deletion, all associated data is permanently removed within 30 days</li>
</ul>

<h3>10. Children's Privacy</h3>
<p>D[ai]TA is designed for use in schools under teacher supervision. We do not knowingly collect information directly from children under 13 without school/district consent acting in place of parental consent under COPPA. Student accounts are created by teachers or administrators, not by students themselves.</p>

<h3>11. California Student Privacy</h3>
<p>We comply with the California Student Online Personal Information Protection Act (SOPIPA) and the Student Privacy Pledge. We do not:</p>
<ul>
<li>Use student information for targeted advertising</li>
<li>Build profiles of students for non-educational purposes</li>
<li>Sell student information</li>
<li>Use student data to inform, influence, or enable marketing or advertising</li>
</ul>

<h3>12. Changes to This Policy</h3>
<p>If we make material changes to this Privacy Policy, we will notify users through the platform and require re-acceptance of updated terms before continued use.</p>

<h3>13. Contact</h3>
<p>Silicon Valley Education Foundation<br/>1400 Parkmoor Ave Suite 200, San Jose, CA<br/>Email: info@svefoundation.org<br/>Phone: 408-790-9400</p>
`;

export const TERMS_OF_SERVICE_HTML = `
<h2>Terms of Service</h2>
<p><strong>Effective Date:</strong> June 21, 2026</p>

<h3>1. Acceptance of Terms</h3>
<p>By accessing or using the D[ai]TA platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you may not use the Service. For teachers, coaches, and college mentors, acceptance is confirmed through a click-through acknowledgment on first login. For students, consent is provided through school district enrollment processes.</p>

<h3>2. Description of Service</h3>
<p>D[ai]TA is a K-12 math tutoring platform operated by Silicon Valley Education Foundation (SVEF). The Service provides AI-assisted lesson planning, student grouping, assessment generation, and session tracking for teachers and college mentors working with elementary and middle school students.</p>

<h3>3. Ownership of the Service</h3>
<p>The D[ai]TA platform, including its design, code, AI prompts, branding, and all original content, is the sole property of SVEF. Users retain ownership of content they create (e.g., lesson notes, session logs), but grant SVEF a non-exclusive license to use such content for improving the Service.</p>

<h3>4. Permitted Use and Restrictions</h3>
<p>You may use the Service only for its intended educational purpose. You may NOT:</p>
<ul>
<li>Share login credentials with unauthorized users</li>
<li>Attempt to access data belonging to other teachers, mentors, or students</li>
<li>Use the Service for any commercial purpose unrelated to education</li>
<li>Reverse-engineer, decompile, or attempt to extract source code</li>
<li>Upload harmful, offensive, or illegal content</li>
<li>Use automated tools (bots, scrapers) to access the Service</li>
</ul>

<h3>5. Feedback and Improvements</h3>
<p>Any feedback, suggestions, or ideas you submit about the Service may be used by SVEF without restriction or compensation. You waive any rights to such feedback.</p>

<h3>6. User Accounts and Responsibilities</h3>
<ul>
<li>Accounts are created by school administrators or SVEF staff</li>
<li>You are responsible for maintaining the confidentiality of your login credentials</li>
<li>You must notify your administrator immediately if you suspect unauthorized access</li>
<li>SVEF may suspend or terminate accounts that violate these Terms</li>
</ul>

<h3>7. AI-Generated Content</h3>
<p>The Service uses artificial intelligence to generate lesson plans, assessments, and recommendations. AI-generated content:</p>
<ul>
<li>Is provided as a starting point and should be reviewed by educators before use</li>
<li>May contain errors or inaccuracies</li>
<li>Does not constitute professional educational advice</li>
<li>Should be adapted to meet individual student needs</li>
</ul>

<h3>8. No Warranty</h3>
<p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. SVEF does not warrant that the Service will be uninterrupted, error-free, or suitable for any particular purpose.</p>

<h3>9. Limitation of Liability</h3>
<p>To the maximum extent permitted by law, SVEF shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to loss of data, revenue, or educational outcomes.</p>

<h3>10. Termination</h3>
<p>SVEF may terminate or suspend your access at any time, with or without cause. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive (including limitation of liability and intellectual property) will survive termination.</p>

<h3>11. Changes to These Terms</h3>
<p>SVEF reserves the right to modify these Terms at any time. Material changes will be communicated through the platform, and continued use after notification constitutes acceptance. If you do not agree to updated Terms, you must discontinue use of the Service.</p>

<h3>12. Governing Law</h3>
<p>These Terms are governed by the laws of the State of California, without regard to conflict-of-law principles. Any disputes shall be resolved in the courts of Santa Clara County, California.</p>

<h3>13. Severability</h3>
<p>If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.</p>

<h3>14. Contact</h3>
<p>Silicon Valley Education Foundation<br/>1400 Parkmoor Ave Suite 200, San Jose, CA<br/>Email: info@svefoundation.org<br/>Phone: 408-790-9400</p>
`;

export const STUDENT_DATA_PROTECTION_HTML = `
<h2>Student Data Protection Addendum</h2>
<p><strong>Effective Date:</strong> June 21, 2026</p>
<p>This Student Data Protection Addendum ("DPA") supplements the Terms of Service and Privacy Policy and governs the processing of student data by SVEF through the D[ai]TA platform.</p>

<h3>1. Definitions</h3>
<ul>
<li><strong>"Student Data"</strong> means any information that identifies or could identify a specific student, including educational records as defined by FERPA.</li>
<li><strong>"School"</strong> means the K-12 school or district that has authorized use of the Service.</li>
<li><strong>"Processor"</strong> means SVEF, acting on behalf of the School to provide the Service.</li>
</ul>

<h3>2. Roles</h3>
<p>The School is the data controller. SVEF acts as a data processor, processing Student Data only as directed by the School and as necessary to provide the Service.</p>

<h3>3. Use of Student Data</h3>
<p>SVEF will use Student Data solely to:</p>
<ul>
<li>Provide the D[ai]TA tutoring platform services</li>
<li>Generate personalized lesson plans and grouping recommendations</li>
<li>Produce progress reports and analytics for authorized school personnel</li>
<li>Maintain and improve the technical operation of the Service</li>
</ul>
<p>SVEF will NOT use Student Data to:</p>
<ul>
<li>Advertise or market to students or families</li>
<li>Build commercial profiles of students</li>
<li>Sell or rent Student Data to any third party</li>
<li>Train AI models on identifiable student information</li>
</ul>

<h3>4. Ownership</h3>
<p>Student Data remains the property of the School and its students/families. SVEF claims no ownership interest in Student Data and will return or delete all Student Data upon termination of the service relationship.</p>

<h3>5. Service Providers</h3>
<p>SVEF may engage sub-processors to help provide the Service (see Privacy Policy, Section 6). All sub-processors are bound by data protection agreements no less protective than this DPA.</p>

<h3>6. Data Security</h3>
<p>SVEF implements industry-standard security measures including:</p>
<ul>
<li>Encryption in transit and at rest</li>
<li>Role-based access controls</li>
<li>Regular security testing and vulnerability assessments</li>
<li>Employee training on data protection</li>
<li>Incident response procedures</li>
</ul>

<h3>7. Data Minimization</h3>
<p>SVEF collects only the minimum Student Data necessary to provide the Service. We do not require full student names (only first name and last initial), do not collect home addresses, and do not collect any data beyond what is needed for educational purposes.</p>

<h3>8. Access, Correction, and Export</h3>
<p>Schools may request access to, correction of, or export of Student Data at any time by contacting SVEF. Parents/guardians may exercise their rights under FERPA through the School.</p>

<h3>9. Retention and Deletion</h3>
<ul>
<li>Student Data is retained only for the duration of the service relationship plus a 60-day grace period</li>
<li>Upon termination or written request, Student Data is permanently deleted within 30 days</li>
<li>SVEF will certify deletion in writing upon request</li>
</ul>

<h3>10. Breach Notification</h3>
<p>In the event of a data breach affecting Student Data, SVEF will:</p>
<ul>
<li>Notify the affected School within 72 hours of discovery</li>
<li>Provide details of the nature and scope of the breach</li>
<li>Take immediate steps to contain and remediate the breach</li>
<li>Cooperate with the School's notification obligations</li>
</ul>

<h3>11. Compliance</h3>
<p>SVEF complies with:</p>
<ul>
<li>Family Educational Rights and Privacy Act (FERPA)</li>
<li>Children's Online Privacy Protection Act (COPPA)</li>
<li>California Student Online Personal Information Protection Act (SOPIPA)</li>
<li>California Consumer Privacy Act (CCPA) as applicable</li>
<li>Student Privacy Pledge</li>
</ul>

<h3>12. Term, Survival, and Precedence</h3>
<p>This DPA remains in effect for as long as SVEF processes Student Data. In the event of a conflict between this DPA and the Terms of Service, the provisions of this DPA shall prevail with respect to Student Data. Obligations regarding deletion, confidentiality, and compliance survive termination.</p>

<h3>Contact</h3>
<p>Silicon Valley Education Foundation<br/>1400 Parkmoor Ave Suite 200, San Jose, CA<br/>Email: info@svefoundation.org<br/>Phone: 408-790-9400</p>
`;

export const STUDENT_SIMPLIFIED_NOTICE = `
<div class="student-notice">
  <h3>How D[ai]TA Protects You</h3>
  <ul>
    <li><strong>What we store:</strong> Only your first name, last initial, grade level, and math scores.</li>
    <li><strong>What we don't store:</strong> No home address, phone number, photos, or personal details.</li>
    <li><strong>How it's used:</strong> Only to help you learn math -- never for ads or selling data.</li>
    <li><strong>AI features:</strong> AI helps create lesson plans using anonymous scores only. Your teacher reviews everything.</li>
    <li><strong>Who sees it:</strong> Your teacher, your mentor, and you. No one else.</li>
    <li><strong>How long:</strong> Data is kept for the school year, then deleted per your school's policy.</li>
  </ul>
  <p style="margin-top: 12px; font-size: 0.85em; color: #666;">Your school and parent/guardian have agreed to the full legal terms on your behalf. Questions? Ask your teacher or contact SVEF at info@svefoundation.org.</p>
</div>
`;
