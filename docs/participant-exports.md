# Participant exports

In **Events → Event details → People**, choose **Export all participants** to
download `<event-name>-participants.csv`. The download includes the full event
roster even when the People search hides some participants.

The columns are:

- Participant ID
- Name
- Email
- Student ID
- Course Track
- Degree Program
- Section
- Attendance
- Check-in Time (UTC)
- Check-in Time (GMT+8)

GMT+8 matches Asia/Manila year-round. A check-in at `2026-10-20T22:15:30.000Z`
appears as `2026-10-21T06:15:30+08:00`. Both check-in columns are blank when no
check-in has been recorded.

The attendee directory export uses the same participant and attendance columns,
plus Registered Events Count, Attended Events Count, and Attendance Rate (%).
It exports the selected students, or every student matching the current filters,
across all pages. Each student's attendance history has one row per event;
students with no events still receive one row with blank attendance fields.

The events catalog export includes event details, participant counts, participant
profiles, attendance, and ticket information. The Export action on an individual
event downloads only that event. The toolbar exports selected events, or all
filtered events when no selection exists. Events with no participants still appear.

All exports require an administrator session. Files use UTF-8, escape CSV values,
and neutralize spreadsheet formulas in supplied text. Browsers may replace
unsupported characters in filenames.
