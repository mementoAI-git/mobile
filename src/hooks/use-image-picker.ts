import { useCallback, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { requestLibraryPickerAccess } from '@/features/media/library-picker-access';

export interface PickedAsset {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export function useImagePicker() {
  const pickFromLibrary = useCallback(async (options?: {
    mediaTypes?: 'images' | 'videos' | 'all';
    allowsMultipleSelection?: boolean;
  }): Promise<PickedAsset[]> => {
    const { status } = await requestLibraryPickerAccess();
    if (status !== 'granted') return [];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        options?.mediaTypes === 'images'
          ? ImagePicker.MediaTypeOptions.Images
          : options?.mediaTypes === 'videos'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
      quality: 0.8,
    });

    if (result.canceled) return [];

    return result.assets.map((a) => ({
      uri: a.uri,
      type: a.mimeType ?? 'image/jpeg',
      name: a.fileName ?? `upload_${Date.now()}`,
      size: a.fileSize,
    }));
  }, []);

  const pickFromCamera = useCallback(async (): Promise<PickedAsset | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (result.canceled) return null;
    const a = result.assets[0];
    return {
      uri: a.uri,
      type: a.mimeType ?? 'image/jpeg',
      name: a.fileName ?? `camera_${Date.now()}`,
      size: a.fileSize,
    };
  }, []);

  return useMemo(() => ({ pickFromLibrary, pickFromCamera }), [pickFromLibrary, pickFromCamera]);
}
