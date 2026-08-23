import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export const MAX_LOVED_ONE_PHOTOS = 6;
export const MAX_LOVED_ONE_PHOTO_DIMENSION = 1200;

export async function prepareLovedOnePhoto(
  asset: ImagePicker.ImagePickerAsset,
): Promise<string> {
  let decoded;
  try {
    decoded = await manipulateAsync(asset.uri, [], {
      compress: 1,
      format: SaveFormat.JPEG,
    });
  } catch {
    throw new Error("The selected photo could not be prepared.");
  }
  const width = decoded.width || asset.width;
  const height = decoded.height || asset.height;
  const largestDimension = Math.max(width, height);
  const actions =
    largestDimension === 0 || largestDimension > MAX_LOVED_ONE_PHOTO_DIMENSION
      ? [
          {
            resize:
              width >= height
                ? { width: MAX_LOVED_ONE_PHOTO_DIMENSION }
                : { height: MAX_LOVED_ONE_PHOTO_DIMENSION },
          },
        ]
      : [];
  const processed = await manipulateAsync(decoded.uri, actions, {
    base64: true,
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  if (!processed.base64) {
    throw new Error("The selected photo could not be prepared.");
  }
  return `data:image/jpeg;base64,${processed.base64}`;
}
