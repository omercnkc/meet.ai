import re

files_to_refactor = {
    r"c:\Users\omerc\Downloads\meet.ai\apps\web\src\pages\meeting-room\index.tsx": [
        ("Entering meeting...", '{t("enteringMeeting")}'),
        ("Meeting Not Found", '{t("meetingNotFound")}'),
        ("The meeting link is invalid or the meeting has already securely concluded.", '{t("meetingNotFoundDesc")}'),
        ("Return to Dashboard", '{t("returnToDashboard")}'),
        ("Connection Error", '{t("connectionError")}'),
        ("Connecting to room...", '{t("connectingToRoom")}'),
        ("{meeting.participantIds.length} participant(s)", '{t("participantsCount", { count: meeting.participantIds.length })}'),
        (">Share Invite<", '>{t("shareInvite")}<'),
        ('"Meeting link copied to clipboard!"', 't("inviteCopied")'),
        ("Click to enable the floating meeting window while browsing other tabs.", '{t("pipHint")}'),
        (">Enable Mini Window<", '>{t("enableMiniWindow")}<'),
        ("This tab is being shared with Meet.ai", '{t("tabShared")}'),
        (">Hide<", '>{t("hide")}<'),
        (">Stop sharing<", '>{t("stopSharing")}<'),
        ('"Connecting to meeting..."', 't("connectingMeeting")'),
        ('"Connection lost. Reconnecting..."', 't("reconnecting")'),
        ('"Disconnected."', 't("disconnected")'),
        (': "Connecting..."', ': t("connecting")')
    ],
    r"c:\Users\omerc\Downloads\meet.ai\apps\web\src\pages\meeting-room\components\guest-admission-flow.tsx": [
        ("Requesting to join...", '{t("requestingJoin")}'),
        ("Request Declined", '{t("requestDeclined")}'),
        ("The host has declined your request to join.", '{t("requestDeclinedDesc")}'),
        ("Request Timed Out", '{t("requestTimedOut")}'),
        ("The host didn't respond in time. Please try again later.", '{t("requestTimedOutDesc")}'),
        ("Waiting for host approval...", '{t("waitingApproval")}'),
        ("You will join the meeting as soon as the host admits you.", '{t("waitingApprovalDesc")}')
    ]
}

for filepath, replacements in files_to_refactor.items():
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "useTranslation" not in content:
        # insert it after standard imports
        if "react-router-dom" in content:
            content = content.replace('from "react-router-dom"', 'from "react-router-dom"\nimport { useTranslation } from "react-i18next"')
        else:
            content = content.replace('from "react";', 'from "react";\nimport { useTranslation } from "react-i18next";')
        
    if "const { t } = useTranslation" not in content and "const { t," not in content:
        # hook into main component
        # meeting-room/index.tsx -> export default function MeetingRoomPage() {
        # guest-admission-flow -> export function GuestAdmissionFlow({
        # we will use regex
        content = re.sub(
            r'(export (?:default )?function \w+\([^)]*\)\s*\{)',
            r'\1\n  const { t } = useTranslation("meeting");',
            content
        )
        
        # for ConnectionStatusOverlay in index.tsx
        content = re.sub(
            r'(function ConnectionStatusOverlay\(\)\s*\{)',
            r'\1\n  const { t } = useTranslation("meeting");',
            content
        )

    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Meeting files refactored.")
