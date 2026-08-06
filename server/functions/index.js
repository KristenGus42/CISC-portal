const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Admin SDK once for all functions
admin.initializeApp({
    databaseURL: "https://cisc-portal-default-rtdb.firebaseio.com"
});

setGlobalOptions({ maxInstances: 10 });

const { createUserAccount } = require("./createAccounts");
const { deleteUserAccount, disableUserAccount, enableUserAccount } = require("./deleteAccounts");
const { updateUserRole, updateUserEmail } = require("./updateAccounts");
const { getUserAuthStatuses } = require("./userStatus");
const { requestPasswordReset } = require("./passwordReset");
const { completePasswordReset } = require("./completePasswordReset");

exports.createUserAccount = createUserAccount;
exports.deleteUserAccount = deleteUserAccount;
exports.disableUserAccount = disableUserAccount;
exports.enableUserAccount = enableUserAccount;
exports.updateUserRole = updateUserRole;
exports.updateUserEmail = updateUserEmail;
exports.getUserAuthStatuses = getUserAuthStatuses;
exports.requestPasswordReset = requestPasswordReset;
exports.completePasswordReset = completePasswordReset;