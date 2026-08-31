import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { apiDownload } from "./api";

export type UploadFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};
const supported = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function validate(file: UploadFile) {
  if (file.size && file.size > 5 * 1024 * 1024)
    throw new Error("Files must be 5 MB or smaller.");
  if (!supported.includes(file.type))
    throw new Error("Choose a JPG, PNG, WEBP, or PDF file.");
  return file;
}

export async function pickAttachment(
  source: "document" | "photo" = "document",
): Promise<UploadFile | null> {
  if (source === "photo") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Photo library permission is required to attach an image.",
      );
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    return validate({
      uri: asset.uri,
      name:
        asset.fileName || `receipt.${asset.mimeType?.split("/")[1] || "jpg"}`,
      type: asset.mimeType || "image/jpeg",
      size: asset.fileSize,
    });
  }
  const result = await DocumentPicker.getDocumentAsync({
    type: supported,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return validate({
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType || "application/octet-stream",
    size: asset.size,
  });
}

export async function shareApiFile(path: string, filename: string) {
  const blob = await apiDownload(path);
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, filename);
  file.write(new Uint8Array(await blob.arrayBuffer()));
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(file.uri, { dialogTitle: filename });
}
