const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Admin SDK once for all functions
admin.initializeApp({
    databaseURL: "https://cisc-portal-default-rtdb.firebaseio.com"
});

setGlobalOptions({ maxInstances: 10 });

const { createUserAccount } = require("./createAccounts");
const { deleteUserAccount, deleteOwnAccount, disableUserAccount, enableUserAccount } = require("./deleteAccounts");
const { updateUserRole, updateUserEmail } = require("./updateAccounts");
const { getUserAuthStatuses } = require("./userStatus");
const { requestPasswordReset, requestOwnPasswordReset } = require("./passwordReset");
const { completePasswordReset } = require("./completePasswordReset");
const { generateMeetLinks } = require("./meetLinks");

exports.createUserAccount = createUserAccount;
exports.deleteUserAccount = deleteUserAccount;
exports.deleteOwnAccount = deleteOwnAccount;
exports.disableUserAccount = disableUserAccount;
exports.enableUserAccount = enableUserAccount;
exports.updateUserRole = updateUserRole;
exports.updateUserEmail = updateUserEmail;
exports.getUserAuthStatuses = getUserAuthStatuses;
exports.requestPasswordReset = requestPasswordReset;
exports.requestOwnPasswordReset = requestOwnPasswordReset;
exports.completePasswordReset = completePasswordReset;
exports.generateMeetLinks = generateMeetLinks;