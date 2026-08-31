import * as SecureStore from "expo-secure-store";

const pendingInviteKey = "settlr_pending_invite";

export const savePendingInvite = (token: string) =>
  SecureStore.setItemAsync(pendingInviteKey, token);

export const getPendingInvite = () =>
  SecureStore.getItemAsync(pendingInviteKey);

export const clearPendingInvite = () =>
  SecureStore.deleteItemAsync(pendingInviteKey);
