import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

/**
 * Upload (or replace) a user's avatar image, stored at avatars/{uid}/{fileName}.
 * Returns { url, path } — the path is kept alongside the URL in the user's
 * record so the old file can be deleted when the avatar is replaced.
 */
export async function uploadAvatar(uid, file) {
    const storage = getStorage();
    const path = `avatars/${uid}/${file.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return { url: await getDownloadURL(fileRef), path };
}

/**
 * Upload a document attached to a case and return its public download URL.
 * Stored at case-documents/{caseId}/{fileName}.
 */
export async function uploadCaseDocument(caseId, file) {
    const storage = getStorage();
    const fileRef = ref(storage, `case-documents/${caseId}/${file.name}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
}

/** Delete a file from Storage given its full storage path (e.g. "avatars/uid123/photo.jpg"). */
export async function deleteStorageFile(path) {
    const storage = getStorage();
    await deleteObject(ref(storage, path));
}
