import re

filepath = r"c:\Users\omerc\Downloads\meet.ai\apps\web\src\pages\dashboard\index.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useTranslation import if not there
if "useTranslation" not in content:
    content = content.replace('import { useNavigate } from "react-router-dom"', 'import { useNavigate } from "react-router-dom"\nimport { useTranslation } from "react-i18next"')

# Add useTranslation hook call
content = content.replace('const navigate = useNavigate()', 'const navigate = useNavigate()\n  const { t, i18n } = useTranslation("dashboard")')

# Replace Welcome back
content = re.sub(
    r'Welcome back, \{currentUser\?\.displayName \|\| currentUser\?\.email\?\.split\(\'@\'\)\[0\]\}',
    r'{t("welcomeTitle", { name: currentUser?.displayName || currentUser?.email?.split("@")[0] })}',
    content
)

# Other string replacements
replacements = {
    "Ready for your next productive meeting?": '{t("welcomeSubtitle")}',
    'isCreating ? "Starting..." : "Start Meeting"': 'isCreating ? t("startingMeeting") : t("startMeeting")',
    '"Sign Out"': 't("signOut")',
    "Recent Meetings": '{t("recentMeetings")}',
    "No meetings yet": '{t("noMeetingsTitle")}',
    "You haven't hosted or joined any meetings.": '{t("noMeetingsDesc")}',
    "Start your first meeting": '{t("startFirstMeeting")}',
    '"Just now"': 't("justNow")',
    'm.status === "active" ? "Active" : "Ended"': 'm.status === "active" ? t("active") : t("ended")',
    "Open tasks from previous meetings": '{t("openTasksTitle")}',
    "No open tasks from previous meetings.": '{t("noOpenTasks")}',
    '"Mark as done"': 't("markAsDone")',
    'Meeting: <span': '{t("meetingPrefix")} <span',
    'Date: {dateStr}': '{t("datePrefix")} {dateStr}',
    'Start: {': '{t("startPrefix")} {',
    'End: {': '{t("endPrefix")} {',
    'Assigned to: {': '{t("assignedToPrefix")} {',
    '=== currentUser?.uid ? "You" :': '=== currentUser?.uid ? t("you") :',
    '"Unknown date"': 't("unknownDate")',
    'mInfo?.title || "Unknown"': 'mInfo?.title || t("unknownMeeting")',
    "Completed tasks": '{t("completedTasksTitle")}',
    "No completed tasks yet.": '{t("noCompletedTasks")}',
    "m.createdAt.toDate().toLocaleDateString()": "m.createdAt.toDate().toLocaleDateString(i18n.language)",
    "m.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})": "m.createdAt.toDate().toLocaleTimeString(i18n.language, {hour: '2-digit', minute:'2-digit'})",
    "mInfo.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })": "mInfo.createdAt.toDate().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })",
    "mInfo.endedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })": "mInfo.endedAt.toDate().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })",
    ".toLocaleDateString('en-GB',": ".toLocaleDateString(i18n.language,",
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard refactored!")
