# SIC Event Attendance Context

## Terms

### Admin

Anyone on the allowlist who can sign in to the dashboard: a System Administrator,
Executive Committee member, Event Head or Committee member. Each allowlisted email
has exactly one role. An Admin authenticates through Neon Managed Better Auth; their
allowlist entry is linked to the Neon Auth user ID, which every audit reference
("created by", "scanned by", "uploaded by") stores.

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

A file stored in Neon Object Storage and referenced by an Event or Campaign. Asset
metadata records its object key, original filename, media type, size, and
uploading Admin.
