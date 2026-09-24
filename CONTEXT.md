# SIC Event Attendance Context

## Terms

### Admin

The single authorised application operator. The Admin authenticates through
Clerk and has a corresponding Neon record keyed by the Clerk user ID for audit
references.

### Attendee

A person who can be invited to an Event. An Attendee has a unique student ID,
a name, and an email address. An Attendee is not an application user.

### Event

A scheduled SIC activity with a lifecycle of draft, published, then closed.
An Event owns its attendee roster and attendance outcomes.

### Event Roster Entry

The association between one Event and one Attendee. It begins as pending,
becomes attended when the Attendee presents a valid QR ticket, or becomes
absent automatically when the Event closes.

### QR Ticket

An opaque signed value for one Event Roster Entry. A QR Ticket expires when
its Event ends and cannot be reissued in the first release.

### Campaign

An email message authored for one Event and sent to selected Event Roster
Entries.

### Delivery

The attempt to deliver one Campaign to one Event Roster Entry. A Delivery is
separate from the technical queue work used to process it.

### Asset

A file stored in Filebase and referenced by an Event or Campaign. Asset
metadata records its object key, original filename, media type, size, and
uploading Admin.
