type PickerAssetLike = {
  id: string;
  uri: string;
};

type AssetInfoLike = {
  localUri?: string | null;
  uri?: string | null;
};

export async function getPickerAssetUploadUri(
  asset: PickerAssetLike,
  getAssetInfoAsync: (
    id: string,
    options: { shouldDownloadFromNetwork: boolean },
  ) => Promise<AssetInfoLike>,
) {
  try {
    const info = await getAssetInfoAsync(asset.id, { shouldDownloadFromNetwork: false });
    return info.localUri ?? info.uri ?? asset.uri;
  } catch {
    return asset.uri;
  }
}
