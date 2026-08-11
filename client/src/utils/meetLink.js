// Google Meet link generation.
//
// PLACEHOLDER IMPLEMENTATION. The codes below have the right *shape*
// (meet.google.com/xxx-xxxx-xxx) but they are not reserved with Google, so the
// links are not joinable meetings. Minting a real one takes Google Calendar's
// events.insert with conferenceDataVersion=1, which needs OAuth or a Workspace
// service account — neither of which this project is set up with yet.
//
// When that lands it belongs behind this same function (turned async, calling a
// Cloud Function). Every caller already treats the returned link as opaque, so
// nothing outside this file has to change.

const MEET_HOST = "https://meet.google.com";
const CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz";
// A Meet code is three lowercase letter groups: 3-4-3.
const CODE_GROUP_SIZES = [3, 4, 3];

function randomLetters(count) {
    let out = "";
    for (let i = 0; i < count; i++) {
        out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return out;
}

/** A fresh Google Meet-style link, e.g. "https://meet.google.com/abc-defg-hij" */
export function generateMeetLink() {
    const code = CODE_GROUP_SIZES.map((size) => randomLetters(size)).join("-");
    return `${MEET_HOST}/${code}`;
}
